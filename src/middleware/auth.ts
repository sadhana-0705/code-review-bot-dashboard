import type { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { eq } from 'drizzle-orm';

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email: string;
    name?: string;
    picture?: string;
  };
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const apiKey = req.headers['x-api-key'] as string;
  if (apiKey) {
    try {
      const matched = await db.select().from(users).where(eq(users.apiKey, apiKey));
      if (matched.length > 0) {
        req.user = {
          uid: matched[0].uid,
          email: matched[0].email,
          name: matched[0].displayName || undefined,
        };
        return next();
      }
    } catch (e) {
      console.error('API key lookup failed:', e);
    }
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid authorization token' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken: DecodedIdToken = await adminAuth.verifyIdToken(token);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
      name: decodedToken.name || (decodedToken as any).displayName || '',
      picture: decodedToken.picture || '',
    };
    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token or expired session' });
  }
};

export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const apiKey = req.headers['x-api-key'] as string;
  if (apiKey) {
    try {
      const matched = await db.select().from(users).where(eq(users.apiKey, apiKey));
      if (matched.length > 0) {
        req.user = {
          uid: matched[0].uid,
          email: matched[0].email,
          name: matched[0].displayName || undefined,
        };
        return next();
      }
    } catch {
      // Continue to next
    }
  }

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1];
    try {
      const decodedToken: DecodedIdToken = await adminAuth.verifyIdToken(token);
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email || '',
        name: decodedToken.name || '',
        picture: decodedToken.picture || '',
      };
    } catch {
      // Allow through without user
    }
  }
  next();
};
