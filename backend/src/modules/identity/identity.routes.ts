import { Router } from 'express';
import {
  listIdentities,
  getIdentity,
  getDidDocument,
  createIdentity,
  revokeIdentity,
  reactivateIdentity,
  verifyIdentity,
  rotateKey,
  issueVC,
} from './identity.controller';
import { requireAuth } from '../../middleware/auth';

const router = Router();

router.get('/', listIdentities);
router.get('/:id', getIdentity);
router.get('/:id/did-document', getDidDocument);   // W3C DID Document
router.post('/:id/verify', verifyIdentity);        // Public verification

// Protected mutation endpoints
router.post('/', requireAuth, createIdentity);
router.post('/:id/revoke', requireAuth, revokeIdentity);
router.post('/:id/reactivate', requireAuth, reactivateIdentity);
router.post('/:id/rotate-key', requireAuth, rotateKey);
router.post('/:id/issue-vc', requireAuth, issueVC);

export default router;
