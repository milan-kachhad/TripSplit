import pool from '../config/db.js';

export const getUsers = async (req, res) => {
  try {
    const { search } = req.query;
    let query = 'SELECT id, name, username, email FROM users';
    const params = [];

    if (search && search.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      query += ' WHERE LOWER(username) LIKE ? OR LOWER(email) LIKE ? OR LOWER(name) LIKE ?';
      params.push(term, term, term);
    }

    query += ' ORDER BY username ASC LIMIT 100';

    const [users] = await pool.query(query, params);

    return res.status(200).json({
      users: users.map((u) => ({
        id: u.id,
        name: u.name || u.username,
        username: u.username,
        email: u.email,
      })),
    });
  } catch (error) {
    console.error('Get users error:', error);
    return res.status(500).json({ message: 'Failed to fetch users.', error: error.message });
  }
};
