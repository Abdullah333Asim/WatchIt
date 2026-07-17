import { Request, Response, NextFunction } from 'express';
import { adminAuth } from './firebase-admin.ts';
import { DecodedIdToken } from 'firebase-admin/auth';
import { db } from '../src/db/index.ts';
import { users } from '../src/db/schema.ts';
import { eq } from 'drizzle-orm';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    
    // Ensure user exists in db
    await db.insert(users).values({
      id: decodedToken.uid,
      name: decodedToken.name || 'Anonymous',
      email: decodedToken.email,
      bio: 'Cinephile',
      avatarUrl: decodedToken.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${decodedToken.uid}`,
      tasteDna: JSON.stringify({})
    }).onConflictDoNothing();
    
    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};
