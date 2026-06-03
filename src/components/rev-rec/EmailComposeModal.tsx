"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Mail, Send, X, Loader2, Info, AtSign, User, Paperclip, Download, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

// Optional attachment shown as a downloadable chip inside the composer. The
// `url` is a fetch-able URL (e.g. /api/.../invoices/INV-XYZ/pdf) — clicking the
// chip downloads the file via a hidden <a download> click. The server route
// re-generates the same file when sending, so we don't need to upload bytes
// from the client.
export interface ComposeAttachment {
  filename: string;
  url: string;
  contentType?: string;
  sizeHint?: string; // e.g., "2 pages" or "120 KB"; purely decorative
}

interface Props {
  open: boolean;
  initialTo?: string;
  initialSubject: string;
  initialBody: string;
  recipientRole?: string | null;
  recipientName?: string | null;
  attachment?: ComposeAttachment | null;
  onClose: () => void;
  onSend: (args: { to: string; subject: string; body: string }) => Promise<void>;
}

// Modal for editing + sending an anomaly send_email action via SES.
// Auto-fills last-sent values from localStorage (keyed per action_id by the
// parent) so a repeat send doesn't require re-typing.
export function EmailComposeModal({
  open, initialTo = "", initialSubject, initialBody, recipientRole, recipientName,
  attachment, onClose, onSend,
}: Props) {
  const [to, setTo] = useState(initialTo);
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const toRef = useRef<HTMLInputElement>(null);

  // Portal target — only available after mount on the client.
  useEffect(() => setMounted(true), []);

  // Lock page scroll while the modal is open so the underlying content can't
  // scroll behind it.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    if (open) {
      setTo(initialTo);
      setSubject(initialSubject);
      setBody(initialBody);
      setErr(null);
      setBusy(false);
      // Defer to next tick so the input is in the DOM.
      setTimeout(() => toRef.current?.focus(), 50);
    }
  }, [open, initialTo, initialSubject, initialBody]);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, busy, onClose]);

  async function handleSend() {
    setErr(null);
    if (!to.trim()) {
      setErr("Please enter a recipient email.");
      toRef.current?.focus();
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to.trim())) {
      setErr("That doesn't look like a valid email address.");
      toRef.current?.focus();
      return;
    }
    if (!subject.trim() || !body.trim()) {
      setErr("Subject and body cannot be empty.");
      return;
    }
    try {
      setBusy(true);
      await onSend({ to: to.trim(), subject: subject.trim(), body });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => !busy && onClose()}>
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-auto bg-background rounded-2xl border border-primary/15 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-primary/10 bg-primary/[0.03]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Mail className="w-3.5 h-3.5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Compose email</p>
              {(recipientRole || recipientName) && (
                <p className="text-[11px] text-muted-foreground">
                  Suggested recipient: {recipientName ?? recipientRole}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => !busy && onClose()}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          {/* Two reminders the user must action before sending. */}
          <div className="rounded-lg border border-warning/30 bg-warning/5 px-3 py-2.5">
            <div className="flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-warning">Before you send</p>
                <ul className="space-y-1 text-[11px] text-warning/90">
                  <li className="flex items-start gap-1.5">
                    <AtSign className="w-3 h-3 mt-0.5 shrink-0" />
                    <span>
                      Add the recipient&apos;s email in the <span className="font-semibold">To</span> field — it&apos;s blank by default.
                    </span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <User className="w-3 h-3 mt-0.5 shrink-0" />
                    <span>
                      Replace <code className="font-mono bg-warning/10 px-1 rounded">[Your name]</code> at the end of the body with your actual name before sending.
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1">To</label>
            <input
              ref={toRef}
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
              className="w-full px-3 py-2 rounded-lg border border-primary/15 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-primary/15 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1">Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              className="w-full px-3 py-2 rounded-lg border border-primary/15 bg-background text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {/Your name/i.test(body) && (
              <p className="mt-1 text-[11px] text-warning flex items-center gap-1">
                <User className="w-3 h-3" />
                The body still contains <code className="font-mono bg-warning/10 px-1 rounded">[Your name]</code> — replace it with your name before sending.
              </p>
            )}
          </div>
          {/* Attachment chip — downloadable, shown when caller passed one in. */}
          {attachment && (
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1 flex items-center gap-1">
                <Paperclip className="w-3 h-3" /> Attachment
              </label>
              <div className="rounded-lg border border-primary/15 bg-primary/[0.03] px-3 py-2 flex items-center gap-3">
                <div className="w-9 h-10 rounded-md bg-destructive/10 border border-destructive/20 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-destructive" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium text-foreground truncate">{attachment.filename}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {(attachment.contentType ?? "application/pdf")}
                    {attachment.sizeHint ? ` · ${attachment.sizeHint}` : ""}
                  </p>
                </div>
                <a
                  href={attachment.url}
                  download={attachment.filename}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] font-medium text-primary hover:text-primary/80 px-2 py-1 rounded-md border border-primary/15 hover:bg-primary/[0.05] transition-colors"
                  title="Download the attachment"
                >
                  <Download className="w-3 h-3" /> Download
                </a>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Will be attached to the email when sent.
              </p>
            </div>
          )}

          {err && <p className="text-[12px] text-destructive">{err}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-primary/10 bg-muted/20">
          <button
            onClick={onClose}
            disabled={busy}
            className="px-3 py-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={busy}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-white",
              busy ? "bg-success/70" : "bg-success hover:bg-success"
            )}
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            {busy ? "Sending…" : "Send email"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
