// PDF rendering for invoices. Mirrors InvoiceTemplate's on-screen layout using
// @react-pdf/renderer primitives so the same data shape produces both the
// preview dialog (HTML) and the email attachment / downloadable PDF (Buffer).
//
// This file is consumed by:
//   - /api/companies/[id]/invoices/[invoiceId]/pdf  → renderToBuffer for download
//   - /api/companies/[id]/invoices/[invoiceId]/send-email  → attach buffer to SES

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { InvoiceView } from "@/lib/rev-rec/view";

const COLORS = {
  border: "#e4e4e7",
  borderSoft: "#f1f1f4",
  muted: "#6b7280",
  mutedSoft: "#9ca3af",
  fg: "#18181b",
  fgSoft: "#3f3f46",
  zebra: "#fafafa",
  accentBg: "#f5f5f7",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 36,
    paddingHorizontal: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: COLORS.fg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 12,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: { fontSize: 22, fontFamily: "Helvetica-Bold" },
  invoiceId: { fontSize: 10, color: COLORS.muted, marginTop: 4 },
  cycle: { fontSize: 9, color: COLORS.muted, marginTop: 1 },
  headerMetaCol: { textAlign: "right" },
  metaRow: { fontSize: 10, color: COLORS.muted, marginBottom: 1 },
  metaLabel: { color: COLORS.mutedSoft },
  partiesRow: { flexDirection: "row", gap: 12, marginBottom: 14 },
  partyBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    padding: 8,
  },
  partyTitle: {
    fontSize: 8,
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 4,
    fontFamily: "Helvetica-Bold",
  },
  partyName: { fontSize: 11, fontFamily: "Helvetica-Bold", color: COLORS.fg, marginBottom: 2 },
  partyLine: { fontSize: 9, color: COLORS.muted, marginBottom: 1 },
  refsBlock: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.accentBg,
    padding: 6,
    borderRadius: 4,
    marginBottom: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  refItem: { fontSize: 9, color: COLORS.muted },
  refLabel: { color: COLORS.mutedSoft },
  table: { marginBottom: 12 },
  tableHeadRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 4,
    paddingTop: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.borderSoft,
    paddingVertical: 4,
  },
  thDesc: {
    flex: 2.6,
    fontSize: 8,
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    fontFamily: "Helvetica-Bold",
  },
  thPeriod: {
    flex: 1.6,
    fontSize: 8,
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    fontFamily: "Helvetica-Bold",
  },
  thQty: {
    flex: 0.7,
    fontSize: 8,
    color: COLORS.muted,
    textAlign: "right",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    fontFamily: "Helvetica-Bold",
  },
  thUnit: {
    flex: 1,
    fontSize: 8,
    color: COLORS.muted,
    textAlign: "right",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    fontFamily: "Helvetica-Bold",
  },
  thTotal: {
    flex: 1.1,
    fontSize: 8,
    color: COLORS.muted,
    textAlign: "right",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    fontFamily: "Helvetica-Bold",
  },
  tdDesc: { flex: 2.6, fontSize: 10, color: COLORS.fgSoft },
  tdPeriod: { flex: 1.6, fontSize: 10, color: COLORS.muted },
  tdQty: { flex: 0.7, fontSize: 10, color: COLORS.fgSoft, textAlign: "right" },
  tdUnit: { flex: 1, fontSize: 10, color: COLORS.fgSoft, textAlign: "right", fontFamily: "Helvetica" },
  tdTotal: { flex: 1.1, fontSize: 10, color: COLORS.fgSoft, textAlign: "right", fontFamily: "Helvetica" },
  totalsBlock: {
    marginTop: 6,
    marginLeft: "auto",
    width: 200,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 10,
    marginBottom: 2,
  },
  totalsRowGrand: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 11,
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    fontFamily: "Helvetica-Bold",
  },
  notesBlock: {
    marginTop: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  notesTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: COLORS.fgSoft, marginBottom: 2 },
  notesBody: { fontSize: 9, color: COLORS.muted },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: COLORS.mutedSoft,
  },
});

function fmt(n: number | null | undefined, currency?: string | null): string {
  if (n == null) return "—";
  const v = n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency ? `${currency} ${v}` : v;
}

export function InvoicePdfDocument({ inv }: { inv: InvoiceView }) {
  return (
    <Document title={`Invoice ${inv.id}`} author={inv.vendor?.name ?? "Vendor"}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Invoice</Text>
            <Text style={styles.invoiceId}>{inv.id}</Text>
            {inv.sequence != null && <Text style={styles.cycle}>Cycle {inv.sequence}</Text>}
          </View>
          <View style={styles.headerMetaCol}>
            {inv.issueDate && (
              <Text style={styles.metaRow}>
                <Text style={styles.metaLabel}>Issued: </Text>
                {inv.issueDate}
              </Text>
            )}
            {inv.dueDate && (
              <Text style={styles.metaRow}>
                <Text style={styles.metaLabel}>Due: </Text>
                {inv.dueDate}
              </Text>
            )}
            {inv.paymentTerms && (
              <Text style={styles.metaRow}>
                <Text style={styles.metaLabel}>Terms: </Text>
                {inv.paymentTerms}
              </Text>
            )}
            {inv.periodLabel && (
              <Text style={styles.metaRow}>
                <Text style={styles.metaLabel}>Period: </Text>
                {inv.periodLabel}
              </Text>
            )}
          </View>
        </View>

        {/* Parties */}
        <View style={styles.partiesRow}>
          <PartyBlock title="From" party={inv.vendor} />
          <PartyBlock title="Bill to" party={inv.customer} />
        </View>

        {/* References */}
        {inv.references && (inv.references.poNumber || inv.references.contractReference || inv.references.ssaReference) && (
          <View style={styles.refsBlock}>
            {inv.references.poNumber && (
              <Text style={styles.refItem}>
                <Text style={styles.refLabel}>PO: </Text>
                {inv.references.poNumber}
              </Text>
            )}
            {inv.references.contractReference && (
              <Text style={styles.refItem}>
                <Text style={styles.refLabel}>Contract: </Text>
                {inv.references.contractReference}
              </Text>
            )}
            {inv.references.ssaReference && (
              <Text style={styles.refItem}>
                <Text style={styles.refLabel}>SSA: </Text>
                {inv.references.ssaReference}
              </Text>
            )}
          </View>
        )}

        {/* Line items */}
        <View style={styles.table}>
          <View style={styles.tableHeadRow}>
            <Text style={styles.thDesc}>Description</Text>
            <Text style={styles.thPeriod}>Period</Text>
            <Text style={styles.thQty}>Qty</Text>
            <Text style={styles.thUnit}>Unit</Text>
            <Text style={styles.thTotal}>Total</Text>
          </View>
          {inv.lineItems.length === 0 ? (
            <View style={styles.tableRow}>
              <Text style={{ ...styles.tdDesc, color: COLORS.muted }}>No line items.</Text>
            </View>
          ) : (
            inv.lineItems.map((li, i) => (
              <View key={li.lineItemId ?? i} style={styles.tableRow}>
                <Text style={styles.tdDesc}>{li.description}</Text>
                <Text style={styles.tdPeriod}>{li.periodLabel ?? "—"}</Text>
                <Text style={styles.tdQty}>{li.quantity ?? "—"}</Text>
                <Text style={styles.tdUnit}>{fmt(li.unitPrice, inv.currency)}</Text>
                <Text style={styles.tdTotal}>{fmt(li.total, inv.currency)}</Text>
              </View>
            ))
          )}
        </View>

        {/* Totals */}
        <View style={styles.totalsBlock}>
          {inv.subtotal != null && (
            <View style={styles.totalsRow}>
              <Text style={{ color: COLORS.muted }}>Subtotal</Text>
              <Text>{fmt(inv.subtotal, inv.currency)}</Text>
            </View>
          )}
          {inv.taxTotal != null && (
            <View style={styles.totalsRow}>
              <Text style={{ color: COLORS.muted }}>Tax</Text>
              <Text>{fmt(inv.taxTotal, inv.currency)}</Text>
            </View>
          )}
          <View style={styles.totalsRowGrand}>
            <Text>Total</Text>
            <Text>{inv.total ?? fmt(inv.totalNumber, inv.currency)}</Text>
          </View>
        </View>

        {/* Notes */}
        {inv.notes && (
          <View style={styles.notesBlock}>
            <Text style={styles.notesTitle}>Notes</Text>
            <Text style={styles.notesBody}>{inv.notes}</Text>
          </View>
        )}

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}

function PartyBlock({
  title, party,
}: {
  title: string;
  party: { name: string; address: string | null; billingContact: string | null; taxId: string | null; poReference?: string | null } | null;
}) {
  return (
    <View style={styles.partyBox}>
      <Text style={styles.partyTitle}>{title}</Text>
      {party ? (
        <View>
          <Text style={styles.partyName}>{party.name}</Text>
          {party.address && <Text style={styles.partyLine}>{party.address}</Text>}
          {party.billingContact && <Text style={styles.partyLine}>{party.billingContact}</Text>}
          {party.taxId && <Text style={styles.partyLine}>Tax ID: {party.taxId}</Text>}
          {party.poReference && <Text style={styles.partyLine}>PO: {party.poReference}</Text>}
        </View>
      ) : (
        <Text style={styles.partyLine}>—</Text>
      )}
    </View>
  );
}
