"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  docId: string;
  filename: string;
}

export function DocumentPreviewModal({ open, onClose, sessionId, docId, filename }: Props) {
  const previewUrl = `/api/companies/${sessionId}/files/${encodeURIComponent(docId)}/pdf`;
  const downloadUrl = `${previewUrl}?download=1`;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-5xl w-[95vw] h-[90vh] p-0 gap-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-5 py-3 border-b border-[#e6ebf8] flex flex-row items-center justify-between gap-3 space-y-0">
          <DialogTitle className="flex items-center gap-2 text-[0.875rem] leading-[1.2] font-semibold min-w-0">
            <FileText className="w-4 h-4 text-[#3c67ea] shrink-0" />
            <span className="truncate">{filename}</span>
          </DialogTitle>
          <a href={downloadUrl} download={filename} className="shrink-0 mr-8">
            <Button size="sm" className="gap-1.5">
              <Download className="w-3.5 h-3.5" />
              Download
            </Button>
          </a>
        </DialogHeader>
        <div className="flex-1 bg-[#f0f1f7]">
          <iframe
            key={previewUrl}
            src={previewUrl}
            className="w-full h-full"
            title={filename}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
