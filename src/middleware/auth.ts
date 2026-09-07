import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { DecodedIdToken } from 'firebase-admin/auth';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
}

/**
 * Validates whether a token string has the syntactic structure of a Firebase JWT (3 dot-separated segments).
 */
function isValidJwt(token: string | undefined): boolean {
  if (!token || typeof token !== 'string') return false;
  const trimmed = token.trim();
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null' || trimmed === '[object Object]') {
    return false;
  }
  const parts = trimmed.split('.');
  return parts.length === 3 && parts.every(part => part.length > 0);
}

/**
 * Strict authentication middleware: Requires a valid Firebase ID token.
 */
export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing Authorization header' });
  }

  const token = authHeader.substring(7).trim();
  if (!isValidJwt(token)) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token format' });
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error: any) {
    console.warn('Firebase ID token verification failed:', error?.message || error);
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
};

/**
 * Optional authentication middleware: Decodes Firebase ID token if provided,
 * but allows unauthenticated guest access to public dashboard data if absent.
 */
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.substring(7).trim();
  if (!isValidJwt(token)) {
    return next();
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
  } catch (error: any) {
    // Non-fatal: continue as guest
    console.warn('Optional token verification skipped:', error?.message || error);
  }

  next();
};

