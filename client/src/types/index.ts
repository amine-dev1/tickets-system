export type Role = 'admin' | 'client';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketCategory = 'bug' | 'feature_request' | 'billing' | 'support' | 'other';

/** Helper to check if a role has admin-level access */
export const isAdminRole = (role?: Role | string): boolean => role === 'admin';

export interface Company {
  id: string;
  name: string;
  slug: string;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user_count?: number;
  prestataire_count?: number;
  ticket_count?: number;
}

export interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  role: Role;
  company_id: string | null;
  company?: Company;
  avatar_url: string | null;
  created_at: string;
}

export interface Prestataire {
  id: string;
  company_id: string;
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  ticket_count?: number;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory | null;
  company_id: string;
  prestataire_id: string;
  created_by: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  created_by_profile?: Profile;
  prestataire?: Prestataire;
  assigned_to_profile?: Profile;
}

export interface TicketComment {
  id: string;
  ticket_id: string;
  company_id: string;
  author_id: string;
  content: string;
  is_internal: boolean;
  created_at: string;
  profiles?: Profile;
}

export interface TicketAttachment {
  id: string;
  ticket_id: string;
  company_id: string;
  uploaded_by: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
}

export interface TicketHistory {
  id: string;
  ticket_id: string;
  company_id: string;
  changed_by: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  profiles?: Profile;
}

export type MissionStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface Mission {
  id: string;
  company_id: string;
  prestataire_id: string;
  name: string;
  description: string | null;
  status: MissionStatus;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  created_at: string;
  updated_at: string;
  prestataire?: Prestataire;
}

export interface AdminStats {
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
  urgent: number;
  companies_count?: number;
  users_count?: number;
}

export interface CreateTicketDTO {
  title: string;
  description: string;
  priority: TicketPriority;
  category: TicketCategory;
  prestataire_id: string;
  assigned_to?: string;
}

export interface UpdateTicketDTO {
  status?: TicketStatus;
  priority?: TicketPriority;
  assigned_to?: string | null;
  category?: TicketCategory;
}
