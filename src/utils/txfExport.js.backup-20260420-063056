// =============================================================================
// TURBOTAX TXF EXPORT
// =============================================================================
// Generates a .txf file (Tax Exchange Format) that TurboTax, H&R Block
// Tax Software, TaxAct, and other tax programs can import directly.
//
// Format specification: https://turbotax.intuit.com/txf/
//
// File structure:
//   V042           - Version header
//   A<software>    - Application name (appears on one line)
//   D<MM/DD/YYYY>  - Export date
//   ^              - End of header record
//
//   Then one record per transaction:
//   TD             - Detail record (TD = transaction detail; TS = summary)
//   D<MM/DD/YYYY>  - Transaction date
//   N<code>        - TXF reference number (maps to tax form line)
//   C1             - Copy number (1 = primary)
//   L1             - Line number within the TXF record
//   $<amount>      - Amount
//   P<payee>       - Payee/description
//   ^              - End of record
// =============================================================================

import { getTaxCategoryById } from '../constants/taxCategories.js';
import { getDeductibleAmount } from './taxCalculations.js';

/**
 * Format a date as MM/DD/YYYY for TXF.
 */
function formatTxfDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

/**
 * Clean a string for TXF — strip newlines, carets (which delimit records),
 * and trim whitespace.
 */
function txfClean(str) {
  if (!str) return '';
  return String(str).replace(/[\r\n^]/g, ' ').trim();
}

/**
 * Determine whether a category represents income (positive in TXF) or
 * a deduction (also positive — TXF treats deductions as positive values
 * on deduction-type lines).
 */
function txfSign(category, amount) {
  // Most TXF lines expect a positive number regardless of whether it's
  // income or a deduction. The TXF code itself tells the tax software
  // how to classify it.
  return Math.abs(Number(amount) || 0);
}

/**
 * Build the TXF content from transactions.
 *
 * @param {Array}  transactions - Transactions (should already be filtered to
 *                                 the relevant tax year)
 * @param {Object} options      - { taxYear, softwareName }
 * @returns {string} TXF file content
 */
export function buildTxfExport(transactions, options = {}) {
  const {
    taxYear = new Date().getFullYear(),
    softwareName = 'FinanceOS',
  } = options;

  const lines = [];

  // Header
  lines.push('V042');                                    // TXF version
  lines.push(`A${txfClean(softwareName)}`);              // Application
  lines.push(`D${formatTxfDate(new Date())}`);           // Export date
  lines.push('^');                                       // End of header

  let recordsWritten = 0;
  let recordsSkipped = 0;

  for (const t of transactions) {
    const cat = t.tax_category ? getTaxCategoryById(t.tax_category) : null;

    // Skip if no tax category or if category has no TXF code
    if (!cat || !cat.txfCode) {
      recordsSkipped++;
      continue;
    }

    // Skip non-deductible personal expenses
    if (cat.type === 'personal') {
      recordsSkipped++;
      continue;
    }

    const amount = getDeductibleAmount(t);
    if (amount === 0) {
      recordsSkipped++;
      continue;
    }

    // Detail record
    lines.push('TD');                                    // Detail (per-transaction)
    lines.push(cat.txfCode);                             // TXF reference code (already prefixed with N)
    lines.push('C1');                                    // Copy 1 (single instance)
    lines.push('L1');                                    // Line 1 within record
    lines.push(`D${formatTxfDate(t.date)}`);             // Transaction date
    lines.push(`$${txfSign(cat, amount).toFixed(2)}`);   // Amount
    lines.push(`P${txfClean(t.description || 'Transaction')}`); // Payee
    if (t.tax_notes) {
      lines.push(`X${txfClean(t.tax_notes)}`);           // Extended memo
    }
    lines.push('^');                                     // End of record
    recordsWritten++;
  }

  return {
    content: lines.join('\n') + '\n',
    recordsWritten,
    recordsSkipped,
    taxYear,
  };
}

/**
 * Trigger a browser download of the TXF file.
 */
export function downloadTxfExport(transactions, options = {}) {
  const { taxYear = new Date().getFullYear() } = options;
  const { content, recordsWritten, recordsSkipped } = buildTxfExport(
    transactions,
    options
  );

  const filename = `FinanceOS_TaxYear_${taxYear}.txf`;
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  return { filename, recordsWritten, recordsSkipped };
}
