import { Loader2 } from 'lucide-react';
import { useComments } from '../../hooks/useTickets';
import { formatRelative, getInitials } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';
import { isAdminRole } from '../../types';

export function CommentList({ ticketId }: { ticketId: string }) {
  const { data: comments, isLoading } = useComments(ticketId);
  const { user } = useAuthStore();
  const isAdmin = isAdminRole(user?.role);

  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!comments?.length) {
    return (
      <p className="text-gray-400 dark:text-gray-500 text-sm py-4 text-center">
        No comments yet. Be the first to respond.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {comments
        .filter((c) => isAdmin || !c.is_internal)
        .map((comment) => (
          <div
            key={comment.id}
            className={`flex gap-3 animate-fade-in ${
              comment.is_internal
                ? 'bg-amber-50 border border-amber-200 rounded-lg p-3 dark:bg-amber-500/5 dark:border-amber-500/20'
                : ''
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300">
              {getInitials(comment.profiles?.full_name)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {comment.profiles?.full_name || 'Unknown'}
                </span>
                {comment.is_internal && (
                  <span className="badge bg-amber-100 text-amber-700 border border-amber-200 text-[10px] dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30">
                    Internal Note
                  </span>
                )}
                <span className="text-xs text-gray-400">
                  {formatRelative(comment.created_at)}
                </span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                {comment.content}
              </p>
            </div>
          </div>
        ))}
    </div>
  );
}
