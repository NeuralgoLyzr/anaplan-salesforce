"use client";
import { useRef, useState } from "react";
import { Upload, FileText, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Loader } from "@/components/ui/loader";
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
          "rounded-[4px] border-2 border-dashed px-4 py-4 flex items-center gap-3 cursor-pointer transition-colors",
          drag ? "border-[#e6ebf8] bg-[#f0f1f7]]" : "border-[#e6ebf8] hover:border-[#e6ebf8] hover:bg-[#f0f1f7]]",
          (disabled || busy) && "opacity-60 cursor-not-allowed"
        )}
      >
        <div className="w-9 h-9 rounded-[4px] bg-[#e6ebf8] flex items-center justify-center shrink-0">
          {busy ? <Loader size="inline" /> : <Upload className="w-4 h-4 text-[#3c67ea]" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[0.75rem] font-medium text-[#242d48] truncate">
            {operation === "update" ? "Replace" : "Upload"}{documentName ? ` — ${documentName}` : ""}
          </p>
          <p className="text-[0.75rem] text-[#485478]">
            {busy
              ? operation === "update"
                ? "Replacing in Salesforce…"
                : "Uploading to Salesforce…"
              : "Click or drop a PDF to attach"}
            {triggersRerun && (
              <span className="ml-2 inline-flex items-center gap-1 text-[#ffbb16]">
                <RefreshCw className="w-3 h-3" /> will trigger a reader+pricing rerun
              </span>
            )}
          </p>
          {sourceDocId && (
            <p className="text-[0.75rem] text-[#485478] mt-0.5 font-mono">{sourceDocId}</p>
          )}
        </div>
        <FileText className="w-4 h-4 text-[#485478] shrink-0" />
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
      {err && <p className="text-[0.75rem] text-[#db3743]">{err}</p>}
    </div>
  );
}
