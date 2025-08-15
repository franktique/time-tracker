import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { config } from './config';
import { query } from './db';

export interface User {
  id: string;
  username: string;
  email?: string;
}

export interface AuthToken {
  userId: string;
  username: string;
  iat: number;
  exp: number;
}

export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const generateToken = (user: User): string => {
  return jwt.sign(
    { userId: user.id, username: user.username },
    config.auth.jwtSecret,
    { expiresIn: config.auth.jwtExpiresIn }
  );
};

export const verifyToken = (token: string): AuthToken | null => {
  try {
    return jwt.verify(token, config.auth.jwtSecret) as AuthToken;
  } catch (error) {
    return null;
  }
};

export const getUserFromToken = async (token: string): Promise<User | null> => {
  const decoded = verifyToken(token);
  if (!decoded) return null;

  try {
    const result = await query(
      'SELECT id, username, email FROM users WHERE id = $1',
      [decoded.userId]
    );
    
    if (result.rows.length === 0) return null;
    
    return result.rows[0];
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
};

export const extractTokenFromRequest = (request: NextRequest): string | null => {
  // Try Authorization header first
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Fallback to cookie
  const tokenCookie = request.cookies.get('auth-token');
  return tokenCookie?.value || null;
};

export const authenticateRequest = async (request: NextRequest): Promise<User | null> => {
  const token = extractTokenFromRequest(request);
  if (!token) return null;

  return getUserFromToken(token);
};

export const createUser = async (username: string, password: string, email?: string): Promise<User> => {
  const passwordHash = await hashPassword(password);
  
  const result = await query(
    'INSERT INTO users (username, password_hash, email) VALUES ($1, $2, $3) RETURNING id, username, email',
    [username, passwordHash, email]
  );
  
  return result.rows[0];
};

export const loginUser = async (username: string, password: string): Promise<{ user: User; token: string } | null> => {
  const result = await query(
    'SELECT id, username, email, password_hash FROM users WHERE username = $1',
    [username]
  );
  
  if (result.rows.length === 0) return null;
  
  const user = result.rows[0];
  const isValidPassword = await verifyPassword(password, user.password_hash);
  
  if (!isValidPassword) return null;
  
  const userWithoutHash = { id: user.id, username: user.username, email: user.email };
  const token = generateToken(userWithoutHash);
  
  return { user: userWithoutHash, token };
};