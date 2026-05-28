export interface DashboardMetric {
  id: string;
  label: string;
  value: string;
  change: string;
  changeType: "positive" | "negative" | "neutral";
  trend: "up" | "down" | "flat";
  detail?: string;
}

export interface DashboardInsight {
  id: string;
  severity: "critical" | "warning" | "positive" | "info";
  headline: string;
  summary: string;
  category: string;
  actionLabel?: string;
}

export interface EngagementData {
  id: string;
  client: string;
  type: string;
  progress: {
    survey: boolean;
    policy: boolean;
    competitive: boolean;
    synthesis: boolean;
  };
  lastActivity: string;
  industry: string;
}

export interface SuggestedAction {
  client: string;
  label: string;
  detail: string;
  href: string;
}
