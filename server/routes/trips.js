import express from 'express';
import {
  createTrip,
  getTrips,
  getTripById,
  addTripMember,
} from '../controllers/tripController.js';
import {
  getBalances,
  recordSettlement,
  resetSettlements,
} from '../controllers/expenseController.js';
import expenseRoutes from './expenses.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Protect all trip routes with authMiddleware
router.use(authMiddleware);

// Trip routes
router.post('/', createTrip);
router.get('/', getTrips);
router.get('/:id', getTripById);
router.post('/:id/members', addTripMember);

// Mount expenses subroutes: /api/trips/:tripId/expenses
router.use('/:tripId/expenses', expenseRoutes);

// Direct mount for balances: /api/trips/:tripId/balances
router.get('/:tripId/balances', getBalances);

// Settle endpoints: /api/trips/:id/settle and /api/trips/:tripId/settle
router.post('/:id/settle', recordSettlement);
router.delete('/:id/settle', resetSettlements);
router.post('/:tripId/settle', recordSettlement);
router.delete('/:tripId/settle', resetSettlements);

export default router;
