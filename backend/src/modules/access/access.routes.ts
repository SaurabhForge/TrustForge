import { Router } from 'express';
import { getRoles, getPermissions, assignRole, revokeRole, createRole, signQuorumRequest, rejectQuorumRequest, getCedarPolicies, evaluateCedarPolicy } from './access.controller';
import { requireAuth } from '../../middleware/auth';

const router = Router();

router.get('/roles', getRoles);
router.get('/permissions', getPermissions);

// AWS Open-Source Cedar Authorization Engine Endpoints
router.get('/cedar/policies', getCedarPolicies);
router.post('/cedar/evaluate', evaluateCedarPolicy);

// Protected mutation endpoints
router.post('/roles', requireAuth, createRole);
router.post('/roles/assign', requireAuth, assignRole);
router.post('/roles/revoke', requireAuth, revokeRole);
router.post('/quorum/:id/sign', requireAuth, signQuorumRequest);
router.post('/quorum/:id/reject', requireAuth, rejectQuorumRequest);

export default router;
