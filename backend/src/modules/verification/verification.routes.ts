import { Router } from 'express';
import { listVerifications, createVerification, unifiedVerify } from './verification.controller';

const router = Router();

router.get('/', listVerifications);
router.post('/', createVerification);
router.get('/:identifier', unifiedVerify);

export default router;
