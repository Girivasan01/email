export async function parseRecipientWorkbook(file) {
  if (!file) {
    throw new Error('Choose an Excel workbook first.');
  }

  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    throw new Error('Recipient upload must be a .xlsx Excel workbook.');
  }

  const XLSX = await import('xlsx');
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('The Excel workbook does not contain any sheets.');
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
  if (!rows.length) {
    return [];
  }

  const headers = Object.keys(rows[0]);
  const nameKey = findHeader(headers, 'full name');
  const emailKey = findHeader(headers, 'email');

  if (!nameKey || !emailKey) {
    throw new Error('The Excel workbook must include "Full Name" and "Email" columns.');
  }

  return rows
    .map((row) => ({
      name: String(row[nameKey] || '').trim(),
      email: String(row[emailKey] || '').trim(),
    }))
    .filter((recipient) => recipient.name || recipient.email);
}

function findHeader(headers, expected) {
  return headers.find((header) => normalizeHeader(header) === expected);
}

function normalizeHeader(header) {
  return String(header || '').trim().toLowerCase().replace(/\s+/g, ' ');
}
