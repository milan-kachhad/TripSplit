

-- 1. Create and select the database
CREATE DATABASE IF NOT EXISTS tripsplit_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE tripsplit_db;

-- 2. Drop existing tables in reverse dependency order if recreating
DROP TABLE IF EXISTS settlements;
DROP TABLE IF EXISTS expense_splits;
DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS trip_members;
DROP TABLE IF EXISTS trips;
DROP TABLE IF EXISTS users;


-- Table 1: users

CREATE TABLE users (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  username VARCHAR(100) UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Table 2: trips

CREATE TABLE trips (
  id VARCHAR(100) PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  description TEXT,
  created_by VARCHAR(100) NOT NULL,
  user_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_created_by (created_by),
  INDEX idx_user_id (user_id),
  CONSTRAINT fk_trips_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Table 3: trip_members

CREATE TABLE trip_members (
  id VARCHAR(100) PRIMARY KEY,
  trip_id VARCHAR(100) NOT NULL,
  user_id VARCHAR(100) NOT NULL,
  name VARCHAR(150),
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_trip_id (trip_id),
  INDEX idx_user_id (user_id),
  UNIQUE KEY uq_trip_member (trip_id, user_id),
  CONSTRAINT fk_trip_members_trip FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
  CONSTRAINT fk_trip_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Table 4: expenses

CREATE TABLE expenses (
  id VARCHAR(100) PRIMARY KEY,
  trip_id VARCHAR(100) NOT NULL,
  user_id VARCHAR(100),
  paid_by VARCHAR(100) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  description VARCHAR(255) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  original_amount DECIMAL(10, 2),
  exchange_rate DECIMAL(10, 4) DEFAULT 1.0000,
  conversion_fee DECIMAL(10, 2) DEFAULT 0.00,
  split_members TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_expenses_trip (trip_id),
  INDEX idx_expenses_paid_by (paid_by),
  CONSTRAINT fk_expenses_trip FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
  CONSTRAINT fk_expenses_paid_by FOREIGN KEY (paid_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Table 5: expense_splits

CREATE TABLE expense_splits (
  id VARCHAR(100) PRIMARY KEY,
  expense_id VARCHAR(100) NOT NULL,
  user_id VARCHAR(100) NOT NULL,
  amount_owed DECIMAL(10, 2) NOT NULL,
  INDEX idx_splits_expense (expense_id),
  INDEX idx_splits_user (user_id),
  CONSTRAINT fk_expense_splits_expense FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
  CONSTRAINT fk_expense_splits_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table 6: settlements

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
