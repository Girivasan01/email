import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ImageIcon, Pencil, Plus, Trash2 } from 'lucide-react';
import ErrorBanner from '../components/ErrorBanner.jsx';
import Spinner from '../components/Spinner.jsx';
import TemplateModal from './TemplateModal.jsx';
import { apiRequest, assetUrl } from '../utils/api.js';

export default function Templates() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  async function loadTemplates() {
    setLoading(true);
    setError('');

    try {
      const data = await apiRequest('/templates');
      setTemplates(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTemplates();
  }, []);

  function openCreateModal() {
    setEditingTemplate(null);
    setModalError('');
    setModalOpen(true);
  }

  function openEditModal(template) {
    setEditingTemplate(template);
    setModalError('');
    setModalOpen(true);
  }

  async function saveTemplate({ id, formData }) {
    setSaving(true);
    setModalError('');

    try {
      await apiRequest(id ? `/templates/${id}` : '/templates', {
        method: id ? 'PUT' : 'POST',
        body: formData,
      });
      setModalOpen(false);
      setEditingTemplate(null);
      await loadTemplates();
    } catch (err) {
      setModalError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteTemplate(template) {
    const confirmed = window.confirm(`Delete "${template.name}"? This cannot be undone.`);
    if (!confirmed) {
      return;
    }

    setDeletingId(template.id);
    setError('');

    try {
      await apiRequest(`/templates/${template.id}`, { method: 'DELETE' });
      setTemplates((current) => current.filter((item) => item.id !== template.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-normal text-slate-950">Email Templates</h2>
          <p className="mt-2 text-slate-600">Create reusable messages with image attachments and [Name] personalization.</p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-500"
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
          Create New Template
        </button>
      </header>

      <ErrorBanner message={error} />

      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-slate-600 shadow-soft">
          <Spinner label="Loading templates" />
        </div>
      ) : templates.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              deleting={deletingId === template.id}
              onEdit={() => openEditModal(template)}
              onDelete={() => deleteTemplate(template)}
              onUse={() => navigate(`/send?templateId=${template.id}`)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center shadow-soft">
          <ImageIcon className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
          <h3 className="mt-3 text-lg font-semibold text-slate-950">No templates yet</h3>
          <p className="mt-1 text-sm text-slate-500">Create your first reusable email template.</p>
        </div>
      )}

      {modalOpen ? (
        <TemplateModal
          template={editingTemplate}
          saving={saving}
          error={modalError}
          onCancel={() => {
            setModalOpen(false);
            setEditingTemplate(null);
          }}
          onSave={saveTemplate}
        />
      ) : null}
    </div>
  );
}

function TemplateCard({ template, deleting, onEdit, onDelete, onUse }) {
  const firstImage = template.image_paths?.[0];
  const previewHtml = template.html_content || template.body;

  return (
    <article className="flex min-h-80 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-soft">
      <div className="h-36 bg-slate-100">
        {firstImage ? (
          <img src={assetUrl(firstImage.path)} alt={firstImage.originalName || template.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-400">
            <ImageIcon className="h-10 w-10" aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-bold text-slate-950">{template.name}</h3>
          <p className="mt-1 truncate text-sm font-semibold text-primary">{template.subject}</p>
          <p className="mt-3 line-clamp-4 text-sm leading-6 text-slate-600">{stripHtml(previewHtml)}</p>
        </div>

        <div className="mt-auto flex items-center justify-between pt-5">
          <div className="text-xs font-semibold text-slate-500">
            {template.image_paths?.length || 0} image{template.image_paths?.length === 1 ? '' : 's'}
          </div>
          <div className="flex items-center gap-2">
            <IconButton label="Use in Sender" onClick={onUse} icon={ArrowRight} />
            <IconButton label="Edit template" onClick={onEdit} icon={Pencil} />
            <IconButton label="Delete template" onClick={onDelete} icon={Trash2} danger disabled={deleting} />
          </div>
        </div>
      </div>
    </article>
  );
}

function IconButton({ label, onClick, icon: Icon, danger = false, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'inline-flex h-9 w-9 items-center justify-center rounded-md border transition disabled:cursor-wait disabled:opacity-60',
        danger
          ? 'border-red-200 text-red-600 hover:bg-red-50'
          : 'border-slate-200 text-slate-600 hover:border-primary hover:text-primary',
      ].join(' ')}
      aria-label={label}
      title={label}
    >
      {disabled ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" /> : <Icon className="h-4 w-4" />}
    </button>
  );
}

function stripHtml(value) {
  const noTags = String(value || '').replace(/<[^>]*>/g, ' ');
  return noTags.replace(/\s+/g, ' ').trim() || 'No body content.';
}
