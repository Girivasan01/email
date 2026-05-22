import { previewDocument } from '../utils/preview.js';

export default function PreviewFrame({ body, name = 'John', title = 'Email preview' }) {
  return (
    <iframe
      title={title}
      className="h-56 w-full rounded-lg border border-slate-200 bg-white"
      sandbox=""
      srcDoc={previewDocument(body, name)}
    />
  );
}
