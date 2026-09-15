import { Router } from 'express';
import { getOverview, getSecurity, getBlockchainStats } from './dashboard.controller';

const router = Router();

router.get('/overview', getOverview);
router.get('/security', getSecurity);
router.get('/blockchain', getBlockchainStats);   // Live blockchain stats

export default router;
