import { Router } from 'express';
import { verifyToken } from '../middleware/auth';
import * as controller from '../controllers/analyticsController';

const router = Router();

router.get('/overview', verifyToken, controller.overview);
router.get('/dashboard-summary', verifyToken, controller.getDashboardSummary);

export default router;
