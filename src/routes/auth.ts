import { Router } from 'express';
import jwt from 'jsonwebtoken';

export const authRouter = Router();

authRouter.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Missing username or password' });
  }
  const token = jwt.sign({ username }, process.env.JWT_SECRET || 'secret', {
    expiresIn: '1h',
  });
  return res.json({ token });
});

authRouter.get('/profile', (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    return res.json({ profile: decoded });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});
