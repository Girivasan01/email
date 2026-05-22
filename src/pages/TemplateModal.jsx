import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Save, X } from 'lucide-react';
import Dropzone from '../components/Dropzone.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import ImagePreviewGrid from '../components/ImagePreviewGrid.jsx';
import PreviewFrame from '../components/PreviewFrame.jsx';
import Spinner from '../components/Spinner.jsx';
import { assetUrl } from '../utils/api.js';

const MAX_IMAGES = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function TemplateModal({ template, saving, error, onCancel, onSave }) {
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [existingImages, setExistingImages] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [localError, setLocalError] = useState('');
  const imageUrls = useRef(new Set());

  useEffect(() => {
    setName(template?.name || '');
    setSubject(template?.subject || '');
    setBody(template?.body || '');
    setExistingImages(
      (template?.image_paths || []).map((image) => ({
        ...image,
        id: image.path,
        url: assetUrl(image.path),
        name: image.originalName || image.filename,
      }))
    );
    setNewImages([]);
    setLocalError('');
  }, [template]);

  useEffect(() => {
    return () => {
      imageUrls.current.forEach((url) => URL.revokeObjectURL(url));
      imageUrls.current.clear();
    };
  }, []);

  function addImages(files) {
    setLocalError('');
    const imageFiles = files.filter((file) => file.type.startsWith('image/'));
    const oversized = imageFiles.find((file) => file.size > MAX_FILE_SIZE);

    if (imageFiles.length !== files.length) {
      setLocalError('Template images must be .jpg, .jpeg, .png, or .gif files.');
      return;
    }

    if (oversized) {
      setLocalError('Each template image must be 10MB or smaller.');
      return;
    }

    if (existingImages.length + newImages.length + imageFiles.length > MAX_IMAGES) {
      setLocalError(`Templates can include up to ${MAX_IMAGES} images.`);
      return;
    }

    const items = imageFiles.map((file) => {
      const previewUrl = URL.createObjectURL(file);
      imageUrls.current.add(previewUrl);
      return {
        id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
        file,
        name: file.name,
        previewUrl,
      };
    });

    setNewImages((current) => [...current, ...items]);
  }

  function removeExistingImage(image) {
    setExistingImages((current) => current.filter((item) => item.path !== image.path));
  }

  function removeNewImage(image) {
    if (image.previewUrl) {
      URL.revokeObjectURL(image.previewUrl);
      imageUrls.current.delete(image.previewUrl);
    }
    setNewImages((current) => current.filter((item) => item.id !== image.id));
  }

  function handleSubmit(event) {
    event.preventDefault();
    setLocalError('');

    if (!name.trim() || !subject.trim() || !body.trim()) {
      setLocalError('Template name, subject, and body are required.');
      return;
    }

    const formData = new FormData();
    formData.append('name', name.trim());
    formData.append('subject', subject.trim());
    formData.append('body', body.trim());
    if (template?.id) {
      formData.append('existingImages', JSON.stringify(existingImages.map(({ url, id, name: imageName, ...image }) => image)));
    }
    newImages.forEach((image) => {
      formData.append('images', image.file);
    });

    onSave({ id: template?.id, formData });
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 px-4 py-6">
      <div className="mx-auto max-w-5xl rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-xl font-bold text-slate-950">{template ? 'Edit Template' : 'Create Template'}</h3>
            <p className="text-sm text-slate-500">Build reusable email content with optional image attachments.</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
            aria-label="Close modal"
            title="Close"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form className="p-5" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <ErrorBanner message={localError || error} />

            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-slate-700" htmlFor="template-name">
                  Template Name
                </label>
                <input
                  id="template-name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-slate-900"
                  placeholder="New customer welcome"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700" htmlFor="template-subject">
                  Email Subject
                </label>
                <input
                  id="template-subject"
                  type="text"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-slate-900"
                  placeholder="Welcome, [Name]"
                />
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div>
                <label className="block text-sm font-semibold text-slate-700" htmlFor="template-body">
                  Email Body
                </label>
                <textarea
                  id="template-body"
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  rows={11}
                  className="mt-2 w-full resize-y rounded-lg border border-slate-300 px-3 py-3 text-slate-900"
                  placeholder="Hi [Name],&#10;&#10;Thanks for joining us..."
                />
                <p className="mt-2 text-sm text-slate-500">Supports [Name] personalization and HTML.</p>
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">Preview</p>
                <PreviewFrame body={body} />
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-slate-700">Image Attachments</h4>
              <div className="mt-2">
                <Dropzone
                  label="Drop images here or click to upload"
                  description="Accepted formats: .jpg, .jpeg, .png, .gif. Maximum 10MB each."
                  accept=".jpg,.jpeg,.png,.gif,image/jpeg,image/png,image/gif"
                  multiple
                  icon={ImagePlus}
                  onFiles={addImages}
                />
              </div>
              <div className="mt-4 space-y-4">
                <ImagePreviewGrid images={existingImages} onRemove={removeExistingImage} />
                <ImagePreviewGrid images={newImages} onRemove={removeNewImage} />
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-500 disabled:cursor-wait disabled:bg-slate-300 disabled:shadow-none"
            >
              {saving ? <Spinner label="Saving" /> : <><Save className="h-4 w-4" aria-hidden="true" /> Save</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
