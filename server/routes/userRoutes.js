import express from 'express';
import {
  registerAnonymousUser,
  registerUser,
  loginUser,
  getUserProfile,
  updateUserBookAccess,
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/anonymous', registerAnonymousUser);
router.post('/signup', registerUser);
router.post('/login', loginUser);
router.get('/profile', protect, getUserProfile);
router.put('/access', protect, updateUserBookAccess);

export default router;
