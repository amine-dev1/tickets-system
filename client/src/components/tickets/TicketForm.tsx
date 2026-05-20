import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Send, AlertTriangle } from 'lucide-react';
import { useCreateTicket } from '../../hooks/useTickets';

import { usePrestataires } from '../../hooks/usePrestataires';

const schema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(120),
  description: z.string().min(20, 'Please describe the issue in at least 20 characters'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  category: z.enum(['bug', 'feature_request', 'billing', 'support', 'other']),
  prestataire_id: z.string().uuid('Please select a prestataire'),
});

type FormData = z.infer<typeof schema>;

export function TicketForm() {
  const navigate = useNavigate();
  const createTicket = useCreateTicket();
  const { data: prestataires } = usePrestataires('', true);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { priority: 'medium', category: 'support' },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const ticket = await createTicket.mutateAsync(data);
      navigate(`/tickets/${ticket.id}`);
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl">
      <div className="elevated-card p-6 space-y-5 animate-fade-in-up">
        <div className="animate-fade-in-up" style={{ animationDelay: '40ms', animationFillMode: 'backwards' }}>
          <label htmlFor="prestataire_id" className="label">Prestataire <span className="text-red-500">*</span></label>
          <select id="prestataire_id" {...register('prestataire_id')} className="input cursor-pointer">
            <option value="">Sélectionner un prestataire...</option>
            {prestataires?.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {errors.prestataire_id && (
            <p className="flex items-center gap-1 text-red-500 text-xs mt-1.5 animate-fade-in">
              <AlertTriangle className="w-3 h-3" />
              {errors.prestataire_id.message}
            </p>
          )}
        </div>

        <div className="animate-fade-in-up" style={{ animationDelay: '80ms', animationFillMode: 'backwards' }}>
          <label htmlFor="title" className="label">Title <span className="text-red-500">*</span></label>
          <input id="title" {...register('title')} className="input" placeholder="Brief description of the issue" />
          {errors.title && (
            <p className="flex items-center gap-1 text-red-500 text-xs mt-1.5 animate-fade-in">
              <AlertTriangle className="w-3 h-3" />
              {errors.title.message}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in-up" style={{ animationDelay: '120ms', animationFillMode: 'backwards' }}>
          <div>
            <label htmlFor="category" className="label">Category <span className="text-red-500">*</span></label>
            <select id="category" {...register('category')} className="input cursor-pointer">
              <option value="bug">🐛 Bug</option>
              <option value="feature_request">✨ Feature Request</option>
              <option value="billing">💳 Billing</option>
              <option value="support">🛟 Support</option>
              <option value="other">📌 Other</option>
            </select>
          </div>
          <div>
            <label htmlFor="priority" className="label">Priority <span className="text-red-500">*</span></label>
            <select id="priority" {...register('priority')} className="input cursor-pointer">
              <option value="low">▲ Low</option>
              <option value="medium">▲▲ Medium</option>
              <option value="high">▲▲▲ High</option>
              <option value="urgent">🔥 Urgent</option>
            </select>
          </div>
        </div>

        <div className="animate-fade-in-up" style={{ animationDelay: '160ms', animationFillMode: 'backwards' }}>
          <label htmlFor="description" className="label">Description <span className="text-red-500">*</span></label>
          <textarea
            id="description"
            {...register('description')}
            rows={6}
            className="input resize-none"
            placeholder="Describe the issue in detail — steps to reproduce, expected vs actual behavior, screenshots, etc."
          />
          {errors.description && (
            <p className="flex items-center gap-1 text-red-500 text-xs mt-1.5 animate-fade-in">
              <AlertTriangle className="w-3 h-3" />
              {errors.description.message}
            </p>
          )}
        </div>

        {createTicket.error && (
          <div className="flex items-start gap-2 p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm animate-fade-in dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{(createTicket.error as Error).message}</span>
          </div>
        )}

        <div className="flex gap-3 pt-2 border-t border-gray-100 dark:border-gray-800/60 animate-fade-in-up" style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}>
          <button
            type="submit"
            id="submit-ticket-btn"
            disabled={isSubmitting || createTicket.isPending}
            className="btn-primary"
          >
            {(isSubmitting || createTicket.isPending) ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Submit Ticket
          </button>
          <button
            type="button"
            onClick={() => navigate('/tickets')}
            className="btn-secondary"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}
