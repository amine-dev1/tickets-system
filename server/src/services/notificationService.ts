import { supabaseAdmin } from '../lib/supabase';

export type NotificationType =
  | 'ticket_created'
  | 'ticket_updated'
  | 'ticket_status_changed'
  | 'ticket_deleted'
  | 'comment_added';

interface NotifyInput {
  recipientIds: string[];
  actorId?: string | null;
  companyId?: string | null;
  type: NotificationType;
  title: string;
  message?: string;
  entity_type?: string;
  entity_id?: string;
  link?: string;
}

/** Insert one notification per recipient. Silently logs errors. */
export async function notify(input: NotifyInput): Promise<void> {
  const recipients = input.recipientIds.filter(id => !!id && id !== input.actorId);
  if (recipients.length === 0) return;

  const rows = recipients.map(rid => ({
    recipient_id: rid,
    actor_id: input.actorId ?? null,
    company_id: input.companyId ?? null,
    type: input.type,
    title: input.title,
    message: input.message ?? null,
    entity_type: input.entity_type ?? null,
    entity_id: input.entity_id ?? null,
    link: input.link ?? null,
  }));

  const { error } = await supabaseAdmin.from('notifications').insert(rows);
  if (error) {
    console.error('[notificationService] insert failed:', error.message);
  }
}

/** Get all admin/superadmin profile IDs for a company (excluding one user). */
export async function getCompanyAdminIds(
  companyId: string | null | undefined,
  exceptUserId?: string,
): Promise<string[]> {
  if (!companyId) return [];

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('company_id', companyId)
    .in('role', ['admin']);

  if (error || !data) {
    console.error('[notificationService] getCompanyAdminIds failed:', error?.message);
    return [];
  }

  return data
    .map((p: { id: string }) => p.id)
    .filter((id: string) => id !== exceptUserId);
}
