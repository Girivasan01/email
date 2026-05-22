import { UploadCloud } from 'lucide-react';

export default function Dropzone({
  label,
  description,
  accept,
  multiple = false,
  disabled = false,
  onFiles,
  icon: Icon = UploadCloud,
}) {
  function handleFiles(fileList) {
    if (disabled) {
      return;
    }
    const files = Array.from(fileList || []);
    if (files.length) {
      onFiles(files);
    }
  }

  return (
    <label
      className={[
        'flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 text-center transition',
        disabled
          ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
          : 'border-slate-300 bg-white text-slate-600 hover:border-primary hover:bg-indigo-50/50',
      ].join(' ')}
      onDragOver={(event) => {
        event.preventDefault();
      }}
      onDrop={(event) => {
        event.preventDefault();
        handleFiles(event.dataTransfer.files);
      }}
    >
      <input
        className="sr-only"
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={(event) => {
          handleFiles(event.target.files);
          event.target.value = '';
        }}
      />
      <Icon className="mb-3 h-10 w-10 text-primary" aria-hidden="true" />
      <span className="text-base font-semibold text-slate-900">{label}</span>
      {description ? <span className="mt-1 max-w-md text-sm text-slate-500">{description}</span> : null}
    </label>
  );
}
