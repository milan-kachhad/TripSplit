import express from 'express';
import {
  addExpense,
  getExpenses,
  deleteExpense,
  getBalances,
  recordSettlement,
  resetSettlements,
} from '../controllers/expenseController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router({ mergeParams: true });

// All expense routes require auth
router.use(authMiddleware);

// Expense routes
router.post('/', addExpense);
router.get('/', getExpenses);
router.delete('/:expenseId', deleteExpense);

// Balances and settlements (under trip scope)
router.get('/balances', getBalances);
router.post('/settle', recordSettlement);
router.delete('/settle', resetSettlements);

export default router;
