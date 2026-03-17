export type InvoiceLineItem = {
  name: string;
  quantity: number;
  quantityLabel?: string;
  unitPrice: number;
  total?: number;
};

export type InvoiceTotals = {
  subtotal: number;
  shippingCost: number;
  tax: number;
  grandTotal: number;
};

export type InvoiceTotalsOptions = {
  shippingCost?: number;
  taxAmount?: number;
  taxRate?: number;
};

export type OrderInvoiceTemplateData = {
  companyName: string;
  companyHeader: string;
  companyLogoUrl: string;
  supportEmail: string;
  supportPhone: string;
  orderId: string;
  orderDate: string;
  orderStatus: string;
  customerName: string;
  customerEmail: string;
  mobileNumber: string;
  address: string;
  items: InvoiceLineItem[];
  totals: InvoiceTotals;
};

function parseNumberEnv(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatAddress(address: string): string {
  return escapeHtml(address).replace(/\r?\n/g, '<br />');
}

export const COMPANY_NAME = import.meta.env.VITE_COMPANY_NAME || 'R.K Textiles';
export const COMPANY_HEADER = import.meta.env.VITE_COMPANY_HEADER || 'Fine Fabrics Order Invoice';
export const COMPANY_LOGO_URL =
  import.meta.env.VITE_COMPANY_LOGO_URL || 'https://placehold.co/220x80/f8fafc/0f172a?text=R.K+Textiles';
export const COMPANY_SUPPORT_EMAIL = import.meta.env.VITE_BUSINESS_EMAIL || 'jpandidevi13@gmail.com';
export const COMPANY_SUPPORT_PHONE = import.meta.env.VITE_ADMIN_MOBILE || '9360373692';

export const DEFAULT_SHIPPING_COST = parseNumberEnv(import.meta.env.VITE_INVOICE_SHIPPING_COST, 0);
export const DEFAULT_TAX_RATE = parseNumberEnv(import.meta.env.VITE_INVOICE_TAX_RATE, 0);

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function calculateInvoiceTotals(
  items: InvoiceLineItem[],
  options: InvoiceTotalsOptions = {}
): InvoiceTotals {
  const subtotal = items.reduce((sum, item) => {
    const lineTotal = typeof item.total === 'number' ? item.total : item.quantity * item.unitPrice;
    return sum + lineTotal;
  }, 0);

  const shippingCost = Number.isFinite(options.shippingCost) ? Number(options.shippingCost) : DEFAULT_SHIPPING_COST;
  const tax = Number.isFinite(options.taxAmount)
    ? Number(options.taxAmount)
    : subtotal * ((Number.isFinite(options.taxRate) ? Number(options.taxRate) : DEFAULT_TAX_RATE) / 100);

  return {
    subtotal,
    shippingCost,
    tax,
    grandTotal: subtotal + shippingCost + tax,
  };
}

export function buildInvoiceRowsHtml(items: InvoiceLineItem[]): string {
  if (items.length === 0) {
    return `
      <tr>
        <td colspan="4" style="padding:16px;border-bottom:1px solid #e5e7eb;color:#64748b;font-size:14px;text-align:center;">
          No items found for this order.
        </td>
      </tr>
    `.trim();
  }

  return items
    .map((item) => {
      const quantityText = item.quantityLabel || String(item.quantity);
      const total = typeof item.total === 'number' ? item.total : item.quantity * item.unitPrice;

      return `
        <tr>
          <td style="padding:14px 16px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#0f172a;">${escapeHtml(item.name)}</td>
          <td style="padding:14px 16px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#334155;text-align:center;">${escapeHtml(quantityText)}</td>
          <td style="padding:14px 16px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#334155;text-align:right;">${formatCurrency(item.unitPrice)}</td>
          <td style="padding:14px 16px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#0f172a;text-align:right;font-weight:700;">${formatCurrency(total)}</td>
        </tr>
      `.trim();
    })
    .join('');
}

export function buildOrderInvoiceHtml(data: OrderInvoiceTemplateData): string {
  const productRows = buildInvoiceRowsHtml(data.items);

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(data.companyName)} Invoice</title>
      </head>
      <body style="margin:0;padding:0;background-color:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;margin:0;padding:24px 0;width:100%;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:760px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
                <tr>
                  <td style="padding:32px 32px 20px;background:linear-gradient(135deg,#eff6ff 0%,#ffffff 60%,#f8fafc 100%);border-bottom:1px solid #e2e8f0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td valign="top" style="padding-right:16px;">
                          <img src="${escapeHtml(data.companyLogoUrl)}" alt="${escapeHtml(data.companyName)}" style="display:block;max-width:180px;width:100%;height:auto;border:0;" />
                          <div style="font-size:28px;line-height:36px;font-weight:700;color:#0f172a;margin-top:16px;letter-spacing:0.02em;">${escapeHtml(data.companyName)}</div>
                          <div style="font-size:14px;line-height:22px;color:#475569;">${escapeHtml(data.companyHeader)}</div>
                        </td>
                        <td valign="top" align="right">
                          <div style="display:inline-block;background-color:#dbeafe;color:#1d4ed8;border-radius:999px;padding:8px 14px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">Invoice</div>
                          <div style="margin-top:16px;font-size:13px;line-height:22px;color:#475569;">
                            <div><strong style="color:#0f172a;">Order ID:</strong> ${escapeHtml(data.orderId)}</div>
                            <div><strong style="color:#0f172a;">Order Date:</strong> ${escapeHtml(data.orderDate)}</div>
                            <div><strong style="color:#0f172a;">Status:</strong> ${escapeHtml(data.orderStatus)}</div>
                            <div><strong style="color:#0f172a;">Customer Email:</strong> ${escapeHtml(data.customerEmail)}</div>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:24px 32px 8px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td valign="top" width="50%" style="padding:0 8px 16px 0;">
                          <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;margin-bottom:10px;">Billed To</div>
                          <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;min-height:112px;">
                            <div style="font-size:16px;font-weight:700;color:#0f172a;margin-bottom:8px;">${escapeHtml(data.customerName)}</div>
                            <div style="font-size:14px;line-height:22px;color:#475569;">${escapeHtml(data.customerEmail)}</div>
                            <div style="font-size:14px;line-height:22px;color:#475569;">${escapeHtml(data.mobileNumber)}</div>
                            <div style="font-size:14px;line-height:22px;color:#475569;margin-top:6px;">${formatAddress(data.address)}</div>
                          </div>
                        </td>
                        <td valign="top" width="50%" style="padding:0 0 16px 8px;">
                          <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;margin-bottom:10px;">Support</div>
                          <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;min-height:112px;">
                            <div style="font-size:14px;line-height:24px;color:#475569;"><strong style="color:#0f172a;">Email:</strong> ${escapeHtml(data.supportEmail)}</div>
                            <div style="font-size:14px;line-height:24px;color:#475569;"><strong style="color:#0f172a;">Phone:</strong> ${escapeHtml(data.supportPhone)}</div>
                            <div style="font-size:14px;line-height:24px;color:#475569;margin-top:8px;">Thank you for shopping with ${escapeHtml(data.companyName)}. Your order invoice is attached below in a mail-friendly format.</div>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 32px 0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
                      <thead>
                        <tr style="background-color:#0f172a;">
                          <th align="left" style="padding:14px 16px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#ffffff;">Product Name</th>
                          <th align="center" style="padding:14px 16px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#ffffff;">Quantity</th>
                          <th align="right" style="padding:14px 16px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#ffffff;">Price / Item</th>
                          <th align="right" style="padding:14px 16px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#ffffff;">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${productRows}
                      </tbody>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:24px 32px 12px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td></td>
                        <td width="320" style="padding-left:16px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;background-color:#f8fafc;">
                            <tr>
                              <td style="padding:14px 18px;font-size:14px;color:#475569;border-bottom:1px solid #e2e8f0;">Subtotal</td>
                              <td align="right" style="padding:14px 18px;font-size:14px;color:#0f172a;font-weight:600;border-bottom:1px solid #e2e8f0;">${formatCurrency(data.totals.subtotal)}</td>
                            </tr>
                            <tr>
                              <td style="padding:14px 18px;font-size:14px;color:#475569;border-bottom:1px solid #e2e8f0;">Shipping</td>
                              <td align="right" style="padding:14px 18px;font-size:14px;color:#0f172a;font-weight:600;border-bottom:1px solid #e2e8f0;">${formatCurrency(data.totals.shippingCost)}</td>
                            </tr>
                            <tr>
                              <td style="padding:14px 18px;font-size:14px;color:#475569;border-bottom:1px solid #e2e8f0;">Tax</td>
                              <td align="right" style="padding:14px 18px;font-size:14px;color:#0f172a;font-weight:600;border-bottom:1px solid #e2e8f0;">${formatCurrency(data.totals.tax)}</td>
                            </tr>
                            <tr>
                              <td style="padding:16px 18px;font-size:16px;color:#0f172a;font-weight:700;">Grand Total</td>
                              <td align="right" style="padding:16px 18px;font-size:18px;color:#1d4ed8;font-weight:700;">${formatCurrency(data.totals.grandTotal)}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 32px 32px;">
                    <div style="font-size:12px;line-height:20px;color:#64748b;text-align:center;">
                      This is an auto-generated invoice for order ${escapeHtml(data.orderId)}. For any billing queries, contact ${escapeHtml(data.supportEmail)} or ${escapeHtml(data.supportPhone)}.
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `.trim();
}

export const EMAILJS_INVOICE_TEMPLATE_HTML = `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background-color:#f8fafc;">
    {{invoice_html}}
  </body>
</html>`;