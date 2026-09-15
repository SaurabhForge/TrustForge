import { Router } from 'express';
import { listAuditEvents, getAuditEvent, verifyAuditIntegrity } from './audit.controller';

const router = Router();

router.get('/', listAuditEvents);
router.get('/verify', verifyAuditIntegrity);
router.post('/verify', verifyAuditIntegrity);
router.get('/merkle/verify', verifyAuditIntegrity);
router.get('/:id', getAuditEvent);

export default router;
