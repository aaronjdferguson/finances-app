import React, { useState, useMemo } from 'react';
import { TAX_FORMS } from '../constants/taxForms.js';
import {
  computeFormLines,
  filterByTaxYear,
  formatCurrency,
  formatDate,
  getDeductibleAmount,
} from '../utils/taxCalculations.js';
import { getTaxCategoryById } from '../constants/taxCategories.js';

/**
 * FormHelper
 *
 * This is the component you'll sit in front of while filling out your tax
 * return. Pick a form, see every line with its computed amount, and click
 * "Copy" to copy the exact number to paste into TurboTax / a tax preparer's
 * software / a paper form.
 *
 * Props:
 *   transactions - Array of transactions (all years; will be filtered)
 *   taxYear      - number (e.g. 2025)
 *   settings     - { filingStatus: 'single' | 'mfj' | 'mfs' | 'hoh' }
 */
export default function FormHelper({ transactions, taxYear, settings = {} }) {
  const [selectedFormId, setSelectedFormId] = useState('schedule_a');
  const [manualEntries, setManualEntries] = useState({});
  const [expandedLineId, setExpandedLineId] = useState(null);
  const [copiedLineId, setCopiedLineId] = useState(null);

  const yearTxns = useMemo(
    () => filterByTaxYear(transactions, taxYear),
    [transactions, taxYear]
  );

  const form = TAX_FORMS[selectedFormId];

  const { lineValues, lineTransactions, warnings } = useMemo(() => {
    if (!form) return { lineValues: {}, lineTransactions: {}, warnings: [] };
    return computeFormLines(selectedFormId, yearTxns, manualEntries, settings);
  }, [selectedFormId, yearTxns, manualEntries, settings, form]);

  const copyToClipboard = async (value, lineId) => {
    const textValue = (Number(value) || 0).toFixed(2);
    try {
      await navigator.clipboard.writeText(textValue);
      setCopiedLineId(lineId);
      setTimeout(() => setCopiedLineId(null), 1500);
    } catch (e) {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = textValue;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedLineId(lineId);
      setTimeout(() => setCopiedLineId(null), 1500);
    }
  };

  return (
    <div className="form-helper max-w-5xl mx-auto p-4">
      <div className="mb-4">
        <h2 className="text-2xl font-bold mb-1">Tax Form Helper</h2>
        <p className="text-sm text-gray-600">
          Pick the IRS form you're filling out. For each line, the computed
          amount is shown — click "Copy" to copy the number, then paste into
          your tax software or form.
        </p>
      </div>

      {/* Form selector */}
      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <label className="font-semibold text-sm">Form:</label>
        <select
          value={selectedFormId}
          onChange={(e) => setSelectedFormId(e.target.value)}
          className="px-3 py-2 border rounded-md text-sm"
        >
          {Object.values(TAX_FORMS).map((f) => (
            <option key={f.id} value={f.id}>
              {f.title}
            </option>
          ))}
        </select>
        <span className="ml-4 text-sm text-gray-600">
          Tax year: <strong>{taxYear}</strong>
        </span>
      </div>

      {!form ? (
        <p>Select a form to begin.</p>
      ) : (
        <>
          <div className="mb-3 p-3 bg-gray-50 border rounded">
            <div className="font-semibold">{form.title}</div>
            <div className="text-sm text-gray-600">{form.description}</div>
          </div>

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="mb-3 space-y-1">
              {warnings.map((w, i) => (
                <div
                  key={i}
                  className="p-2 bg-amber-50 border-l-4 border-amber-400 text-xs text-amber-900"
                >
                  ⚠️ <strong>Line {w.lineId.replace(/^.*_/, '')}:</strong>{' '}
                  {w.message}
                </div>
              ))}
            </div>
          )}

          {/* Form sections */}
          {form.sections.map((section, sectionIdx) => (
            <div key={sectionIdx} className="mb-4">
              <h3 className="font-bold text-lg bg-gray-100 px-3 py-2 border-l-4 border-blue-600">
                {section.title}
              </h3>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-700">
                    <th className="text-left px-3 py-2 border-b w-20">Line</th>
                    <th className="text-left px-3 py-2 border-b">Description</th>
                    <th className="text-right px-3 py-2 border-b w-40">Amount</th>
                    <th className="text-center px-3 py-2 border-b w-28">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {section.lines.map((line) => {
                    const val = lineValues[line.id] || 0;
                    const txns = lineTransactions[line.id] || [];
                    const isExpanded = expandedLineId === line.id;
                    const isCopied = copiedLineId === line.id;
                    const isGrandTotal = line.isGrandTotal;
                    const isSumLine = line.type === 'sum';
                    const isManualLine = line.type === 'manual';

                    return (
                      <React.Fragment key={line.id}>
                        <tr
                          className={
                            isGrandTotal
                              ? 'bg-yellow-50 border-t-2 border-black font-bold'
                              : 'hover:bg-blue-50'
                          }
                        >
                          <td className="px-3 py-2 border-b font-mono font-semibold">
                            {line.lineNumber}
                          </td>
                          <td className="px-3 py-2 border-b">
                            <div>{line.description}</div>
                            {line.warning && val > 0 && (
                              <div className="text-xs text-amber-700 mt-1">
                                ⚠ {line.warning}
                              </div>
                            )}
                            {isManualLine && line.manualNote && (
                              <div className="text-xs text-blue-700 mt-1 italic">
                                ℹ {line.manualNote}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 border-b text-right font-mono">
                            {isManualLine ? (
                              <input
                                type="number"
                                step="0.01"
                                value={manualEntries[line.id] ?? ''}
                                onChange={(e) =>
                                  setManualEntries((prev) => ({
                                    ...prev,
                                    [line.id]: e.target.value,
                                  }))
                                }
                                placeholder="Enter value"
                                className="w-32 px-2 py-1 border rounded text-right"
                              />
                            ) : (
                              <span
                                className={val === 0 ? 'text-gray-400' : ''}
                              >
                                {formatCurrency(val)}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 border-b text-center">
                            <div className="flex gap-1 justify-center">
                              {isSumLine && txns.length > 0 && (
                                <button
                                  onClick={() =>
                                    setExpandedLineId(isExpanded ? null : line.id)
                                  }
                                  className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                                  title={`View ${txns.length} transactions`}
                                >
                                  👁 {txns.length}
                                </button>
                              )}
                              {val !== 0 && (
                                <button
                                  onClick={() => copyToClipboard(val, line.id)}
                                  className={`text-xs px-2 py-1 rounded ${
                                    isCopied
                                      ? 'bg-green-600 text-white'
                                      : 'bg-blue-600 text-white hover:bg-blue-700'
                                  }`}
                                  title="Copy amount to clipboard"
                                >
                                  {isCopied ? '✓ Copied' : '📋 Copy'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Expanded transaction list */}
                        {isExpanded && txns.length > 0 && (
                          <tr>
                            <td colSpan="4" className="px-0 py-0 bg-blue-50 border-b">
                              <div className="p-3">
                                <div className="text-xs font-semibold text-blue-900 mb-2">
                                  Transactions contributing to Line {line.lineNumber}:
                                </div>
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="text-gray-600">
                                      <th className="text-left px-2 py-1">Date</th>
                                      <th className="text-left px-2 py-1">Description</th>
                                      <th className="text-left px-2 py-1">Account</th>
                                      <th className="text-right px-2 py-1">Raw Amt</th>
                                      <th className="text-right px-2 py-1">Ded %</th>
                                      <th className="text-right px-2 py-1">Counted</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {txns
                                      .sort((a, b) => new Date(a.date) - new Date(b.date))
                                      .map((t) => {
                                        const pct =
                                          t.deductible_percentage != null
                                            ? Number(t.deductible_percentage)
                                            : 100;
                                        const counted = getDeductibleAmount(t);
                                        return (
                                          <tr key={t.id} className="border-t border-blue-100">
                                            <td className="px-2 py-1">
                                              {formatDate(t.date)}
                                            </td>
                                            <td className="px-2 py-1">
                                              {t.description}
                                              {t.tax_notes && (
                                                <span className="block text-gray-500 italic">
                                                  📝 {t.tax_notes}
                                                </span>
                                              )}
                                            </td>
                                            <td className="px-2 py-1">{t.account}</td>
                                            <td className="px-2 py-1 text-right">
                                              {formatCurrency(Math.abs(t.amount))}
                                            </td>
                                            <td className="px-2 py-1 text-right">{pct}%</td>
                                            <td className="px-2 py-1 text-right font-semibold">
                                              {formatCurrency(counted)}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}

          {/* Help note */}
          <div className="mt-6 p-3 bg-gray-50 border-l-4 border-gray-400 text-xs text-gray-700">
            <strong>How to use:</strong> Open your tax software or the paper
            form. Find the line number shown here, click "Copy" next to the
            matching line in this table, then paste into your tax program.
            All amounts already reflect deductible percentages (e.g., meals at
            50%). Manual-entry lines are for values not tracked in
            transactions (like carryovers or AGI).
          </div>
        </>
      )}
    </div>
  );
}
