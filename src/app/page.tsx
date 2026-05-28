"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { IconBuildingBank } from "@tabler/icons-react";
import { Loader2, FileText, AlertTriangle, Receipt, ChevronRight, RefreshCw, Trash2, Cloud } from "lucide-react";
import { AddCompanyDialog } from "@/components/rev-rec/AddCompanyDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { STATUS_META, isBusy, formatMoney, formatDate, type SessionSummary } from "@/lib/rev-rec/ui";
import { cn } from "@/lib/utils";

export default function CustomersPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<SessionSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

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
      setToDelete(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDeleting(false);
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
    <div className="space-y-5 px-4 sm:px-6 py-5 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <IconBuildingBank className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">Customers</h1>
            <p className="text-[11px] text-muted-foreground font-medium">
              Revenue Recognition pipeline · {companies.length} customer{companies.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <AddCompanyDialog />
        </div>
      </div>

      {error && (
        <div className="glass-card rounded-xl p-4 border border-destructive/20 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-primary/[0.07] bg-primary/[0.02]">
                {["Customer", "Status", "Files", "Total Revenue", "Projection", "Anomalies", "Invoices", "Audit", "Updated", ""].map((h, i) => (
                  <th key={i} className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center">
                    <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" />
                  </td>
                </tr>
              ) : companies.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center">
                    <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center mb-3 mx-auto">
                      <IconBuildingBank className="w-6 h-6 text-primary/30" />
                    </div>
                    <p className="text-sm font-medium text-foreground/70">No customers yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Add a customer to upload contracts and run the pipeline.
                    </p>
                  </td>
                </tr>
              ) : (
                companies.map((c, i) => {
                  const meta = STATUS_META[c.status];
                  return (
                    <motion.tr
                      key={c.session_id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => router.push(`/customers/${c.session_id}`)}
                      className="border-b border-primary/[0.05] hover:bg-primary/[0.03] transition-colors last:border-0 cursor-pointer group"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{c.company_name}</span>
                          {c.source === "salesforce" && (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border bg-blue-500/10 text-blue-600 border-blue-400/20"
                              title="Auto-ingested from Salesforce"
                            >
                              <Cloud className="w-2.5 h-2.5" />
                              Salesforce
                            </span>
                          )}
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-colors" />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border", meta.pill)}>
                          {meta.busy && <Loader2 className="w-3 h-3 animate-spin" />}
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground/70">
                        <span className="inline-flex items-center gap-1"><FileText className="w-3.5 h-3.5 text-muted-foreground/60" />{c.file_count}</span>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono tabular-nums text-foreground/80">{formatMoney(c.total_revenue)}</td>
                      <td className="px-4 py-3 text-sm text-foreground/70">{c.projection_months != null ? `${c.projection_months} mo` : "—"}</td>
                      <td className="px-4 py-3 text-sm text-foreground/70">
                        {c.anomaly_count != null ? (
                          <span className="inline-flex items-center gap-1">
                            <AlertTriangle className={cn("w-3.5 h-3.5", c.anomaly_count > 0 ? "text-amber-500" : "text-muted-foreground/40")} />
                            {c.anomaly_count}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground/70">
                        {c.invoice_count != null && c.invoice_count > 0 ? (
                          <span className="inline-flex items-center gap-1"><Receipt className="w-3.5 h-3.5 text-muted-foreground/60" />{c.invoice_count}</span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground/70 tabular-nums">{c.audit_count}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatDate(c.updated_at)}</td>
                      <td className="px-2 py-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setToDelete(c);
                          }}
                          title={`Delete ${c.company_name}`}
                          className="p-1.5 rounded-md text-muted-foreground/0 group-hover:text-muted-foreground hover:!text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete confirmation */}
      <Dialog open={!!toDelete} onOpenChange={(o) => !o && !deleting && setToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-destructive" />
              Delete customer
            </DialogTitle>
            <DialogDescription>
              Permanently remove <span className="font-medium text-foreground">{toDelete?.company_name}</span> and
              all of its session data (uploaded files, agent outputs, gates, audit log). This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setToDelete(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="gap-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
