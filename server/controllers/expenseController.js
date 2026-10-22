import crypto from 'node:crypto';
import pool from '../config/db.js';
import { convertCurrency } from '../utils/currency.js';

/**
 * POST /api/trips/:tripId/expenses
 * Uses MySQL transactions for atomic writes with live currency conversion
 */
export const addExpense = async (req, res) => {
  const { tripId } = req.params;
  const {
    description,
    amount,
    original_amount,
    currency,
    paid_by,
    paidBy,
    split_members,
    splitMembers,
  } = req.body;
  const loggedInUserId = req.user.id;

  const rawAmount = parseFloat(original_amount !== undefined ? original_amount : amount);
  if (!description || !description.trim() || isNaN(rawAmount) || rawAmount <= 0) {
    return res.status(400).json({ message: 'Valid description and positive amount are required.' });
  }

  const expenseCurrency = (currency || 'INR').trim().toUpperCase();

  // Verify the logged-in user is a member of :tripId
  const [membership] = await pool.query(
    `SELECT tm.id FROM trip_members tm WHERE tm.trip_id = ? AND tm.user_id = ?
     UNION
     SELECT t.id FROM trips t WHERE t.id = ? AND (t.created_by = ? OR t.user_id = ?)`,
    [tripId, loggedInUserId, tripId, loggedInUserId, loggedInUserId]
  );

  if (membership.length === 0) {
    return res.status(403).json({ message: 'Access denied: You are not a member of this trip.' });
  }

  // Fetch all members of the trip for resolving splits
  const [allMembers] = await pool.query(
    `SELECT tm.id AS member_id, tm.user_id, tm.name, u.email
     FROM trip_members tm
     LEFT JOIN users u ON tm.user_id = u.id
     WHERE tm.trip_id = ?`,
    [tripId]
  );

  if (allMembers.length === 0) {
    return res.status(400).json({ message: 'No members found in this trip.' });
  }

  // Resolve split members array
  let rawSplits = split_members || splitMembers || [];
  if (!Array.isArray(rawSplits) || rawSplits.length === 0) {
    // Default to all trip members
    rawSplits = allMembers.map((m) => m.user_id || m.member_id || m.name);
  }

  // Map each split item to a member user_id or identifier
  const resolvedSplitMemberIds = rawSplits.map((item) => {
    const str = typeof item === 'object' && item !== null ? item.id || item.user_id || item.name : String(item);
    const match = allMembers.find(
      (m) =>
        m.user_id === str ||
        m.member_id === str ||
        m.name.toLowerCase() === str.toLowerCase() ||
        (m.email && m.email.toLowerCase() === str.toLowerCase())
    );
    return match ? (match.user_id || match.member_id) : str;
  });

  // Remove duplicates
  const finalSplitMembers = Array.from(new Set(resolvedSplitMemberIds));
  if (finalSplitMembers.length === 0) {
    return res.status(400).json({ message: 'At least one split member is required.' });
  }

  // Determine payer strictly from frontend payload req.body.paid_by
  const rawPayer = paid_by !== undefined && paid_by !== null
    ? paid_by
    : paidBy;

  if (!rawPayer || (typeof rawPayer === 'string' && !rawPayer.trim())) {
    return res.status(400).json({ message: 'paid_by is required in request payload.' });
  }

  const payerInput = typeof rawPayer === 'string' ? rawPayer.trim() : String(rawPayer);

  // Validate payer against trip members to resolve user_id if needed for fk_expenses_paid_by constraint
  const payerMatch = allMembers.find(
    (m) =>
      String(m.user_id) === payerInput ||
      String(m.member_id) === payerInput ||
      (m.name && m.name.toLowerCase() === payerInput.toLowerCase())
  );

  // Crucial: strictly use req.body.paid_by (or resolved user_id).
  // Do NOT override with req.user.id or hardcoded ID.
  const resolvedPayer = (payerMatch && payerMatch.user_id) ? payerMatch.user_id : payerInput;

  // Convert foreign currency to INR before opening transaction
  const { convertedAmount: inrAmount, exchangeRate } = await convertCurrency(
    rawAmount,
    expenseCurrency,
    'INR'
  );

  // Open MySQL transaction
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const expenseId = 'exp_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex');

    // Step A: Insert record into expenses table
    await conn.query(
      `INSERT INTO expenses (id, trip_id, user_id, paid_by, amount, original_amount, currency, exchange_rate, description, split_members)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        expenseId,
        tripId,
        loggedInUserId,
        resolvedPayer,
        inrAmount,
        rawAmount,
        expenseCurrency,
        exchangeRate,
        description.trim(),
        JSON.stringify(finalSplitMembers),
      ]
    );

    // Step B: Calculate per-person share in standardized base currency (INR)
    const splitAmount = (inrAmount / finalSplitMembers.length).toFixed(2);

    // Step C: Bulk insert rows into expense_splits (expense_id, user_id, amount_owed)
    for (const memberUserId of finalSplitMembers) {
      const splitId = 'spl_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex');
      await conn.query(
        `INSERT INTO expense_splits (id, expense_id, user_id, amount_owed)
         VALUES (?, ?, ?, ?)`,
        [splitId, expenseId, memberUserId, parseFloat(splitAmount)]
      );
    }

    // Step D: Commit transaction and release connection
    await conn.commit();
    conn.release();

    return res.status(201).json({
      message: 'Expense added successfully.',
      expense: {
        id: expenseId,
        _id: expenseId,
        trip_id: tripId,
        description: description.trim(),
        amount: inrAmount,
        original_amount: rawAmount,
        currency: expenseCurrency,
        exchange_rate: exchangeRate,
        paid_by: resolvedPayer,
        paidBy: resolvedPayer,
        split_members: finalSplitMembers,
        splitMembers: finalSplitMembers,
        splitAmount: Number(splitAmount),
      },
    });
  } catch (error) {
    await conn.rollback();
    conn.release();
    console.error('Expense transaction failed, rolled back:', error);
    return res.status(500).json({ message: 'Failed to record expense.', error: error.message });
  }
};

/**
 * GET /api/trips/:tripId/expenses
 * Fetch all expenses for :tripId joined with users table to get payer name (paid_by_name)
 */
export const getExpenses = async (req, res) => {
  try {
    const { tripId } = req.params;

    const [rows] = await pool.query(
      `SELECT e.id, e.id AS _id, e.trip_id, e.description, e.amount, e.original_amount, e.currency, e.exchange_rate, e.paid_by, e.split_members, e.created_at,
              COALESCE(u.name, u.username, tm.name, e.paid_by) AS paid_by_name,
              COALESCE(u.name, u.username, tm.name, e.paid_by) AS paidBy
       FROM expenses e
       LEFT JOIN users u ON e.paid_by = u.id OR e.paid_by = u.username
       LEFT JOIN trip_members tm ON (e.paid_by = tm.user_id OR e.paid_by = tm.name) AND tm.trip_id = e.trip_id
       WHERE e.trip_id = ?
       ORDER BY e.created_at DESC`,
      [tripId]
    );

    const formatted = rows.map((r) => ({
      ...r,
      amount: Number(r.amount),
      original_amount: r.original_amount !== null && r.original_amount !== undefined ? Number(r.original_amount) : Number(r.amount),
      currency: r.currency || 'INR',
      exchange_rate: Number(r.exchange_rate || 1.0),
      split_members: typeof r.split_members === 'string' ? JSON.parse(r.split_members || '[]') : r.split_members,
    }));

    return res.json(formatted);
  } catch (error) {
    console.error('Get expenses error:', error);
    return res.status(500).json({ message: 'Failed to fetch expenses.', error: error.message });
  }
};

/**
 * DELETE /api/trips/:tripId/expenses/:expenseId
 */
export const deleteExpense = async (req, res) => {
  try {
    const { tripId, expenseId } = req.params;
    await pool.query('DELETE FROM expenses WHERE id = ? AND trip_id = ?', [expenseId, tripId]);
    return res.json({ message: 'Expense deleted successfully.' });
  } catch (error) {
    console.error('Delete expense error:', error);
    return res.status(500).json({ message: 'Failed to delete expense.', error: error.message });
  }
};

/**
 * GET /api/trips/:tripId/balances
 * The Balance & Settlement Engine:
 * Query A: Total paid by each member: SELECT paid_by, SUM(amount) AS total_paid FROM expenses WHERE trip_id = ? GROUP BY paid_by
 * Query B: Total owed by each member: SELECT es.user_id, SUM(es.amount_owed) AS total_owed FROM expense_splits es JOIN expenses e ON es.expense_id = e.id WHERE e.trip_id = ? GROUP BY es.user_id
 * Query C: All trip members with their id and name.
 * Net balance calculation: net = (total_paid || 0) - (total_owed || 0)
 * Settlement Minimization Algorithm: two-pointer greedy algorithm
 */
export const getBalances = async (req, res) => {
  try {
    const tripId = req.params.tripId || req.params.id;

    // Query A: Total paid by each member on this trip
    const [paidRows] = await pool.query(
      `SELECT paid_by, SUM(amount) AS total_paid
       FROM expenses
       WHERE trip_id = ?
       GROUP BY paid_by`,
      [tripId]
    );

    // Query B: Total owed by each member on this trip
    const [owedRows] = await pool.query(
      `SELECT es.user_id, SUM(es.amount_owed) AS total_owed
       FROM expense_splits es
       JOIN expenses e ON es.expense_id = e.id
       WHERE e.trip_id = ?
       GROUP BY es.user_id`,
      [tripId]
    );

    // Query C: All trip members with their id and name
    const [members] = await pool.query(
      `SELECT tm.id AS member_id, COALESCE(tm.user_id, tm.id) AS id, tm.user_id, tm.name
       FROM trip_members tm
       WHERE tm.trip_id = ?`,
      [tripId]
    );

    // Build paid and owed lookups
    const paidMap = {};
    for (const r of paidRows) {
      paidMap[r.paid_by] = Number(r.total_paid);
    }

    const owedMap = {};
    for (const r of owedRows) {
      owedMap[r.user_id] = Number(r.total_owed);
    }

    // Helper to find paid amount matching member by id, user_id, or name
    const getMemberPaid = (m) => {
      if (m.user_id && paidMap[m.user_id] !== undefined) return paidMap[m.user_id];
      if (m.id && paidMap[m.id] !== undefined) return paidMap[m.id];
      if (m.name && paidMap[m.name] !== undefined) return paidMap[m.name];
      // Case-insensitive match on name
      const nameKey = Object.keys(paidMap).find((k) => k.toLowerCase() === m.name.toLowerCase());
      return nameKey ? paidMap[nameKey] : 0;
    };

    // Helper to find owed amount matching member
    const getMemberOwed = (m) => {
      if (m.user_id && owedMap[m.user_id] !== undefined) return owedMap[m.user_id];
      if (m.id && owedMap[m.id] !== undefined) return owedMap[m.id];
      if (m.name && owedMap[m.name] !== undefined) return owedMap[m.name];
      const nameKey = Object.keys(owedMap).find((k) => k.toLowerCase() === m.name.toLowerCase());
      return nameKey ? owedMap[nameKey] : 0;
    };

    // Net Balance Calculation
    const balances = members.map((m) => {
      const totalPaid = getMemberPaid(m);
      const totalOwed = getMemberOwed(m);
      const net = Math.round((totalPaid - totalOwed) * 100) / 100;

      return {
        userId: m.user_id || m.id,
        name: m.name,
        totalPaid: Math.round(totalPaid * 100) / 100,
        totalOwed: Math.round(totalOwed * 100) / 100,
        netBalance: net,
      };
    });

    // Settlement Minimization Algorithm: Two-pointer greedy algorithm
    const debtors = [];
    const creditors = [];

    balances.forEach((b) => {
      if (b.netBalance < -0.01) {
        debtors.push({ name: b.name, amount: Math.abs(b.netBalance) });
      } else if (b.netBalance > 0.01) {
        creditors.push({ name: b.name, amount: b.netBalance });
      }
    });

    // Sort descending by amount for efficient matching
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const settlements = [];
    let d = 0;
    let c = 0;

    while (d < debtors.length && c < creditors.length) {
      const debtor = debtors[d];
      const creditor = creditors[c];
      const payment = Math.min(debtor.amount, creditor.amount);

      if (payment > 0.01) {
        settlements.push({
          from: debtor.name,
          to: creditor.name,
          amount: Math.round(payment * 100) / 100,
        });
      }

      debtor.amount -= payment;
      creditor.amount -= payment;

      if (debtor.amount < 0.01) d++;
      if (creditor.amount < 0.01) c++;
    }

    return res.json({
      balances,
      settlements,
    });
  } catch (error) {
    console.error('Balance calculation error:', error);
    return res.status(500).json({ message: 'Failed to calculate balances.', error: error.message });
  }
};

/**
 * POST /api/trips/:tripId/settle
 * Settle balances recording
 */
export const recordSettlement = async (req, res) => {
  try {
    const tripId = req.params.tripId || req.params.id;
    const { settlements } = req.body;

    if (!Array.isArray(settlements) || settlements.length === 0) {
      return res.status(400).json({ message: 'No settlements to record.' });
    }

    const today = new Date().toISOString().split('T')[0];
    for (const s of settlements) {
      const settleId = 'set_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex');
      await pool.query(
        'INSERT INTO settlements (id, trip_id, from_member, to_member, amount, date) VALUES (?, ?, ?, ?, ?, ?)',
        [settleId, tripId, s.from, s.to, parseFloat(s.amount), today]
      );
    }

    return res.json({ message: 'Settlements recorded successfully.' });
  } catch (error) {
    console.error('Record settlement error:', error);
    return res.status(500).json({ message: 'Failed to record settlements.', error: error.message });
  }
};

/**
 * DELETE /api/trips/:tripId/settle
 * Reset settlements
 */
export const resetSettlements = async (req, res) => {
  try {
    const tripId = req.params.tripId || req.params.id;
    await pool.query('DELETE FROM settlements WHERE trip_id = ?', [tripId]);
    return res.json({ message: 'Settlements reset successfully.' });
  } catch (error) {
    console.error('Reset settlements error:', error);
    return res.status(500).json({ message: 'Failed to reset settlements.', error: error.message });
  }
};
