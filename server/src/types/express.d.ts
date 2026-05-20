import { User } from '@supabase/supabase-js';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      userRole?: string;
      companyId?: string;
    }
  }
}

export {};
