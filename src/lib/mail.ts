import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

type MailAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
};

function smtpHost(): string | undefined {
  return process.env.SMTP_HOST || process.env.SMTP_MAIL;
}

function smtpPort(): number {
  const raw = process.env.MAIL_PORT || process.env.SMTP_PORT || '587';
  const port = parseInt(raw, 10);
  return Number.isNaN(port) ? 587 : port;
}

function smtpUser(): string | undefined {
  return process.env.MAIL_USERNAME || process.env.SMTP_USER;
}

function smtpPass(): string | undefined {
  return process.env.MAIL_PASSWORD || process.env.SMTP_PASS;
}

function smtpFrom(): string {
  return (
    process.env.SMTP_FROM ||
    process.env.MAIL_FROM ||
    smtpUser() ||
    'noreply@trackmylinen.com'
  );
}

function shouldUseTls(): boolean {
  const raw = process.env.MAIL_USE_TLS ?? process.env.SMTP_USE_TLS;
  if (raw === undefined) return smtpPort() === 587;
  return raw === 'true' || raw === '1';
}

export function isSmtpConfigured(): boolean {
  return Boolean(smtpHost() && smtpUser() && smtpPass());
}

/**
 * One shared, pooled transporter for the process.
 *
 * The previous code called `nodemailer.createTransport()` on every send. Each
 * call built a fresh SMTP transport with NO connection/greeting/socket
 * timeouts, so whenever the mail host was slow or unreachable the underlying
 * socket and its timers were never released — `notifyPackSendByEmail` swallows
 * the error, the request returns, and the dead socket stays. Every pack send
 * leaked one descriptor; after a day or two of traffic the process hit its
 * file-descriptor ceiling (EMFILE) and died.
 *
 * Pooling bounds concurrent connections, and the explicit timeouts guarantee a
 * stuck connection is torn down instead of held forever.
 */
const globalForMail = globalThis as unknown as {
  __mailTransporter?: Transporter;
};

function getTransporter(): Transporter {
  if (globalForMail.__mailTransporter) {
    return globalForMail.__mailTransporter;
  }

  const host = smtpHost();
  const user = smtpUser();
  const pass = smtpPass();
  const port = smtpPort();

  if (!host || !user || !pass) {
    throw new Error('SMTP is not configured');
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    requireTLS: shouldUseTls() && port !== 465,
    auth: { user, pass },

    // Bounded, reusable connection pool.
    pool: true,
    maxConnections: 3,
    maxMessages: 100,

    // Hard ceilings so a hung SMTP peer can never pin a socket open.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  transporter.on('error', (error) => {
    // Pooled transports emit errors outside of any sendMail promise; without a
    // listener these surface as unhandled 'error' events and abort the process.
    console.error(
      'SMTP transport error:',
      error instanceof Error ? error.message : 'unknown error'
    );
  });

  globalForMail.__mailTransporter = transporter;
  return transporter;
}

export async function sendEmailWithAttachments(options: {
  to: string;
  subject: string;
  text: string;
  attachments?: MailAttachment[];
}): Promise<void> {
  const transporter = getTransporter();

  await transporter.sendMail({
    from: smtpFrom(),
    to: options.to,
    subject: options.subject,
    text: options.text,
    attachments: options.attachments?.map((a) => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType ?? 'application/octet-stream',
    })),
  });
}
