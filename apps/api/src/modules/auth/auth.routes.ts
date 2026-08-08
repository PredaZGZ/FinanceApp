import { Router } from 'express';
import { authController } from './auth.controller';
import { authenticateToken } from './auth.middleware';

const router = Router();

router.post('/register', authController.register.bind(authController));
router.post('/login', authController.login.bind(authController));
router.post('/logout', authController.logout.bind(authController));
router.get('/me', authenticateToken, authController.getMe.bind(authController));
router.patch('/profile', authenticateToken, authController.updateProfile.bind(authController));
router.post('/change-password', authenticateToken, authController.changePassword.bind(authController));

export default router;
