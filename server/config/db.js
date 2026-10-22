import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'node:fs';

dotenv.config();

const socketExists = process.env.DB_SOCKET && fs.existsSync(process.env.DB_SOCKET);

export const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'tripsplit_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

if (socketExists) {
  poolConfig.socketPath = process.env.DB_SOCKET;
}

const pool = mysql.createPool(poolConfig);

/**
 * Ping function that logs a clear console error if MySQL fails to connect on startup
 */
export async function ping() {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    console.log(`[Database] MySQL connected successfully to "${poolConfig.database}" at ${poolConfig.host}:${poolConfig.port}`);
    return true;
  } catch (error) {
    console.error(`[Database Error] Failed to connect to MySQL on startup (${poolConfig.host}:${poolConfig.port}): ${error.message}`);
    return false;
  }
}

/**
 * Ensures schema, tables, and columns exist for TripSplit
 */
export async function initDatabase() {
  try {
    // 1. Ensure database exists
    const rootConnection = await mysql.createConnection({
      host: poolConfig.host,
      port: poolConfig.port,
      user: poolConfig.user,
      password: poolConfig.password,
      ...(socketExists ? { socketPath: poolConfig.socketPath } : {}),
    });

    await rootConnection.query(`CREATE DATABASE IF NOT EXISTS \`${poolConfig.database}\`;`);
    await rootConnection.end();

    // 2. Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(150),
        username VARCHAR(100) NOT NULL UNIQUE,
        email VARCHAR(150) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Ensure 'name' column exists in users
    try {
      const [cols] = await pool.query('SHOW COLUMNS FROM users LIKE "name"');
      if (cols.length === 0) {
        await pool.query('ALTER TABLE users ADD COLUMN name VARCHAR(150) AFTER id');
        await pool.query('UPDATE users SET name = username WHERE name IS NULL');
      }
    } catch (e) {
      console.warn('Could not check name column in users:', e.message);
    }

    // 3. Trips table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS trips (
        id VARCHAR(100) PRIMARY KEY,
        created_by VARCHAR(100) NOT NULL,
        user_id VARCHAR(100),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_created_by (created_by),
        INDEX idx_user_id (user_id),
        CONSTRAINT fk_trips_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Ensure 'created_by' column exists in trips
    try {
      const [cols] = await pool.query('SHOW COLUMNS FROM trips LIKE "created_by"');
      if (cols.length === 0) {
        await pool.query('ALTER TABLE trips ADD COLUMN created_by VARCHAR(100) AFTER id');
        await pool.query('UPDATE trips SET created_by = user_id WHERE created_by IS NULL');
      }
    } catch (e) {
      console.warn('Could not check created_by column in trips:', e.message);
    }

    // 4. Trip Members table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS trip_members (
        id VARCHAR(100) PRIMARY KEY,
        trip_id VARCHAR(100) NOT NULL,
        user_id VARCHAR(100),
        name VARCHAR(150) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_trip_id (trip_id),
        INDEX idx_member_user_id (user_id),
        CONSTRAINT fk_members_trip FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Ensure 'user_id' column exists in trip_members
    try {
      const [cols] = await pool.query('SHOW COLUMNS FROM trip_members LIKE "user_id"');
      if (cols.length === 0) {
        await pool.query('ALTER TABLE trip_members ADD COLUMN user_id VARCHAR(100) AFTER trip_id');
      }
    } catch (e) {
      console.warn('Could not check user_id column in trip_members:', e.message);
    }

    // 5. Expenses table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id VARCHAR(100) PRIMARY KEY,
        trip_id VARCHAR(100) NOT NULL,
        user_id VARCHAR(100),
        paid_by VARCHAR(150) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        description VARCHAR(255) NOT NULL,
        split_members TEXT,
        currency VARCHAR(3) DEFAULT 'INR',
        original_amount DECIMAL(10, 2),
        exchange_rate DECIMAL(10, 4) DEFAULT 1.0000,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_expenses_trip (trip_id),
        INDEX idx_expenses_user (user_id),
        INDEX idx_expenses_paid_by (paid_by),
        CONSTRAINT fk_expenses_trip FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Ensure multi-currency columns exist in expenses
    try {
      const [curCols] = await pool.query('SHOW COLUMNS FROM expenses LIKE "currency"');
      if (curCols.length === 0) {
        await pool.query("ALTER TABLE expenses ADD COLUMN currency VARCHAR(3) DEFAULT 'INR'");
        await pool.query("ALTER TABLE expenses ADD COLUMN original_amount DECIMAL(10, 2)");
        await pool.query("ALTER TABLE expenses ADD COLUMN exchange_rate DECIMAL(10, 4) DEFAULT 1.0000");
        await pool.query("UPDATE expenses SET original_amount = amount WHERE original_amount IS NULL");
      }
    } catch (e) {
      console.warn('Could not check multi-currency columns in expenses:', e.message);
    }

    // 6. Expense Splits table (Prompt 4 & 5)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS expense_splits (
        id VARCHAR(100) PRIMARY KEY,
        expense_id VARCHAR(100) NOT NULL,
        user_id VARCHAR(100) NOT NULL,
        amount_owed DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_splits_expense (expense_id),
        INDEX idx_splits_user (user_id),
        CONSTRAINT fk_splits_expense FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 7. Settlements table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS settlements (
        id VARCHAR(100) PRIMARY KEY,
        trip_id VARCHAR(100) NOT NULL,
        from_member VARCHAR(150) NOT NULL,
        to_member VARCHAR(150) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        date VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_settle_trip (trip_id),
        CONSTRAINT fk_settle_trip FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log(`[Database] All tables and schemas initialized successfully.`);
  } catch (err) {
    console.error('[Database Error] Failed to initialize database schema:', err);
    throw err;
  }
}

export default pool;
