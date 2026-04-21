import React from 'react';

/**
 * TaxSettings
 *
 * Simple form for tax-related settings that affect calculations and reports.
 * Persists via the onChange callback — parent component decides where to
 * store (localStorage, Supabase, etc.).
 *
 * Props:
 *   settings - current settings object
 *   onChange - (newSettings) => void
 */
export default function TaxSettings({ settings = {}, onChange }) {
  const update = (patch) => {
    onChange?.({ ...settings, ...patch });
  };

  return (
    <div className="tax-settings max-w-2xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-1">Tax Settings</h2>
      <p className="text-sm text-gray-600 mb-6">
        These settings personalize your tax reports and affect certain
        calculations (e.g., the SALT cap for Married Filing Separately).
        Nothing sensitive is stored — SSN and other IDs are never saved.
      </p>

      <div className="space-y-4">
        <Field label="Taxpayer Name(s)">
          <input
            type="text"
            value={settings.taxpayerName || ''}
            onChange={(e) => update({ taxpayerName: e.target.value })}
            placeholder="e.g., Aaron &amp; Spouse"
            className="w-full px-3 py-2 border rounded-md text-sm"
          />
        </Field>

        <Field label="Filing Status">
          <select
            value={settings.filingStatus || ''}
            onChange={(e) => update({ filingStatus: e.target.value })}
            className="w-full px-3 py-2 border rounded-md text-sm"
          >
            <option value="">— Select —</option>
            <option value="single">Single</option>
            <option value="mfj">Married Filing Jointly</option>
            <option value="mfs">Married Filing Separately</option>
            <option value="hoh">Head of Household</option>
            <option value="qw">Qualifying Widow(er)</option>
          </select>
          {settings.filingStatus === 'mfs' && (
            <div className="text-xs text-amber-700 mt-1">
              Note: SALT deduction cap drops from $10,000 to $5,000 for MFS.
            </div>
          )}
        </Field>

        <Field label="State of Residence">
          <input
            type="text"
            maxLength="2"
            value={settings.state || ''}
            onChange={(e) => update({ state: e.target.value.toUpperCase() })}
            placeholder="e.g., WA"
            className="w-24 px-3 py-2 border rounded-md text-sm uppercase"
          />
          <span className="text-xs text-gray-600 ml-2">
            Two-letter state code
          </span>
        </Field>

        <Field label="Deduction Preference">
          <select
            value={settings.deductionPreference || 'auto'}
            onChange={(e) => update({ deductionPreference: e.target.value })}
            className="w-full px-3 py-2 border rounded-md text-sm"
          >
            <option value="auto">Auto (whichever is larger)</option>
            <option value="standard">Always Standard</option>
            <option value="itemized">Always Itemized (Schedule A)</option>
          </select>
        </Field>

        <Field label="Business Name (if self-employed)">
          <input
            type="text"
            value={settings.businessName || ''}
            onChange={(e) => update({ businessName: e.target.value })}
            placeholder="Leave blank if no Schedule C business"
            className="w-full px-3 py-2 border rounded-md text-sm"
          />
        </Field>

        <Field label="Mileage Rate (for business/charitable miles)">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600 w-32">Business:</label>
            <input
              type="number"
              step="0.001"
              value={settings.mileageRateBusiness ?? 0.67}
              onChange={(e) =>
                update({ mileageRateBusiness: Number(e.target.value) })
              }
              className="w-24 px-3 py-2 border rounded-md text-sm"
            />
            <span className="text-xs text-gray-600">$/mile</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <label className="text-xs text-gray-600 w-32">Charitable:</label>
            <input
              type="number"
              step="0.001"
              value={settings.mileageRateCharitable ?? 0.14}
              onChange={(e) =>
                update({ mileageRateCharitable: Number(e.target.value) })
              }
              className="w-24 px-3 py-2 border rounded-md text-sm"
            />
            <span className="text-xs text-gray-600">$/mile</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            IRS updates these yearly — check{' '}
            <a
              href="https://www.irs.gov/tax-professionals/standard-mileage-rates"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              IRS.gov
            </a>{' '}
            for current rates.
          </div>
        </Field>

        <Field label="Prepared For (shows on PDF report)">
          <input
            type="text"
            value={settings.preparedFor || ''}
            onChange={(e) => update({ preparedFor: e.target.value })}
            placeholder="e.g., My CPA, Tax Records, TurboTax Import"
            className="w-full px-3 py-2 border rounded-md text-sm"
          />
        </Field>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-1">{label}</label>
      {children}
    </div>
  );
}
