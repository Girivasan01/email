export function personalizedBody(body, name = 'John') {
  return String(body || '').replace(/\[Name\]/g, name);
}

export function previewDocument(body, name = 'John') {
  const personalized = personalizedBody(body, name);
  const content = bodyLooksLikeHtml(personalized)
    ? personalized
    : escapeHtml(personalized).replace(/\r?\n/g, '<br>');

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body {
        margin: 0;
        padding: 18px;
        color: #0f172a;
        font-family: Inter, Arial, sans-serif;
        font-size: 15px;
        line-height: 1.65;
        background: #ffffff;
      }
      img { max-width: 100%; height: auto; }
      a { color: #4f46e5; }
    </style>
  </head>
  <body>${content || '<span style="color:#64748b">Email preview appears here.</span>'}</body>
</html>`;
}

function bodyLooksLikeHtml(value) {
  return /<[a-z][\s\S]*>/i.test(value);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
