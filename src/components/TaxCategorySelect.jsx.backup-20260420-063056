import React, { useState, useMemo } from 'react';
import { TAX_CATEGORIES, getCategoriesGrouped, getTaxCategoryById } from '../constants/taxCategories.js';

/**
 * TaxCategorySelect
 *
 * Drop-in replacement for a simple <select>. Supports:
 *   - Grouping by schedule (Schedule A, C, E, etc.)
 *   - Search/filter by label
 *   - Inline display of form/line references
 *   - Shows hint about deductible % for meals (50%)
 *
 * Props:
 *   value          - current tax_category id (string) or null
 *   onChange       - (newCategoryId: string | null) => void
 *   deductiblePct  - current deductible_percentage (number, default 100)
 *   onDeductiblePctChange - (newPct: number) => void
 *   disabled       - boolean
 *   showDetails    - boolean (show form/line info under the dropdown)
 */
export default function TaxCategorySelect({
  value,
  onChange,
  deductiblePct = 100,
  onDeductiblePctChange,
  disabled = false,
  showDetails = true,
}) {
  const [search, setSearch] = useState('');
  const grouped = useMemo(() => getCategoriesGrouped(), []);
  const selected = value ? getTaxCategoryById(value) : null;

  // Filter by search term
  const filteredGrouped = useMemo(() => {
    if (!search.trim()) return grouped;
    const q = search.toLowerCase();
    const out = {};
    for (const [schedule, cats] of Object.entries(grouped)) {
      const matches = cats.filter(
        (c) =>
          c.label.toLowerCase().includes(q) ||
          c.line?.toLowerCase().includes(q) ||
          c.form?.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q)
      );
      if (matches.length > 0) out[schedule] = matches;
    }
    return out;
  }, [grouped, search]);

  return (
    <div className="tax-category-select">
      {/* Search filter */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search tax categories (e.g. 'mortgage', 'Schedule C', 'Line 18')"
        className="w-full px-3 py-2 border rounded-md text-sm mb-2"
        disabled={disabled}
      />

      {/* Dropdown */}
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={disabled}
        className="w-full px-3 py-2 border rounded-md text-sm"
      >
        <option value="">— Not tax-relevant —</option>
        {Object.entries(filteredGrouped).map(([schedule, cats]) => (
          <optgroup key={schedule} label={schedule}>
            {cats.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label} {cat.line ? `(${cat.line})` : ''}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      {/* Details panel */}
      {showDetails && selected && (
        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md text-xs">
          <div className="font-semibold text-blue-900">
            {selected.form} · {selected.line}
          </div>
          <div className="text-blue-800 mt-1">{selected.lineDescription}</div>
          {selected.notes && (
            <div className="text-blue-700 mt-2 italic">⚠ {selected.notes}</div>
          )}
          {selected.requiresDoc && (
            <div className="text-blue-700 mt-1">
              📄 Required documentation: {selected.requiresDoc}
            </div>
          )}

          {/* Deductible percentage (shown when relevant) */}
          {(selected.defaultDeductiblePct || selected.type === 'deduction') &&
            onDeductiblePctChange && (
              <div className="mt-3 pt-2 border-t border-blue-200">
                <label className="block font-semibold text-blue-900 mb-1">
                  Deductible % (default {selected.defaultDeductiblePct || 100}%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={deductiblePct}
                  onChange={(e) =>
                    onDeductiblePctChange(Math.max(0, Math.min(100, Number(e.target.value))))
                  }
                  disabled={disabled}
                  className="w-24 px-2 py-1 border rounded text-sm"
                />
                <span className="ml-2 text-blue-800">
                  (e.g., 100% for fully deductible, 50% for business meals,
                  partial % for mixed business/personal use)
                </span>
              </div>
            )}
        </div>
      )}
    </div>
  );
}
