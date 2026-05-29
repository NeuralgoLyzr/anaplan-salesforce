// Server-only configuration loaded from environment variables.
// Never import this from a client component.

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function optional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export const lyzrConfig = {
  baseUrl: optional("LYZR_BASE_URL", "https://agent-prod.studio.lyzr.ai").replace(/\/+$/, ""),
  apiKey: () => required("LYZR_API_KEY"),
  userId: () => optional("LYZR_USER_ID", "default_user"),
  agents: {
    reader: () => required("LYZR_AGENT_READER_ID"),
    pricing: () => required("LYZR_AGENT_PRICING_ID"),
    anomaly: () => required("LYZR_AGENT_ANOMALY_ID"),
    billing: () => required("LYZR_AGENT_BILLING_ID"),
  },
};

export const mongoConfig = {
  uri: () => required("MONGODB_URI"),
  db: () => optional("MONGODB_DB", "rev_rec"),
};

export const anaplanConfig = () => ({
  workspace_name: optional("ANAPLAN_WORKSPACE_NAME", "Polaris CoModeler"),
  model_name: optional("ANAPLAN_MODEL_NAME", "IFP Integrated Financial Planning"),
  input_module_hint: optional("ANAPLAN_INPUT_MODULE_HINT") || null,
  calc_process_hint: optional("ANAPLAN_CALC_PROCESS_HINT") || null,
  output_export_hint: optional("ANAPLAN_OUTPUT_EXPORT_HINT") || null,
});

export const llamaConfig = {
  baseUrl: optional("LLAMA_CLOUD_BASE_URL", "https://api.cloud.llamaindex.ai").replace(/\/+$/, ""),
  apiKey: () => optional("LLAMA_CLOUD_API_KEY"),
  // LlamaParse is the primary parser only when an API key is configured;
  // otherwise the app falls back to unpdf.
  enabled: () => !!process.env.LLAMA_CLOUD_API_KEY,
  tier: () => optional("LLAMA_PARSE_TIER", "agentic"),
  version: () => optional("LLAMA_PARSE_VERSION", "latest"),
  projectId: () => optional("LLAMA_PROJECT_ID") || null,
};

export const billingConfig = () => ({
  vendor_invoice_prefix: optional("VENDOR_INVOICE_PREFIX", "INV-LYZR-"),
  preview_cycle_count: Number(optional("PREVIEW_CYCLE_COUNT", "3")),
});

// AWS SES SMTP — outbound email for anomaly send_email actions. Uses SES SMTP
// credentials (NOT IAM keys), mirroring accenture-media-entertainment's setup.
export const sesConfig = {
  fromAddress: () => optional("SES_FROM_ADDRESS", "no-reply@ca.lyzr.app"),
  host: () => optional("SMTP_HOST", "email-smtp.us-east-1.amazonaws.com"),
  port: () => Number(optional("SMTP_PORT", "587")),
  username: () => required("SMTP_USERNAME"),
  password: () => required("SMTP_PASSWORD"),
};

export const salesforceConfig = {
  // Base URL of the FastAPI Salesforce gateway (anaplan-salesforce-backend).
  // The Next.js sync route calls /api/contracts and /api/contracts/{id}/documents
  // (and the document-download proxy) against this host.
  backendUrl: () => optional("SALESFORCE_BACKEND_URL", "http://localhost:8000").replace(/\/+$/, ""),
  // Shared bearer secret between the polling worker and the /api/salesforce/sync
  // route. Required in production; in dev the route returns 503 if missing.
  syncSecret: () => optional("SALESFORCE_SYNC_SECRET"),
};
