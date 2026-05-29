import { Request, Response, NextFunction } from 'express';
import type { PermModule, PermAction } from '../types/express';

/** Bypass permission checks for admin roles. */
const isAdminRole = (role?: string) => role === 'superadmin' || role === 'admin';

/**
 * Middleware factory: ensures the authenticated user has `action` permission
 * on `module`. Admins and superadmins always pass through.
 */
export const requirePermission = (module: PermModule, action: PermAction) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (isAdminRole(req.userRole)) { next(); return; }

    const allowed = req.userPermissions?.[module]?.[action] ?? false;
    if (!allowed) {
      res.status(403).json({ error: `Accès refusé : permission "${module}.${action}" requise.` });
      return;
    }
    next();
  };
