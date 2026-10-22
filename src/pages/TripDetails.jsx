<<<<<<< HEAD
=======
/* oxlint-disable react/purity */
/* oxlint-disable react/set-state-in-effect */
>>>>>>> 2e5742c0c09ec5b5dbd1205951e97938012931bc
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import AddMemberModal from '../components/AddMemberModal';
import AddExpenseModal from '../components/AddExpenseModal';
import ThemeToggle from '../components/ThemeToggle';

<<<<<<< HEAD

 // Finds the matching member based on the raw payer information
=======
/**
 * Intelligent Payer Resolution Helper
 * Matches raw payer input or ID to actual trip members
 */
>>>>>>> 2e5742c0c09ec5b5dbd1205951e97938012931bc
function findMatchingMember(rawPayer, membersList, user, rawMembers) {
  if (!rawPayer && (!membersList || membersList.length === 0)) {
    return user?.username || 'You';
  }

  const payerStr = String(
    typeof rawPayer === 'object' && rawPayer !== null
      ? rawPayer.name || rawPayer.username || rawPayer.id || ''
      : rawPayer || ''
  ).trim();

  // 1. Direct ID match against raw trip members
  if (rawMembers && Array.isArray(rawMembers)) {
    const matchedById = rawMembers.find(
      (m) =>
        m &&
        (String(m.id) === payerStr ||
<<<<<<< HEAD
        String(m.user_id) === payerStr ||
        String(m.member_record_id) === payerStr)
=======
         String(m.user_id) === payerStr ||
         String(m.member_record_id) === payerStr)
>>>>>>> 2e5742c0c09ec5b5dbd1205951e97938012931bc
    );
    if (matchedById && (matchedById.name || matchedById.username)) {
      return matchedById.name || matchedById.username;
    }
  }

  // 2. Direct exact match in membersList
  if (membersList && Array.isArray(membersList)) {
    const exact = membersList.find((m) => m.toLowerCase() === payerStr.toLowerCase());
    if (exact) return exact;
  }

  // 3. Name match in rawMembers
  if (rawMembers && Array.isArray(rawMembers)) {
    const matchedByName = rawMembers.find(
      (m) => m && m.name && m.name.toLowerCase() === payerStr.toLowerCase()
    );
    if (matchedByName && matchedByName.name) {
      return matchedByName.name;
    }
  }

  // 4. Current user username match
  const currentUsername = (user?.username || '').trim().toLowerCase();
  const clean = (s) => (s ? s.toLowerCase().replace(/[^a-z0-9]/g, '') : '');
  const cleanPayer = clean(payerStr);

  if (currentUsername && cleanPayer && cleanPayer === clean(currentUsername)) {
    const userInMembers = membersList?.find((m) => clean(m) === clean(currentUsername));
    if (userInMembers) return userInMembers;
    return user?.username || 'You';
  }

  // 5. Alphanumeric clean match in membersList
  if (cleanPayer && membersList && Array.isArray(membersList)) {
    const alphaMatch = membersList.find((m) => clean(m) === cleanPayer);
    if (alphaMatch) return alphaMatch;
  }

  // 6. Return payerStr if it represents a readable name
  if (payerStr && !payerStr.startsWith('usr_') && !payerStr.startsWith('mem_') && isNaN(Number(payerStr))) {
    return payerStr;
  }

  return (membersList && membersList[0]) || user?.username || 'You';
}

<<<<<<< HEAD

// Calculates net balances accounting for expenses and completed settlements

=======
/**
 * Calculates net balances accounting for expenses and completed settlements
 */
>>>>>>> 2e5742c0c09ec5b5dbd1205951e97938012931bc
function calculateTripFinances(membersList, expensesList, completedSettlements, user, rawMembers) {
  if (!membersList || membersList.length === 0) {
    return {
      totalSpent: 0,
      perPersonShare: 0,
      memberBreakdown: [],
      pendingSettlements: [],
    };
  }

  // 1. Track paid amounts for every member
  const paidMap = {};
  membersList.forEach((m) => {
    paidMap[m] = 0;
  });

  let totalSpent = 0;

  // 2. Sum expenses accurately
  expensesList.forEach((exp) => {
    const amount = parseFloat(exp.amount) || 0;
    totalSpent += amount;

    const payer = findMatchingMember(
      exp.paid_by_name || exp.paidBy || exp.paid_by,
      membersList,
      user,
      rawMembers
    );
    if (paidMap[payer] === undefined) {
      paidMap[payer] = 0;
    }
    paidMap[payer] += amount;
  });

  // 3. Apply completed settlements
  completedSettlements.forEach((st) => {
    const amount = parseFloat(st.amount) || 0;
    if (paidMap[st.from] !== undefined) {
      paidMap[st.from] += amount;
    }
    if (paidMap[st.to] !== undefined) {
      paidMap[st.to] -= amount;
    }
  });

  // 4. Equal share
  const memberCount = membersList.length;
  const perPersonShare = memberCount > 0 ? Math.round((totalSpent / memberCount) * 100) / 100 : 0;

  // 5. Net balance per person
  const memberBreakdown = membersList.map((name) => {
    const paid = paidMap[name] || 0;
    const balance = paid - perPersonShare;
    return {
      name,
      paid: Math.round(paid * 100) / 100,
      balance: Math.round(balance * 100) / 100,
    };
  });

  // 6. Minimal pending settlements (Two-pointer greedy)
  const debtors = [];
  const creditors = [];

  memberBreakdown.forEach((m) => {
    if (m.balance < -0.01) {
      debtors.push({ name: m.name, amount: Math.abs(m.balance) });
    } else if (m.balance > 0.01) {
      creditors.push({ name: m.name, amount: m.balance });
    }
  });

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const pendingSettlements = [];
  let d = 0;
  let c = 0;

  while (d < debtors.length && c < creditors.length) {
    const debtor = debtors[d];
    const creditor = creditors[c];
    const payment = Math.min(debtor.amount, creditor.amount);

    if (payment >= 0.01) {
      pendingSettlements.push({
        id: `set_${d}_${c}_${payment}`,
        from: debtor.name,
        to: creditor.name,
        amount: payment.toFixed(2),
      });
    }

    debtor.amount -= payment;
    creditor.amount -= payment;

    if (debtor.amount < 0.01) d++;
    if (creditor.amount < 0.01) c++;
  }

  return {
    totalSpent,
    perPersonShare,
    memberBreakdown,
    pendingSettlements,
  };
}

export default function TripDetails() {
  const { id } = useParams();
  const { user } = useAuth();

  const [trip, setTrip] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [completedSettlements, setCompletedSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  // Load trip, expenses, and settlements from backend API
  const loadTripData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/trips/${id}`);
      const tripData = res.data?.trip || res.data;
      setTrip(tripData);
      setExpenses(tripData.expenses || []);
      setCompletedSettlements(tripData.settlements || []);
    } catch (err) {
      console.error('Failed to load trip:', err);
      setError(err.response?.data?.message || 'Trip not found or unauthorized access.');
      setTrip(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadTripData();
  }, [loadTripData]);

  // Clean, unique list of member names
  const members = useMemo(() => {
    if (!trip?.members || trip.members.length === 0) {
      return [user?.username || 'You'];
    }
    const list = trip.members
      .map((m) => (typeof m === 'object' && m !== null ? m.name : String(m)))
      .filter(Boolean);
    return Array.from(new Set(list));
  }, [trip, user]);

  // Calculate finances accurately
  const { totalSpent, perPersonShare, memberBreakdown, pendingSettlements } = useMemo(() => {
    return calculateTripFinances(members, expenses, completedSettlements, user, trip?.members);
  }, [members, expenses, completedSettlements, user, trip]);

  // Helper to check if a member name belongs to current logged in user
  const isCurrentUser = useCallback(
    (name) => {
      if (!name || !user) return false;
      const nLower = String(name).trim().toLowerCase();
      if (nLower === 'you') return true;

      const uLower = (user.username || '').trim().toLowerCase();
      const nameLower = (user.name || '').trim().toLowerCase();

      // 1. Exact match on username or name
      if (nLower === uLower || (nameLower && nLower === nameLower)) return true;

      // 2. Prefix matching for generated usernames (e.g. 'jay_123' matching 'jay')
      if (uLower && (uLower.startsWith(nLower + '_') || nLower.startsWith(uLower + '_'))) return true;

      // 3. Match against trip.members array
      if (trip?.members && Array.isArray(trip.members)) {
        const found = trip.members.find(
          (m) =>
            m &&
            m.name &&
            m.name.toLowerCase() === nLower &&
            (String(m.id) === String(user.id) ||
              String(m.user_id) === String(user.id) ||
              (m.email && user.email && m.email.toLowerCase() === user.email.toLowerCase()))
        );
        if (found) return true;
      }

      return false;
    },
    [user, trip]
  );

  // Current logged in user's matching financial record
  const myRecord = useMemo(() => {
    if (!memberBreakdown || memberBreakdown.length === 0) return null;
    return (
      memberBreakdown.find((m) => isCurrentUser(m.name)) ||
      null
    );
  }, [memberBreakdown, isCurrentUser]);

  // Display name for current user in this trip
  const myDisplayName = useMemo(() => {
    if (myRecord) return myRecord.name;
    return user?.name || user?.username || 'You';
  }, [myRecord, user]);

  // Settle single transaction via backend API
  const handleSettleSingle = async (settlement) => {
    try {
      await api.post(`/trips/${id}/settle`, { settlements: [settlement] });
      loadTripData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record settlement.');
    }
  };

  // Settle all pending debts in one click via backend API
  const handleSettleAll = async () => {
    if (pendingSettlements.length === 0) return;
    try {
      await api.post(`/trips/${id}/settle`, { settlements: pendingSettlements });
      loadTripData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to settle debts.');
    }
  };

  // Reset settlements via backend API
  const handleResetSettlements = async () => {
    try {
      await api.delete(`/trips/${id}/settle`);
      loadTripData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reset settlements.');
    }
  };

  // Delete an expense via backend API
  const handleDeleteExpense = async (expenseId) => {
    try {
      await api.delete(`/trips/${id}/expenses/${expenseId}`);
      loadTripData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete expense.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-gray-500 dark:text-slate-400">Loading trip details...</p>
        </div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-8 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center text-xl font-bold mx-auto mb-4">
            ✕
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-6 leading-relaxed">
            {error || 'This trip does not exist or does not belong to your account.'}
          </p>
          <Link
            to="/"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-bold transition inline-block"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 p-4 sm:p-8 transition-colors duration-200">
      {/* Full Width Container */}
      <div className="w-full max-w-7xl mx-auto space-y-6">
        {/* Navigation & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition"
          >
            ← Back to All Trips
          </Link>

          {/* Quick Actions */}
          <div className="flex items-center gap-3">
            <ThemeToggle />

            {pendingSettlements.length > 0 && (
              <button
                onClick={handleSettleAll}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span>✓ Settle Up All Debts</span>
              </button>
            )}

            <button
              onClick={() => setIsExpenseModalOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-bold transition shadow-xs cursor-pointer"
            >
              + Add Expense
            </button>
          </div>
        </div>

        {/* Trip Header Banner */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6 transition-colors duration-200">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                {trip.title}
              </h1>
              {pendingSettlements.length === 0 && expenses.length > 0 && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 dark:bg-emerald-950/60 text-green-800 dark:text-emerald-300 border border-green-200 dark:border-emerald-800">
                  ✓ All Settled Up
                </span>
              )}
            </div>
            {trip.description && (
              <p className="text-sm text-gray-500 dark:text-slate-400 max-w-2xl">{trip.description}</p>
            )}

            {/* Members Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                Members ({members.length}):
              </span>
              {members.map((m, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-slate-200"
                >
                  {m} {isCurrentUser(m) ? '(You)' : ''}
                </span>
              ))}
            </div>
          </div>

          <button
            onClick={() => setIsMemberModalOpen(true)}
            className="px-4 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 border border-gray-300 dark:border-slate-700 text-gray-800 dark:text-slate-200 rounded-md text-xs font-semibold transition cursor-pointer self-start md:self-auto shrink-0"
          >
            + Add Member
          </button>
        </div>

<<<<<<< HEAD
=======
        {/* 3 Top Summary Cards */}
>>>>>>> 2e5742c0c09ec5b5dbd1205951e97938012931bc
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Total Trip Cost */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-xs transition-colors duration-200">
            <div className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
              Total Trip Spending
            </div>
            <div className="text-3xl font-extrabold text-gray-900 dark:text-white mt-2">
              ₹{totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-gray-400 dark:text-slate-500 mt-1">{expenses.length} bills recorded</div>
          </div>

          {/* Each Person Pays */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-xs transition-colors duration-200">
            <div className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
              Fair Share (Per Person)
            </div>
            <div className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 mt-2">
              ₹{perPersonShare.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-gray-400 dark:text-slate-500 mt-1">
              Split equally between {members.length} members
            </div>
          </div>

          {/* Your Status */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-xs transition-colors duration-200">
            <div className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
              Your Status ({myDisplayName})
            </div>
            <div className="text-3xl font-extrabold mt-2">
              {myRecord && myRecord.balance > 0.01 ? (
                <span className="text-green-600 dark:text-emerald-400">
                  +₹{myRecord.balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (get back)
                </span>
              ) : myRecord && myRecord.balance < -0.01 ? (
                <span className="text-red-600 dark:text-red-400">
                  -₹{Math.abs(myRecord.balance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (you owe)
                </span>
              ) : (
                <span className="text-gray-700 dark:text-slate-300">₹0.00 (Settled)</span>
              )}
            </div>
            <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              You paid ₹{(myRecord?.paid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} so far
            </div>
          </div>
        </div>

<<<<<<< HEAD
=======
        {/* Main Full-Size Workspace */}
>>>>>>> 2e5742c0c09ec5b5dbd1205951e97938012931bc
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (7 cols): Expenses List */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4 transition-colors duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Expenses Log</h2>
                <p className="text-xs text-gray-500 dark:text-slate-400">Every bill paid by members on this trip</p>
              </div>

              <button
                onClick={() => setIsExpenseModalOpen(true)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold transition cursor-pointer"
              >
                + Add Expense
              </button>
            </div>

            {expenses.length === 0 ? (
              <div className="text-center py-14">
                <p className="text-sm text-gray-400 dark:text-slate-500">No expenses recorded yet.</p>
                <button
                  onClick={() => setIsExpenseModalOpen(true)}
                  className="mt-3 px-3.5 py-1.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/60 cursor-pointer"
                >
                  + Add First Expense
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-slate-800">
                {expenses.map((exp) => {
                  const resolvedPayer = findMatchingMember(
                    exp.paid_by_name || exp.paidBy || exp.paid_by,
                    members,
                    user,
                    trip?.members
                  );
                  const expId = exp._id || exp.id;
                  return (
                    <div
                      key={expId}
                      className="py-3.5 flex items-center justify-between hover:bg-gray-50/70 dark:hover:bg-slate-800/60 px-2 rounded-lg transition"
                    >
                      <div>
                        <div className="text-sm font-bold text-gray-900 dark:text-white">{exp.description}</div>
                        <div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                          Paid by <strong className="text-gray-800 dark:text-slate-200">{resolvedPayer}</strong>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-base font-bold text-gray-900 dark:text-white text-right">
                          {exp.currency && exp.currency !== 'INR' ? (
                            <span>
                              {Number(exp.original_amount !== undefined ? exp.original_amount : exp.amount).toLocaleString('en-IN')}{' '}
                              {exp.currency}{' '}
                              <span className="text-xs font-semibold text-gray-500 dark:text-slate-400">
<<<<<<< HEAD
                                (₹{Number(exp.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })} INR
                                {exp.conversion_fee > 0 ? ` incl. ₹${Number(exp.conversion_fee).toFixed(2)} fee` : ''})
=======
                                (₹{Number(exp.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })} INR)
>>>>>>> 2e5742c0c09ec5b5dbd1205951e97938012931bc
                              </span>
                            </span>
                          ) : (
                            <span>
                              ₹{Number(exp.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteExpense(expId)}
                          className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
                          title="Delete expense"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column (5 cols): Balances & Settlement Action */}
          <div className="lg:col-span-5 space-y-6">
            {/* 1. Member Balances Breakdown */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-6 shadow-xs transition-colors duration-200">
              <h2 className="text-base font-bold text-gray-900 dark:text-white pb-2 border-b border-gray-200 dark:border-slate-800 mb-3">
                Member Standing
              </h2>

              <div className="space-y-2.5">
                {memberBreakdown.map((m, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-lg border border-gray-200/80 dark:border-slate-700/80 flex items-center justify-between text-xs transition-colors"
                  >
                    <div>
                      <div className="font-bold text-gray-900 dark:text-white text-sm">
                        {m.name} {isCurrentUser(m.name) ? '(You)' : ''}
                      </div>
                      <div className="text-gray-500 dark:text-slate-400">
                        Paid: ₹{m.paid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div className="text-right">
                      {m.balance > 0.01 ? (
                        <span className="font-bold text-green-700 dark:text-emerald-400 bg-green-100/70 dark:bg-emerald-950/60 border border-green-200 dark:border-emerald-800 px-2.5 py-1 rounded-md">
                          +₹{m.balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (gets back)
                        </span>
                      ) : m.balance < -0.01 ? (
                        <span className="font-bold text-red-700 dark:text-red-400 bg-red-100/70 dark:bg-red-950/60 border border-red-200 dark:border-red-800 px-2.5 py-1 rounded-md">
                          -₹{Math.abs(m.balance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (owes)
                        </span>
                      ) : (
                        <span className="text-gray-500 dark:text-slate-400 bg-gray-200/60 dark:bg-slate-700 px-2 py-0.5 rounded font-medium">
                          Settled (₹0)
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Settle Up Card */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-5 shadow-xs transition-colors duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800 mb-3">
                <h2 className="text-base font-bold text-gray-900 dark:text-white">How to Settle Up</h2>
                {pendingSettlements.length > 0 && (
                  <button
                    onClick={handleSettleAll}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold cursor-pointer"
                  >
                    Settle All
                  </button>
                )}
              </div>

              {pendingSettlements.length === 0 ? (
                <div className="py-3 px-4 bg-green-50 dark:bg-emerald-950/40 border border-green-200 dark:border-emerald-800 rounded-lg flex items-center justify-between text-xs">
                  <span className="text-green-700 dark:text-emerald-400 font-semibold">✓ All debts are settled up</span>
                  {completedSettlements.length > 0 && (
                    <button
                      onClick={handleResetSettlements}
                      className="text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 underline text-xs cursor-pointer ml-2"
                    >
                      Reset
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingSettlements.map((s) => (
                    <div
                      key={s.id}
                      className="p-2.5 bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 rounded-lg text-xs flex items-center justify-between transition-colors"
                    >
                      <div className="text-gray-800 dark:text-slate-200">
                        <span><strong>{s.from}</strong> owes <strong>{s.to}</strong></span>
                        <div className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                          ₹{Number(s.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>

                      <button
                        onClick={() => handleSettleSingle(s)}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold cursor-pointer"
                      >
                        Settle
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AddMemberModal
        isOpen={isMemberModalOpen}
        onClose={() => setIsMemberModalOpen(false)}
        tripId={id}
<<<<<<< HEAD
        existingMembers={trip?.members || []}
=======
>>>>>>> 2e5742c0c09ec5b5dbd1205951e97938012931bc
        onMemberAdded={loadTripData}
      />

      <AddExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        tripId={id}
        members={trip?.members && trip.members.length > 0 ? trip.members : members}
        onExpenseAdded={loadTripData}
      />
    </div>
  );
}
