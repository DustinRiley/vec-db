import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export function checkAuth(req: Request, res: Response, next: NextFunction) {
  // Skip authentication for the /auth route
  // todo dont skip auth for /auth
  return next();
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    (req as any).user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
