import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin, isMock, loadData } from '../lib/supabase';
import type { UserPermissionsMap, PermModule, ModulePerms } from '../types/express';

export const DEFAULT_PERMISSIONS: Record<string, UserPermissionsMap> = {
  agent: {
    dashboard:    { view: true,  create: false, edit: false, delete: false },
    tickets:      { view: true,  create: true,  edit: true,  delete: false },
    missions:     { view: true,  create: false, edit: false, delete: false },
    prestataires: { view: true,  create: false, edit: false, delete: false },
    users:        { view: false, create: false, edit: false, delete: false },
  },
  client: {
    dashboard:    { view: true,  create: false, edit: false, delete: false },
    tickets:      { view: true,  create: true,  edit: false, delete: false },
    missions:     { view: false, create: false, edit: false, delete: false },
    prestataires: { view: false, create: false, edit: false, delete: false },
    users:        { view: false, create: false, edit: false, delete: false },
  },
};

/**
 * Role hierarchy:
 *  - superadmin : Global platform access (manages all enterprises)
 *  - admin      : Enterprise admin (full access within their company)
 *  - agent      : Enterprise agent (tickets only within their company)
 *  - client     : End user
 */

export type Role = 'superadmin' | 'admin' | 'agent' | 'client';

export const isSuperAdmin = (role?: string) => role === 'superadmin';
export const isEnterpriseAdmin = (role?: string) =>
  role === 'superadmin' || role === 'admin';
export const isStaff = (role?: string) =>
  role === 'superadmin' || role === 'admin' || role === 'agent';

export const companyScope = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    if (isMock) {
      const profiles = loadData('profiles');
      const profile = profiles.find((p: any) => p.id === req.user?.id);
      const role1 = profile?.role || 'client';
      req.userRole = role1;
      req.companyId = profile?.company_id;

      const permRows = loadData('user_permissions');
      const permRow = permRows.find((p: any) => p.user_id === req.user!.id);
      req.userPermissions = permRow?.permissions ?? DEFAULT_PERMISSIONS[role1] ?? DEFAULT_PERMISSIONS.client;
    } else {
      const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .select('role, company_id')
        .eq('id', req.user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      const role2 = profile?.role || 'client';
      req.userRole = role2;
      req.companyId = profile?.company_id;

      const { data: permRow } = await supabaseAdmin
        .from('user_permissions')
        .select('permissions')
        .eq('user_id', req.user.id)
        .single();
      req.userPermissions = permRow?.permissions ?? DEFAULT_PERMISSIONS[role2] ?? DEFAULT_PERMISSIONS.client;
    }

    next();
  } catch (err) {
    console.error('Scope Error:', err);
    res.status(500).json({ error: 'Internal server error resolving user scope' });
  }
};

/** Only superadmin can access (global platform features) */
export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!isSuperAdmin(req.userRole)) {
    res.status(403).json({ error: 'Access denied. Superadmin role required.' });
    return;
  }
  next();
};

/** Enterprise admin or superadmin (manages a company's settings) */
export const requireEnterpriseAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!isEnterpriseAdmin(req.userRole)) {
    res.status(403).json({ error: 'Access denied. Admin role required.' });
    return;
  }
  next();
};

/** Any staff member (superadmin, admin, or agent) — used for ticket management */
export const requireStaff = (req: Request, res: Response, next: NextFunction): void => {
  if (!isStaff(req.userRole)) {
    res.status(403).json({ error: 'Access denied. Staff role required.' });
    return;
  }
  next();
};

/** Backward-compatible alias — admin or superadmin */
export const requireAdmin = requireEnterpriseAdmin;

export const requireClient = (req: Request, res: Response, next: NextFunction): void => {
  if (isEnterpriseAdmin(req.userRole)) {
    return next();
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
