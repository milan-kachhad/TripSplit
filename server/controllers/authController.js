import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import pool from '../config/db.js';
import { JWT_SECRET } from '../middleware/auth.js';

export const register = async (req, res) => {
  try {
    const { name, username, email, password } = req.body;

<<<<<<< HEAD
    const trimmedEmail = (email || '').trim().toLowerCase();

    if (!trimmedEmail || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail) || trimmedEmail.length > 100) {
      return res.status(400).json({ message: 'Please provide a valid email address.' });
    }

    // Derive username from email context before '@'
    const emailPrefix = trimmedEmail.includes('@')
      ? trimmedEmail.split('@')[0]
      : trimmedEmail;
    const cleanEmailPrefix = emailPrefix.toLowerCase().replace(/[^a-z0-9_.-]/g, '');

    // Allow explicitly supplied username or fallback to email prefix
    let finalUsername = (username ? String(username).trim() : cleanEmailPrefix)
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9_.-]/g, '');

    if (!finalUsername) {
      finalUsername = cleanEmailPrefix || ('user_' + Date.now().toString().slice(-4));
    }

    // Ensure valid length (between 2 and 50 characters)
    if (finalUsername.length < 2) {
      finalUsername = `${finalUsername}_${Date.now().toString().slice(-3)}`;
    }
    if (finalUsername.length > 50) {
      finalUsername = finalUsername.slice(0, 50);
    }

    // Security: Check that username does not contain spaces
    if (/\s/.test(finalUsername)) {
      return res.status(400).json({ message: 'Username cannot contain spaces.' });
    }

=======
    const trimmedName = (name || username || '').trim();
    const rawUsername = (username || '').trim();
    const trimmedEmail = (email || '').trim().toLowerCase();

    if (!trimmedName || !trimmedEmail || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    // Security: Check that username does not contain spaces
    if (/\s/.test(username || '')) {
      return res.status(400).json({ message: 'Username cannot contain spaces.' });
    }

    const finalUsername = rawUsername || trimmedName.toLowerCase().replace(/[^a-z0-9_.-]/g, '');

    // Username validation: 3-30 chars, alphanumeric + underscores + dashes + dots, no spaces
    if (finalUsername.length < 3 || finalUsername.length > 30) {
      return res.status(400).json({ message: 'Username must be between 3 and 30 characters long.' });
    }

>>>>>>> 2e5742c0c09ec5b5dbd1205951e97938012931bc
    const usernameRegex = /^[a-zA-Z0-9_.-]+$/;
    if (!usernameRegex.test(finalUsername)) {
      return res.status(400).json({
        message: 'Username can only contain alphanumeric characters, underscores, dashes, and periods (no spaces allowed).',
      });
    }

<<<<<<< HEAD
    const trimmedName = (name || finalUsername).trim();
=======
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail) || trimmedEmail.length > 100) {
      return res.status(400).json({ message: 'Please provide a valid email address.' });
    }
>>>>>>> 2e5742c0c09ec5b5dbd1205951e97938012931bc

    // Password security: 6 to 128 characters
    if (typeof password !== 'string' || password.length < 6 || password.length > 128) {
      return res.status(400).json({ message: 'Password must be between 6 and 128 characters long.' });
    }

    // Check if email already exists in MySQL
    const [emailMatches] = await pool.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER(?)',
      [trimmedEmail]
    );

    if (emailMatches.length > 0) {
      return res.status(400).json({ message: 'Email already registered.' });
    }

<<<<<<< HEAD
    // Verify username uniqueness - auto-disambiguate with numeric suffix if already taken
=======
    // Verify username uniqueness
>>>>>>> 2e5742c0c09ec5b5dbd1205951e97938012931bc
    const [userMatches] = await pool.query(
      'SELECT id FROM users WHERE LOWER(username) = LOWER(?)',
      [finalUsername]
    );
    if (userMatches.length > 0) {
<<<<<<< HEAD
      finalUsername = `${finalUsername}_${Math.floor(100 + Math.random() * 900)}`;
=======
      return res.status(400).json({ message: 'Username already exists.' });
>>>>>>> 2e5742c0c09ec5b5dbd1205951e97938012931bc
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = 'usr_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex');

    await pool.query(
      'INSERT INTO users (id, name, username, email, password, password_hash) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, trimmedName, finalUsername, trimmedEmail, hashedPassword, hashedPassword]
    );

    // Generate JWT signed with user id and email
    const token = jwt.sign(
      { id: userId, email: trimmedEmail },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      message: 'User registered successfully.',
      token,
      user: {
        id: userId,
        name: trimmedName,
        username: finalUsername,
        email: trimmedEmail,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Server error during registration.', error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, identifier, password } = req.body;
    const loginIdentifier = (email || identifier || '').trim().toLowerCase();

    if (!loginIdentifier || !password) {
      return res.status(400).json({ message: 'Please provide email and password.' });
    }

    // Look up user by email or username
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE LOWER(email) = ? OR LOWER(username) = ?',
      [loginIdentifier, loginIdentifier]
    );

    const user = rows[0];
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials. User not found.' });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password || user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials. Incorrect password.' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        name: user.name || user.username,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Server error during login.', error: error.message });
  }
};

export const getMe = async (req, res) => {
  return res.json({
    user: req.user,
  });
};
