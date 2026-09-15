import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requestNonce, verifySignature, logout, getMe, personaLogin } from './auth.controller';
import { requireAuth } from '../../middleware/auth';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // allow up to 60 auth requests per 15 min
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many requests' } },
});

router.post('/nonce', authLimiter, requestNonce);
router.post('/verify', authLimiter, verifySignature);
router.post('/persona-login', authLimiter, personaLogin);
router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, getMe);

export default router;
