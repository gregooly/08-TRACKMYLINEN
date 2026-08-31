import nodemailer from 'nodemailer';

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

function useTls(): boolean {
  const raw = process.env.MAIL_USE_TLS ?? process.env.SMTP_USE_TLS;
  if (raw === undefined) return smtpPort() === 587;
  return raw === 'true' || raw === '1';
}

export function isSmtpConfigured(): boolean {
  return Boolean(smtpHost() && smtpUser() && smtpPass());
}

export async function sendEmailWithAttachments(options: {
  to: string;
  subject: string;
  text: string;
  attachments?: MailAttachment[];
}): Promise<void> {
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
    requireTLS: useTls() && port !== 465,
    auth: { user, pass },
  });

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
