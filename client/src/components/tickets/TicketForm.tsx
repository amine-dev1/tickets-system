import { useNavigate } from 'react-router-dom';
import { useRef, useState, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Send, AlertTriangle, Paperclip, X, FileText, Image, Film } from 'lucide-react';
import { useCreateTicket } from '../../hooks/useTickets';
import { useAuthStore } from '../../store/authStore';
import { isStaff } from '../../types';
import { attachmentsApi } from '../../api/attachments';
import { usePrestataires } from '../../hooks/usePrestataires';
import { Select } from '../ui/Select';

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.gif', '.webp',
  '.mp4', '.webm', '.mov',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv',
];

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return Image;
  if (['mp4', 'webm', 'mov'].includes(ext)) return Film;
  return FileText;
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const CATEGORY_OPTIONS = [
  { value: 'bug', label: '🐛 Bug' },
  { value: 'feature_request', label: '✨ Feature Request' },
  { value: 'billing', label: '💳 Billing' },
  { value: 'support', label: '🛟 Support' },
  { value: 'other', label: '📌 Other' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: '▲ Low' },
  { value: 'medium', label: '▲▲ Medium' },
  { value: 'high', label: '▲▲▲ High' },
  { value: 'urgent', label: '🔥 Urgent' },
];

const schema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(120),
  description: z.string().min(20, 'Please describe the issue in at least 20 characters'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  category: z.enum(['bug', 'feature_request', 'billing', 'support', 'other']),
  prestataire_id: z.string().uuid('Please select a prestataire'),
});

type FormData = z.infer<typeof schema>;

interface TicketFormProps {
  onSuccess?: (ticketId: string) => void;
  onCancel?: () => void;
}

export function TicketForm({ onSuccess, onCancel }: TicketFormProps = {}) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isUserStaff = isStaff(user?.role);
  const baseRoute = isUserStaff ? '/admin/tickets' : '/tickets';

  const createTicket = useCreateTicket();
  const { data: prestataires } = usePrestataires('', true);

  // File attachment state
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndAdd = useCallback((incoming: File[]) => {
    setFileError(null);
    const valid: File[] = [];
    for (const file of incoming) {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        setFileError(`"${file.name}" — type non supporté`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        setFileError(`"${file.name}" dépasse la limite de 50 MB`);
        continue;
      }
      valid.push(file);
    }
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name + f.size));
      return [...prev, ...valid.filter((f) => !existing.has(f.name + f.size))];
    });
  }, []);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { priority: 'medium', category: 'support' },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const ticket = await createTicket.mutateAsync(data);
      // Upload attachments if any
      if (files.length > 0) {
        try {
          await attachmentsApi.upload(ticket.id, files);
        } catch (uploadErr) {
          console.error('Attachment upload failed:', uploadErr);
          // Don't block navigation — ticket was created successfully
        }
      }
      if (onSuccess) {
        onSuccess(ticket.id);
      } else {
        navigate(`${baseRoute}/${ticket.id}`);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl">
      <div className="elevated-card p-6 space-y-5 animate-fade-in-up">
        <div className="animate-fade-in-up" style={{ animationDelay: '40ms', animationFillMode: 'backwards' }}>
          <label htmlFor="prestataire_id" className="label">Prestataire <span className="text-red-500">*</span></label>
          <Controller
            name="prestataire_id"
            control={control}
            render={({ field }) => (
              <Select
                id="prestataire_id"
                value={field.value || ''}
                onChange={field.onChange}
                searchable
                fullWidth
                placeholder="Sélectionner un prestataire..."
                options={prestataires?.map((c) => ({ value: c.id, label: c.name })) || []}
              />
            )}
          />
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
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <Select
                  id="category"
                  value={field.value}
                  onChange={field.onChange}
                  options={CATEGORY_OPTIONS}
                  fullWidth
                />
              )}
            />
          </div>
          <div>
            <label htmlFor="priority" className="label">Priority <span className="text-red-500">*</span></label>
            <Controller
              name="priority"
              control={control}
              render={({ field }) => (
                <Select
                  id="priority"
                  value={field.value}
                  onChange={field.onChange}
                  options={PRIORITY_OPTIONS}
                  fullWidth
                />
              )}
            />
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

        {/* File attachments */}
        <div className="animate-fade-in-up" style={{ animationDelay: '180ms', animationFillMode: 'backwards' }}>
          <label className="label flex items-center gap-1.5">
            <Paperclip className="w-3.5 h-3.5" />
            Pièces jointes
            <span className="text-gray-400 font-normal">(optionnel)</span>
          </label>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); validateAndAdd(Array.from(e.dataTransfer.files)); }}
            onClick={() => fileInputRef.current?.click()}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all ${
              dragOver
                ? 'border-2 border-dashed border-brand-400 bg-brand-50/50 dark:bg-brand-500/10'
                : 'border border-dashed border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-600 hover:bg-gray-50 dark:hover:bg-gray-800/30'
            }`}
          >
            <Paperclip className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <span className="text-brand-600 dark:text-brand-400 font-medium">Choisir des fichiers</span>
              {' '}ou glisser-déposer — Images, vidéos, PDF, docs (max 50 MB)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              accept={ALLOWED_EXTENSIONS.join(',')}
              onChange={(e) => {
                if (e.target.files) validateAndAdd(Array.from(e.target.files));
                e.target.value = '';
              }}
            />
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {files.map((file, i) => {
                const Icon = getFileIcon(file.name);
                return (
                  <div key={file.name + file.size} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/60">
                    <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">{file.name}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0">{formatSize(file.size)}</span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setFiles((prev) => prev.filter((_, idx) => idx !== i)); }}
                      className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                      <X className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {fileError && (
            <p className="flex items-center gap-1 text-red-500 text-xs mt-1.5">
              <AlertTriangle className="w-3 h-3" />
              {fileError}
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
            {files.length > 0 && (
              <span className="ml-1 text-xs opacity-80">+ {files.length} fichier{files.length > 1 ? 's' : ''}</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              if (onCancel) onCancel();
              else navigate(baseRoute);
            }}
            className="btn-secondary"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}
