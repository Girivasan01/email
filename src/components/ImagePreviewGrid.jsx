import { X } from 'lucide-react';

export default function ImagePreviewGrid({ images, onRemove }) {
  if (!images.length) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {images.map((image) => (
        <div key={image.id || image.path || image.previewUrl} className="group relative overflow-hidden rounded-lg border border-slate-200 bg-white">
          <img src={image.previewUrl || image.url} alt={image.name || image.originalName || 'Attachment'} className="h-28 w-full object-cover" />
          <div className="flex h-10 items-center px-2">
            <p className="truncate text-xs font-medium text-slate-700">{image.name || image.originalName}</p>
          </div>
          {onRemove ? (
            <button
              type="button"
              className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md bg-slate-950/80 text-white opacity-90 transition hover:bg-red-600"
              onClick={() => onRemove(image)}
              aria-label={`Remove ${image.name || image.originalName || 'image'}`}
              title="Remove image"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
