import { Router } from 'express';
import {
  listAssets,
  getAsset,
  getVCDocument,
  createAsset,
  mintAsset,
  allocateAsset,
  transferAsset,
  revokeAsset,
  getAssetHistory,
} from './assets.controller';
import { requireAuth } from '../../middleware/auth';

const router = Router();

router.get('/', listAssets);
router.get('/:id', getAsset);
router.get('/:id/vc', getVCDocument);          // W3C Verifiable Credential
router.get('/:id/history', getAssetHistory);

// Protected mutation endpoints
router.post('/', requireAuth, createAsset);
router.post('/:id/mint', requireAuth, mintAsset);
router.post('/:id/allocate', requireAuth, allocateAsset);
router.post('/:id/transfer', requireAuth, transferAsset);
router.post('/:id/revoke', requireAuth, revokeAsset);

export default router;
