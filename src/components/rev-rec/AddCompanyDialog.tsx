"use client";
import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Upload, FileText, X } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader } from "@/components/ui/loader";
interface Props {
  // Optional callback so callers can refresh their list without a full reload.
  onCreated?: () => void;
}
export function AddCompanyDialog({ onCreated }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const reset = useCallback(() => {
    setCompanyName("");
    setFiles([]);
    setError(null);
    setBusy(false);
    setDragging(false);
  }, []);
  const acceptFiles = useCallback((list: FileList | null) => {
    if (!list) return;
    const pdfs: File[] = [];
    for (const f of Array.from(list)) {
      const isPdf = f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
      if (isPdf) pdfs.push(f);
    }
    if (pdfs.length === 0) {
      setError("Only PDF files are accepted.");
      return;
    }
    setError(null);
    setFiles((prev) => [...prev, ...pdfs]);
  }, []);
  function removeFile(i: number) {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
  }
  async function submit() {
    if (files.length === 0) {
      setError("Add at least one contract PDF.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      if (companyName.trim()) form.append("company_name", companyName.trim());
      for (const f of files) form.append("files", f);
      const res = await fetch("/api/companies", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create customer");
      setOpen(false);
      reset();
      onCreated?.();
      if (data.session_id) {
        router.push(`/customers/${data.session_id}`);
      } else {
        router.refresh();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button className="gap-1.5">
          <Plus className="w-4 h-4" /> Add customer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-[#3c67ea]" /> Add customer
          </DialogTitle>
          <DialogDescription>
            Upload one or more contract PDFs (SSA / order schedule). The Reader agent will start
            automatically once extraction completes.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-[0.75rem] font-medium uppercase tracking-[0.08em] text-[#485478]">
              Customer name <span className="font-normal text-[#485478]">(optional — inferred from contract)</span>
            </label>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Acme Corp."
              className="mt-1 w-full bg-[#f8f8fa] shadow-[0_0_0_1px_#7885ab] rounded-[2px] px-3 py-2 text-[0.875rem] leading-[1.2]"
            />
          </div>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              acceptFiles(e.dataTransfer.files);
            }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "border-2 border-dashed border-[#e6ebf8] rounded-[4px] px-4 py-6 text-center cursor-pointer transition-colors",
              dragging ? "border-[#3c67ea] bg-[#f0f1f7]" : "border-[#e6ebf8] hover:bg-[#f0f1f7]",
            )}
          >
            <Upload className="w-5 h-5 text-[#3c67ea] mx-auto mb-1" />
            <p className="text-[0.875rem] leading-[1.2] text-[#242d48]">Drop PDFs here or click to browse</p>
            <p className="text-[0.75rem] text-[#485478] mt-0.5">SSA and / or Order Schedule documents</p>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              multiple
              className="hidden"
              onChange={(e) => acceptFiles(e.target.files)}
            />
          </div>
          {files.length > 0 && (
            <ul className="space-y-1.5 max-h-40 overflow-auto">
              {files.map((f, i) => (
                <li key={`${f.name}-${i}`} className="flex items-center gap-2 text-[0.75rem] rounded-[4px] border border-[#e6ebf8] px-2 py-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#3c67ea] shrink-0" />
                  <span className="truncate flex-1">{f.name}</span>
                  <span className="text-[0.75rem] text-[#485478]">{(f.size / 1024).toFixed(0)} KB</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                    className="p-0.5 rounded hover:bg-white text-[#485478] hover:text-[#db3743]"
                    title="Remove"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {error && (
            <p className="text-[0.75rem] text-[#db3743]">{error}</p>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy || files.length === 0} className="gap-1.5">
            {busy ? <Loader size="inline" /> : <Upload className="w-4 h-4" />}
            {busy ? "Uploading…" : `Upload ${files.length || ""} file${files.length === 1 ? "" : "s"}`.trim()}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
