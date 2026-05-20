import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

export const emailService = {
  async sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
    if (!resend) {
      console.log(`[EMAIL MOCK] To: ${to} | Subject: ${subject}`);
      console.log(`[EMAIL BODY]:\n`, html.replace(/<[^>]*>/g, ' '));
      return;
    }

    try {
      await resend.emails.send({
        from: 'Support <onboarding@resend.dev>',
        to,
        subject,
        html,
      });
      console.log(`Email successfully sent to ${to} via Resend.`);
    } catch (error) {
      console.error('Failed to send email via Resend:', error);
    }
  },

  async notifyNewTicket(clientName: string, ticketId: string, title: string) {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; color: #1f2937;">
        <h2 style="color: #4f46e5;">New Ticket Created</h2>
        <p>A new ticket has been submitted by <strong>${clientName}</strong>.</p>
        <p><strong>Title:</strong> ${title}</p>
        <p>Click the link below to view and manage this ticket:</p>
        <p><a href="${clientUrl}/admin/tickets/${ticketId}" style="display: inline-block; padding: 10px 20px; background-color: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold;">View Ticket</a></p>
      </div>
    `;
    // In production, send to your support / admin email. Mocking to onboarding/admin/users
    await this.sendEmail({ to: 'admin@example.com', subject: `[New Ticket] ${title}`, html });
  },

  async notifyStatusChanged(clientEmail: string, ticketId: string, title: string, status: string) {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; color: #1f2937;">
        <h2 style="color: #4f46e5;">Ticket Status Updated</h2>
        <p>Your ticket "<strong>${title}</strong>" is now set to <strong>${status.toUpperCase().replace('_', ' ')}</strong>.</p>
        <p>Click the link below to see the latest updates:</p>
        <p><a href="${clientUrl}/tickets/${ticketId}" style="display: inline-block; padding: 10px 20px; background-color: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold;">View Ticket Thread</a></p>
      </div>
    `;
    await this.sendEmail({ to: clientEmail, subject: `[Update] Ticket #${ticketId.slice(0, 8)}: ${title}`, html });
  },

  async notifyNewComment(toEmail: string, ticketId: string, title: string, authorName: string, content: string, isAdminView = false) {
    const link = isAdminView ? `${clientUrl}/admin/tickets/${ticketId}` : `${clientUrl}/tickets/${ticketId}`;
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; color: #1f2937;">
        <h2 style="color: #4f46e5;">New Comment Added</h2>
        <p><strong>${authorName}</strong> replied to the ticket "<strong>${title}</strong>":</p>
        <blockquote style="border-left: 4px solid #e5e7eb; padding-left: 16px; margin: 20px 0; color: #4b5563; font-style: italic;">
          ${content}
        </blockquote>
        <p><a href="${link}" style="display: inline-block; padding: 10px 20px; background-color: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold;">View Conversation</a></p>
      </div>
    `;
    await this.sendEmail({ to: toEmail, subject: `[Reply] Ticket #${ticketId.slice(0, 8)}: ${title}`, html });
  }
};
