// =============================================================================
// TAX FORM STRUCTURES
// =============================================================================
// Defines the line-by-line structure of key IRS forms for the Form Helper.
// Each line either maps to tax category ids (for auto-sum), is a computed
// total, or is informational/manual entry.
//
// Line types:
//   - 'sum'       : Auto-summed from transactions with matching category ids
//   - 'subtotal'  : Sum of other lines (by line id)
//   - 'difference': Line A minus Line B
//   - 'manual'    : User enters manually (shown with note)
//   - 'info'      : Section header / informational only
// =============================================================================

export const TAX_FORMS = {
  // ==========================================================================
  // SCHEDULE A - ITEMIZED DEDUCTIONS
  // ==========================================================================
  schedule_a: {
    id: 'schedule_a',
    title: 'Schedule A - Itemized Deductions',
    formNumber: 'Form 1040 Schedule A',
    description: 'Use this if itemizing instead of taking the standard deduction.',
    sections: [
      {
        title: 'Medical and Dental Expenses',
        lines: [
          {
            id: 'sch_a_1',
            lineNumber: '1',
            description: 'Medical and dental expenses',
            type: 'sum',
            categoryIds: ['medical_expenses', 'medical_insurance_premiums'],
          },
          {
            id: 'sch_a_2',
            lineNumber: '2',
            description: 'Enter AGI (from Form 1040, line 11)',
            type: 'manual',
            manualNote: 'Enter your Adjusted Gross Income from Form 1040 line 11',
          },
          {
            id: 'sch_a_3',
            lineNumber: '3',
            description: 'Multiply line 2 by 7.5% (0.075)',
            type: 'computed',
            formula: (lines) => (lines.sch_a_2 || 0) * 0.075,
          },
          {
            id: 'sch_a_4',
            lineNumber: '4',
            description: 'Subtract line 3 from line 1. If zero or less, enter 0',
            type: 'computed',
            formula: (lines) => Math.max(0, (lines.sch_a_1 || 0) - (lines.sch_a_3 || 0)),
          },
        ],
      },
      {
        title: 'Taxes You Paid',
        lines: [
          {
            id: 'sch_a_5a',
            lineNumber: '5a',
            description: 'State and local income taxes OR general sales taxes',
            type: 'sum',
            categoryIds: ['state_local_income_tax', 'estimated_tax_state'],
          },
          {
            id: 'sch_a_5b',
            lineNumber: '5b',
            description: 'State and local real estate taxes',
            type: 'sum',
            categoryIds: ['real_estate_tax'],
          },
          {
            id: 'sch_a_5c',
            lineNumber: '5c',
            description: 'State and local personal property taxes',
            type: 'sum',
            categoryIds: ['personal_property_tax'],
          },
          {
            id: 'sch_a_5d',
            lineNumber: '5d',
            description: 'Add lines 5a, 5b, and 5c',
            type: 'subtotal',
            lineIds: ['sch_a_5a', 'sch_a_5b', 'sch_a_5c'],
          },
          {
            id: 'sch_a_5e',
            lineNumber: '5e',
            description: 'Smaller of line 5d or $10,000 ($5,000 if MFS)',
            type: 'computed',
            formula: (lines, settings) => {
              const cap = settings?.filingStatus === 'mfs' ? 5000 : 10000;
              return Math.min(lines.sch_a_5d || 0, cap);
            },
            warning: 'SALT deduction is capped at $10,000 ($5,000 if Married Filing Separately)',
          },
          {
            id: 'sch_a_7',
            lineNumber: '7',
            description: 'Total taxes paid (line 5e + line 6)',
            type: 'subtotal',
            lineIds: ['sch_a_5e'],
          },
        ],
      },
      {
        title: 'Interest You Paid',
        lines: [
          {
            id: 'sch_a_8a',
            lineNumber: '8a',
            description: 'Home mortgage interest and points on Form 1098',
            type: 'sum',
            categoryIds: ['mortgage_interest'],
          },
          {
            id: 'sch_a_8c',
            lineNumber: '8c',
            description: 'Points not reported on Form 1098',
            type: 'sum',
            categoryIds: ['mortgage_points'],
          },
          {
            id: 'sch_a_8e',
            lineNumber: '8e',
            description: 'Total mortgage interest (8a + 8c)',
            type: 'subtotal',
            lineIds: ['sch_a_8a', 'sch_a_8c'],
          },
          {
            id: 'sch_a_10',
            lineNumber: '10',
            description: 'Total interest paid',
            type: 'subtotal',
            lineIds: ['sch_a_8e'],
          },
        ],
      },
      {
        title: 'Gifts to Charity',
        lines: [
          {
            id: 'sch_a_11',
            lineNumber: '11',
            description: 'Gifts by cash or check',
            type: 'sum',
            categoryIds: ['charitable_cash', 'charitable_mileage'],
          },
          {
            id: 'sch_a_12',
            lineNumber: '12',
            description: 'Other than by cash or check (requires Form 8283 if > $500)',
            type: 'sum',
            categoryIds: ['charitable_noncash'],
            warning: 'If total non-cash donations exceed $500, Form 8283 is required',
          },
          {
            id: 'sch_a_13',
            lineNumber: '13',
            description: 'Carryover from prior year',
            type: 'manual',
            manualNote: 'Enter any charitable contribution carryover from prior years',
          },
          {
            id: 'sch_a_14',
            lineNumber: '14',
            description: 'Total gifts to charity',
            type: 'subtotal',
            lineIds: ['sch_a_11', 'sch_a_12', 'sch_a_13'],
          },
        ],
      },
      {
        title: 'Casualty and Theft Losses',
        lines: [
          {
            id: 'sch_a_15',
            lineNumber: '15',
            description: 'Casualty and theft losses (federally declared disasters)',
            type: 'sum',
            categoryIds: ['casualty_theft_loss'],
          },
        ],
      },
      {
        title: 'Total Itemized Deductions',
        lines: [
          {
            id: 'sch_a_17',
            lineNumber: '17',
            description: 'Total itemized deductions (lines 4, 7, 10, 14, 15, 16)',
            type: 'subtotal',
            lineIds: ['sch_a_4', 'sch_a_7', 'sch_a_10', 'sch_a_14', 'sch_a_15'],
            isGrandTotal: true,
          },
        ],
      },
    ],
  },

  // ==========================================================================
  // SCHEDULE C - PROFIT OR LOSS FROM BUSINESS
  // ==========================================================================
  schedule_c: {
    id: 'schedule_c',
    title: 'Schedule C - Profit or Loss from Business (Sole Proprietorship)',
    formNumber: 'Form 1040 Schedule C',
    description: 'Business income and expenses for sole proprietors.',
    sections: [
      {
        title: 'Part I: Income',
        lines: [
          {
            id: 'sch_c_1',
            lineNumber: '1',
            description: 'Gross receipts or sales',
            type: 'sum',
            categoryIds: ['1099_nec'],
          },
          {
            id: 'sch_c_2',
            lineNumber: '2',
            description: 'Returns and allowances',
            type: 'manual',
            manualNote: 'Enter any refunds/returns given to customers',
          },
          {
            id: 'sch_c_3',
            lineNumber: '3',
            description: 'Subtract line 2 from line 1',
            type: 'difference',
            minuend: 'sch_c_1',
            subtrahend: 'sch_c_2',
          },
          {
            id: 'sch_c_4',
            lineNumber: '4',
            description: 'Cost of goods sold (from line 42)',
            type: 'manual',
            manualNote: 'Calculate from Part III if you have inventory',
          },
          {
            id: 'sch_c_5',
            lineNumber: '5',
            description: 'Gross profit (subtract line 4 from line 3)',
            type: 'difference',
            minuend: 'sch_c_3',
            subtrahend: 'sch_c_4',
          },
          {
            id: 'sch_c_6',
            lineNumber: '6',
            description: 'Other income',
            type: 'manual',
            manualNote: 'Other business income (fuel tax credits, etc.)',
          },
          {
            id: 'sch_c_7',
            lineNumber: '7',
            description: 'Gross income (add lines 5 and 6)',
            type: 'subtotal',
            lineIds: ['sch_c_5', 'sch_c_6'],
          },
        ],
      },
      {
        title: 'Part II: Expenses',
        lines: [
          {
            id: 'sch_c_8',
            lineNumber: '8',
            description: 'Advertising',
            type: 'sum',
            categoryIds: ['sch_c_advertising'],
          },
          {
            id: 'sch_c_9',
            lineNumber: '9',
            description: 'Car and truck expenses',
            type: 'sum',
            categoryIds: ['sch_c_car_truck'],
          },
          {
            id: 'sch_c_10',
            lineNumber: '10',
            description: 'Commissions and fees',
            type: 'sum',
            categoryIds: ['sch_c_commissions'],
          },
          {
            id: 'sch_c_11',
            lineNumber: '11',
            description: 'Contract labor',
            type: 'sum',
            categoryIds: ['sch_c_contract_labor'],
          },
          {
            id: 'sch_c_12',
            lineNumber: '12',
            description: 'Depletion',
            type: 'manual',
          },
          {
            id: 'sch_c_13',
            lineNumber: '13',
            description: 'Depreciation and section 179 expense',
            type: 'sum',
            categoryIds: ['sch_c_depreciation'],
          },
          {
            id: 'sch_c_14',
            lineNumber: '14',
            description: 'Employee benefit programs',
            type: 'manual',
          },
          {
            id: 'sch_c_15',
            lineNumber: '15',
            description: 'Insurance (other than health)',
            type: 'sum',
            categoryIds: ['sch_c_insurance'],
          },
          {
            id: 'sch_c_16a',
            lineNumber: '16a',
            description: 'Interest - Mortgage (paid to banks, etc.)',
            type: 'sum',
            categoryIds: ['sch_c_mortgage_interest'],
          },
          {
            id: 'sch_c_16b',
            lineNumber: '16b',
            description: 'Interest - Other',
            type: 'sum',
            categoryIds: ['sch_c_other_interest'],
          },
          {
            id: 'sch_c_17',
            lineNumber: '17',
            description: 'Legal and professional services',
            type: 'sum',
            categoryIds: ['sch_c_legal_professional'],
          },
          {
            id: 'sch_c_18',
            lineNumber: '18',
            description: 'Office expense',
            type: 'sum',
            categoryIds: ['sch_c_office'],
          },
          {
            id: 'sch_c_19',
            lineNumber: '19',
            description: 'Pension and profit-sharing plans',
            type: 'manual',
          },
          {
            id: 'sch_c_20a',
            lineNumber: '20a',
            description: 'Rent/lease - vehicles, machinery, equipment',
            type: 'sum',
            categoryIds: ['sch_c_rent_equipment'],
          },
          {
            id: 'sch_c_20b',
            lineNumber: '20b',
            description: 'Rent/lease - other business property',
            type: 'sum',
            categoryIds: ['sch_c_rent_property'],
          },
          {
            id: 'sch_c_21',
            lineNumber: '21',
            description: 'Repairs and maintenance',
            type: 'sum',
            categoryIds: ['sch_c_repairs'],
          },
          {
            id: 'sch_c_22',
            lineNumber: '22',
            description: 'Supplies',
            type: 'sum',
            categoryIds: ['sch_c_supplies'],
          },
          {
            id: 'sch_c_23',
            lineNumber: '23',
            description: 'Taxes and licenses',
            type: 'sum',
            categoryIds: ['sch_c_taxes_licenses'],
          },
          {
            id: 'sch_c_24a',
            lineNumber: '24a',
            description: 'Travel',
            type: 'sum',
            categoryIds: ['sch_c_travel'],
          },
          {
            id: 'sch_c_24b',
            lineNumber: '24b',
            description: 'Deductible meals (50% of total meals)',
            type: 'sum',
            categoryIds: ['sch_c_meals'],
            applyDeductiblePercentage: true,
            warning: 'Meals are 50% deductible. Amount shown reflects 50% of total.',
          },
          {
            id: 'sch_c_25',
            lineNumber: '25',
            description: 'Utilities',
            type: 'sum',
            categoryIds: ['sch_c_utilities'],
          },
          {
            id: 'sch_c_26',
            lineNumber: '26',
            description: 'Wages (less employment credits)',
            type: 'sum',
            categoryIds: ['sch_c_wages'],
          },
          {
            id: 'sch_c_27a',
            lineNumber: '27a',
            description: 'Other expenses',
            type: 'sum',
            categoryIds: ['sch_c_other'],
          },
          {
            id: 'sch_c_28',
            lineNumber: '28',
            description: 'Total expenses (add lines 8 through 27a)',
            type: 'subtotal',
            lineIds: [
              'sch_c_8', 'sch_c_9', 'sch_c_10', 'sch_c_11', 'sch_c_12',
              'sch_c_13', 'sch_c_14', 'sch_c_15', 'sch_c_16a', 'sch_c_16b',
              'sch_c_17', 'sch_c_18', 'sch_c_19', 'sch_c_20a', 'sch_c_20b',
              'sch_c_21', 'sch_c_22', 'sch_c_23', 'sch_c_24a', 'sch_c_24b',
              'sch_c_25', 'sch_c_26', 'sch_c_27a',
            ],
          },
          {
            id: 'sch_c_29',
            lineNumber: '29',
            description: 'Tentative profit or (loss). Subtract line 28 from line 7',
            type: 'difference',
            minuend: 'sch_c_7',
            subtrahend: 'sch_c_28',
          },
          {
            id: 'sch_c_30',
            lineNumber: '30',
            description: 'Expenses for business use of home',
            type: 'sum',
            categoryIds: ['sch_c_home_office'],
          },
          {
            id: 'sch_c_31',
            lineNumber: '31',
            description: 'Net profit or (loss). Subtract line 30 from line 29',
            type: 'difference',
            minuend: 'sch_c_29',
            subtrahend: 'sch_c_30',
            isGrandTotal: true,
          },
        ],
      },
    ],
  },

  // ==========================================================================
  // SCHEDULE E - SUPPLEMENTAL INCOME AND LOSS (Rental Real Estate)
  // ==========================================================================
  schedule_e: {
    id: 'schedule_e',
    title: 'Schedule E - Rental Real Estate',
    formNumber: 'Form 1040 Schedule E',
    description: 'Income and expenses from rental real estate and royalties.',
    sections: [
      {
        title: 'Part I: Income',
        lines: [
          {
            id: 'sch_e_3',
            lineNumber: '3',
            description: 'Rents received',
            type: 'sum',
            categoryIds: ['rental_income'],
          },
          {
            id: 'sch_e_4',
            lineNumber: '4',
            description: 'Royalties received',
            type: 'sum',
            categoryIds: ['royalty_income'],
          },
        ],
      },
      {
        title: 'Part I: Expenses',
        lines: [
          {
            id: 'sch_e_5',
            lineNumber: '5',
            description: 'Advertising',
            type: 'sum',
            categoryIds: ['sch_e_advertising'],
          },
          {
            id: 'sch_e_6',
            lineNumber: '6',
            description: 'Auto and travel',
            type: 'sum',
            categoryIds: ['sch_e_auto_travel'],
          },
          {
            id: 'sch_e_7',
            lineNumber: '7',
            description: 'Cleaning and maintenance',
            type: 'sum',
            categoryIds: ['sch_e_cleaning'],
          },
          {
            id: 'sch_e_8',
            lineNumber: '8',
            description: 'Commissions',
            type: 'sum',
            categoryIds: ['sch_e_commissions'],
          },
          {
            id: 'sch_e_9',
            lineNumber: '9',
            description: 'Insurance',
            type: 'sum',
            categoryIds: ['sch_e_insurance'],
          },
          {
            id: 'sch_e_10',
            lineNumber: '10',
            description: 'Legal and other professional fees',
            type: 'sum',
            categoryIds: ['sch_e_legal'],
          },
          {
            id: 'sch_e_11',
            lineNumber: '11',
            description: 'Management fees',
            type: 'sum',
            categoryIds: ['sch_e_management'],
          },
          {
            id: 'sch_e_12',
            lineNumber: '12',
            description: 'Mortgage interest paid to banks, etc.',
            type: 'sum',
            categoryIds: ['sch_e_mortgage_interest'],
          },
          {
            id: 'sch_e_13',
            lineNumber: '13',
            description: 'Other interest',
            type: 'sum',
            categoryIds: ['sch_e_other_interest'],
          },
          {
            id: 'sch_e_14',
            lineNumber: '14',
            description: 'Repairs',
            type: 'sum',
            categoryIds: ['sch_e_repairs'],
          },
          {
            id: 'sch_e_15',
            lineNumber: '15',
            description: 'Supplies',
            type: 'sum',
            categoryIds: ['sch_e_supplies'],
          },
          {
            id: 'sch_e_16',
            lineNumber: '16',
            description: 'Taxes',
            type: 'sum',
            categoryIds: ['sch_e_taxes'],
          },
          {
            id: 'sch_e_17',
            lineNumber: '17',
            description: 'Utilities',
            type: 'sum',
            categoryIds: ['sch_e_utilities'],
          },
          {
            id: 'sch_e_18',
            lineNumber: '18',
            description: 'Depreciation or depletion',
            type: 'sum',
            categoryIds: ['sch_e_depreciation'],
          },
          {
            id: 'sch_e_19',
            lineNumber: '19',
            description: 'Other',
            type: 'sum',
            categoryIds: ['sch_e_other'],
          },
          {
            id: 'sch_e_20',
            lineNumber: '20',
            description: 'Total expenses (add lines 5 through 19)',
            type: 'subtotal',
            lineIds: [
              'sch_e_5', 'sch_e_6', 'sch_e_7', 'sch_e_8', 'sch_e_9',
              'sch_e_10', 'sch_e_11', 'sch_e_12', 'sch_e_13', 'sch_e_14',
              'sch_e_15', 'sch_e_16', 'sch_e_17', 'sch_e_18', 'sch_e_19',
            ],
          },
          {
            id: 'sch_e_21',
            lineNumber: '21',
            description: 'Income or (loss). Subtract line 20 from line 3 (+ line 4)',
            type: 'computed',
            formula: (lines) => (lines.sch_e_3 || 0) + (lines.sch_e_4 || 0) - (lines.sch_e_20 || 0),
            isGrandTotal: true,
          },
        ],
      },
    ],
  },

  // ==========================================================================
  // FORM 1040 - MAIN INCOME TAX RETURN (relevant lines only)
  // ==========================================================================
  form_1040: {
    id: 'form_1040',
    title: 'Form 1040 - U.S. Individual Income Tax Return',
    formNumber: 'Form 1040',
    description: 'Main tax return. Most lines pull from other schedules.',
    sections: [
      {
        title: 'Income',
        lines: [
          {
            id: '1040_1a',
            lineNumber: '1a',
            description: 'Total amount from Form(s) W-2, box 1',
            type: 'sum',
            categoryIds: ['w2_wages'],
          },
          {
            id: '1040_1c',
            lineNumber: '1c',
            description: 'Tip income not reported on line 1a',
            type: 'sum',
            categoryIds: ['w2_tips'],
          },
          {
            id: '1040_2b',
            lineNumber: '2b',
            description: 'Taxable interest',
            type: 'sum',
            categoryIds: ['1099_int'],
          },
          {
            id: '1040_3a',
            lineNumber: '3a',
            description: 'Qualified dividends',
            type: 'sum',
            categoryIds: ['1099_div_qualified'],
          },
          {
            id: '1040_3b',
            lineNumber: '3b',
            description: 'Ordinary dividends',
            type: 'sum',
            categoryIds: ['1099_div_ordinary'],
          },
          {
            id: '1040_5b',
            lineNumber: '5b',
            description: 'Pensions and annuities (taxable)',
            type: 'sum',
            categoryIds: ['1099_r_distribution'],
          },
          {
            id: '1040_6a',
            lineNumber: '6a',
            description: 'Social security benefits',
            type: 'sum',
            categoryIds: ['ssa_benefits'],
          },
        ],
      },
      {
        title: 'Payments',
        lines: [
          {
            id: '1040_26',
            lineNumber: '26',
            description: 'Estimated tax payments',
            type: 'sum',
            categoryIds: ['estimated_tax_federal'],
          },
        ],
      },
    ],
  },

  // ==========================================================================
  // SCHEDULE 1 - ADDITIONAL INCOME AND ADJUSTMENTS
  // ==========================================================================
  schedule_1: {
    id: 'schedule_1',
    title: 'Schedule 1 - Additional Income and Adjustments to Income',
    formNumber: 'Form 1040 Schedule 1',
    description: 'Additional income and above-the-line deductions.',
    sections: [
      {
        title: 'Part I: Additional Income',
        lines: [
          {
            id: 'sch_1_1',
            lineNumber: '1',
            description: 'Taxable refunds of state/local income taxes',
            type: 'sum',
            categoryIds: ['state_tax_refund'],
          },
          {
            id: 'sch_1_7',
            lineNumber: '7',
            description: 'Unemployment compensation',
            type: 'sum',
            categoryIds: ['unemployment'],
          },
          {
            id: 'sch_1_8b',
            lineNumber: '8b',
            description: 'Gambling income',
            type: 'sum',
            categoryIds: ['gambling_winnings'],
          },
          {
            id: 'sch_1_8z',
            lineNumber: '8z',
            description: 'Other income',
            type: 'sum',
            categoryIds: ['1099_misc_other'],
          },
        ],
      },
      {
        title: 'Part II: Adjustments to Income',
        lines: [
          {
            id: 'sch_1_11',
            lineNumber: '11',
            description: 'Educator expenses',
            type: 'sum',
            categoryIds: ['educator_expenses'],
          },
          {
            id: 'sch_1_13',
            lineNumber: '13',
            description: 'Health savings account deduction',
            type: 'sum',
            categoryIds: ['hsa_contribution'],
          },
          {
            id: 'sch_1_15',
            lineNumber: '15',
            description: 'Deductible part of self-employment tax',
            type: 'sum',
            categoryIds: ['self_employment_tax_deduction'],
          },
          {
            id: 'sch_1_16',
            lineNumber: '16',
            description: 'Self-employed SEP, SIMPLE, and qualified plans',
            type: 'sum',
            categoryIds: ['sep_simple_pension'],
          },
          {
            id: 'sch_1_17',
            lineNumber: '17',
            description: 'Self-employed health insurance deduction',
            type: 'sum',
            categoryIds: ['se_health_insurance'],
          },
          {
            id: 'sch_1_20',
            lineNumber: '20',
            description: 'IRA deduction',
            type: 'sum',
            categoryIds: ['traditional_ira'],
          },
          {
            id: 'sch_1_21',
            lineNumber: '21',
            description: 'Student loan interest deduction',
            type: 'sum',
            categoryIds: ['student_loan_interest'],
            warning: 'Maximum $2,500 deduction, subject to income limits',
            cap: 2500,
          },
        ],
      },
    ],
  },
};

export function getFormById(formId) {
  return TAX_FORMS[formId] || null;
}

export function getAllForms() {
  return Object.values(TAX_FORMS);
}
