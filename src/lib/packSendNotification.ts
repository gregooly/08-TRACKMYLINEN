import { buildPackSendPdfBuffer, type PackSendPdfItem } from '@/lib/packSendPdf';
import { isSmtpConfigured, sendEmailWithAttachments } from '@/lib/mail';

export type PackSendNotificationParams = {
  locationName: string;
  locationEmail: string | null | undefined;
  packName: string;
  statusName: string;
  items: PackSendPdfItem[];
  sentAt?: string;
};

export type PackSendNotificationResult = {
  emailSent: boolean;
  skippedReason?: string;
};

const EMAIL_SUBJECT = 'Sending pack.';
const EMAIL_BODY = 'Sending pack.';

/**
 * After a pack is sent: email destination location if it has an email address.
 * Failures are logged but do not throw (pack send already succeeded).
 */
export async function notifyPackSendByEmail(
  params: PackSendNotificationParams
): Promise<PackSendNotificationResult> {
  const email = params.locationEmail?.trim();
  if (!email) {
    return { emailSent: false, skippedReason: 'location_has_no_email' };
  }

  if (!isSmtpConfigured()) {
    console.warn('Pack send email skipped: SMTP is not configured');
    return { emailSent: false, skippedReason: 'smtp_not_configured' };
  }

  try {
    const sentAt = params.sentAt ?? new Date().toISOString();
    const pdfBuffer = await buildPackSendPdfBuffer({
      packName: params.packName,
      locationName: params.locationName,
      statusName: params.statusName,
      sentAt,
      items: params.items,
    });

    const safeLocation = params.locationName.replace(/[^\w.-]+/g, '_').slice(0, 40);
    const filename = `pack-send-${safeLocation}-${Date.now()}.pdf`;

    await sendEmailWithAttachments({
      to: email,
      subject: EMAIL_SUBJECT,
      text: EMAIL_BODY,
      attachments: [
        {
          filename,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    return { emailSent: true };
  } catch (error) {
    console.error('Pack send email failed:', error);
    return { emailSent: false, skippedReason: 'send_failed' };
  }
}
