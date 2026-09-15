import { Router } from 'express';
import { getSystemHealth, getSystemMetrics, exportBackup, restoreBackup } from './system.controller';
import { requireAuth, requireRole } from '../../middleware/auth';

const router = Router();

router.get('/health', getSystemHealth);
router.get('/metrics', getSystemMetrics);

// Protected administrative backup operations
router.get('/backup', requireAuth, requireRole('Super Admin', 'Admin', 'Chief Compliance Auditor'), exportBackup);
router.post('/restore', requireAuth, requireRole('Super Admin', 'Admin'), restoreBackup);

export default router;
