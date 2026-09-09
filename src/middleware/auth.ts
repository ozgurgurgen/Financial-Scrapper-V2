import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { DecodedIdToken } from 'firebase-admin/auth';
import { apiTelemetryService, ApiKeyRecord } from '../services/ApiTelemetryService.ts';

export interface AuthRequest extends Request {
  user?: DecodedIdToken | { uid: string; email?: string; name?: string; tier?: string; isApiKey?: boolean };
  apiKeyRecord?: ApiKeyRecord;
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
 * Extracts raw API key or Bearer token from headers/query
 */
function extractAuthToken(req: Request): { type: 'API_KEY' | 'BEARER_JWT' | 'NONE'; token: string } {
  // 1. Check X-API-Key header
  const xApiKey = req.headers['x-api-key'];
  if (xApiKey && typeof xApiKey === 'string' && xApiKey.trim()) {
    return { type: 'API_KEY', token: xApiKey.trim() };
  }

  // 2. Check query string api_key
  const queryApiKey = req.query.api_key;
  if (queryApiKey && typeof queryApiKey === 'string' && queryApiKey.trim()) {
    return { type: 'API_KEY', token: queryApiKey.trim() };
  }

  // 3. Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (!token) return { type: 'NONE', token: '' };
    if (isValidJwt(token)) {
      return { type: 'BEARER_JWT', token };
    }
    // Might be an API key passed via Bearer token
    return { type: 'API_KEY', token };
  }

  return { type: 'NONE', token: '' };
}

/**
 * Flexible & Dual Authentication Middleware:
 * Accepts EITHER a valid API Key (X-API-Key / Bearer <API_KEY>) OR a valid Firebase JWT token (Bearer <JWT>).
 */
export const requireApiKeyOrAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const extracted = extractAuthToken(req);

  if (extracted.type === 'NONE' || !extracted.token) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Yetkisiz erişim. Geçerli bir X-API-Key veya Authorization: Bearer <TOKEN> başlığı gereklidir.',
      supportedMethods: [
        { header: 'X-API-Key', example: 'fin_live_master_2026_a8f9c2d1e4' },
        { header: 'Authorization', example: 'Bearer fin_live_master_2026_a8f9c2d1e4' },
        { header: 'Authorization', example: 'Bearer <FIREBASE_JWT_TOKEN>' },
        { query: '?api_key=<API_KEY>', example: '?api_key=fin_live_master_2026_a8f9c2d1e4' }
      ]
    });
  }

  // Try validating as API Key first
  const apiKeyObj = apiTelemetryService.validateApiKey(extracted.token);
  if (apiKeyObj) {
    req.apiKeyRecord = apiKeyObj;
    req.user = {
      uid: apiKeyObj.id,
      email: `${apiKeyObj.tier.toLowerCase()}@api-client.local`,
      name: apiKeyObj.name,
      tier: apiKeyObj.tier,
      isApiKey: true
    };
    return next();
  }

  // If token has JWT format, try Firebase JWT verification
  if (extracted.type === 'BEARER_JWT' || isValidJwt(extracted.token)) {
    try {
      const decodedToken = await adminAuth.verifyIdToken(extracted.token);
      req.user = decodedToken;
      return next();
    } catch (error: any) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Geçersiz veya süresi dolmuş Firebase Yetkilendirme Tokenı',
        detail: error?.message || String(error)
      });
    }
  }

  return res.status(401).json({
    success: false,
    error: 'Unauthorized: Tanımsız veya pasif API Anahtarı / Yetki Tokenı'
  });
};

/**
 * Strict authentication middleware: Requires a valid Firebase ID token or API Key.
 */
export const requireAuth = requireApiKeyOrAuth;

/**
 * Strict API Key middleware: Requires specifically a registered API Key.
 */
export const requireApiKey = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const extracted = extractAuthToken(req);
  if (!extracted.token) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Geçerli bir X-API-Key veya Authorization: Bearer <API_KEY> gereklidir.'
    });
  }

  const apiKeyObj = apiTelemetryService.validateApiKey(extracted.token);
  if (!apiKeyObj) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Geçersiz veya durdurulmuş API Anahtarı'
    });
  }

  req.apiKeyRecord = apiKeyObj;
  req.user = {
    uid: apiKeyObj.id,
    email: `${apiKeyObj.tier.toLowerCase()}@api-client.local`,
    name: apiKeyObj.name,
    tier: apiKeyObj.tier,
    isApiKey: true
  };
  next();
};

/**
 * Optional authentication middleware: Decodes API Key or Firebase ID token if provided,
 * but allows unauthenticated guest access to public dashboard data if absent.
 */
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const extracted = extractAuthToken(req);

  if (extracted.token) {
    // Check API Key
    const apiKeyObj = apiTelemetryService.validateApiKey(extracted.token);
    if (apiKeyObj) {
      req.apiKeyRecord = apiKeyObj;
      req.user = {
        uid: apiKeyObj.id,
        email: `${apiKeyObj.tier.toLowerCase()}@api-client.local`,
        name: apiKeyObj.name,
        tier: apiKeyObj.tier,
        isApiKey: true
      };
      return next();
    }

    // Check Firebase JWT
    if (isValidJwt(extracted.token)) {
      try {
        const decodedToken = await adminAuth.verifyIdToken(extracted.token);
        req.user = decodedToken;
      } catch (error: any) {
        // Continue as guest
      }
    }
  }

  next();
};


