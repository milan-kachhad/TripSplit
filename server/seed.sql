-- ==============================================================
-- TripSplit Database Seed Data DML Script
-- Target Database: tripsplit_db
-- ==============================================================

USE tripsplit_db;

-- 1. Insert 3 Users ('Rahul', 'Sarthak', 'Jay')
-- Password hash corresponds to 'password123' hashed with bcrypt
INSERT INTO users (id, name, username, email, password, password_hash, created_at)
VALUES 
  (1, 'Rahul', 'rahul', 'rahul@example.com', '$2b$10$7br1xGy8idYKFW8SRefKi.GFiFcOdTX2x7Mj4OeQ8JsZtcWJ31fCe', '$2b$10$7br1xGy8idYKFW8SRefKi.GFiFcOdTX2x7Mj4OeQ8JsZtcWJ31fCe', NOW()),
  (2, 'Sarthak', 'sarthak', 'sarthak@example.com', '$2b$10$7br1xGy8idYKFW8SRefKi.GFiFcOdTX2x7Mj4OeQ8JsZtcWJ31fCe', '$2b$10$7br1xGy8idYKFW8SRefKi.GFiFcOdTX2x7Mj4OeQ8JsZtcWJ31fCe', NOW()),
  (3, 'Jay', 'jay', 'jay@example.com', '$2b$10$7br1xGy8idYKFW8SRefKi.GFiFcOdTX2x7Mj4OeQ8JsZtcWJ31fCe', '$2b$10$7br1xGy8idYKFW8SRefKi.GFiFcOdTX2x7Mj4OeQ8JsZtcWJ31fCe', NOW());

-- 2. Insert 1 Trip ('Goa Weekend 2026' created by Rahul)
INSERT INTO trips (id, title, description, created_by, user_id, created_at)
VALUES 
  (1, 'Goa Weekend 2026', 'Weekend beach getaway with friends', 1, '1', NOW());

-- 3. Add all 3 users (Rahul, Sarthak, Jay) to trip_members
INSERT INTO trip_members (id, trip_id, user_id, name, joined_at)
VALUES 
  (1, 1, 1, 'Rahul', NOW()),
  (2, 1, 2, 'Sarthak', NOW()),
  (3, 1, 3, 'Jay', NOW());

-- 4. Insert Expense 1: Rahul pays ₹3000 for 'Hotel Booking'
INSERT INTO expenses (id, trip_id, user_id, paid_by, amount, original_amount, currency, exchange_rate, description, created_at)
VALUES 
  (1, 1, 1, 1, 3000.00, 3000.00, 'INR', 1.0000, 'Hotel Booking', NOW());

-- Split Expense 1 equally among all 3 (₹1000 each)
INSERT INTO expense_splits (id, expense_id, user_id, amount_owed)
VALUES 
  (1, 1, 1, 1000.00),
  (2, 1, 2, 1000.00),
  (3, 1, 3, 1000.00);

-- 5. Insert Expense 2: Sarthak pays ₹900 for 'Dinner'
INSERT INTO expenses (id, trip_id, user_id, paid_by, amount, original_amount, currency, exchange_rate, description, created_at)
VALUES 
  (2, 1, 2, 2, 900.00, 900.00, 'INR', 1.0000, 'Dinner', NOW());

-- Split Expense 2 only between Sarthak and Jay (₹450 each)
INSERT INTO expense_splits (id, expense_id, user_id, amount_owed)
VALUES 
  (4, 2, 2, 450.00),
  (5, 2, 3, 450.00);
