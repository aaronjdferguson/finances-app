import React, { useState, useMemo } from 'react';
import {
  filterByTaxYear,
  summaryBySchedule,
  quarterlySummary,
  preFilingChecklist,
  formatCurrency,
  formatDate,
  getDeductibleAmount,
  yearOverYear,
  getTaxYear,
} from '../utils/taxCalculations.js';
import { getTaxCategoryById, TAX_TYPES } from '../constants/taxCategories.js';
import { downloadTaxCSV } from '../utils/csvExport.js';
import { downloadTxfExport } from '../utils/txfExport.js';
import { openTaxReport } from '../utils/pdfExport.js';
import FormHelper from './FormHelper.jsx';

/**
 * TaxCenter
 *
 * The main tax dashboard. Displays:
 *   - At-a-glance summary cards
 *   - Year selector
 *   - Pre-filing checklist
 *   - Schedule-by-schedule breakdowns (expandable)
 *   - Quarterly view
 *   - Year-over-year comparison
 *   - Export buttons (CSV / TXF / PDF)
 *   - Launch Form Helper
 *
 * Props:
 *   transactions - All transactions (any year; will be filtered)
 *   settings     - { taxpayerName, filingStatus, state, ... } (see TaxSettings)
 *   onUpdateSettings - (newSettings) => void (optional)
 */
export default function TaxCenter({ transactions = [], settings = {}, onUpdateSettings }) {
  // Derive available tax years from transactions
  const availableYears = useMemo(() => {
    const years = new Set();
    for (const t of transactions) {
      const y = getTaxYear(t);
      if (y) years.add(y);
    }
    const sorted = [...years].sort((a, b) => b - a);
    if (sorted.length === 0) sorted.push(new Date().getFullYear());
    return sorted;
  }, [transactions]);

  const [selectedYear, setSelectedYear] = useState(availableYears[0]);
  const [view, setView] = useState('dashboard'); // 'dashboard' | 'form_helper'
  const [expandedSchedule, setExpandedSchedule] = useState(null);

  const yearTxns = useMemo(
    () => filterByTaxYear(transactions, selectedYear),
    [transactions, selectedYear]
  );

  const scheduleSummary = useMemo(() => summaryBySchedule(yearTxns), [yearTxns]);
  const quarters = useMemo(
    () => quarterlySummary(transactions, selectedYear),
    [transactions, selectedYear]
  );
  const checklist = useMemo(
    () => preFilingChecklist(transactions, selectedYear),
    [transactions, selectedYear]
  );

  // Compute totals by type
  const totals = useMemo(() => {
    const t = { income: 0, deduction: 0, adjustment: 0, credit: 0, payment: 0, txnCount: yearTxns.length };
    for (const data of Object.values(scheduleSummary)) {
      for (const { category, total } of Object.values(data.categories)) {
        if (t[category.type] != null) t[category.type] += total;
      }
    }
    return t;
  }, [scheduleSummary, yearTxns]);

  const priorYear = selectedYear - 1;
  const yoyRows = useMemo(
    () => yearOverYear(transactions, selectedYear, priorYear).filter(r => r.current > 0 || r.prior > 0),
    [transactions, selectedYear, priorYear]
  );

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleExportCSV = () => {
    downloadTaxCSV(
      yearTxns,
      `FinanceOS_TaxTransactions_${selectedYear}.csv`
    );
  };

  const handleExportTXF = () => {
    const result = downloadTxfExport(yearTxns, {
      taxYear: selectedYear,
      softwareName: 'FinanceOS',
    });
    alert(
      `TXF export complete: ${result.recordsWritten} records written, ${result.recordsSkipped} skipped.\n\nFile: ${result.filename}\n\nImport this file into TurboTax via File > Import > From Accounting Software.`
    );
  };

  const handleExportPDF = () => {
    openTaxReport({
      transactions,
      taxYear: selectedYear,
      settings,
    });
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  if (view === 'form_helper') {
    return (
      <div>
        <div className="mb-4 flex items-center gap-3">
          <button
            onClick={() => setView('dashboard')}
            className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
          >
            ← Back to Tax Center
          </button>
        </div>
        <FormHelper
          transactions={transactions}
          taxYear={selectedYear}
          settings={settings}
        />
      </div>
    );
  }

  return (
    <div className="tax-center max-w-6xl mx-auto p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div>
          <h2 className="text-3xl font-bold">Tax Center</h2>
          <p className="text-sm text-gray-600 mt-1">
            Live tax tracking across all your categorized transactions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold">Tax Year:</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 border rounded-md text-sm"
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <SummaryCard label="Total Income" value={totals.income} color="green" />
        <SummaryCard label="Deductions" value={totals.deduction} color="orange" />
        <SummaryCard label="Adjustments" value={totals.adjustment} color="blue" />
        <SummaryCard label="Credits" value={totals.credit} color="purple" />
        <SummaryCard label="Est. Tax Paid" value={totals.payment} color="gray" />
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setView('form_helper')}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold text-sm"
        >
          📋 Open Form Helper
        </button>
        <button
          onClick={handleExportTXF}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
        >
          💾 Export to TurboTax (.txf)
        </button>
        <button
          onClick={handleExportPDF}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
        >
          📄 Tax Preparer Report (PDF)
        </button>
        <button
          onClick={handleExportCSV}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
        >
          📊 Export CSV
        </button>
      </div>

      {/* Pre-filing checklist */}
      <section className="mb-6">
        <h3 className="text-xl font-bold mb-2">Pre-Filing Checklist</h3>
        <ul className="space-y-1">
          {checklist.map((item) => (
            <li
              key={item.id}
              className={`p-3 rounded border-l-4 ${
                item.level === 'success'
                  ? 'bg-green-50 border-green-500'
                  : item.level === 'warning'
                    ? 'bg-amber-50 border-amber-500'
                    : 'bg-blue-50 border-blue-500'
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="text-lg leading-none">
                  {item.level === 'success'
                    ? '✓'
                    : item.level === 'warning'
                      ? '⚠'
                      : 'ℹ'}
                </span>
                <div className="flex-1">
                  <div className="font-semibold text-sm">{item.label}</div>
                  <div className="text-xs text-gray-600 mt-0.5">
                    {item.detail}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Quarterly summary */}
      <section className="mb-6">
        <h3 className="text-xl font-bold mb-2">Quarterly View (for Estimated Taxes)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {['q1', 'q2', 'q3', 'q4'].map((qKey, idx) => {
            const q = quarters[qKey];
            const label = ['Q1 Jan–Mar', 'Q2 Apr–Jun', 'Q3 Jul–Sep', 'Q4 Oct–Dec'][idx];
            return (
              <div key={qKey} className="border rounded p-3 bg-white">
                <div className="font-semibold text-sm mb-2">{label}</div>
                <QuarterRow label="Income" value={q.income} />
                <QuarterRow label="Deductions" value={q.deductions} />
                <QuarterRow label="Payments" value={q.payments} />
                <div className="text-xs text-gray-500 mt-2 pt-2 border-t">
                  {q.count} transaction{q.count !== 1 ? 's' : ''}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Schedule summaries */}
      <section className="mb-6">
        <h3 className="text-xl font-bold mb-2">Summary by Schedule</h3>
        {Object.keys(scheduleSummary).length === 0 ? (
          <div className="p-6 bg-gray-50 border-2 border-dashed border-gray-300 rounded text-center text-gray-600">
            No tax-categorized transactions for {selectedYear} yet.
            <br />
            <span className="text-xs">
              Assign tax categories to transactions in the Transactions tab to see them here.
            </span>
          </div>
        ) : (
          <div className="space-y-2">
            {Object.entries(scheduleSummary).map(([scheduleName, data]) => {
              const isExpanded = expandedSchedule === scheduleName;
              const categoryList = Object.values(data.categories).sort((a, b) =>
                (a.category.line || '').localeCompare(b.category.line || '')
              );
              return (
                <div
                  key={scheduleName}
                  className="border rounded overflow-hidden bg-white"
                >
                  <button
                    onClick={() =>
                      setExpandedSchedule(isExpanded ? null : scheduleName)
                    }
                    className="w-full px-4 py-3 flex justify-between items-center bg-gray-50 hover:bg-gray-100 text-left"
                  >
                    <div>
                      <div className="font-semibold">{scheduleName}</div>
                      <div className="text-xs text-gray-600">
                        {data.count} transaction{data.count !== 1 ? 's' : ''} across{' '}
                        {Object.keys(data.categories).length} categor
                        {Object.keys(data.categories).length !== 1 ? 'ies' : 'y'}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="font-mono font-bold text-lg">
                        {formatCurrency(data.total)}
                      </div>
                      <span className="text-gray-400">
                        {isExpanded ? '▼' : '▶'}
                      </span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-xs text-gray-600">
                            <th className="text-left px-4 py-2">Form / Line</th>
                            <th className="text-left px-4 py-2">Category</th>
                            <th className="text-right px-4 py-2">Count</th>
                            <th className="text-right px-4 py-2">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {categoryList.map(({ category, total, count, transactions: catTxns }) => (
                            <React.Fragment key={category.id}>
                              <tr className="border-t hover:bg-blue-50">
                                <td className="px-4 py-2 font-mono text-xs">
                                  {category.form}
                                  <br />
                                  <span className="text-gray-500">{category.line}</span>
                                </td>
                                <td className="px-4 py-2">
                                  {category.label}
                                  {category.notes && (
                                    <div className="text-xs text-amber-600 italic mt-0.5">
                                      ⚠ {category.notes}
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-2 text-right">{count}</td>
                                <td className="px-4 py-2 text-right font-mono font-semibold">
                                  {formatCurrency(total)}
                                </td>
                              </tr>
                              {/* Transaction detail rows (always shown when schedule expanded) */}
                              {catTxns.slice(0, 5).map((t) => (
                                <tr key={t.id} className="border-t text-xs bg-gray-50/50">
                                  <td></td>
                                  <td className="px-4 py-1 text-gray-600">
                                    {formatDate(t.date)} — {t.description}
                                  </td>
                                  <td></td>
                                  <td className="px-4 py-1 text-right text-gray-600">
                                    {formatCurrency(getDeductibleAmount(t))}
                                  </td>
                                </tr>
                              ))}
                              {catTxns.length > 5 && (
                                <tr className="border-t text-xs bg-gray-50/50">
                                  <td></td>
                                  <td className="px-4 py-1 text-gray-500 italic">
                                    + {catTxns.length - 5} more…
                                  </td>
                                  <td></td>
                                  <td></td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Year-over-year */}
      {yoyRows.length > 0 && (
        <section className="mb-6">
          <h3 className="text-xl font-bold mb-2">
            {selectedYear} vs {priorYear} — Year-over-Year
          </h3>
          <table className="w-full text-sm border bg-white rounded overflow-hidden">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-600">
                <th className="text-left px-4 py-2">Category</th>
                <th className="text-right px-4 py-2">{selectedYear}</th>
                <th className="text-right px-4 py-2">{priorYear}</th>
                <th className="text-right px-4 py-2">Change</th>
              </tr>
            </thead>
            <tbody>
              {yoyRows.slice(0, 15).map((r) => (
                <tr key={r.categoryId} className="border-t">
                  <td className="px-4 py-2">
                    {r.category.label}
                    <div className="text-xs text-gray-500">
                      {r.category.form} {r.category.line}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right font-mono">
                    {formatCurrency(r.current)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-gray-500">
                    {formatCurrency(r.prior)}
                  </td>
                  <td
                    className={`px-4 py-2 text-right font-mono ${
                      r.change > 0
                        ? 'text-green-700'
                        : r.change < 0
                          ? 'text-red-700'
                          : ''
                    }`}
                  >
                    {r.change >= 0 ? '+' : ''}
                    {formatCurrency(r.change)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Settings reminder */}
      {!settings.taxpayerName && onUpdateSettings && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded mb-6 text-sm">
          <strong>💡 Tip:</strong> Set your taxpayer name and filing status in
          Tax Settings to personalize reports.
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Sub-components
// -----------------------------------------------------------------------------

function SummaryCard({ label, value, color = 'gray' }) {
  const colorClasses = {
    green: 'bg-green-50 text-green-900 border-green-200',
    orange: 'bg-orange-50 text-orange-900 border-orange-200',
    blue: 'bg-blue-50 text-blue-900 border-blue-200',
    purple: 'bg-purple-50 text-purple-900 border-purple-200',
    gray: 'bg-gray-50 text-gray-900 border-gray-200',
  };
  return (
    <div className={`p-3 rounded border ${colorClasses[color]}`}>
      <div className="text-xs font-semibold uppercase tracking-wide opacity-75">
        {label}
      </div>
      <div className="text-xl font-bold mt-1 font-mono">
        {formatCurrency(value)}
      </div>
    </div>
  );
}

function QuarterRow({ label, value }) {
  return (
    <div className="flex justify-between text-xs py-0.5">
      <span className="text-gray-600">{label}</span>
      <span className="font-mono font-semibold">{formatCurrency(value)}</span>
    </div>
  );
}
