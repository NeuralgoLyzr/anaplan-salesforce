"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ExternalLink } from "lucide-react";
import { PanelShell } from "./PanelShell";

interface Props {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  content: string;
  ctaLabel?: string;
  ctaUrl?: string;
  isLoading?: boolean;
  headerActions?: ReactNode;
}

export function MarkdownPanel({
  icon,
  title,
  subtitle,
  emptyTitle = "No content yet",
  emptyDescription = "Content will appear here once available.",
  content,
  ctaLabel,
  ctaUrl,
  isLoading,
  headerActions,
}: Props) {
  return (
    <PanelShell
      icon={icon}
      title={title}
      subtitle={subtitle}
      isLoading={isLoading}
      isEmpty={!content.trim()}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      headerActions={headerActions}
    >
      <div className="p-5 space-y-4">
        {ctaLabel && ctaUrl && (
          <a
            href={ctaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 text-primary text-[12px] font-medium hover:bg-primary/15 transition-colors border border-primary/15"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {ctaLabel}
          </a>
        )}
        <div className="prose-agent">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      </div>
    </PanelShell>
  );
}
