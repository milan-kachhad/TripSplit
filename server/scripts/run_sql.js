import fs from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const socketExists = process.env.DB_SOCKET && fs.existsSync(process.env.DB_SOCKET);

async function runSqlFile() {
  console.log('--- Executing schema.sql and seed.sql into MySQL ---');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
    ...(socketExists ? { socketPath: process.env.DB_SOCKET } : {}),
  });

  try {
    const schemaSql = fs.readFileSync(path.resolve('server/schema.sql'), 'utf-8');
    console.log('1. Executing server/schema.sql...');
    await connection.query(schemaSql);
    console.log('✓ schema.sql executed successfully! Database tripsplit_db & 5 tables created.');

    const seedSql = fs.readFileSync(path.resolve('server/seed.sql'), 'utf-8');
    console.log('2. Executing server/seed.sql...');
    await connection.query(seedSql);
    console.log('✓ seed.sql executed successfully! Seed data inserted.');

    // Verify seeded data
    const [users] = await connection.query('SELECT id, name, email FROM tripsplit_db.users');
    console.log('\nVerified Users:', users);

    const [trips] = await connection.query('SELECT * FROM tripsplit_db.trips');
    console.log('Verified Trips:', trips);

    const [members] = await connection.query('SELECT * FROM tripsplit_db.trip_members');
    console.log('Verified Trip Members:', members);

    const [expenses] = await connection.query('SELECT * FROM tripsplit_db.expenses');
    console.log('Verified Expenses:', expenses);

    const [splits] = await connection.query('SELECT * FROM tripsplit_db.expense_splits');
    console.log('Verified Expense Splits:', splits);

    console.log('\n--- ALL DDL AND DML QUERIES VERIFIED SUCCESSFULLY ---');
  } catch (err) {
    console.error('SQL Execution failed:', err);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runSqlFile();
