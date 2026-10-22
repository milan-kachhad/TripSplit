import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey';

export const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if user exists in database or attach decoded payload
    const [rows] = await pool.query('SELECT id, name, username, email FROM users WHERE id = ?', [decoded.id]);
    const user = rows[0];

    if (!user) {
      return res.status(401).json({ message: 'Unauthorized: User not found' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name || user.username,
      username: user.username,
    };

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Unauthorized: Invalid or expired token', error: error.message });
  }
};

export default authMiddleware;
