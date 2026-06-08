import { useEffect, useCallback } from 'react';
import { X, Download, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import ReactPlayer from 'react-player';
import type { TicketAttachment } from '../../types';

interface AttachmentPreviewProps {
  attachment: TicketAttachment;
  attachments?: TicketAttachment[];
  onClose: () => void;
  onNavigate?: (attachment: TicketAttachment) => void;
}

export function AttachmentPreview({ attachment, attachments, onClose, onNavigate }: AttachmentPreviewProps) {
  const currentIndex = attachments?.findIndex((a) => a.id === attachment.id) ?? -1;
  const hasPrev = currentIndex > 0;
  const hasNext = attachments ? currentIndex < attachments.length - 1 : false;

  const goPrev = useCallback(() => {
    if (hasPrev && attachments && onNavigate) onNavigate(attachments[currentIndex - 1]);
  }, [hasPrev, attachments, currentIndex, onNavigate]);

  const goNext = useCallback(() => {
    if (hasNext && attachments && onNavigate) onNavigate(attachments[currentIndex + 1]);
  }, [hasNext, attachments, currentIndex, onNavigate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose, goPrev, goNext]);

  const isImage = attachment.mime_type?.startsWith('image/');
  const isVideo = attachment.mime_type?.startsWith('video/');
  const isPdf = attachment.mime_type === 'application/pdf';

  return (
    <div className="fixed inset-0 z-50 bg-black/90 animate-fade-in" onClick={onClose}>
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-white/90 text-sm font-medium truncate max-w-[50vw]">
            {attachment.file_name}
          </span>
          {attachments && attachments.length > 1 && (
            <span className="text-white/40 text-xs flex-shrink-0">
              {currentIndex + 1} / {attachments.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <a
            href={attachment.file_url}
            download={attachment.file_name}
            onClick={(e) => e.stopPropagation()}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            title="Download"
          >
            <Download className="w-5 h-5 text-white/80" />
          </a>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-white/80" />
          </button>
        </div>
      </div>

      {/* Navigation arrows */}
      {hasPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); goPrev(); }}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-colors"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
      )}
      {hasNext && (
        <button
          onClick={(e) => { e.stopPropagation(); goNext(); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-colors"
        >
          <ChevronRight className="w-6 h-6 text-white" />
        </button>
      )}

      {/* Content */}
      <div
        className="absolute inset-0 flex items-center justify-center p-16 pt-14"
        onClick={(e) => e.stopPropagation()}
      >
        {isImage && (
          <img
            src={attachment.file_url}
            alt={attachment.file_name}
            className="max-w-full max-h-full rounded-lg object-contain select-none"
            draggable={false}
          />
        )}

        {isVideo && (
          <div className="rounded-xl overflow-hidden shadow-2xl bg-black flex items-center justify-center" style={{ maxWidth: '90vw', maxHeight: '85vh' }}>
            <video
              key={attachment.id}
              src={attachment.file_url}
              controls
              autoPlay
              playsInline
              controlsList="nodownload"
              className="max-w-full max-h-[85vh] block"
              style={{ width: 'auto', height: 'auto' }}
            >
              <source src={attachment.file_url} type={attachment.mime_type || 'video/mp4'} />
              Your browser does not support video playback.
            </video>
          </div>
        )}

        {isPdf && (
          <iframe
            src={attachment.file_url}
            title={attachment.file_name}
            className="w-[75vw] h-[80vh] rounded-xl bg-white shadow-2xl"
          />
        )}

        {!isImage && !isVideo && !isPdf && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-10 text-center shadow-2xl max-w-sm">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-5">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-700 dark:text-gray-200 font-semibold mb-1">
              {attachment.file_name}
            </p>
            <p className="text-gray-400 text-sm mb-5">
              Preview not available for this file type
            </p>
            <a
              href={attachment.file_url}
              download={attachment.file_name}
              className="btn-primary inline-flex"
            >
              <Download className="w-4 h-4" />
              Download File
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
