import { useState, useRef, useCallback } from 'react';
import { Upload, X, FileText, Image, Film, Loader2, Plus } from 'lucide-react';
import { useUploadAttachments } from '../../hooks/useTickets';

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
  '.mp4', '.webm', '.mov',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv',
];

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return Image;
  if (['mp4', 'webm', 'mov'].includes(ext)) return Film;
  return FileText;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface FileUploadProps {
  ticketId: string;
}

export function FileUpload({ ticketId }: FileUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadAttachments(ticketId);

  const validateFiles = useCallback((files: File[]): File[] => {
    const valid: File[] = [];
    for (const file of files) {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        setError(`"${file.name}" has an unsupported file type`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(`"${file.name}" exceeds the 50MB limit`);
        continue;
      }
      valid.push(file);
    }
    return valid;
  }, []);

  const addFiles = useCallback((files: File[]) => {
    setError(null);
    const valid = validateFiles(files);
    setSelectedFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name + f.size));
      return [...prev, ...valid.filter((f) => !existing.has(f.name + f.size))];
    });
  }, [validateFiles]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(Array.from(e.dataTransfer.files));
  }, [addFiles]);

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    try {
      await upload.mutateAsync(selectedFiles);
      setSelectedFiles([]);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  if (selectedFiles.length === 0) {
    return (
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all ${
          dragOver
            ? 'border-2 border-dashed border-brand-400 bg-brand-50/50 dark:bg-brand-500/10 dark:border-brand-500'
            : 'border border-dashed border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-600 hover:bg-gray-50/50 dark:hover:bg-gray-800/30'
        }`}
      >
        <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center flex-shrink-0">
          <Plus className="w-4 h-4 text-brand-500 dark:text-brand-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span className="text-brand-600 dark:text-brand-400 font-medium">Add files</span>
            {' '}or drop here
          </p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">
            Max 50MB · Images, videos, PDF, docs
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          accept={ALLOWED_EXTENSIONS.join(',')}
          onChange={(e) => {
            if (e.target.files) addFiles(Array.from(e.target.files));
            e.target.value = '';
          }}
        />
        {error && (
          <p className="text-[11px] text-red-500 dark:text-red-400">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-3 space-y-1.5">
        {selectedFiles.map((file, i) => {
          const Icon = getFileIcon(file.name);
          return (
            <div
              key={file.name + file.size}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/40"
            >
              <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{file.name}</p>
              </div>
              <span className="text-[11px] text-gray-400 flex-shrink-0">{formatSize(file.size)}</span>
              <button
                onClick={() => removeFile(i)}
                className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
              >
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>
          );
        })}
      </div>

      {error && (
        <p className="px-3 pb-2 text-[11px] text-red-500 dark:text-red-400">{error}</p>
      )}

      <div className="flex items-center gap-2 px-3 py-2.5 border-t border-gray-100 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-800/20">
        <button
          onClick={() => inputRef.current?.click()}
          className="text-xs text-gray-500 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400 transition-colors"
        >
          + Add more
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          accept={ALLOWED_EXTENSIONS.join(',')}
          onChange={(e) => {
            if (e.target.files) addFiles(Array.from(e.target.files));
            e.target.value = '';
          }}
        />
        <div className="flex-1" />
        <button
          onClick={() => setSelectedFiles([])}
          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleUpload}
          disabled={upload.isPending}
          className="btn-primary !py-1.5 !px-3 !text-xs"
        >
          {upload.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Upload className="w-3.5 h-3.5" />
          )}
          Upload {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''}
        </button>
      </div>
    </div>
  );
}
