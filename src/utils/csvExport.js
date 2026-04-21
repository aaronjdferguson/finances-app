// =============================================================================
// CSV EXPORT
// =============================================================================
// Exports transactions to CSV with full tax metadata.
// Output is safe for Excel, Google Sheets, and most tax software.
// =============================================================================

import { getTaxCategoryById } from '../constants/taxCategories.js';
import { getDeductibleAmount, formatDate } from './taxCalculations.js';

/**
 * Escape a field for CSV. Wraps in quotes if needed, escapes inner quotes.
 */
function csvEscape(value) {
  if (value == null) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Join a row of fields into a CSV line.
 */
function csvRow(fields) {
  return fields.map(csvEscape).join(',');
}

/**
 * Build CSV content from transactions.
 *
 * Output columns:
 *   Date, Description, Amount, Account, Category, Member,
 *   Tax Category, Tax Form, Tax Line, Tax Schedule, Tax Type,
 *   Deductible %, Deductible Amount, TXF Code, Tax Notes, Needs Review
 */
export function buildTaxCSV(transactions) {
  const header = [
    'Date',
    'Description',
    'Amount',
    'Account',
    'Category',
    'Member',
    'Tax Category',
    'Tax Form',
    'Tax Line',
    'Tax Schedule',
    'Tax Type',
    'Deductible %',
    'Deductible Amount',
    'TXF Code',
    'Tax Notes',
    'Needs Review',
    'Transaction ID',
  ];

  const rows = [csvRow(header)];

  for (const t of transactions) {
    const cat = t.tax_category ? getTaxCategoryById(t.tax_category) : null;
    const deductiblePct = t.deductible_percentage != null
      ? Number(t.deductible_percentage)
      : 100;
    const deductibleAmount = getDeductibleAmount(t);

    rows.push(
      csvRow([
        formatDate(t.date),
        t.description || '',
        typeof t.amount === 'number' ? t.amount.toFixed(2) : t.amount || '',
        t.account || '',
        t.category || '',
        t.member || '',
        cat?.label || '',
        cat?.form || '',
        cat?.line || '',
        cat?.schedule || '',
        cat?.type || '',
        deductiblePct,
        deductibleAmount.toFixed(2),
        cat?.txfCode || '',
        t.tax_notes || '',
        t.needs_review ? 'Yes' : 'No',
        t.id || '',
      ])
    );
  }

  return rows.join('\r\n');
}

/**
 * Trigger a browser download of the CSV.
 */
export function downloadTaxCSV(transactions, filename = 'tax_transactions.csv') {
  const csv = buildTaxCSV(transactions);
  // Add a UTF-8 BOM so Excel recognizes unicode (dollar signs, em-dashes etc.)
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Build a CSV summary organized by form and line (one row per line, with totals).
 * Useful to hand to a tax preparer as a quick-reference sheet.
 */
export function buildFormLineSummaryCSV(lineValues, lineLabels) {
  const header = ['Form', 'Line', 'Description', 'Amount'];
  const rows = [csvRow(header)];
  for (const [lineId, value] of Object.entries(lineValues)) {
    const meta = lineLabels[lineId] || {};
    rows.push(
      csvRow([
        meta.form || '',
        meta.lineNumber || '',
        meta.description || '',
        (Number(value) || 0).toFixed(2),
      ])
    );
  }
  return rows.join('\r\n');
}
