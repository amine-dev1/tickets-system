import { User } from '@supabase/supabase-js';

export type PermModule = 'dashboard' | 'tickets' | 'missions' | 'prestataires' | 'users';
export type PermAction = 'view' | 'create' | 'edit' | 'delete';
export type ModulePerms = { [key in PermAction]: boolean };
export type UserPermissionsMap = { [key in PermModule]?: ModulePerms };

declare global {
  namespace Express {
    interface Request {
      user?: User;
      userRole?: string;
      companyId?: string;
      userPermissions?: UserPermissionsMap;
    }
  }
}

export {};
