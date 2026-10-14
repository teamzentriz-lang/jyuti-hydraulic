import { money } from "@/lib/quotations";

type PdfQuote = { quoteNumber: string; versionNumber: number; validUntil?: Date | null; customerName: string; customerEmail: string; customerPhone: string; billingAddress: string; currency: string; subtotal: number; discountAmount: number; taxAmount: number; shippingAmount: number; totalAmount: number; terms: string; paymentTerms: string; deliveryTerms: string; notes: string; lines: { description: string; quantity: number; unitPrice: number; lineTotal: number }[] };

function clean(value: unknown) { return String(value ?? "").replace(/[\\()]/g, (m) => `\\${m}`).replace(/[^\x20-\x7E]/g, "?"); }

export function buildQuotationPdf(q: PdfQuote) {
  const rows = [
    "JYOTI HYDRAULIC", `QUOTATION ${q.quoteNumber} / V${q.versionNumber}`, `Valid until: ${q.validUntil ? new Date(q.validUntil).toLocaleDateString("en-IN") : "-"}`, "",
    `Customer: ${q.customerName}`, `Email: ${q.customerEmail}`, `Phone: ${q.customerPhone}`, `Address: ${q.billingAddress}`, "", "ITEMS",
    ...q.lines.flatMap((l, i) => [`${i + 1}. ${l.description}`, `   Qty ${l.quantity}  Rate ${money(l.unitPrice, q.currency)}  Total ${money(l.lineTotal, q.currency)}`]),
    "", `Subtotal: ${money(q.subtotal, q.currency)}`, `Discount: ${money(q.discountAmount, q.currency)}`, `Tax: ${money(q.taxAmount, q.currency)}`, `Shipping: ${money(q.shippingAmount, q.currency)}`, `TOTAL: ${money(q.totalAmount, q.currency)}`,
    "", `Payment terms: ${q.paymentTerms}`, `Delivery terms: ${q.deliveryTerms}`, `Terms: ${q.terms}`, `Notes: ${q.notes}`,
  ];
  const content = rows.slice(0, 48).map((line, i) => `BT /F1 ${i < 2 ? 16 : 10} Tf 50 ${790 - i * 15} Td (${clean(line).slice(0, 105)}) Tj ET`).join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, i) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${i + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((o) => `${String(o).padStart(10, "0")} 00000 n `).join("\n")}\ntrailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf);
}
