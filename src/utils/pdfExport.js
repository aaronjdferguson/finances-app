// =============================================================================
// TAX PROFESSIONAL REPORT
// =============================================================================
// Generates a print-ready HTML report that the user can:
//   - Save as PDF via browser's Print > "Save as PDF" option
//   - Print directly to paper
//   - Email to their tax preparer
//
// Zero dependencies. Uses window.open() + print CSS.
// =============================================================================

import { getTaxCategoryById } from '../constants/taxCategories.js';
import { TAX_FORMS } from '../constants/taxForms.js';
import {
  summaryBySchedule,
  computeFormLines,
  filterByTaxYear,
  quarterlySummary,
  preFilingChecklist,
  formatCurrency,
  formatDate,
  getDeductibleAmount,
} from './taxCalculations.js';

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Build the HTML report.
 *
 * @param {Object} params
 * @param {Array}  params.transactions
 * @param {number} params.taxYear
 * @param {Object} params.settings         - { taxpayerName, filingStatus, preparedFor }
 * @param {Object} params.manualEntries    - Optional manual entries for form lines
 */
export function buildTaxReportHTML({
  transactions,
  taxYear,
  settings = {},
  manualEntries = {},
}) {
  const yearTxns = filterByTaxYear(transactions, taxYear);
  const scheduleSummary = summaryBySchedule(yearTxns);
  const quarters = quarterlySummary(transactions, taxYear);
  const checklist = preFilingChecklist(transactions, taxYear);

  const taxpayerName = escapeHtml(settings.taxpayerName || '_________________________');
  const filingStatus = escapeHtml(settings.filingStatus || 'Not specified');
  const preparedFor = escapeHtml(settings.preparedFor || 'Tax Records');
  const preparedDate = formatDate(new Date());

  // ---------------------------------------------------------------------------
  // Helpers for building report sections
  // ---------------------------------------------------------------------------
  const renderTransactionRow = (t) => {
    const cat = t.tax_category ? getTaxCategoryById(t.tax_category) : null;
    const amount = getDeductibleAmount(t);
    return `
      <tr>
        <td>${escapeHtml(formatDate(t.date))}</td>
        <td>${escapeHtml(t.description || '')}</td>
        <td>${escapeHtml(t.account || '')}</td>
        <td class="num">${escapeHtml(formatCurrency(amount))}</td>
        <td class="small">${cat ? `${escapeHtml(cat.form)} ${escapeHtml(cat.line)}` : ''}</td>
        <td class="small">${escapeHtml(t.tax_notes || '')}</td>
      </tr>
    `;
  };

  const renderScheduleSection = (scheduleName, data) => {
    const categoryEntries = Object.values(data.categories).sort((a, b) =>
      (a.category.line || '').localeCompare(b.category.line || '')
    );
    return `
      <section class="schedule-block">
        <h3>${escapeHtml(scheduleName)}</h3>
        <table class="category-summary">
          <thead>
            <tr>
              <th>Form &amp; Line</th>
              <th>Category</th>
              <th class="num"># Txns</th>
              <th class="num">Total</th>
            </tr>
          </thead>
          <tbody>
            ${categoryEntries
              .map(
                ({ category, total, count }) => `
              <tr>
                <td>${escapeHtml(category.form)} · ${escapeHtml(category.line)}</td>
                <td>${escapeHtml(category.label)}</td>
                <td class="num">${count}</td>
                <td class="num">${escapeHtml(formatCurrency(total))}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" class="total-label">Schedule Total</td>
              <td class="num total">${escapeHtml(formatCurrency(data.total))}</td>
            </tr>
          </tfoot>
        </table>

        <details>
          <summary>Show ${data.count} transaction${data.count !== 1 ? 's' : ''}</summary>
          <table class="detail-txns">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Account</th>
                <th class="num">Amount</th>
                <th>Form/Line</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${categoryEntries
                .flatMap(({ transactions: catTxns }) =>
                  catTxns.sort((a, b) => new Date(a.date) - new Date(b.date))
                )
                .map(renderTransactionRow)
                .join('')}
            </tbody>
          </table>
        </details>
      </section>
    `;
  };

  const renderFormLines = (formId) => {
    const form = TAX_FORMS[formId];
    if (!form) return '';
    const { lineValues } = computeFormLines(
      formId,
      yearTxns,
      manualEntries,
      settings
    );
    return `
      <section class="form-lines">
        <h3>${escapeHtml(form.title)}</h3>
        ${form.sections
          .map(
            (section) => `
          <h4>${escapeHtml(section.title)}</h4>
          <table class="line-table">
            <thead>
              <tr>
                <th style="width: 70px">Line</th>
                <th>Description</th>
                <th class="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${section.lines
                .map((line) => {
                  const val = lineValues[line.id] || 0;
                  const isGrandTotal = line.isGrandTotal;
                  return `
                <tr class="${isGrandTotal ? 'grand-total' : ''}">
                  <td>${escapeHtml(line.lineNumber)}</td>
                  <td>${escapeHtml(line.description)}</td>
                  <td class="num">${escapeHtml(formatCurrency(val))}</td>
                </tr>
              `;
                })
                .join('')}
            </tbody>
          </table>
        `
          )
          .join('')}
      </section>
    `;
  };

  // ---------------------------------------------------------------------------
  // Totals for cover page
  // ---------------------------------------------------------------------------
  let totalIncome = 0;
  let totalDeductions = 0;
  let totalAdjustments = 0;
  let totalPayments = 0;
  for (const [schedule, data] of Object.entries(scheduleSummary)) {
    for (const { category, total } of Object.values(data.categories)) {
      switch (category.type) {
        case 'income': totalIncome += total; break;
        case 'deduction': totalDeductions += total; break;
        case 'adjustment': totalAdjustments += total; break;
        case 'payment': totalPayments += total; break;
        default: break;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Assemble HTML
  // ---------------------------------------------------------------------------
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Tax Report ${taxYear} — ${taxpayerName}</title>
<style>
  @page { size: letter; margin: 0.5in; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    font-size: 10pt;
    line-height: 1.4;
    color: #111;
    margin: 0;
    padding: 20px;
    max-width: 8in;
    margin: 0 auto;
  }
  h1 { font-size: 20pt; margin: 0 0 4px; letter-spacing: -0.02em; }
  h2 { font-size: 14pt; margin: 24px 0 8px; border-bottom: 2px solid #111; padding-bottom: 4px; }
  h3 { font-size: 12pt; margin: 18px 0 6px; color: #222; }
  h4 { font-size: 10.5pt; margin: 12px 0 4px; color: #444; font-weight: 600; }
  p { margin: 4px 0; }
  .muted { color: #666; }
  .small { font-size: 9pt; color: #555; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .cover {
    text-align: left;
    padding: 12px 0 20px;
    border-bottom: 1px solid #ccc;
    margin-bottom: 12px;
  }
  .cover-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; margin-top: 10px; font-size: 10pt; }
  .cover-grid dt { font-weight: 600; color: #555; }
  .cover-grid dd { margin: 0; }
  .summary-cards {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin: 14px 0 18px;
  }
  .card {
    border: 1px solid #ccc;
    padding: 10px 12px;
    border-radius: 4px;
    background: #fafafa;
  }
  .card .label { font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.04em; color: #666; }
  .card .value { font-size: 14pt; font-weight: 600; margin-top: 2px; }
  .card.income .value { color: #0a7c32; }
  .card.deduction .value { color: #b45309; }
  table { width: 100%; border-collapse: collapse; margin: 6px 0 10px; }
  th { text-align: left; font-weight: 600; padding: 6px 8px; background: #f4f4f4; border-bottom: 2px solid #ccc; font-size: 9.5pt; }
  td { padding: 5px 8px; border-bottom: 1px solid #eee; font-size: 9.5pt; vertical-align: top; }
  tfoot td { font-weight: 600; border-top: 2px solid #ccc; background: #fafafa; }
  .total-label { text-align: right; }
  .total { font-weight: 700; }
  .grand-total td { font-weight: 700; background: #fff8e1; border-top: 2px solid #000; }
  .schedule-block { margin: 16px 0; page-break-inside: avoid; }
  details { margin: 6px 0 12px; }
  summary { cursor: pointer; color: #0055cc; font-size: 9.5pt; padding: 4px 0; }
  .detail-txns { font-size: 9pt; }
  .checklist { margin: 8px 0; padding: 0; list-style: none; }
  .checklist li { padding: 6px 10px; border-left: 3px solid #ccc; margin: 4px 0; background: #fafafa; }
  .checklist li.success { border-left-color: #0a7c32; }
  .checklist li.warning { border-left-color: #d97706; background: #fff7ed; }
  .checklist li.info { border-left-color: #2563eb; background: #eff6ff; }
  .checklist .label { font-weight: 600; }
  .checklist .detail { display: block; font-size: 9pt; color: #555; margin-top: 2px; }
  .quarters { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
  .quarter { border: 1px solid #ddd; padding: 8px; border-radius: 4px; font-size: 9pt; }
  .quarter h5 { margin: 0 0 4px; font-size: 10pt; }
  .quarter .row { display: flex; justify-content: space-between; padding: 2px 0; }
  .page-break { page-break-before: always; }
  @media print {
    body { padding: 0; }
    details[open] summary { display: none; }
    details > *:not(summary) { display: block !important; }
    details { display: block !important; }
    details > :not(summary) { display: revert !important; }
  }
  .print-button {
    position: fixed;
    top: 10px;
    right: 10px;
    background: #0055cc;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }
  @media print { .print-button { display: none; } }
</style>
</head>
<body>
<button class="print-button" onclick="window.print()">🖨️ Print / Save as PDF</button>

<!-- COVER -->
<section class="cover">
  <h1>Tax Summary Report — ${taxYear}</h1>
  <p class="muted">Generated ${escapeHtml(preparedDate)} by FinanceOS</p>
  <dl class="cover-grid">
    <dt>Taxpayer</dt><dd>${taxpayerName}</dd>
    <dt>Filing Status</dt><dd>${filingStatus}</dd>
    <dt>Tax Year</dt><dd>${taxYear}</dd>
    <dt>Prepared For</dt><dd>${preparedFor}</dd>
  </dl>
</section>

<!-- AT-A-GLANCE -->
<section>
  <h2>At-a-Glance</h2>
  <div class="summary-cards">
    <div class="card income">
      <div class="label">Total Income</div>
      <div class="value">${escapeHtml(formatCurrency(totalIncome))}</div>
    </div>
    <div class="card deduction">
      <div class="label">Total Deductions</div>
      <div class="value">${escapeHtml(formatCurrency(totalDeductions))}</div>
    </div>
    <div class="card">
      <div class="label">Adjustments</div>
      <div class="value">${escapeHtml(formatCurrency(totalAdjustments))}</div>
    </div>
    <div class="card">
      <div class="label">Est. Tax Paid</div>
      <div class="value">${escapeHtml(formatCurrency(totalPayments))}</div>
    </div>
  </div>
</section>

<!-- PRE-FILING CHECKLIST -->
<section>
  <h2>Pre-Filing Checklist</h2>
  <ul class="checklist">
    ${checklist
      .map(
        (item) => `
      <li class="${item.level}">
        <span class="label">${escapeHtml(item.label)}</span>
        <span class="detail">${escapeHtml(item.detail || '')}</span>
      </li>
    `
      )
      .join('')}
  </ul>
</section>

<!-- QUARTERLY SUMMARY -->
<section>
  <h2>Quarterly Summary</h2>
  <div class="quarters">
    ${['q1', 'q2', 'q3', 'q4']
      .map((qKey, idx) => {
        const q = quarters[qKey];
        const label = ['Q1 Jan–Mar', 'Q2 Apr–Jun', 'Q3 Jul–Sep', 'Q4 Oct–Dec'][idx];
        return `
      <div class="quarter">
        <h5>${label}</h5>
        <div class="row"><span>Income</span><span>${escapeHtml(formatCurrency(q.income))}</span></div>
        <div class="row"><span>Deductions</span><span>${escapeHtml(formatCurrency(q.deductions))}</span></div>
        <div class="row"><span>Payments</span><span>${escapeHtml(formatCurrency(q.payments))}</span></div>
        <div class="row"><span>Txns</span><span>${q.count}</span></div>
      </div>
      `;
      })
      .join('')}
  </div>
</section>

<!-- SCHEDULE SUMMARIES -->
<section>
  <h2>Summary by Schedule</h2>
  ${Object.entries(scheduleSummary)
    .map(([schedule, data]) => renderScheduleSection(schedule, data))
    .join('')}
</section>

<!-- FORM-LEVEL LINE BREAKDOWN -->
<section class="page-break">
  <h2>Form-by-Form Line Breakdown</h2>
  <p class="muted">Below are the computed amounts for each line on the relevant IRS forms. These values can be entered directly into TurboTax, another tax program, or handed to a tax preparer.</p>
  ${['schedule_a', 'schedule_c', 'schedule_e', 'schedule_1']
    .map((formId) => renderFormLines(formId))
    .join('')}
</section>

<!-- FOOTER -->
<section style="margin-top:40px;border-top:1px solid #ccc;padding-top:10px;" class="muted small">
  <p>This report was generated by FinanceOS. All figures are derived from categorized transactions as of ${escapeHtml(preparedDate)}. Cross-check against 1099 forms, W-2s, and other official tax documents before filing. Consult a qualified tax professional for advice specific to your situation.</p>
</section>

</body>
</html>`;
}

/**
 * Open the report in a new tab/window. User can then print or save as PDF.
 */
export function openTaxReport(params) {
  const html = buildTaxReportHTML(params);
  const win = window.open('', '_blank');
  if (!win) {
    alert(
      'Pop-up blocked. Please allow pop-ups for this site to view the tax report.'
    );
    return;
  }
  win.document.write(html);
  win.document.close();
  win.document.title = `Tax Report ${params.taxYear}`;
}
