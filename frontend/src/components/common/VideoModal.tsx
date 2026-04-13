import { useState } from 'react';

interface Props {
  url: string;
  title?: string;
  /** true → muestra un thumbnail clickable (para listas); false → botón de texto */
  compact?: boolean;
}

/** Convierte URLs de YouTube / Vimeo a su versión embed con autoplay. */
function toEmbedSrc(url: string): { type: 'local' | 'iframe'; src: string } {
  if (url.startsWith('/uploads/')) return { type: 'local', src: url };

  // YouTube: watch?v=ID | youtu.be/ID | embed/ID
  const yt = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (yt) return { type: 'iframe', src: `https://www.youtube.com/embed/${yt[1]}?autoplay=1&rel=0` };

  // Vimeo: vimeo.com/ID
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return { type: 'iframe', src: `https://player.vimeo.com/video/${vm[1]}?autoplay=1` };

  // Cualquier otra URL: intentar con iframe
  return { type: 'iframe', src: url };
}

export default function VideoModal({ url, title = 'Video del ejercicio', compact = false }: Props) {
  const [open, setOpen] = useState(false);
  const { type, src } = toEmbedSrc(url);

  // Miniatura clickable para vista de lista
  const trigger = compact ? (
    <button
      onClick={() => setOpen(true)}
      className="relative w-24 h-14 rounded-lg overflow-hidden group flex-shrink-0 focus:outline-none"
      title="Ver video"
    >
      {type === 'local' ? (
        <video src={src} className="w-full h-full object-cover" muted />
      ) : (
        <div className="w-full h-full bg-dark-200 flex items-center justify-center">
          <svg className="w-6 h-6 text-dark-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      )}
      {/* Overlay play */}
      <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <svg className="w-7 h-7 text-white drop-shadow" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
    </button>
  ) : (
    // Botón de texto para vista de detalle / rutina
    <button
      onClick={() => setOpen(true)}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-800 transition-colors"
    >
      <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
        <path d="M8 5v14l11-7z" />
      </svg>
      Ver video guía
    </button>
  );

  return (
    <>
      {trigger}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div className="relative bg-black rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-dark-900/80">
              <span className="text-sm font-medium text-white truncate pr-4">{title}</span>
              <button
                onClick={() => setOpen(false)}
                className="text-white/70 hover:text-white transition-colors flex-shrink-0"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Video */}
            <div className="aspect-video w-full bg-black">
              {type === 'local' ? (
                <video
                  src={src}
                  controls
                  autoPlay
                  className="w-full h-full"
                />
              ) : (
                <iframe
                  src={src}
                  title={title}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
