# TripSplit — Shared Expense & Trip Settlement System

> **Semester 5 Mini-Project** | Full-Stack Web Application (React 19 + Node.js + Express + MySQL)

TripSplit is a modern travel expense tracker and debt settlement engine designed to calculate fair splits, convert multiple currencies, and minimize reimbursement transactions using a greedy two-pointer algorithm.

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js (v18+)
- MySQL Server (running on port 3306)

### 2. Configure `.env`
Ensure `.env` exists in the root directory:
```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=tripsplit_db
DB_PORT=3306
JWT_SECRET=tripsplit_super_secret_jwt_key_2026
```

### 3. Install & Start Application
```bash
npm install
npm run dev
```
- **Backend API**: `http://localhost:5000`
- **Frontend App**: `http://localhost:5173`

---

## 📚 Complete Technical Documentation
For the complete, in-depth architectural breakdown, database schema diagrams, algorithm proofs, security implementations, and scripted **Faculty Presentation & Viva Guide**, please refer to:

👉 **[PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md)**

---

## 🌟 Key Features
- **Stateless JWT Authentication**: Secure signup and signin with username space prevention and bcrypt hashing.
- **Trip Workspaces**: Create independent trip ledgers with dynamic member management.
- **Flexible "Paid By" Logging**: Authenticated travelers can log expenses paid by themselves or any other travel companion.
- **Live Multi-Currency Engine**: Log expenses in USD, EUR, THB, AED, GBP, or INR with automatic standardization.
- **Minimal Debt Settlement Engine**: Solves complex debts using an $O(N \log N)$ two-pointer greedy algorithm.
- **One-Click Settlement**: Clear individual debts or settle all pending balances in a single action.
