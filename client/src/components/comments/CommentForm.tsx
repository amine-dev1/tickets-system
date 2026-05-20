import { useState } from 'react';
import { Send, Loader2, Lock } from 'lucide-react';
import { useAddComment } from '../../hooks/useTickets';

interface CommentFormProps {
  ticketId: string;
  isAdmin?: boolean;
}

export function CommentForm({ ticketId, isAdmin }: CommentFormProps) {
  const [content, setContent] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const addComment = useAddComment(ticketId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    await addComment.mutateAsync({ content: content.trim(), isInternal });
    setContent('');
    setIsInternal(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        id="comment-input"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write a reply…"
        rows={3}
        className="input resize-none"
      />
      <div className="flex items-center justify-between">
        {isAdmin && (
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div
              role="checkbox"
              aria-checked={isInternal}
              onClick={() => setIsInternal(!isInternal)}
              className={`w-9 h-5 rounded-full transition-colors ${
                isInternal ? 'bg-amber-500' : 'bg-gray-200 dark:bg-gray-700'
              } relative cursor-pointer`}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                  isInternal ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Internal note
            </span>
          </label>
        )}
        {!isAdmin && <div />}
        <button
          type="submit"
          id="submit-comment-btn"
          disabled={!content.trim() || addComment.isPending}
          className="btn-primary"
        >
          {addComment.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          {isInternal ? 'Add Note' : 'Reply'}
        </button>
      </div>
    </form>
  );
}
