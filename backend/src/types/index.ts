import { Request } from 'express';
import { Role } from '@prisma/client';

export interface JwtPayload {
  userId: string;
  username: string;
  email: string;
  role: Role;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export interface UserResponse {
  id: string;
  username: string;
  email: string;
  role: Role;
  coinsBalance: string;
  charmPoints: number;
  isBanned: boolean;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}
