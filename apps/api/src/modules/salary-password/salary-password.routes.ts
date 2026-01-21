import { Router } from 'express';
import { salaryPasswordController } from './salary-password.controller';
import { authenticateToken } from '../auth/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.post('/', salaryPasswordController.create.bind(salaryPasswordController));
router.get('/', salaryPasswordController.findAll.bind(salaryPasswordController));
router.delete('/:id', salaryPasswordController.delete.bind(salaryPasswordController));

export default router;
