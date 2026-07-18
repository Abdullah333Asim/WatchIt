import { Request, Response, NextFunction } from 'express';
import { adminAuth } from './firebase-admin.ts';
import { DecodedIdToken } from 'firebase-admin/auth';
import { db } from '../src/db/index.ts';
import { users } from '../src/db/schema.ts';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: DecodedIdToken | any;
}

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-guest-key';

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
    
    return next();
  } catch (error) {
    // Fallback: try decoding custom JWT for guest users
    try {
      const decodedGuest = jwt.verify(token, JWT_SECRET) as any;
      const userExists = (await db.select().from(users).where(eq(users.id, decodedGuest.uid))).at(0);
      if (!userExists) {
        return res.status(401).json({ error: 'Unauthorized: User not found' });
      }
      req.user = decodedGuest;
      return next();
    } catch (jwtError) {
      console.error('Error verifying Firebase ID token and custom JWT:', error, jwtError);
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
  }
};
