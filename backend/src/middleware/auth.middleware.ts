import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../db/prisma';
import { AuthenticatedRequest, JwtPayload } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret-weplay-jwt-key-change-in-production-min32chars';

export const authenticateJWT = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication token required' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    // Verify user still exists in database and check banned status
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, isBanned: true, role: true, username: true, email: true },
    });

    if (!user) {
      res.status(401).json({ error: 'User no longer exists' });
      return;
    }

    if (user.isBanned) {
      res.status(403).json({ error: 'Account has been banned. Please contact support.' });
      return;
    }

    req.user = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired authentication token' });
  }
};

export const optionalAuthenticateJWT = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, isBanned: true, role: true, username: true, email: true },
    });

    if (user && !user.isBanned) {
      req.user = {
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      };
    }
  } catch (_) {
    // Ignore invalid token on optional auth
  }

  next();
};


export const requireSuperAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return Promise.resolve();
  }

  // Allow superadmin role (and admin if designated)
  if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
    res.status(403).json({ error: 'Access denied: Superadmin role required' });
    return Promise.resolve();
  }

  next();
  return Promise.resolve();
};
