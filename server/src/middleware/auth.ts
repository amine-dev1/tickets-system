import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin, isMock } from '../lib/supabase';

export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }

    const token = authHeader.split(' ')[1];
    
    if (isMock) {
       // In mock mode, the token is just the user id (strip mock_token_ prefix if present)
       const userId = token.replace(/^mock_token_/, '');
       req.user = { id: userId } as any;
       return next();
    }
    
    // Verify token with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth Error:', err);
    res.status(500).json({ error: 'Internal server error during authentication' });
  }
};
