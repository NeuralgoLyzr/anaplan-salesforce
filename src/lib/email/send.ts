// Server-only SMTP sender for anomaly send_email actions.
// Uses AWS SES via SMTP with SES-issued SMTP credentials (NOT IAM access keys).
// Mirrors the pattern in accenture-media-entertainment/lib/apb/util/email.ts.

import nodemailer, { type Transporter } from "nodemailer";
import { sesConfig } from "../config";

let cachedTransporter: Transporter | null = null;
let cachedKey = "";

function getTransporter(): Transporter {
  const host = sesConfig.host();
  const port = sesConfig.port();
  const username = sesConfig.username();
  const password = sesConfig.password();
  const secure = port === 465;
  const key = `${host}|${port}|${username}|${password}|${secure}`;
  if (cachedTransporter && cachedKey === key) return cachedTransporter;
  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user: username, pass: password },
    pool: true,
    maxConnections: 3,
    maxMessages: 50,
  });
  cachedKey = key;
  return cachedTransporter;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType: string; // e.g., "application/pdf"
}

export interface SendEmailArgs {
  to: string;
  subject: string;
  text: string;
  fromName?: string;
  attachments?: EmailAttachment[];
}

export interface SendEmailResult {
  message_id: string;
  response: string;
  accepted: string[];
  rejected: string[];
}

export async function sendActionEmail(args: SendEmailArgs): Promise<SendEmailResult> {
  const t = getTransporter();
  const fromAddress = sesConfig.fromAddress();
  const from = args.fromName ? `${args.fromName} <${fromAddress}>` : fromAddress;
  const info = await t.sendMail({
    from,
    to: args.to,
    subject: args.subject,
    text: args.text,
    attachments: args.attachments?.map((a) => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType,
    })),
  });
  return {
    message_id: info.messageId,
    response: info.response,
    accepted: info.accepted as string[],
    rejected: info.rejected as string[],
  };
}
