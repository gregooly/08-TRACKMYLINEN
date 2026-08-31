import PDFDocument from 'pdfkit';

export type PackSendPdfItem = {
  name: string;
  tag: string;
};

export type PackSendPdfParams = {
  packName: string;
  locationName: string;
  statusName: string;
  sentAt: string;
  items: PackSendPdfItem[];
};

function groupQuantities(items: PackSendPdfItem[]): { name: string; qty: number }[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    counts.set(item.name, (counts.get(item.name) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * PDF note with quantity summary and RFID/tag detail list.
 */
export function buildPackSendPdfBuffer(params: PackSendPdfParams): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).text('TrackMyLinen — Pack Send Note', { align: 'center' });
    doc.moveDown();

    doc.fontSize(11);
    doc.text(`Pack: ${params.packName}`);
    doc.text(`Location: ${params.locationName}`);
    doc.text(`Status: ${params.statusName}`);
    doc.text(`Date: ${params.sentAt}`);
    doc.text(`Total items: ${params.items.length}`);
    doc.moveDown();

    doc.fontSize(13).text('Quantity summary', { underline: true });
    doc.moveDown(0.5);

    doc.fontSize(10);
    const quantities = groupQuantities(params.items);
    if (quantities.length === 0) {
      doc.text('No items');
    } else {
      for (const row of quantities) {
        doc.text(`${row.name} — QTY: ${row.qty}`);
      }
    }

    doc.moveDown();
    doc.fontSize(13).text('Detail (RFID / tag)', { underline: true });
    doc.moveDown(0.5);

    doc.fontSize(10);
    if (params.items.length === 0) {
      doc.text('No items');
    } else {
      for (const item of params.items) {
        doc.text(`${item.name} — ${item.tag}`);
      }
    }

    doc.end();
  });
}
