import express from 'express';
import { getUsers } from '../controllers/userController.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware);
router.get('/', getUsers);

export default router;
