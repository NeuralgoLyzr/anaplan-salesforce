"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { IconBuildingBank } from "@tabler/icons-react";
import { FileText, AlertTriangle, Receipt, ChevronRight, RefreshCw, Trash2 } from "lucide-react";
import { AddCompanyDialog } from "@/components/rev-rec/AddCompanyDialog";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { STATUS_META, isBusy, formatMoney, formatDate, type SessionSummary } from "@/lib/rev-rec/ui";
import { cn } from "@/lib/utils";
import { Loader } from "@/components/ui/loader";
export default function CustomersPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<SessionSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/companies", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setCompanies(data.companies ?? []);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  async function handleDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/companies/${toDelete.session_id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Delete failed");
      }
      setCompanies((prev) => prev.filter((c) => c.session_id !== toDelete.session_id));
      setSelected((prev) => {
        if (!prev.has(toDelete.session_id)) return prev;
        const next = new Set(prev);
        next.delete(toDelete.session_id);
        return next;
      });
      setToDelete(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDeleting(false);
    }
  }
  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll(checked: boolean) {
    setSelected(() => {
      if (!checked) return new Set();
      return new Set(companies.map((c) => c.session_id));
    });
  }
  function clearSelection() {
    setSelected(new Set());
  }
  async function handleBulkDelete() {
    if (selected.size === 0) return;
    setBulkDeleting(true);
    const ids = [...selected];
    try {
      const results = await Promise.allSettled(
        ids.map((id) => fetch(`/api/companies/${id}`, { method: "DELETE" })),
      );
      const failed: string[] = [];
      results.forEach((r, i) => {
        if (r.status === "rejected" || !r.value.ok) failed.push(ids[i]);
      });
      const succeeded = new Set(ids.filter((id) => !failed.includes(id)));
      setCompanies((prev) => prev.filter((c) => !succeeded.has(c.session_id)));
      setSelected(new Set(failed));
      setBulkOpen(false);
      if (failed.length > 0) {
        setError(`Failed to delete ${failed.length} customer${failed.length === 1 ? "" : "s"}.`);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBulkDeleting(false);
    }
  }
  // Light auto-refresh while any customer is still running.
  useEffect(() => {
    const anyBusy = companies.some((c) => isBusy(c.status));
    if (!anyBusy) return;
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [companies, load]);
  return (
    <div className="app-bg min-h-screen">
      {/* ADS PageHeader: 56px, white, border-b #E6EBF8, grid back|header|actions */}
      <header
        style={{ display: "grid", gridTemplateAreas: "'back header actions'", gridTemplateColumns: "min-content 1fr auto", alignItems: "center" }}
        className="w-full h-[56px] bg-white border-b border-[#e6ebf8] px-4"
      >
        <div style={{ gridArea: "header" }} className="flex items-center gap-2 min-w-0">
          {/* ADS grapefruit title: 22px/600 */}
          <h1 className="text-[1.375rem] font-semibold leading-[1.5] text-[#242d48]">Customers</h1>
          {/* ADS: cranberry secondary text */}
          <span className="text-[0.8125rem] font-normal text-[#485478] leading-[1.2]">
            · {companies.length} customer{companies.length === 1 ? "" : "s"}
          </span>
        </div>
        <div style={{ gridArea: "actions" }} className="flex items-center gap-2">
          {/* ADS icon button: h-8 w-8, #485478, hover bg #F0F1F7 */}
          <button
            onClick={load}
            className="flex h-8 w-8 items-center justify-center rounded-[2px] text-[#485478] hover:bg-[#f0f1f7] active:bg-[#dfe2eb] transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <AddCompanyDialog />
        </div>
      </header>
      <div className="px-4 sm:px-6 py-4 space-y-4">
        {/* ADS InlineMessage — error: border-left #DB3743 */}
        {error && (
          <div className="bg-white border-l-4 border-[#db3743] px-4 py-3 rounded-[2px] shadow-[0_2px_4px_rgba(36,45,72,0.15)] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#db3743] shrink-0" />
            <p className="text-[0.875rem] font-normal text-[#242d48] leading-[1.2]">{error}</p>
          </div>
        )}
        {/* Bulk action toolbar — ADS ButtonToolbar style */}
        {selected.size > 0 && (
          <div className="flex items-center gap-3 bg-white border border-[#e6ebf8] rounded-[4px] px-4 py-2 shadow-[0_2px_4px_rgba(36,45,72,0.15)]">
            <p className="text-[0.875rem] font-normal text-[#242d48] leading-[1.2] flex-1">
              <span className="font-semibold">{selected.size}</span> selected
            </p>
            <Button variant="outline" size="sm" onClick={clearSelection} disabled={bulkDeleting}>
              Clear
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setBulkOpen(true)} disabled={bulkDeleting} className="gap-1.5">
              <Trash2 className="w-3.5 h-3.5" />
              Delete {selected.size}
            </Button>
          </div>
        )}
        {/* ADS DataTable: white bg, #E6EBF8 borders, 16px cell padding, 32px row height */}
        <div className="rounded-[4px] bg-white border border-[#e6ebf8] shadow-[0_2px_4px_rgba(36,45,72,0.15)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left" style={{ tableLayout: "fixed" }}>
              <thead>
                {/* ADS table head: weight 600, 13px, #2C2C48 */}
                <tr className="border-b border-[#e6ebf8] bg-white">
                  <th className="px-4 py-2 w-10 border-b border-l border-[#e6ebf8]">
                    <Checkbox
                      aria-label="Select all customers"
                      checked={
                        companies.length > 0 && selected.size === companies.length
                          ? true
                          : selected.size > 0
                          ? "indeterminate"
                          : false
                      }
                      onCheckedChange={(c) => toggleAll(c === true)}
                      disabled={companies.length === 0}
                    />
                  </th>
                  {["Customer", "Status", "Files", "Total Revenue", "Projection", "Anomalies", "Invoices", "Audit", "Updated", ""].map((h, i) => (
                    <th key={i} className="px-4 py-2 text-[0.8125rem] font-semibold text-[#2c2c48] leading-[1.2] whitespace-nowrap border-b border-l border-[#e6ebf8]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-16 text-center border-b border-[#e6ebf8]">
                      {/* ADS disc loader */}
                      <Loader size="medium" />
                    </td>
                  </tr>
                ) : companies.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-16 text-center">
                      {/* ADS EmptyState */}
                      <IconBuildingBank className="w-8 h-8 text-[#909cc0] mx-auto mb-3" />
                      <p className="text-[1rem] font-semibold text-[#242d48] leading-[1.2]">No customers yet</p>
                      <p className="text-[0.875rem] font-normal text-[#485478] leading-[1.2] mt-1">
                        Add a customer to upload contracts and run the pipeline.
                      </p>
                    </td>
                  </tr>
                ) : (
                  companies.map((c) => {
                    const meta = STATUS_META[c.status];
                    const isSelected = selected.has(c.session_id);
                    return (
                      // ADS DataTable row: hover #F8F8FA, selected #DFE2EB, border-b #E6EBF8
                      <tr
                        key={c.session_id}
                        onClick={() => router.push(`/customers/${c.session_id}`)}
                        className={cn(
                          "cursor-pointer group border-b border-[#e6ebf8] last:border-0 transition-colors",
                          isSelected
                            ? "bg-[rgba(230,235,248,0.06)] outline outline-1 outline-[#3c67ea] -outline-offset-1"
                            : "hover:bg-[#f8f8fa]"
                        )}
                      >
                        <td className="px-4 py-3 w-10 border-l border-[#e6ebf8]" onClick={(e) => e.stopPropagation()}>
                          <Checkbox aria-label={`Select ${c.company_name}`} checked={isSelected} onCheckedChange={() => toggleRow(c.session_id)} />
                        </td>
                        {/* ADS: kiwi 14px/400, #242D48 */}
                        <td className="px-4 py-3 border-l border-[#e6ebf8]">
                          <div className="flex items-center gap-2">
                            <span className="text-[0.875rem] font-semibold text-[#242d48] leading-[1.2]">{c.company_name}</span>
                            {c.source === "salesforce" && (
                              <span className="inline-flex items-center border border-[#e6ebf8] rounded-[2px] px-1 py-0.5" title="Auto-ingested from Salesforce">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src="/Salesforce.com_logo.svg.png" alt="Salesforce" className="h-3 w-auto" />
                              </span>
                            )}
                            <ChevronRight className="w-3.5 h-3.5 text-[#909cc0] opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </td>
                        <td className="px-4 py-3 border-l border-[#e6ebf8]">
                          {/* ADS Badge: 2px radius, uppercase, outlined */}
                          <span className={cn("inline-flex items-center gap-1.5 text-[0.75rem] font-medium px-1 rounded-[2px] border", meta.pill)}>
                            {meta.busy && <Loader size="inline" />}
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 border-l border-[#e6ebf8] text-[0.875rem] font-normal text-[#242d48] leading-[1.2]">
                          <span className="inline-flex items-center gap-1"><FileText className="w-3.5 h-3.5 text-[#909cc0]" />{c.file_count}</span>
                        </td>
                        <td className="px-4 py-3 border-l border-[#e6ebf8] text-[0.875rem] font-normal tabular-nums text-[#242d48] leading-[1.2]">{formatMoney(c.total_revenue)}</td>
                        <td className="px-4 py-3 border-l border-[#e6ebf8] text-[0.875rem] font-normal text-[#485478] leading-[1.2]">{c.projection_months != null ? `${c.projection_months} mo` : "—"}</td>
                        <td className="px-4 py-3 border-l border-[#e6ebf8] text-[0.875rem] font-normal text-[#485478] leading-[1.2]">
                          {c.anomaly_count != null ? (
                            <span className="inline-flex items-center gap-1">
                              <AlertTriangle className={cn("w-3.5 h-3.5", c.anomaly_count > 0 ? "text-[#ffbb16]" : "text-[#909cc0]")} />
                              {c.anomaly_count}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3 border-l border-[#e6ebf8] text-[0.875rem] font-normal text-[#485478] leading-[1.2]">
                          {c.invoice_count != null && c.invoice_count > 0 ? (
                            <span className="inline-flex items-center gap-1"><Receipt className="w-3.5 h-3.5 text-[#909cc0]" />{c.invoice_count}</span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3 border-l border-[#e6ebf8] text-[0.875rem] font-normal tabular-nums text-[#485478] leading-[1.2]">{c.audit_count}</td>
                        <td className="px-4 py-3 border-l border-[#e6ebf8] text-[0.8125rem] font-normal text-[#485478] whitespace-nowrap leading-[1.2]">{formatDate(c.updated_at)}</td>
                        <td className="px-2 py-3 border-l border-[#e6ebf8] text-right">
                          {/* ADS icon button */}
                          <button
                            onClick={(e) => { e.stopPropagation(); setToDelete(c); }}
                            title={`Delete ${c.company_name}`}
                            className="flex h-8 w-8 items-center justify-center rounded-[2px] text-transparent group-hover:text-[#485478] hover:!text-[#db3743] hover:bg-[#f0f1f7] transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        {/* Delete confirmation — ADS Modal */}
        <Dialog open={!!toDelete} onOpenChange={(o) => !o && !deleting && setToDelete(null)}>
          <DialogContent className="max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-[#db3743]" />
                Delete customer
              </DialogTitle>
            </DialogHeader>
            <div className="px-4 pb-2">
              <DialogDescription>
                Permanently remove <span className="font-semibold text-[#242d48]">{toDelete?.company_name}</span> and
                all of its session data. This cannot be undone.
              </DialogDescription>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setToDelete(null)} disabled={deleting}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="gap-1.5">
                {deleting ? <Loader size="inline" /> : <Trash2 className="w-4 h-4" />}
                {deleting ? "Deleting…" : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Bulk delete confirmation — ADS Modal */}
        <Dialog open={bulkOpen} onOpenChange={(o) => !o && !bulkDeleting && setBulkOpen(false)}>
          <DialogContent className="max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-[#db3743]" />
                Delete {selected.size} customer{selected.size === 1 ? "" : "s"}
              </DialogTitle>
            </DialogHeader>
            <div className="px-4 pb-2">
              <DialogDescription>
                Permanently remove the selected customer{selected.size === 1 ? "" : "s"} and all of their session data. This cannot be undone.
              </DialogDescription>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBulkOpen(false)} disabled={bulkDeleting}>Cancel</Button>
              <Button variant="destructive" onClick={handleBulkDelete} disabled={bulkDeleting} className="gap-1.5">
                {bulkDeleting ? <Loader size="inline" /> : <Trash2 className="w-4 h-4" />}
                {bulkDeleting ? "Deleting…" : `Delete ${selected.size}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
