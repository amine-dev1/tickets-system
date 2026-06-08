import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
const FROM = `${process.env.FROM_NAME || 'TicketFlow'} <${process.env.FROM_EMAIL || 'onboarding@resend.dev'}>`;

/* ── Shared layout ──────────────────────────────────────────────── */

function layout(content: string) {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#1e1b4b 0%,#312e81 100%);border-radius:12px 12px 0 0;padding:28px 36px;text-align:center;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="text-align:left;">
                <span style="display:inline-flex;align-items:center;gap:8px;">
                  <span style="display:inline-block;background:#6366f1;border-radius:8px;padding:6px 10px;font-size:16px;font-weight:800;color:#fff;letter-spacing:-0.5px;">⚡</span>
                  <span style="font-size:20px;font-weight:800;color:#fff;letter-spacing:-0.3px;">TicketFlow</span>
                </span>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#ffffff;padding:36px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
          ${content}
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:20px 36px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">
            © ${new Date().getFullYear()} TicketFlow · Vous recevez cet email car vous avez un compte sur la plateforme.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function btn(url: string, label: string) {
  return `<p style="margin:24px 0 0;">
    <a href="${url}" style="display:inline-block;padding:12px 28px;background:#6366f1;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;letter-spacing:0.2px;">${label}</a>
  </p>`;
}

function badge(text: string, color = '#6366f1') {
  return `<span style="display:inline-block;padding:3px 10px;border-radius:99px;background:${color}1a;color:${color};font-size:12px;font-weight:700;border:1px solid ${color}33;">${text}</span>`;
}

/* ── Core send ──────────────────────────────────────────────────── */

async function send({ to, subject, html }: { to: string; subject: string; html: string }) {
  if (!resend) {
    console.log(`[EMAIL MOCK] To: ${to} | Subject: ${subject}`);
    console.log(html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
    return;
  }
  try {
    const { error } = await resend.emails.send({ from: FROM, to, subject, html });
    if (error) console.error('Resend error:', error);
    else console.log(`✉️  Email sent → ${to} | ${subject}`);
  } catch (err) {
    console.error('Failed to send email:', err);
  }
}

/* ── Email templates ─────────────────────────────────────────────── */

export const emailService = {
  send,

  /** Notify admin(s) of a newly created ticket */
  async notifyNewTicket(clientName: string, ticketId: string, title: string, priority: string, adminEmail: string) {
    const priorityColor: Record<string, string> = {
      urgent: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e',
    };
    const html = layout(`
      <h2 style="margin:0 0 8px;font-size:22px;color:#111827;">Nouveau ticket soumis</h2>
      <p style="margin:0 0 20px;color:#6b7280;font-size:14px;">Un client vient de créer un ticket qui nécessite votre attention.</p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin-bottom:8px;">
        <tr><td style="padding:6px 0;">
          <span style="font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Client</span><br>
          <span style="font-size:15px;font-weight:600;color:#111827;">${clientName}</span>
        </td></tr>
        <tr><td style="padding:6px 0;border-top:1px solid #e5e7eb;">
          <span style="font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Titre</span><br>
          <span style="font-size:15px;font-weight:600;color:#111827;">${title}</span>
        </td></tr>
        <tr><td style="padding:6px 0;border-top:1px solid #e5e7eb;">
          <span style="font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Priorité</span><br>
          ${badge(priority.toUpperCase(), priorityColor[priority] || '#6366f1')}
        </td></tr>
      </table>

      ${btn(`${clientUrl}/admin/tickets/${ticketId}`, 'Voir le ticket →')}
    `);
    await send({ to: adminEmail, subject: `[Nouveau ticket] ${title}`, html });
  },

  /** Notify the ticket author that its status changed */
  async notifyStatusChanged(clientEmail: string, ticketId: string, title: string, status: string) {
    const statusLabel: Record<string, string> = {
      open: 'Ouvert', in_progress: 'En cours', resolved: 'Résolu', closed: 'Fermé',
    };
    const statusColor: Record<string, string> = {
      open: '#6366f1', in_progress: '#f59e0b', resolved: '#22c55e', closed: '#6b7280',
    };
    const html = layout(`
      <h2 style="margin:0 0 8px;font-size:22px;color:#111827;">Statut de votre ticket mis à jour</h2>
      <p style="margin:0 0 20px;color:#6b7280;font-size:14px;">Le statut de votre demande de support a été modifié.</p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin-bottom:8px;">
        <tr><td style="padding:6px 0;">
          <span style="font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Ticket</span><br>
          <span style="font-size:15px;font-weight:600;color:#111827;">${title}</span>
        </td></tr>
        <tr><td style="padding:6px 0;border-top:1px solid #e5e7eb;">
          <span style="font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Nouveau statut</span><br>
          ${badge(statusLabel[status] || status, statusColor[status] || '#6366f1')}
        </td></tr>
      </table>

      ${btn(`${clientUrl}/tickets/${ticketId}`, 'Voir mon ticket →')}
    `);
    await send({ to: clientEmail, subject: `[Mise à jour] ${title}`, html });
  },

  /** Notify a user that someone replied on a ticket */
  async notifyNewComment(toEmail: string, ticketId: string, title: string, authorName: string, content: string, isAdminView = false) {
    const link = isAdminView ? `${clientUrl}/admin/tickets/${ticketId}` : `${clientUrl}/tickets/${ticketId}`;
    const html = layout(`
      <h2 style="margin:0 0 8px;font-size:22px;color:#111827;">Nouvelle réponse sur votre ticket</h2>
      <p style="margin:0 0 20px;color:#6b7280;font-size:14px;"><strong style="color:#374151;">${authorName}</strong> a répondu sur le ticket <strong style="color:#374151;">${title}</strong>.</p>

      <div style="background:#f9fafb;border-left:4px solid #6366f1;border-radius:0 8px 8px 0;padding:16px 20px;margin-bottom:8px;">
        <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;font-style:italic;">${content.length > 300 ? content.slice(0, 300) + '…' : content}</p>
      </div>

      ${btn(link, 'Voir la conversation →')}
    `);
    await send({ to: toEmail, subject: `[Réponse] ${title}`, html });
  },

  /** Welcome email + credentials when an admin creates a new user */
  async sendWelcomeWithCredentials(toEmail: string, fullName: string, password: string, role: string) {
    const html = layout(`
      <h2 style="margin:0 0 8px;font-size:22px;color:#111827;">Bienvenue sur TicketFlow 👋</h2>
      <p style="margin:0 0 20px;color:#6b7280;font-size:14px;">
        Un compte a été créé pour vous. Voici vos identifiants de connexion.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin-bottom:8px;">
        <tr><td style="padding:6px 0;">
          <span style="font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Email</span><br>
          <span style="font-size:15px;font-weight:600;color:#111827;">${toEmail}</span>
        </td></tr>
        <tr><td style="padding:6px 0;border-top:1px solid #e5e7eb;">
          <span style="font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Mot de passe temporaire</span><br>
          <code style="font-size:18px;font-weight:800;color:#6366f1;letter-spacing:2px;font-family:monospace;">${password}</code>
        </td></tr>
        <tr><td style="padding:6px 0;border-top:1px solid #e5e7eb;">
          <span style="font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Rôle</span><br>
          ${badge(role)}
        </td></tr>
      </table>

      <p style="margin:16px 0 0;font-size:13px;color:#ef4444;font-weight:600;">
        ⚠️ Changez votre mot de passe dès votre première connexion.
      </p>

      ${btn(`${clientUrl}/login`, 'Se connecter →')}
    `);
    await send({ to: toEmail, subject: 'Votre compte TicketFlow a été créé', html });
  },

  /** Notify user that their password was reset by an admin */
  async sendPasswordReset(toEmail: string, fullName: string, newPassword: string) {
    const html = layout(`
      <h2 style="margin:0 0 8px;font-size:22px;color:#111827;">Votre mot de passe a été réinitialisé</h2>
      <p style="margin:0 0 20px;color:#6b7280;font-size:14px;">
        Un administrateur a généré un nouveau mot de passe pour votre compte.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:20px;margin-bottom:8px;">
        <tr><td style="padding:6px 0;">
          <span style="font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Nouveau mot de passe</span><br>
          <code style="font-size:20px;font-weight:800;color:#b45309;letter-spacing:2px;font-family:monospace;">${newPassword}</code>
        </td></tr>
      </table>

      <p style="margin:16px 0 0;font-size:13px;color:#ef4444;font-weight:600;">
        ⚠️ Connectez-vous immédiatement et changez ce mot de passe.
      </p>

      ${btn(`${clientUrl}/login`, 'Se connecter →')}
    `);
    await send({ to: toEmail, subject: 'Votre mot de passe TicketFlow a été réinitialisé', html });
  },
};
