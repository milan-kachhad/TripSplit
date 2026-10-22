import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import pool from '../config/db.js';

/**
 * POST /api/trips
 * Body: { title, description }
 * Inserts trip with created_by = req.user.id. Automatically inserts creator into trip_members.
 */
export const createTrip = async (req, res) => {
  try {
    const { title, description } = req.body;
    const userId = req.user.id;
    const userName = req.user.name || req.user.username;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Trip title is required.' });
    }

    const tripId = 'trip_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex');
    const memberId = 'mem_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex');

    // Insert into trips table (with both created_by and user_id for compatibility)
    await pool.query(
      'INSERT INTO trips (id, created_by, user_id, title, description) VALUES (?, ?, ?, ?, ?)',
      [tripId, userId, userId, title.trim(), description ? description.trim() : '']
    );

    // Automatically insert creator as first trip member
    await pool.query(
      'INSERT INTO trip_members (id, trip_id, user_id, name) VALUES (?, ?, ?, ?)',
      [memberId, tripId, userId, userName]
    );

    const [createdRows] = await pool.query('SELECT * FROM trips WHERE id = ?', [tripId]);
    const newTrip = createdRows[0];

    return res.status(201).json({
      message: 'Trip created successfully.',
      trip: {
        id: newTrip.id,
        _id: newTrip.id,
        title: newTrip.title,
        description: newTrip.description,
        created_by: newTrip.created_by,
        user_id: newTrip.user_id,
        createdAt: newTrip.created_at,
        created_at: newTrip.created_at,
        members: [{ id: userId, name: userName, email: req.user.email }],
      },
      id: newTrip.id,
      title: newTrip.title,
    });
  } catch (error) {
    console.error('Create trip error:', error);
    return res.status(500).json({ message: 'Failed to create trip.', error: error.message });
  }
};

/**
 * Helper to compute trip members, expenses summary, and settlement status
 */
async function computeTripDetails(trip, allUsers = []) {
  const [members] = await pool.query(
    `SELECT tm.id AS member_id, tm.user_id, tm.name, u.email
     FROM trip_members tm
     LEFT JOIN users u ON tm.user_id = u.id
     WHERE tm.trip_id = ?`,
    [trip.id]
  );

  const [expenses] = await pool.query(
    'SELECT amount, paid_by FROM expenses WHERE trip_id = ?',
    [trip.id]
  );

  const [settlements] = await pool.query(
    'SELECT from_member, to_member, amount FROM settlements WHERE trip_id = ?',
    [trip.id]
  );

  const memberList = members.map((m) => ({
    id: m.user_id || m.member_id,
    name: m.name,
    email: m.email || '',
  }));

  const memberNames = Array.from(new Set(memberList.map((m) => m.name).filter(Boolean)));
  const totalSpent = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const perPersonShare = memberNames.length > 0 ? totalSpent / memberNames.length : 0;

  const resolveMemberName = (paidBy) => {
    const raw = String(paidBy || '').trim();
    const u = allUsers.find((x) => x.id === raw || x.username === raw || x.name === raw);
    if (u) {
      const match = memberNames.find(
        (m) =>
          m.toLowerCase() === (u.name || '').toLowerCase() ||
          m.toLowerCase() === (u.username || '').toLowerCase() ||
          (u.username && u.username.startsWith(m.toLowerCase() + '_'))
      );
      if (match) return match;
    }
    const mem = members.find(
      (m) => m.member_id === raw || m.user_id === raw || m.name.toLowerCase() === raw.toLowerCase()
    );
    if (mem) return mem.name;
    return memberNames.find((m) => m.toLowerCase() === raw.toLowerCase()) || raw;
  };

  const paidMap = {};
  memberNames.forEach((m) => {
    paidMap[m] = 0;
  });

  expenses.forEach((e) => {
    const name = resolveMemberName(e.paid_by);
    if (paidMap[name] !== undefined) {
      paidMap[name] += parseFloat(e.amount || 0);
    }
  });

  settlements.forEach((s) => {
    const fromName = resolveMemberName(s.from_member);
    const toName = resolveMemberName(s.to_member);
    const amt = parseFloat(s.amount || 0);
    if (paidMap[fromName] !== undefined) paidMap[fromName] += amt;
    if (paidMap[toName] !== undefined) paidMap[toName] -= amt;
  });

  const balances = memberNames.map((m) => Math.round((paidMap[m] - perPersonShare) * 100) / 100);
  const isSettled = expenses.length > 0 && balances.every((b) => Math.abs(b) < 0.05);

  return {
    id: trip.id,
    _id: trip.id,
    title: trip.title,
    description: trip.description,
    created_by: trip.created_by,
    createdAt: trip.created_at,
    created_at: trip.created_at,
    members: memberList,
    memberCount: memberList.length,
    expensesCount: expenses.length,
    totalSpent,
    isSettled,
    status: isSettled ? 'settled' : 'active',
  };
}

/**
 * GET /api/trips
 * Return all trips where authenticated user is in trip_members (INNER JOIN on trip_members)
 */
export const getTrips = async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await pool.query(
      `SELECT DISTINCT t.id, t.title, t.description, t.created_by, t.created_at
       FROM trips t
       INNER JOIN trip_members tm ON t.id = tm.trip_id
       WHERE tm.user_id = ? OR t.created_by = ?
       ORDER BY t.created_at DESC`,
      [userId, userId]
    );

    const [allUsers] = await pool.query('SELECT id, name, username, email FROM users');
    const tripsWithMembers = await Promise.all(
      rows.map((trip) => computeTripDetails(trip, allUsers))
    );

    return res.json(tripsWithMembers);
  } catch (error) {
    console.error('Get trips error:', error);
    return res.status(500).json({ message: 'Failed to fetch trips.', error: error.message });
  }
};

/**
 * GET /api/trips/:id
 * Verify req.user.id is a member of this trip. Return trip details along with array of all members (id, name, email).
 */
export const getTripById = async (req, res) => {
  try {
    const userId = req.user.id;
    const tripId = req.params.id;

    // Verify req.user.id is a member of this trip or creator
    const [membership] = await pool.query(
      `SELECT tm.id FROM trip_members tm
       WHERE tm.trip_id = ? AND tm.user_id = ?
       UNION
       SELECT t.id FROM trips t WHERE t.id = ? AND t.created_by = ?`,
      [tripId, userId, tripId, userId]
    );

    if (membership.length === 0) {
      return res.status(404).json({ message: 'Trip not found or access denied.' });
    }

    // Get trip details
    const [tripRows] = await pool.query('SELECT * FROM trips WHERE id = ?', [tripId]);
    const trip = tripRows[0];
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found.' });
    }

    // Get members
    const [members] = await pool.query(
      `SELECT tm.id AS member_record_id, COALESCE(tm.user_id, u.id, tm.id) AS id, tm.name, COALESCE(u.email, '') AS email
       FROM trip_members tm
       LEFT JOIN users u ON tm.user_id = u.id
       WHERE tm.trip_id = ?`,
      [tripId]
    );

    // Also fetch expenses and settlements for complete trip workspace
    const [expenses] = await pool.query(
      `SELECT e.*, COALESCE(u.name, u.username, tm.name, e.paid_by) AS paid_by_name
       FROM expenses e
       LEFT JOIN users u ON e.paid_by = u.id OR e.paid_by = u.username
       LEFT JOIN trip_members tm ON (e.paid_by = tm.user_id OR e.paid_by = tm.name OR e.paid_by = tm.id) AND tm.trip_id = e.trip_id
       WHERE e.trip_id = ? ORDER BY e.created_at DESC`,
      [tripId]
    );

    const [settlements] = await pool.query(
      'SELECT * FROM settlements WHERE trip_id = ? ORDER BY created_at DESC',
      [tripId]
    );

    const formattedExpenses = expenses.map((e) => ({
      _id: e.id,
      id: e.id,
      description: e.description,
      amount: Number(e.amount),
      original_amount: e.original_amount !== null && e.original_amount !== undefined ? Number(e.original_amount) : Number(e.amount),
      currency: e.currency || 'INR',
      exchange_rate: Number(e.exchange_rate || 1.0),
      paidBy: e.paid_by,
      paid_by: e.paid_by,
      paid_by_name: e.paid_by_name,
      createdAt: e.created_at,
    }));

    const formattedSettlements = settlements.map((s) => ({
      id: s.id,
      from: s.from_member,
      to: s.to_member,
      amount: Number(s.amount),
      date: s.date,
    }));

    const tripData = {
      id: trip.id,
      _id: trip.id,
      title: trip.title,
      description: trip.description,
      created_by: trip.created_by,
      createdAt: trip.created_at,
      created_at: trip.created_at,
      members: members.map((m) => ({
        id: m.id,
        name: m.name,
        email: m.email,
      })),
      expenses: formattedExpenses,
      settlements: formattedSettlements,
    };

    return res.json({ trip: tripData, ...tripData });
  } catch (error) {
    console.error('Get trip by ID error:', error);
    return res.status(500).json({ message: 'Failed to retrieve trip details.', error: error.message });
  }
};

/**
 * POST /api/trips/:id/members
 * Request body: { email }
 * Look up user by email in users table.
 * If not found, return 404 User not found.
 * Check if already in trip_members for this trip; if so, return 400 Already a member.
 * Otherwise, insert into trip_members and return added user's details.
 */
export const addTripMember = async (req, res) => {
  try {
    const tripId = req.params.id;
    const { email, name } = req.body;

    const input = (email || name || '').trim();
    if (!input) {
      return res.status(400).json({ message: 'Member email or name is required.' });
    }

    let user = null;

    // 1. Look up user by email, username, or name
    const [userRows] = await pool.query(
      'SELECT id, name, username, email FROM users WHERE LOWER(email) = ? OR LOWER(username) = ? OR LOWER(name) = ?',
      [input.toLowerCase(), input.toLowerCase(), input.toLowerCase()]
    );

    user = userRows[0];

    // 2. If user does not exist yet in users table, create a member user profile
    // to satisfy the foreign key constraint: fk_trip_members_user (user_id -> users.id)
    if (!user) {
      const newUserId = 'usr_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex');
      const cleanBase = (input.includes('@') ? input.split('@')[0] : input)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
      const baseName = cleanBase || 'user';
      let finalUsername = `${baseName}_123`;

      // Check if username already exists in users table, if so make it uniquely distinguished
      const [existingUserMatches] = await pool.query(
        'SELECT id FROM users WHERE LOWER(username) = LOWER(?)',
        [finalUsername]
      );
      if (existingUserMatches.length > 0) {
        finalUsername = `${baseName}_123_${Date.now().toString().slice(-4)}`;
      }

      const safeEmail = input.includes('@') ? input.toLowerCase() : `${finalUsername}@tripsplit.local`;
      const defaultHashedPassword = await bcrypt.hash('password123', 10);

      await pool.query(
        'INSERT INTO users (id, name, username, email, password, password_hash) VALUES (?, ?, ?, ?, ?, ?)',
        [newUserId, input, finalUsername, safeEmail, defaultHashedPassword, defaultHashedPassword]
      );

      user = { id: newUserId, name: input, username: finalUsername, email: safeEmail };
    }

    const memberUserId = user.id;
    const memberName = user.name || user.username || input;
    const memberEmail = user.email || '';

    // 3. Check if already in trip_members for this trip
    const [existingMembers] = await pool.query(
      'SELECT id FROM trip_members WHERE trip_id = ? AND (user_id = ? OR LOWER(name) = ?)',
      [tripId, memberUserId, memberName.toLowerCase()]
    );

    if (existingMembers.length > 0) {
      return res.status(400).json({ message: 'Already a member.' });
    }

    const memberId = 'mem_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex');

    await pool.query(
      'INSERT INTO trip_members (id, trip_id, user_id, name) VALUES (?, ?, ?, ?)',
      [memberId, tripId, memberUserId, memberName]
    );

    return res.status(201).json({
      message: 'Member added successfully.',
      member: {
        id: memberUserId,
        name: memberName,
        email: memberEmail,
      },
      user: {
        id: memberUserId,
        name: memberName,
        email: memberEmail,
      },
    });
  } catch (error) {
    console.error('Add trip member error:', error);
    return res.status(500).json({ message: 'Failed to add member to trip.', error: error.message });
  }
};

/**
 * GET /api/dashboard
 * Helper for dashboard metrics
 */
export const getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const [trips] = await pool.query(
      `SELECT DISTINCT t.id, t.title, t.description, t.created_by, t.created_at
       FROM trips t
       LEFT JOIN trip_members tm ON t.id = tm.trip_id
       WHERE tm.user_id = ? OR t.created_by = ? OR t.user_id = ?
       ORDER BY t.created_at DESC`,
      [userId, userId, userId]
    );

    const [allUsers] = await pool.query('SELECT id, name, username, email FROM users');
    const tripsWithDetails = await Promise.all(
      trips.map((trip) => computeTripDetails(trip, allUsers))
    );

    const [stats] = await pool.query(
      `SELECT COUNT(DISTINCT e.id) as expensesCount, COALESCE(SUM(e.amount), 0) as totalSpent
       FROM expenses e
       INNER JOIN trips t ON e.trip_id = t.id
       LEFT JOIN trip_members tm ON t.id = tm.trip_id
       WHERE tm.user_id = ? OR t.created_by = ?`,
      [userId, userId]
    );

    return res.json({
      username: req.user.name || req.user.username,
      trips: tripsWithDetails,
      tripsCount: trips.length,
      expensesCount: stats[0]?.expensesCount || 0,
      totalSpent: Number(stats[0]?.totalSpent || 0),
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return res.status(500).json({ message: 'Failed to load dashboard data.' });
  }
};
