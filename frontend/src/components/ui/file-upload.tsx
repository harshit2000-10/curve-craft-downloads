import { useState, useRef, useEffect, DragEvent, ChangeEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import clsx from "clsx";
import {
  UploadCloud,
  File as FileIcon,
  Trash2,
  Loader,
  CheckCircle,
} from "lucide-react";
import { GlassBtn } from "@/components/ui/liquid-glass";
import { FILE_ACCEPT, SUPPORTED_EXTENSIONS } from "@/lib/fileTypes";

interface FileWithPreview {
  id: string;
  preview: string;
  progress: number;
  name: string;
  size: number;
  type: string;
  lastModified?: number;
  file?: File;
}

interface FileUploadProps {
  /** Restrict accepted file types, e.g. ".csv,.tsv" */
  accept?: string;
  /** Called as soon as a file is added (before simulated upload finishes) */
  onFileAccepted?: (file: File) => void;
}

export default function FileUpload({
  accept = FILE_ACCEPT,
  onFileAccepted,
}: FileUploadProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const intervalsRef = useRef<ReturnType<typeof setInterval>[]>([]);

  // Clear any in-flight progress intervals if the component unmounts mid-upload.
  useEffect(() => () => { intervalsRef.current.forEach(clearInterval); }, []);

  const handleFiles = (fileList: FileList) => {
    const accepted = accept.split(",").map(s => s.trim().toLowerCase());
    const filteredFiles = Array.from(fileList).filter((file) => {
      const name = file.name.toLowerCase();
      return accepted.some(a => {
        if (a.startsWith(".")) return name.endsWith(a);
        if (a.endsWith("/*")) return file.type.startsWith(a.slice(0, -2));
        return file.type === a;
      });
    });
    if (!filteredFiles.length) return;
    const newFiles = filteredFiles.map((file) => ({
      id: `${URL.createObjectURL(file)}-${Date.now()}`,
      preview: URL.createObjectURL(file),
      progress: 0,
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      file,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
    newFiles.forEach((f) => {
      simulateUpload(f.id);
      if (onFileAccepted && f.file) onFileAccepted(f.file);
    });
  };

  const simulateUpload = (id: string) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      setFiles((prev) =>
        prev.map((f) =>
          f.id === id ? { ...f, progress: Math.min(progress, 100) } : f,
        ),
      );
      if (progress >= 100) {
        clearInterval(interval);
        intervalsRef.current = intervalsRef.current.filter((i) => i !== interval);
        if (navigator.vibrate) navigator.vibrate(100);
      }
    }, 300);
    intervalsRef.current.push(interval);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: DragEvent) => {
    // dragleave bubbles and fires when the pointer moves onto a child element
    // (the icon, the heading text) too, not just when it actually leaves the
    // zone — relatedTarget is where the pointer is going, so a target still
    // inside the zone means this isn't a real exit.
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const onSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files);
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-4 md:p-6">
      {/* Drop zone */}
      <motion.div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        initial={false}
        animate={{
          borderColor: isDragging ? "#7c5cff" : "#ffffff10",
          scale: isDragging ? 1.02 : 1,
        }}
        whileHover={{ scale: 1.01 }}
        transition={{ duration: 0.2 }}
        className={clsx(
          "relative rounded-2xl p-8 md:p-12 text-center cursor-pointer bg-secondary/50 border border-primary/10 shadow-sm hover:shadow-md backdrop-blur group",
          isDragging && "ring-4 ring-violet-400/30 border-violet-500",
        )}
      >
        <div className="flex flex-col items-center gap-5">
          <motion.div
            animate={{ y: isDragging ? [-5, 0, -5] : 0 }}
            transition={{
              duration: 1.5,
              repeat: isDragging ? Infinity : 0,
              ease: "easeInOut",
            }}
            className="relative"
          >
            <motion.div
              animate={{
                opacity: isDragging ? [0.5, 1, 0.5] : 1,
                scale: isDragging ? [0.95, 1.05, 0.95] : 1,
              }}
              transition={{
                duration: 2,
                repeat: isDragging ? Infinity : 0,
                ease: "easeInOut",
              }}
              className="absolute -inset-4 bg-violet-400/10 rounded-full blur-md"
              style={{ display: isDragging ? "block" : "none" }}
            />
            <UploadCloud
              className={clsx(
                "w-16 h-16 md:w-20 md:h-20 drop-shadow-sm",
                isDragging
                  ? "text-violet-500"
                  : "text-zinc-700 dark:text-zinc-300 group-hover:text-violet-500 transition-colors duration-300",
              )}
            />
          </motion.div>

          <div className="space-y-2">
            <h3 className="text-xl md:text-2xl font-semibold text-zinc-800 dark:text-zinc-100">
              {isDragging
                ? "Drop your file here"
                : files.length
                  ? "Drop another file"
                  : "Drop your file here"}
            </h3>
            <p className="text-zinc-600 dark:text-zinc-300 md:text-lg max-w-md mx-auto">
              {isDragging ? (
                <span className="font-medium text-violet-500">
                  Release to upload
                </span>
              ) : (
                <>
                  Drag & drop, or{" "}
                  <span className="text-violet-500 font-medium">browse</span>
                </>
              )}
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Supports {SUPPORTED_EXTENSIONS.join(", ")} files
            </p>
          </div>

          <input
            ref={inputRef}
            type="file"
            multiple
            hidden
            onChange={onSelect}
            accept={accept}
          />
        </div>
      </motion.div>

      {/* Uploaded files list */}
      <div className="mt-8">
        <AnimatePresence>
          {files.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-between items-center mb-3 px-2"
            >
              <h3 className="font-semibold text-lg md:text-xl text-zinc-800 dark:text-zinc-200">
                Uploaded files ({files.length})
              </h3>
              {files.length > 1 && (
                <GlassBtn
                  onClick={() => setFiles([])}
                  className="text-sm font-medium px-3 py-1 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-700 dark:hover:bg-zinc-600 rounded-md text-zinc-700 hover:text-red-600 dark:text-zinc-300 dark:hover:text-red-400 transition-colors duration-200"
                >
                  Clear all
                </GlassBtn>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div
          className={clsx(
            "flex flex-col gap-3 overflow-y-auto pr-2",
            files.length > 3 &&
              "max-h-96 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-600 scrollbar-track-transparent",
          )}
        >
          <AnimatePresence>
            {files.map((file) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300, damping: 24 }}
                className="px-4 py-4 flex items-start gap-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 shadow hover:shadow-md transition-all duration-200"
              >
                {/* Thumbnail */}
                <div className="relative flex-shrink-0">
                  {file.type.startsWith("image/") ? (
                    <img
                      src={file.preview}
                      alt={file.name}
                      className="w-16 h-16 md:w-20 md:h-20 rounded-lg object-cover border dark:border-zinc-700 shadow-sm"
                    />
                  ) : file.type.startsWith("video/") ? (
                    <video
                      src={file.preview}
                      className="w-16 h-16 md:w-20 md:h-20 rounded-lg object-cover border dark:border-zinc-700 shadow-sm"
                      controls={false}
                      muted
                      loop
                      playsInline
                      preload="metadata"
                    />
                  ) : (
                    <FileIcon className="w-16 h-16 md:w-20 md:h-20 text-zinc-400" />
                  )}
                  {file.progress >= 100 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute -right-2 -bottom-2 bg-white dark:bg-zinc-800 rounded-full shadow-sm"
                    >
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                    </motion.div>
                  )}
                </div>

                {/* File info & progress */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col gap-1 w-full">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileIcon className="w-5 h-5 flex-shrink-0 text-violet-500 dark:text-violet-400" />
                      <h4
                        className="font-medium text-base md:text-lg truncate text-zinc-800 dark:text-zinc-200"
                        title={file.name}
                      >
                        {file.name}
                      </h4>
                    </div>

                    <div className="flex items-center justify-between gap-3 text-sm text-zinc-500 dark:text-zinc-400">
                      <span className="text-xs md:text-sm">
                        {formatFileSize(file.size)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="font-medium">
                          {Math.round(file.progress)}%
                        </span>
                        {file.progress < 100 ? (
                          <Loader className="w-4 h-4 animate-spin text-violet-500" />
                        ) : (
                          <Trash2
                            className="w-4 h-4 cursor-pointer text-zinc-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400 transition-colors duration-200"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFiles((prev) =>
                                prev.filter((f) => f.id !== file.id),
                              );
                            }}
                            aria-label="Remove file"
                          />
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden mt-3">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${file.progress}%` }}
                      transition={{
                        duration: 0.4,
                        type: "spring",
                        stiffness: 100,
                        ease: "easeOut",
                      }}
                      className={clsx(
                        "h-full rounded-full shadow-inner",
                        file.progress < 100 ? "bg-violet-500" : "bg-emerald-500",
                      )}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
