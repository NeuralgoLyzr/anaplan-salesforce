// Seed BPCE's billing.json with the new (v2) shape: top-level vendor/customer,
// invoice lifecycle (status + lock_state), structured line items, JE event_*
// fields. Used to verify the updated frontend consumption.
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "rev_rec";
const SESSION_ID = "59996f0c-794e-422b-93ad-c25867b365cd";

const vendor = {
  name: "Anaplan SAS",
  address: "Tour First, 1 Place des Saisons, 92400 Courbevoie, France",
  tax_id: "FR-XX-XXXXXXXXX",
  bank_details: "Wire transfer details available on request",
};
const customer = {
  name: "BPCE",
  billing_contact: "Accounts Payable",
  address: "50 Avenue Pierre Mendès France, 75201 Paris Cedex 13, France",
  tax_id: null,
  po_reference: "BPC20250430Q-82608",
};

const refs = {
  po_number: "BPC20250430Q-82608",
  contract_reference: "BPC20250430Q-82608",
  ssa_reference: "CT25377",
};

function invoice(seq, status, lock) {
  const y1 = seq === 1;
  return {
    invoice_id: `INV-ANAPLAN-BPCE82608-${String(seq).padStart(3, "0")}`,
    sequence: seq,
    status,
    lock_state: lock,
    issue_date: y1 ? "2025-04-30" : "2026-04-30",
    due_date: y1 ? "2025-05-30" : "2026-05-30",
    payment_terms: "Net 30",
    payment_terms_days: 30,
    period_covered: y1
      ? { start: "2025-04-30", end: "2026-04-29", label: "Year 1: Apr 30, 2025 – Apr 29, 2026" }
      : { start: "2026-04-30", end: "2027-04-29", label: "Year 2: Apr 30, 2026 – Apr 29, 2027" },
    line_items: [
      {
        line_item_id: "OS_82608:LI1",
        description: `Anaplan BYOK (Year ${seq})`,
        quantity: 1,
        unit_price: 14700.00,
        subtotal: 14700.00,
        tax_rate: 0,
        tax_amount: 0,
        total: 14700.00,
      },
      {
        line_item_id: "OS_82608:LI2",
        description: `Standard Contributor subscription (Year ${seq})`,
        quantity: 1,
        unit_price: 98000.00,
        subtotal: 98000.00,
        tax_rate: 0,
        tax_amount: 0,
        total: 98000.00,
      },
    ],
    subtotal: 112700.00,
    tax_total: 0,
    grand_total: 112700.00,
    references: refs,
    notes: "Subject to BPCE Master Services Agreement CT25377 (signed May 21, 2019).",
  };
}

// 24 monthly recognition JEs: stub for 2025-04 (1 day), 22 full months at
// 9,391.67, then a final entry that reconciles to the contract total.
const stub = 313.05;
const full = 9391.67;
const recognitionTotal = stub + 22 * full + 0; // placeholder, set last below
const lastFill = +(225400 - stub - 22 * full).toFixed(2); // amount for REC-024

function ymPlus(start, months) {
  const [y, m] = start.split("-").map(Number);
  const idx = (y * 12 + (m - 1)) + months;
  const yy = Math.floor(idx / 12);
  const mm = (idx % 12) + 1;
  return `${yy}-${String(mm).padStart(2, "0")}`;
}

function lastDayOf(ym) {
  const [y, m] = ym.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0));
  return last.toISOString().slice(0, 10);
}

const jes = [];
// Billing JE 1
jes.push({
  je_id: "JE-BPCE82608-BILL-001",
  sequence: jes.length + 1,
  event_type: "billing",
  event_date: "2025-04-30",
  related_invoice_id: "INV-ANAPLAN-BPCE82608-001",
  recognition_month: null,
  memo: "Bill — BPCE OS-82608 — Year 1 subscription",
  lines: [
    { account: "Accounts Receivable", debit: 112700.00, credit: 0, sub_memo: "Y1 invoice" },
    { account: "Deferred Revenue", debit: 0, credit: 112700.00, sub_memo: "Y1 deferral" },
  ],
  balanced: true,
});

// 24 recognition entries: 2025-04 (stub), 2025-05 … 2027-03
for (let i = 0; i < 24; i++) {
  const month = ymPlus("2025-04", i);
  const date = i === 0 ? "2025-04-30" : lastDayOf(month);
  let amt;
  if (i === 0) amt = stub;
  else if (i === 23) amt = lastFill;
  else amt = full;
  jes.push({
    je_id: `JE-BPCE82608-REC-${String(i + 1).padStart(3, "0")}`,
    sequence: jes.length + 1,
    event_type: "recognition",
    event_date: date,
    related_invoice_id: i < 12 ? "INV-ANAPLAN-BPCE82608-001" : "INV-ANAPLAN-BPCE82608-002",
    recognition_month: month,
    memo: `Revenue recognition — ${month}${i === 0 ? " (stub, 1 day)" : ""}`,
    lines: [
      { account: "Deferred Revenue", debit: amt, credit: 0, sub_memo: "Release from deferral" },
      { account: "Subscription Revenue", debit: 0, credit: amt, sub_memo: `${month} recognized` },
    ],
    balanced: true,
  });
}

// Billing JE 2
jes.push({
  je_id: "JE-BPCE82608-BILL-002",
  sequence: jes.length + 1,
  event_type: "billing",
  event_date: "2026-04-30",
  related_invoice_id: "INV-ANAPLAN-BPCE82608-002",
  recognition_month: null,
  memo: "Bill — BPCE OS-82608 — Year 2 subscription",
  lines: [
    { account: "Accounts Receivable", debit: 112700.00, credit: 0, sub_memo: "Y2 invoice" },
    { account: "Deferred Revenue", debit: 0, credit: 112700.00, sub_memo: "Y2 deferral" },
  ],
  balanced: true,
});

const billingJson = {
  contract_id: "BPCE_BPC20250430Q-82608",
  currency: "EUR",
  billing_cadence: "annual_upfront",
  cadence_source_ref: "[OS_82608 §2.1(a), p.3]",
  cadence_was_defaulted: false,
  total_invoice_count: 2,
  total_je_count: jes.length,
  vendor,
  customer,
  actionability_rule: {
    description: "next_unpaid_in_sequence",
    explanation:
      "The invoice with lock_state='unlocked' is the currently actionable one. When it transitions to 'paid'/'archived', the frontend unlocks the next sequence in line.",
    initial_actionable_invoice_id: "INV-ANAPLAN-BPCE82608-001",
  },
  invoices: [invoice(1, "actionable", "unlocked"), invoice(2, "scheduled", "locked")],
  journal_entries: jes,
  schedule_summary: {
    first_invoice_date: "2025-04-30",
    last_invoice_date: "2026-04-30",
    total_invoice_amount: 225400.00,
    billing_jes_count: 2,
    recognition_jes_count: 24,
    all_jes_balanced: true,
    currency: "EUR",
  },
  render_contract: {
    owner: "frontend",
    template_location: "frontend template binding to fields below",
    required_fields_per_invoice: [
      "invoice_id", "issue_date", "due_date", "payment_terms",
      "period_covered.label", "vendor.name", "vendor.address",
      "customer.name", "customer.address",
      "line_items[].description", "line_items[].quantity",
      "line_items[].unit_price", "line_items[].total",
      "subtotal", "tax_total", "grand_total",
      "references.po_number", "references.contract_reference", "references.ssa_reference",
      "notes",
    ],
    pdf_conversion: "frontend converts unlocked invoice to PDF on user click",
  },
};

const client = new MongoClient(uri);
await client.connect();
const r = await client
  .db(dbName)
  .collection("sessions")
  .updateOne(
    { session_id: SESSION_ID },
    {
      $set: {
        "agent_outputs.billing.json": billingJson,
        "agent_outputs.billing.status": "complete",
        "gates.g2_per_bill": billingJson.invoices.map((i) => ({
          invoice_number: i.invoice_id,
          status: "pending",
          approved_at: null,
          sent: false,
        })),
        status: "gate2",
      },
    }
  );
console.log("billing.json v2 seeded — matched:", r.matchedCount, "modified:", r.modifiedCount);
console.log("invoices:", billingJson.invoices.length, "  JEs:", billingJson.journal_entries.length);
console.log("REC total:", (stub + 22 * full + lastFill).toFixed(2));
await client.close();
