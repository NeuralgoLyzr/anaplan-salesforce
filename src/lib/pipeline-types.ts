import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

// ── Table Panel ───────────────────────────────────────────────────────────────

export interface TableColumn<T extends Record<string, unknown> = Record<string, unknown>> {
  key: keyof T & string;
  label: string;
  width?: string;
  render?: (value: unknown, row: T) => ReactNode;
}

// ── Card List Panel ───────────────────────────────────────────────────────────

export interface TaskCard {
  id: string | number;
  title: string;
  owner?: string;
  start?: string;
  end?: string;
  dependency?: string;
  status: string;
  priority?: string;
  tags?: string[];
  [key: string]: unknown;
}

// ── Markdown Panel ────────────────────────────────────────────────────────────

export interface MarkdownContent {
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
}

// ── Pipeline Tabs ─────────────────────────────────────────────────────────────

export interface PipelineTab {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: string | number;
  panel: ReactNode;
}
