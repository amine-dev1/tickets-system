import { useState } from 'react';
import { Loader2, FileText, Trash2, Download, Eye, Film, Play } from 'lucide-react';
import { useAttachments, useDeleteAttachment } from '../../hooks/useTickets';
import { useAuthStore } from '../../store/authStore';
import { isAdminRole } from '../../types';
import { formatRelative } from '../../lib/utils';
import { AttachmentPreview } from './AttachmentPreview';
import type { TicketAttachment } from '../../types';

function formatSize(bytes: number | null) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getExtLabel(mimeType: string | null, name: string) {
  return (name.split('.').pop() || '').toUpperCase();
}

export function AttachmentList({ ticketId }: { ticketId: string }) {
  const { data: attachments, isLoading } = useAttachments(ticketId);
  const deleteAttachment = useDeleteAttachment(ticketId);
  const { user } = useAuthStore();
  const isAdmin = isAdminRole(user?.role);
  const [preview, setPreview] = useState<TicketAttachment | null>(null);

  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!attachments?.length) {
    return (
      <p className="text-gray-400 dark:text-gray-500 text-sm py-4 text-center">
        No attachments yet.
      </p>
    );
  }

  const media = attachments.filter(
    (a) => a.mime_type?.startsWith('image/') || a.mime_type?.startsWith('video/')
  );
  const docs = attachments.filter(
    (a) => !a.mime_type?.startsWith('image/') && !a.mime_type?.startsWith('video/')
  );

  return (
    <>
      {/* Media grid */}
      {media.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
          {media.map((att) => {
            const isVideo = att.mime_type?.startsWith('video/');
            const canDelete = isAdmin || att.uploaded_by === user?.id;

            return (
              <div key={att.id} className="group relative animate-fade-in">
                <button
                  onClick={() => setPreview(att)}
                  className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/40 cursor-pointer block"
                >
                  {isVideo ? (
                    <>
                      <video
                        src={att.file_url}
                        className="w-full h-full object-cover"
                        muted
                        preload="metadata"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-white/90 dark:bg-white/80 flex items-center justify-center shadow-lg">
                          <Play className="w-4 h-4 text-gray-800 ml-0.5" fill="currentColor" />
                        </div>
                      </div>
                    </>
                  ) : (
                    <img
                      src={att.file_url}
                      alt={att.file_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}
                </button>

                {/* Hover overlay */}
                <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/70 via-black/30 to-transparent rounded-b-xl opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-[11px] text-white/90 truncate mb-1">{att.file_name}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/60">{formatSize(att.file_size)}</span>
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); setPreview(att); }}
                        className="p-1 rounded hover:bg-white/20 transition-colors"
                      >
                        <Eye className="w-3 h-3 text-white" />
                      </button>
                      <a
                        href={att.file_url}
                        download={att.file_name}
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 rounded hover:bg-white/20 transition-colors"
                      >
                        <Download className="w-3 h-3 text-white" />
                      </a>
                      {canDelete && (
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteAttachment.mutate(att.id); }}
                          disabled={deleteAttachment.isPending}
                          className="p-1 rounded hover:bg-red-500/40 transition-colors"
                        >
                          <Trash2 className="w-3 h-3 text-white" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Type badge */}
                {isVideo && (
                  <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/50 text-[10px] font-medium text-white flex items-center gap-1">
                    <Film className="w-2.5 h-2.5" />
                    Video
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Document list */}
      {docs.length > 0 && (
        <div className="space-y-1.5">
          {docs.map((att) => {
            const canDelete = isAdmin || att.uploaded_by === user?.id;
            const ext = getExtLabel(att.mime_type, att.file_name);

            return (
              <div
                key={att.id}
                className="group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors animate-fade-in"
              >
                <div className="w-9 h-9 rounded-lg bg-brand-50 dark:bg-brand-500/10 border border-brand-100 dark:border-brand-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 uppercase">{ext}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => setPreview(att)}
                    className="text-sm text-gray-700 dark:text-gray-300 hover:text-brand-600 dark:hover:text-brand-400 truncate block text-left font-medium transition-colors"
                  >
                    {att.file_name}
                  </button>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {formatSize(att.file_size)} · {formatRelative(att.created_at)}
                  </p>
                </div>

                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setPreview(att)}
                    className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    title="Preview"
                  >
                    <Eye className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                  <a
                    href={att.file_url}
                    download={att.file_name}
                    className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    title="Download"
                  >
                    <Download className="w-3.5 h-3.5 text-gray-400" />
                  </a>
                  {canDelete && (
                    <button
                      onClick={() => deleteAttachment.mutate(att.id)}
                      disabled={deleteAttachment.isPending}
                      className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {preview && (
        <AttachmentPreview
          attachment={preview}
          attachments={attachments}
          onClose={() => setPreview(null)}
          onNavigate={setPreview}
        />
      )}
    </>
  );
}
