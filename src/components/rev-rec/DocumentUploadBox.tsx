"use client";

import { useRef, useState } from "react";
import { Upload, FileText, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  operation: "add" | "update";
  triggersRerun: boolean;
  documentName?: string | null;
  sourceDocId?: string | null;
  disabled?: boolean;
  busy?: boolean;
  onUpload: (file: File) => Promise<void>;
}

// Inline drag-and-drop file picker that appears beneath an upload_document
// action. Plain PDF only; emits the file up to the parent which talks to
// /api/companies/[id]/document-upload.
export function DocumentUploadBox({
  operation, triggersRerun, documentName, sourceDocId, disabled, busy, onUpload,
}: Props) {
  const [drag, setDrag] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | null | undefined) {
    if (!file) return;
    setErr(null);
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setErr("Only PDF files are accepted.");
      return;
    }
    try {
      await onUpload(file);
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  return (
    <div className="space-y-1.5">
      <div
        onDragOver={(e) => { e.preventDefault(); if (!disabled && !busy) setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (disabled || busy) return;
          handleFile(e.dataTransfer.files?.[0]);
        }}
        onClick={() => !disabled && !busy && inputRef.current?.click()}
        className={cn(
          "rounded-xl border-2 border-dashed px-4 py-4 flex items-center gap-3 cursor-pointer transition-colors",
          drag ? "border-primary/60 bg-primary/[0.04]" : "border-primary/15 hover:border-primary/30 hover:bg-primary/[0.02]",
          (disabled || busy) && "opacity-60 cursor-not-allowed"
        )}
      >
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          {busy ? <Loader2 className="w-4 h-4 text-primary animate-spin" /> : <Upload className="w-4 h-4 text-primary" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-medium text-foreground truncate">
            {operation === "update" ? "Replace" : "Upload"}{documentName ? ` — ${documentName}` : ""}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {busy
              ? operation === "update"
                ? "Replacing in Salesforce…"
                : "Uploading to Salesforce…"
              : "Click or drop a PDF to attach"}
            {triggersRerun && (
              <span className="ml-2 inline-flex items-center gap-1 text-amber-600">
                <RefreshCw className="w-3 h-3" /> will trigger a reader+pricing rerun
              </span>
            )}
          </p>
          {sourceDocId && (
            <p className="text-[10px] text-muted-foreground/70 mt-0.5 font-mono">{sourceDocId}</p>
          )}
        </div>
        <FileText className="w-4 h-4 text-muted-foreground/60 shrink-0" />
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
      {err && <p className="text-[11px] text-red-600">{err}</p>}
    </div>
  );
}
