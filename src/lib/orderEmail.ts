import emailjs from '@emailjs/browser';
import {
  buildInvoiceRowsHtml,
  buildOrderInvoiceHtml,
  calculateInvoiceTotals,
  COMPANY_HEADER,
  COMPANY_LOGO_URL,
  COMPANY_NAME,
  COMPANY_SUPPORT_EMAIL,
  COMPANY_SUPPORT_PHONE,
  formatCurrency,
  type InvoiceLineItem,
} from './invoice';

export type OrderEmailInput = {
  customerName: string;
  mobileNumber: string;
  address: string;
  requestedFabric: string;
};

export type OrderConfirmationEmailInput = {
  customerName: string;
  customerEmail: string;
  mobileNumber: string;
  address: string;
  orderId: string;
  orderDate: string;
  orderStatus: string;
  items: InvoiceLineItem[];
  shippingCost?: number;
  taxAmount?: number;
  taxRate?: number;
};

const ADMIN_EMAIL = import.meta.env.VITE_BUSINESS_EMAIL || 'jpandidevi13@gmail.com';
const SECONDARY_ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'deepakj.23aid@kongu.edu';
const ADMIN_MOBILE = import.meta.env.VITE_ADMIN_MOBILE || '9360373692';
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const ORDER_CONFIRMATION_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_ORDER_TEMPLATE_ID || EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

function assertEmailConfig(templateId: string | undefined) {
  if (!EMAILJS_SERVICE_ID || !templateId || !EMAILJS_PUBLIC_KEY) {
    throw new Error('Email is not configured. Set VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID or VITE_EMAILJS_ORDER_TEMPLATE_ID, and VITE_EMAILJS_PUBLIC_KEY.');
  }
}

async function sendEmailWithRetries(
  toEmail: string,
  subject: string,
  templateBase: Record<string, string>,
  templateId: string
) {
  assertEmailConfig(templateId);

  const attempts: Array<Record<string, string>> = [
    {
      ...templateBase,
      to_email: toEmail,
      user_email: toEmail,
      email: toEmail,
      reply_to: toEmail,
      subject,
    },
    {
      ...templateBase,
      to_email: toEmail,
      subject,
    },
    {
      ...templateBase,
      user_email: toEmail,
      email: toEmail,
      subject,
    },
  ];

  const errors: string[] = [];

  for (const params of attempts) {
    try {
      await emailjs.send(EMAILJS_SERVICE_ID, templateId, params, {
        publicKey: EMAILJS_PUBLIC_KEY,
      });
      return;
    } catch (error) {
      const err = error as { status?: number; text?: string; message?: string };
      errors.push(`status=${err.status ?? 'n/a'} text=${err.text ?? err.message ?? 'unknown'}`);
    }
  }

  throw new Error(`EmailJS failed for ${toEmail}. Attempts: ${errors.join(' | ')}`);
}

export async function sendOrderRequestEmail(input: OrderEmailInput) {
  assertEmailConfig(EMAILJS_TEMPLATE_ID);

  const templateParams = {
    to_email: ADMIN_EMAIL,
    subject: 'New Fabric Order Request',
    customer_name: input.customerName,
    mobile_number: input.mobileNumber,
    address: input.address,
    requested_fabric: input.requestedFabric,
    message: [
      'Admin Mobile: ' + ADMIN_MOBILE,
      'Customer Name: ' + input.customerName,
      'Mobile Number: ' + input.mobileNumber,
      'Address: ' + input.address,
      'Requested Fabric: ' + input.requestedFabric,
    ].join('\n'),
  };

  await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID!, templateParams, {
    publicKey: EMAILJS_PUBLIC_KEY,
  });
}

export function isValidMobileNumber(mobile: string): boolean {
  return /^[6-9]\d{9}$/.test(mobile.trim()) || /^\+?[0-9()\-\s]{8,20}$/.test(mobile.trim());
}

export async function sendOrderConfirmationEmails(input: OrderConfirmationEmailInput) {
  assertEmailConfig(ORDER_CONFIRMATION_TEMPLATE_ID);

  const totals = calculateInvoiceTotals(input.items, {
    shippingCost: input.shippingCost,
    taxAmount: input.taxAmount,
    taxRate: input.taxRate,
  });

  const lineText = input.items
    .map((item) => {
      const quantityText = item.quantityLabel || String(item.quantity);
      const lineTotal = typeof item.total === 'number' ? item.total : item.quantity * item.unitPrice;
      return `${item.name}: ${quantityText} x ${formatCurrency(item.unitPrice)} = ${formatCurrency(lineTotal)}`;
    })
    .join('\n');

  const productRows = buildInvoiceRowsHtml(input.items);
  const invoiceHtml = buildOrderInvoiceHtml({
    companyName: COMPANY_NAME,
    companyHeader: COMPANY_HEADER,
    companyLogoUrl: COMPANY_LOGO_URL,
    supportEmail: COMPANY_SUPPORT_EMAIL,
    supportPhone: COMPANY_SUPPORT_PHONE,
    orderId: input.orderId,
    orderDate: input.orderDate,
    orderStatus: input.orderStatus,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    mobileNumber: input.mobileNumber,
    address: input.address,
    items: input.items,
    totals,
  });

  const baseMessage = [
    `Order ID: ${input.orderId}`,
    `Order Date: ${input.orderDate}`,
    `Customer Name: ${input.customerName}`,
    `Customer Email: ${input.customerEmail}`,
    `Mobile Number: ${input.mobileNumber}`,
    `Address: ${input.address}`,
    '',
    'Products:',
    lineText,
    '',
    `Subtotal: ${formatCurrency(totals.subtotal)}`,
    `Shipping: ${formatCurrency(totals.shippingCost)}`,
    `Tax: ${formatCurrency(totals.tax)}`,
    `Grand Total: ${formatCurrency(totals.grandTotal)}`,
    `Order Status: ${input.orderStatus}`,
    `Business Mobile: ${ADMIN_MOBILE}`,
  ].join('\n');

  const subject = `${COMPANY_NAME} Invoice ${input.orderId}`;
  const requestedFabric = input.items.map((item) => item.name).join(', ');

  const commonTemplateParams = {
    company_name: COMPANY_NAME,
    company_header: COMPANY_HEADER,
    company_logo_url: COMPANY_LOGO_URL,
    order_id: input.orderId,
    order_date: input.orderDate,
    order_status: input.orderStatus,
    customer_name: input.customerName,
    customer_email: input.customerEmail,
    mobile_number: input.mobileNumber,
    address: input.address,
    requested_fabric: requestedFabric,
    product_rows: productRows,
    subtotal: formatCurrency(totals.subtotal),
    shipping_cost: formatCurrency(totals.shippingCost),
    tax: formatCurrency(totals.tax),
    grand_total: formatCurrency(totals.grandTotal),
    invoice_html: invoiceHtml,
    message: baseMessage,
  };

  const adminRecipients = [ADMIN_EMAIL, SECONDARY_ADMIN_EMAIL]
    .map((email) => String(email || '').trim())
    .filter(Boolean);
  const uniqueAdminRecipients = Array.from(new Set(adminRecipients));

  for (const toEmail of uniqueAdminRecipients) {
    await sendEmailWithRetries(
      toEmail,
      subject,
      {
        ...commonTemplateParams,
        message: `${baseMessage}\nAdmin Mobile: ${ADMIN_MOBILE}`,
      },
      ORDER_CONFIRMATION_TEMPLATE_ID!
    );
  }

  await sendEmailWithRetries(
    input.customerEmail,
    subject,
    commonTemplateParams,
    ORDER_CONFIRMATION_TEMPLATE_ID!
  );
}
