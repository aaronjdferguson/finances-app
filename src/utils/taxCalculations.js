// =============================================================================
// TAX CALCULATIONS ENGINE
// =============================================================================
// Pure functions that take transactions + settings and compute:
//   - Line totals for any form
//   - Category summaries
//   - Quarterly breakdowns
//   - Year-over-year comparisons
// =============================================================================

import { TAX_CATEGORIES, getTaxCategoryById } from '../constants/taxCategories.js';
import { TAX_FORMS } from '../constants/taxForms.js';

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

/**
 * Parse a date string or Date object into a Date. Returns null if invalid.
 */
function parseDate(d) {
  if (!d) return null;
  if (d instanceof Date) return isNaN(d.getTime()) ? null : d;
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Get the tax year for a transaction (based on transaction date).
 */
export function getTaxYear(transaction) {
  if (transaction.tax_year) return Number(transaction.tax_year);
  const d = parseDate(transaction.date);
  return d ? d.getFullYear() : null;
}

/**
 * Get the quarter (1-4) for a transaction date.
 */
export function getQuarter(transaction) {
  const d = parseDate(transaction.date);
  if (!d) return null;
  const month = d.getMonth() + 1; // 1-12
  return Math.ceil(month / 3);
}

/**
 * Get the signed, deductible amount for a transaction.
 * Applies deductible_percentage (default 100%).
 * Returns the absolute value — caller decides sign based on context.
 */
export function getDeductibleAmount(transaction) {
  const rawAmount = Math.abs(Number(transaction.amount) || 0);
  const pct = transaction.deductible_percentage != null
    ? Number(transaction.deductible_percentage)
    : 100;
  return rawAmount * (pct / 100);
}

/**
 * Filter transactions to a specific tax year.
 */
export function filterByTaxYear(transactions, year) {
  if (!year) return transactions;
  return transactions.filter(t => getTaxYear(t) === Number(year));
}

/**
 * Filter transactions by a member (optional).
 */
export function filterByMember(transactions, member) {
  if (!member || member === 'all') return transactions;
  return transactions.filter(t => t.member === member);
}

/**
 * Filter transactions by tax category id.
 */
export function filterByCategory(transactions, categoryId) {
  return transactions.filter(t => t.tax_category === categoryId);
}

/**
 * Filter transactions where a tax category is set (i.e. flagged as tax-relevant).
 */
export function filterTaxRelevant(transactions) {
  return transactions.filter(t => t.tax_category && t.tax_category !== 'personal_nondeductible');
}

// -----------------------------------------------------------------------------
// CORE AGGREGATIONS
// -----------------------------------------------------------------------------

/**
 * Sum transactions matching any of the given category ids.
 * Applies deductible_percentage.
 * Returns total amount (always positive magnitude).
 */
export function sumByCategories(transactions, categoryIds) {
  if (!Array.isArray(categoryIds) || categoryIds.length === 0) return 0;
  const set = new Set(categoryIds);
  return transactions
    .filter(t => set.has(t.tax_category))
    .reduce((sum, t) => sum + getDeductibleAmount(t), 0);
}

/**
 * Group sums by category id. Returns { [categoryId]: { total, count, transactions } }.
 */
export function summaryByCategory(transactions) {
  const out = {};
  for (const t of transactions) {
    if (!t.tax_category) continue;
    if (!out[t.tax_category]) {
      out[t.tax_category] = { total: 0, count: 0, transactions: [] };
    }
    out[t.tax_category].total += getDeductibleAmount(t);
    out[t.tax_category].count += 1;
    out[t.tax_category].transactions.push(t);
  }
  return out;
}

/**
 * Group sums by schedule. Returns { [schedule]: { total, count, categories: {...} } }.
 */
export function summaryBySchedule(transactions) {
  const byCategory = summaryByCategory(transactions);
  const out = {};
  for (const [catId, data] of Object.entries(byCategory)) {
    const category = getTaxCategoryById(catId);
    if (!category) continue;
    const schedule = category.schedule;
    if (!out[schedule]) {
      out[schedule] = { total: 0, count: 0, categories: {} };
    }
    out[schedule].total += data.total;
    out[schedule].count += data.count;
    out[schedule].categories[catId] = { ...data, category };
  }
  return out;
}

/**
 * Quarterly summary for a given tax year.
 * Returns { q1: { income, deductions }, q2: {...}, q3: {...}, q4: {...} }.
 */
export function quarterlySummary(transactions, taxYear) {
  const yearTxns = filterByTaxYear(transactions, taxYear);
  const quarters = { q1: [], q2: [], q3: [], q4: [] };

  for (const t of yearTxns) {
    const q = getQuarter(t);
    if (q) quarters[`q${q}`].push(t);
  }

  const summarize = (txns) => {
    let income = 0;
    let deductions = 0;
    let credits = 0;
    let adjustments = 0;
    let payments = 0;
    for (const t of txns) {
      const cat = getTaxCategoryById(t.tax_category);
      if (!cat) continue;
      const amt = getDeductibleAmount(t);
      switch (cat.type) {
        case 'income': income += amt; break;
        case 'deduction': deductions += amt; break;
        case 'credit': credits += amt; break;
        case 'adjustment': adjustments += amt; break;
        case 'payment': payments += amt; break;
        default: break;
      }
    }
    return { income, deductions, credits, adjustments, payments, count: txns.length };
  };

  return {
    q1: { ...summarize(quarters.q1), transactions: quarters.q1 },
    q2: { ...summarize(quarters.q2), transactions: quarters.q2 },
    q3: { ...summarize(quarters.q3), transactions: quarters.q3 },
    q4: { ...summarize(quarters.q4), transactions: quarters.q4 },
  };
}

// -----------------------------------------------------------------------------
// FORM LINE COMPUTATION
// -----------------------------------------------------------------------------

/**
 * Compute all line values for a given form.
 *
 * @param {string} formId        - e.g. 'schedule_c'
 * @param {Array}  transactions  - Filtered to the tax year
 * @param {Object} manualEntries - { [lineId]: numberValue } for manual-entry lines
 * @param {Object} settings      - e.g. { filingStatus: 'single' | 'mfj' | 'mfs' | 'hoh' }
 *
 * @returns {Object} {
 *   lineValues: { [lineId]: number },
 *   lineTransactions: { [lineId]: Array<Transaction> },
 *   warnings: Array<{ lineId, message }>
 * }
 */
export function computeFormLines(formId, transactions, manualEntries = {}, settings = {}) {
  const form = TAX_FORMS[formId];
  if (!form) {
    throw new Error(`Unknown form id: ${formId}`);
  }

  const lineValues = {};
  const lineTransactions = {};
  const warnings = [];

  // Flatten all lines across sections, preserving order (important for formulas
  // that depend on earlier lines).
  const allLines = form.sections.flatMap(s => s.lines);

  // Multiple passes so that dependent lines can resolve after their inputs.
  // Three passes is enough for current forms (sum -> subtotal -> computed).
  for (let pass = 0; pass < 3; pass++) {
    for (const line of allLines) {
      if (lineValues[line.id] != null && !Number.isNaN(lineValues[line.id])) {
        // Already computed — skip on later passes unless it depends on something
        // that got filled in later. Our forms don't have back-references so this
        // is safe.
        continue;
      }

      if (line.type === 'sum') {
        const matching = transactions.filter(t =>
          line.categoryIds.includes(t.tax_category)
        );
        lineTransactions[line.id] = matching;
        const total = matching.reduce(
          (sum, t) => sum + getDeductibleAmount(t),
          0
        );
        lineValues[line.id] = total;

        // Emit warnings for transactions flagged as needing review or missing docs
        const needsReview = matching.filter(t => t.needs_review);
        if (needsReview.length > 0) {
          warnings.push({
            lineId: line.id,
            message: `${needsReview.length} transaction(s) on this line are flagged for review`,
            severity: 'warn',
          });
        }
      } else if (line.type === 'subtotal') {
        // Sum of other line ids
        const allResolved = line.lineIds.every(id => lineValues[id] != null);
        if (allResolved) {
          lineValues[line.id] = line.lineIds.reduce(
            (sum, id) => sum + (lineValues[id] || 0),
            0
          );
        }
      } else if (line.type === 'difference') {
        if (lineValues[line.minuend] != null && lineValues[line.subtrahend] != null) {
          lineValues[line.id] =
            (lineValues[line.minuend] || 0) - (lineValues[line.subtrahend] || 0);
        } else if (lineValues[line.minuend] != null && manualEntries[line.subtrahend] != null) {
          lineValues[line.id] =
            (lineValues[line.minuend] || 0) - Number(manualEntries[line.subtrahend] || 0);
        }
      } else if (line.type === 'computed' && typeof line.formula === 'function') {
        try {
          const val = line.formula({ ...lineValues, ...manualEntries }, settings);
          if (!Number.isNaN(val) && val != null) {
            lineValues[line.id] = val;
          }
        } catch (e) {
          // Dependencies not yet resolved — try again next pass
        }
      } else if (line.type === 'manual') {
        // Default to 0 if not entered — this lets downstream subtotals resolve
        lineValues[line.id] = manualEntries[line.id] != null
          ? (Number(manualEntries[line.id]) || 0)
          : 0;
      }
    }
  }

  // Apply caps (e.g. student loan interest capped at $2,500)
  for (const line of allLines) {
    if (line.cap != null && lineValues[line.id] > line.cap) {
      warnings.push({
        lineId: line.id,
        message: `Amount ${formatCurrency(lineValues[line.id])} exceeds IRS cap of ${formatCurrency(line.cap)}. Capped.`,
        severity: 'info',
      });
      lineValues[line.id] = line.cap;
    }
    if (line.warning && lineValues[line.id] > 0) {
      warnings.push({
        lineId: line.id,
        message: line.warning,
        severity: 'info',
      });
    }
  }

  return { lineValues, lineTransactions, warnings };
}

// -----------------------------------------------------------------------------
// MISSING INFO / PRE-FILING CHECKLIST
// -----------------------------------------------------------------------------

/**
 * Scan transactions and produce a list of flags/warnings for the pre-filing
 * checklist.
 */
export function preFilingChecklist(transactions, taxYear) {
  const yearTxns = filterByTaxYear(transactions, taxYear);
  const items = [];

  // Uncategorized but possibly tax-relevant
  const uncategorized = yearTxns.filter(
    t => !t.tax_category && !t.category?.toLowerCase().includes('transfer')
  );
  items.push({
    id: 'uncategorized',
    level: uncategorized.length > 0 ? 'warning' : 'success',
    label: 'All transactions have a tax category assigned',
    detail:
      uncategorized.length === 0
        ? 'All transactions are categorized.'
        : `${uncategorized.length} transaction(s) still need a tax category.`,
    transactions: uncategorized,
  });

  // needs_review flagged
  const needsReview = yearTxns.filter(t => t.needs_review);
  items.push({
    id: 'needs_review',
    level: needsReview.length > 0 ? 'warning' : 'success',
    label: 'No transactions flagged for review',
    detail:
      needsReview.length === 0
        ? 'No transactions need review.'
        : `${needsReview.length} transaction(s) need review before filing.`,
    transactions: needsReview,
  });

  // Large charitable donations without docs
  const largeCharitable = yearTxns.filter(t => {
    if (!['charitable_cash', 'charitable_noncash'].includes(t.tax_category)) return false;
    return getDeductibleAmount(t) >= 250 && !t.tax_notes;
  });
  items.push({
    id: 'charitable_doc',
    level: largeCharitable.length > 0 ? 'warning' : 'success',
    label: 'Charitable donations $250+ have documentation notes',
    detail:
      largeCharitable.length === 0
        ? 'All large donations have notes.'
        : `${largeCharitable.length} donation(s) of $250+ need a note confirming written acknowledgment from the charity.`,
    transactions: largeCharitable,
  });

  // Non-cash donations > $500 (require Form 8283)
  const noncashTotal = yearTxns
    .filter(t => t.tax_category === 'charitable_noncash')
    .reduce((s, t) => s + getDeductibleAmount(t), 0);
  if (noncashTotal > 500) {
    items.push({
      id: 'form_8283',
      level: 'info',
      label: `Non-cash donations total ${formatCurrency(noncashTotal)} — Form 8283 required`,
      detail: 'Non-cash donations exceeding $500 require Form 8283.',
    });
  }

  // Self-employment income present — reminder about estimated taxes
  const seIncome = yearTxns
    .filter(t => t.tax_category === '1099_nec')
    .reduce((s, t) => s + getDeductibleAmount(t), 0);
  if (seIncome > 0) {
    const estPayments = yearTxns
      .filter(t => t.tax_category === 'estimated_tax_federal')
      .reduce((s, t) => s + getDeductibleAmount(t), 0);
    items.push({
      id: 'se_estimated_taxes',
      level: estPayments === 0 ? 'warning' : 'info',
      label: `Self-employment income ${formatCurrency(seIncome)} — ${estPayments > 0 ? 'estimated taxes recorded' : 'no estimated taxes found'}`,
      detail: `Federal estimated payments logged: ${formatCurrency(estPayments)}`,
    });
  }

  // Mortgage interest present — mortgage principal reminder
  const mortgageInterest = yearTxns.filter(
    t => t.tax_category === 'mortgage_interest'
  );
  if (mortgageInterest.length > 0) {
    items.push({
      id: 'mortgage_1098',
      level: 'info',
      label: 'Verify Form 1098 total matches recorded mortgage interest',
      detail: `You have ${mortgageInterest.length} mortgage interest transaction(s) totaling ${formatCurrency(mortgageInterest.reduce((s, t) => s + getDeductibleAmount(t), 0))}. Cross-check against Form 1098 from your lender.`,
    });
  }

  return items;
}

// -----------------------------------------------------------------------------
// UTILITY: FORMATTING
// -----------------------------------------------------------------------------

export function formatCurrency(value, options = {}) {
  if (value == null || Number.isNaN(Number(value))) return '$0.00';
  const { hideZero = false, compact = false } = options;
  const num = Number(value);
  if (hideZero && num === 0) return '';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: compact ? 0 : 2,
    maximumFractionDigits: compact ? 0 : 2,
  }).format(num);
}

export function formatDate(value) {
  const d = parseDate(value);
  if (!d) return '';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// -----------------------------------------------------------------------------
// YEAR-OVER-YEAR COMPARISON
// -----------------------------------------------------------------------------

/**
 * Compare two tax years. Returns array of rows with category, current, prior, change.
 */
export function yearOverYear(transactions, currentYear, priorYear) {
  const curSummary = summaryByCategory(filterByTaxYear(transactions, currentYear));
  const priorSummary = summaryByCategory(filterByTaxYear(transactions, priorYear));

  const allCategoryIds = new Set([
    ...Object.keys(curSummary),
    ...Object.keys(priorSummary),
  ]);

  const rows = [];
  for (const catId of allCategoryIds) {
    const category = getTaxCategoryById(catId);
    if (!category) continue;
    const cur = curSummary[catId]?.total || 0;
    const prior = priorSummary[catId]?.total || 0;
    rows.push({
      categoryId: catId,
      category,
      current: cur,
      prior,
      change: cur - prior,
      changePct: prior > 0 ? ((cur - prior) / prior) * 100 : null,
    });
  }
  rows.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  return rows;
}
