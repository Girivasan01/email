import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Download, FileSpreadsheet, ImagePlus, Send, XCircle } from 'lucide-react';
import Dropzone from '../components/Dropzone.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import ImagePreviewGrid from '../components/ImagePreviewGrid.jsx';
import PreviewFrame from '../components/PreviewFrame.jsx';
import Spinner from '../components/Spinner.jsx';
import { apiRequest, API_BASE_URL } from '../utils/api.js';
import { downloadResultsCsv } from '../utils/csv.js';
import { parseRecipientWorkbook } from '../utils/excel.js';

const MAX_IMAGES = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function SendEmails() {
  const [searchParams] = useSearchParams();
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesError, setTemplatesError] = useState('');
  const [useTemplate, setUseTemplate] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [excelFile, setExcelFile] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [recipientError, setRecipientError] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [sendError, setSendError] = useState('');
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState(null);
  const [sendProgress, setSendProgress] = useState({ sent: 0, failed: 0, total: 0 });
  const attachmentUrls = useRef(new Set());

  useEffect(() => {
    let active = true;

    async function loadTemplates() {
      setTemplatesLoading(true);
      setTemplatesError('');

      try {
        const data = await apiRequest('/templates');
        if (active) {
          setTemplates(data);
        }
      } catch (err) {
        if (active) {
          setTemplatesError(err.message);
        }
      } finally {
        if (active) {
          setTemplatesLoading(false);
        }
      }
    }

    loadTemplates();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const templateId = searchParams.get('templateId');
    if (templateId && templates.some((template) => String(template.id) === templateId)) {
      setUseTemplate(true);
      setSelectedTemplateId(templateId);
    }
  }, [searchParams, templates]);

  useEffect(() => {
    return () => {
      attachmentUrls.current.forEach((url) => URL.revokeObjectURL(url));
      attachmentUrls.current.clear();
    };
  }, []);

  const selectedTemplate = useMemo(
    () => templates.find((template) => String(template.id) === String(selectedTemplateId)),
    [selectedTemplateId, templates]
  );

  const activeSubject = useTemplate ? selectedTemplate?.subject || '' : subject;
  const activeBody = useTemplate ? selectedTemplate?.html_content || selectedTemplate?.body || '' : body;
  const canSend = Boolean(excelFile && recipients.length && activeSubject.trim() && activeBody.trim() && !sending);

  async function handleExcelUpload(files) {
    const file = files[0];
    setRecipientError('');
    setResults(null);

    try {
      const parsedRecipients = await parseRecipientWorkbook(file);
      setExcelFile(file);
      setRecipients(parsedRecipients);
      if (!parsedRecipients.length) {
        setRecipientError('No recipients were found in the workbook.');
      }
    } catch (err) {
      setExcelFile(null);
      setRecipients([]);
      setRecipientError(err.message);
    }
  }

  function handleAttachmentUpload(files) {
    setSendError('');
    const imageFiles = files.filter((file) => file.type.startsWith('image/'));
    const oversized = imageFiles.find((file) => file.size > MAX_FILE_SIZE);

    if (imageFiles.length !== files.length) {
      setSendError('Attachments must be image files: .jpg, .jpeg, .png, or .gif.');
      return;
    }

    if (oversized) {
      setSendError('Each image attachment must be 10MB or smaller.');
      return;
    }

    if (attachments.length + imageFiles.length > MAX_IMAGES) {
      setSendError(`You can attach up to ${MAX_IMAGES} images.`);
      return;
    }

    const nextItems = imageFiles.map((file) => {
      const previewUrl = URL.createObjectURL(file);
      attachmentUrls.current.add(previewUrl);
      return {
        id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
        file,
        name: file.name,
        previewUrl,
      };
    });

    setAttachments((current) => [...current, ...nextItems]);
  }

  function removeAttachment(image) {
    if (image.previewUrl) {
      URL.revokeObjectURL(image.previewUrl);
      attachmentUrls.current.delete(image.previewUrl);
    }
    setAttachments((current) => current.filter((item) => item.id !== image.id));
  }

  async function handleSend() {
    if (!canSend) {
      return;
    }

    const formData = new FormData();
    formData.append('excelFile', excelFile);
    formData.append('subject', activeSubject);
    formData.append('body', activeBody);
    if (useTemplate && selectedTemplateId) {
      formData.append('templateId', selectedTemplateId);
    }
    attachments.forEach((attachment) => {
      formData.append('attachments', attachment.file);
    });

    setSending(true);
    setSendError('');
    setResults(null);
    setSendProgress({ sent: 0, failed: 0, total: 0 });

    try {
      const response = await fetch(`${API_BASE_URL}/emails/send`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.text();
        throw new Error(payload || 'Failed to send emails.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let completedResults = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        let boundaryIndex;

        while ((boundaryIndex = buffer.indexOf('\n\n')) !== -1) {
          const chunk = buffer.slice(0, boundaryIndex);
          buffer = buffer.slice(boundaryIndex + 2);
          const line = chunk.trim();

          if (!line) {
            continue;
          }

          if (line.startsWith('data: ')) {
            try {
              const payload = JSON.parse(line.slice(6));
              if (payload.sent !== undefined && payload.failed !== undefined && payload.total !== undefined) {
                setSendProgress({ sent: payload.sent, failed: payload.failed, total: payload.total });
              }

              if (payload.done) {
                completedResults = payload.results || [];
              }
            } catch (err) {
              console.warn('Failed to parse SSE payload:', err);
            }
          }
        }
      }

      if (completedResults) {
        setResults({
          total: completedResults.length,
          sent: completedResults.filter((item) => item.status === 'sent').length,
          failed: completedResults.filter((item) => item.status !== 'sent').length,
          results: completedResults,
        });
      } else {
        setSendError('Email send completed without a final progress message.');
      }
    } catch (err) {
      setSendError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <header>
        <h2 className="text-3xl font-bold tracking-normal text-slate-950">Bulk Email Sender</h2>
        <p className="mt-2 text-slate-600">Send personalized emails to hundreds of recipients in one click</p>
      </header>

      <ErrorBanner message={templatesError || recipientError || sendError} />

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Recipients</h3>
            <p className="text-sm text-slate-500">Upload a workbook with “Full Name” and “Email” columns.</p>
          </div>
          {recipients.length ? (
            <span className="inline-flex w-fit items-center rounded-full bg-indigo-50 px-3 py-1 text-sm font-semibold text-primary">
              {recipients.length} recipients
            </span>
          ) : null}
        </div>

        <Dropzone
          label={excelFile ? excelFile.name : 'Drop Excel file here or click to upload'}
          description="Only .xlsx files are accepted."
          accept=".xlsx"
          icon={FileSpreadsheet}
          onFiles={handleExcelUpload}
        />

        {recipients.length ? (
          <div className="mt-5 overflow-hidden rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Full Name</th>
                  <th className="px-4 py-3">Email</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {recipients.slice(0, 5).map((recipient, index) => (
                  <tr key={`${recipient.email}-${index}`}>
                    <td className="px-4 py-3 font-medium text-slate-900">{recipient.name || 'Unnamed'}</td>
                    <td className="px-4 py-3 text-slate-600">{recipient.email || 'Missing email'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {recipients.length > 5 ? (
              <p className="border-t border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                and {recipients.length - 5} more...
              </p>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Email Content</h3>
            <p className="text-sm text-slate-500">Choose a saved template or write a custom message.</p>
          </div>
          <div className="grid w-full grid-cols-2 rounded-lg bg-slate-100 p-1 text-sm font-semibold sm:w-72">
            <button
              type="button"
              className={useTemplate ? 'rounded-md bg-white px-3 py-2 text-primary shadow-sm' : 'rounded-md px-3 py-2 text-slate-600'}
              onClick={() => setUseTemplate(true)}
            >
              Use Template
            </button>
            <button
              type="button"
              className={!useTemplate ? 'rounded-md bg-white px-3 py-2 text-primary shadow-sm' : 'rounded-md px-3 py-2 text-slate-600'}
              onClick={() => setUseTemplate(false)}
            >
              Write Custom
            </button>
          </div>
        </div>

        {useTemplate ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-slate-700" htmlFor="template">
                Saved template
              </label>
              <select
                id="template"
                value={selectedTemplateId}
                onChange={(event) => setSelectedTemplateId(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-slate-900"
                disabled={templatesLoading}
              >
                <option value="">{templatesLoading ? 'Loading templates...' : 'Select a template'}</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
              {templatesLoading ? <Spinner label="Loading templates" /> : null}
              {selectedTemplate ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase text-slate-500">Subject</p>
                  <p className="mt-1 font-semibold text-slate-900">{selectedTemplate.subject}</p>
                </div>
              ) : null}
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">Body preview</p>
              <PreviewFrame body={activeBody} />
            </div>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700" htmlFor="subject">
                  Subject
                </label>
                <input
                  id="subject"
                  type="text"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-slate-900"
                  placeholder="Spring campaign announcement"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700" htmlFor="body">
                  Body
                </label>
                <textarea
                  id="body"
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  rows={10}
                  className="mt-2 w-full resize-y rounded-lg border border-slate-300 px-3 py-3 text-slate-900"
                  placeholder="Hi [Name],&#10;&#10;We have an update for you..."
                />
                <p className="mt-2 text-sm text-slate-500">Use [Name] to personalize — e.g. Hi [Name], ...</p>
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">Live preview</p>
              <PreviewFrame body={body} />
            </div>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-slate-950">Attachments</h3>
          <p className="text-sm text-slate-500">Add up to 10 images. Template images are included automatically when a template is selected.</p>
        </div>
        <Dropzone
          label="Drop images here or click to upload"
          description="Accepted formats: .jpg, .jpeg, .png, .gif. Maximum 10MB each."
          accept=".jpg,.jpeg,.png,.gif,image/jpeg,image/png,image/gif"
          multiple
          icon={ImagePlus}
          onFiles={handleAttachmentUpload}
        />
        <div className="mt-4">
          <ImagePreviewGrid images={attachments} onRemove={removeAttachment} />
        </div>
      </section>

      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          disabled={!canSend}
          onClick={handleSend}
          className="inline-flex min-h-14 items-center justify-center gap-3 rounded-lg bg-primary px-6 py-4 text-base font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
        >
          {sending ? <Spinner label="Sending" /> : <><Send className="h-5 w-5" aria-hidden="true" /> 🚀 Send to {recipients.length} Recipients</>}
        </button>
        {!canSend && !sending ? (
          <p className="text-sm text-slate-500">Upload recipients and provide a subject and body before sending.</p>
        ) : null}
      </section>

      {sending ? (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <div className="mb-3 flex items-center justify-between gap-3 text-sm text-slate-600">
            <span>
              Sending {sendProgress.sent + sendProgress.failed} / {sendProgress.total} recipients
            </span>
            <span>
              {sendProgress.total ? `${Math.round(((sendProgress.sent + sendProgress.failed) / sendProgress.total) * 100)}%` : 'Starting...'}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${sendProgress.total ? Math.min(100, ((sendProgress.sent + sendProgress.failed) / sendProgress.total) * 100) : 0}%` }}
            />
          </div>
        </section>
      ) : null}

      {results ? (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Results</h3>
              <p className="text-sm text-slate-500">Each recipient is logged in the backend email_logs table.</p>
            </div>
            <button
              type="button"
              onClick={() => downloadResultsCsv(results.results)}
              className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Export CSV
            </button>
          </div>

          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <Stat label="Total" value={results.total} />
            <Stat label="✅ Sent" value={results.sent} color="text-emerald-600" />
            <Stat label="❌ Failed" value={results.failed} color="text-red-600" />
          </div>

          <div className="max-h-96 overflow-auto rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="sticky top-0 bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {results.results.map((result, index) => (
                  <tr key={`${result.email}-${index}`}>
                    <td className="px-4 py-3 font-medium text-slate-900">{result.name || 'Unnamed'}</td>
                    <td className="px-4 py-3 text-slate-600">{result.email || 'Missing email'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={[
                          'inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold',
                          result.status === 'sent' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700',
                        ].join(' ')}
                      >
                        {result.status === 'sent' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                        {result.status}
                      </span>
                    </td>
                    <td className="max-w-md px-4 py-3 text-slate-600">{result.error || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Stat({ label, value, color = 'text-slate-950' }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
