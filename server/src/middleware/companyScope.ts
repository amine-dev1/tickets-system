import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin, isMock, loadData } from '../lib/supabase';

export const companyScope = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    if (isMock) {
      const profiles = loadData('profiles');
      const profile = profiles.find((p: any) => p.id === req.user?.id);
      req.userRole = profile?.role || 'client';
      req.companyId = profile?.company_id;
    } else {
      const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .select('role, company_id')
        .eq('id', req.user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      req.userRole = profile?.role || 'client';
      req.companyId = profile?.company_id;
    }
    
    next();
  } catch (err) {
    console.error('Scope Error:', err);
    res.status(500).json({ error: 'Internal server error resolving user scope' });
  }
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (req.userRole !== 'admin') {
    res.status(403).json({ error: 'Access denied. Admin role required.' });
    return;
  }
  next();
};

export const requireClient = (req: Request, res: Response, next: NextFunction): void => {
  if (req.userRole === 'admin') {
    return next(); // Admins can bypass client restriction if they want, or we can restrict them.
    // The instructions say "admin: accès complet à tout". So we allow it.
  }
  if (req.userRole !== 'client') {
    res.status(403).json({ error: 'Access denied. Client role required.' });
    return;
  }
  if (!req.companyId) {
     res.status(403).json({ error: 'Access denied. No company assigned.' });
     return;
  }
  next();
};
