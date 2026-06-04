import emailjs from "@emailjs/browser";

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID as string | undefined;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string | undefined;
const ORDER_TEMPLATE = import.meta.env.VITE_EMAILJS_ORDER_TEMPLATE_ID as string | undefined;
const STATUS_TEMPLATE = import.meta.env.VITE_EMAILJS_STATUS_TEMPLATE_ID as string | undefined;

let initialized = false;
function ensureInit() {
  if (initialized || !PUBLIC_KEY) return;
  emailjs.init({ publicKey: PUBLIC_KEY });
  initialized = true;
}

export const emailConfigured = () => Boolean(SERVICE_ID && PUBLIC_KEY);

export async function sendOrderConfirmationEmail(params: {
  to_email: string;
  to_name: string;
  order_id: string;
  total: string;
  items_count: number;
  address: string;
}) {
  if (!SERVICE_ID || !PUBLIC_KEY || !ORDER_TEMPLATE) {
    console.warn("[email] EmailJS not configured — skipping confirmation email");
    return;
  }
  ensureInit();
  try {
    await emailjs.send(SERVICE_ID, ORDER_TEMPLATE, params);
  } catch (e) {
    console.error("[email] order confirmation failed", e);
  }
}

export async function sendOrderStatusEmail(params: {
  to_email: string;
  to_name: string;
  order_id: string;
  status: string;
}) {
  const tplId = STATUS_TEMPLATE || ORDER_TEMPLATE;
  if (!SERVICE_ID || !PUBLIC_KEY || !tplId) {
    console.warn("[email] EmailJS not configured — skipping status email");
    return;
  }
  ensureInit();
  try {
    await emailjs.send(SERVICE_ID, tplId, params);
  } catch (e) {
    console.error("[email] status email failed", e);
  }
}
