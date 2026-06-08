import { useEffect } from 'react';
import { X } from 'lucide-react';
import { TicketForm } from './TicketForm';

interface NewTicketModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (ticketId: string) => void;
}

export function NewTicketModal({ open, onClose, onSuccess }: NewTicketModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-800">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors z-20"
        >
          <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </button>
        <div className="p-6 pb-2">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Create New Ticket
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Fill out the details below to submit a new support request.
          </p>
        </div>
        <div className="p-6 pt-2">
          {/* We wrap TicketForm so it fits the modal nicely without repeating its own card padding */}
          <div className="[&>form>div]:shadow-none [&>form>div]:border-none [&>form>div]:p-0 [&>form>div]:bg-transparent">
            <TicketForm 
              onSuccess={onSuccess} 
              onCancel={onClose} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
