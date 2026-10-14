export type QuoteLineInput = {
  description: string;
  quantity: number;
  unitPrice: number;
  discountBps: number;
  taxRateBps: number;
};

export function calculateQuote(lines: QuoteLineInput[], shippingAmount = 0) {
  let subtotal = 0;
  let discountAmount = 0;
  let taxAmount = 0;
  const calculated = lines.map((line) => {
    const gross = Math.max(0, Math.round(line.quantity)) * Math.max(0, Math.round(line.unitPrice));
    const discount = Math.round((gross * Math.max(0, Math.min(10000, line.discountBps))) / 10000);
    const taxable = gross - discount;
    const tax = Math.round((taxable * Math.max(0, line.taxRateBps)) / 10000);
    subtotal += gross;
    discountAmount += discount;
    taxAmount += tax;
    return { ...line, quantity: Math.max(1, Math.round(line.quantity)), lineTotal: taxable + tax };
  });
  return { lines: calculated, subtotal, discountAmount, taxAmount, shippingAmount: Math.max(0, Math.round(shippingAmount)), totalAmount: subtotal - discountAmount + taxAmount + Math.max(0, Math.round(shippingAmount)) };
}

export function money(minor: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(minor / 100);
}

export const editableQuoteStatuses = new Set(["draft", "revised"]);
