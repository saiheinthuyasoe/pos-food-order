import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM ?? "onboarding@resend.dev";

/* ── Types ─────────────────────────────────────────────────────── */
interface OrderEmailItem {
  name: string;
  quantity: number;
  lineTotal: number;
  selectedOptions?: Record<string, string>;
}

interface OrderConfirmationPayload {
  type: "order_confirmation";
  to: string;
  orderId: string;
  customerName: string;
  orderType: "walkin" | "delivery";
  tableNumber?: number;
  deliveryAddress?: string;
  items: OrderEmailItem[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  tax: number;
  total: number;
  promoCode?: string;
  paymentMethod: string;
  estimatedTime: string;
}

interface OrderDeliveredPayload {
  type: "order_delivered";
  to: string;
  orderId: string;
  customerName: string;
  total: number;
}

type EmailPayload = OrderConfirmationPayload | OrderDeliveredPayload;

/* ── Helpers ────────────────────────────────────────────────────── */
function itemsTable(items: OrderEmailItem[]): string {
  return items
    .map((item) => {
      const opts =
        item.selectedOptions && Object.keys(item.selectedOptions).length > 0
          ? `<br/><span style="color:#888;font-size:12px">${Object.entries(
              item.selectedOptions,
            )
              .map(([k, v]) => `${k}: ${v}`)
              .join(", ")}</span>`
          : "";
      return `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6">${item.name}${opts}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:center">×${item.quantity}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:right">$${item.lineTotal.toFixed(2)}</td>
        </tr>`;
    })
    .join("");
}

function baseHtml(title: string, body: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:32px 16px">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.06)">
        <!-- header -->
        <tr>
          <td style="background:#f59e0b;padding:24px 32px">
            <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700">🍽️ ${title}</h1>
          </td>
        </tr>
        <!-- body -->
        <tr><td style="padding:28px 32px">${body}</td></tr>
        <!-- footer -->
        <tr>
          <td style="background:#f9fafb;padding:16px 32px;text-align:center">
            <p style="margin:0;color:#9ca3af;font-size:12px">Thank you for choosing us! Questions? Reply to this email.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/* ── Email builders ─────────────────────────────────────────────── */
function buildConfirmationEmail(p: OrderConfirmationPayload): {
  subject: string;
  html: string;
} {
  const orderRef = p.orderId.slice(-6).toUpperCase();

  const locationRow =
    p.orderType === "walkin"
      ? `<tr><td style="color:#6b7280;padding:4px 0">Table</td><td style="font-weight:600;padding:4px 0">Table ${p.tableNumber}</td></tr>`
      : `<tr><td style="color:#6b7280;padding:4px 0">Delivery to</td><td style="font-weight:600;padding:4px 0">${p.deliveryAddress}</td></tr>`;

  const body = `
    <p style="color:#374151;margin:0 0 8px">Hi <strong>${p.customerName}</strong>,</p>
    <p style="color:#374151;margin:0 0 20px">Your order has been placed! We'll confirm it shortly.</p>

    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;margin-bottom:20px">
      <p style="margin:0;color:#92400e;font-size:13px;font-weight:600">ORDER #${orderRef}</p>
      <p style="margin:4px 0 0;color:#78350f;font-size:22px;font-weight:700">$${p.total.toFixed(2)}</p>
    </div>

    <table cellpadding="0" cellspacing="0" style="margin-bottom:20px;font-size:14px">
      <tr><td style="color:#6b7280;padding:4px 0;padding-right:24px">Type</td><td style="font-weight:600;padding:4px 0">${p.orderType === "walkin" ? "Walk-in / Dine In" : "Delivery"}</td></tr>
      ${locationRow}
      <tr><td style="color:#6b7280;padding:4px 0;padding-right:24px">Payment</td><td style="font-weight:600;padding:4px 0;text-transform:capitalize">${p.paymentMethod}</td></tr>
      <tr><td style="color:#6b7280;padding:4px 0;padding-right:24px">Est. Time</td><td style="font-weight:600;padding:4px 0">${p.estimatedTime}</td></tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f3f4f6;border-radius:8px;overflow:hidden;margin-bottom:20px;font-size:14px">
      <thead>
        <tr style="background:#f9fafb">
          <th style="padding:10px 12px;text-align:left;font-weight:600;color:#374151">Item</th>
          <th style="padding:10px 12px;text-align:center;font-weight:600;color:#374151">Qty</th>
          <th style="padding:10px 12px;text-align:right;font-weight:600;color:#374151">Price</th>
        </tr>
      </thead>
      <tbody>${itemsTable(p.items)}</tbody>
    </table>

    <table cellpadding="0" cellspacing="0" style="margin-left:auto;font-size:14px;min-width:200px">
      <tr><td style="color:#6b7280;padding:3px 0;padding-right:24px">Subtotal</td><td style="text-align:right">$${p.subtotal.toFixed(2)}</td></tr>
      ${p.discount > 0 ? `<tr><td style="color:#16a34a;padding:3px 0;padding-right:24px">Discount${p.promoCode ? ` (${p.promoCode})` : ""}</td><td style="text-align:right;color:#16a34a">-$${p.discount.toFixed(2)}</td></tr>` : ""}
      ${p.deliveryFee > 0 ? `<tr><td style="color:#6b7280;padding:3px 0;padding-right:24px">Delivery Fee</td><td style="text-align:right">$${p.deliveryFee.toFixed(2)}</td></tr>` : ""}
      <tr><td style="color:#6b7280;padding:3px 0;padding-right:24px">Tax</td><td style="text-align:right">$${p.tax.toFixed(2)}</td></tr>
      <tr style="border-top:2px solid #f3f4f6">
        <td style="font-weight:700;padding:6px 0;padding-right:24px">Total</td>
        <td style="text-align:right;font-weight:700">$${p.total.toFixed(2)}</td>
      </tr>
    </table>

    <div style="margin-top:24px;text-align:center">
      <a href="${process.env.NEXT_PUBLIC_APP_URL ?? ""}/order-confirmation/${p.orderId}"
         style="display:inline-block;background:#f59e0b;color:#fff;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px">
        Track My Order →
      </a>
    </div>`;

  return {
    subject: `Order Confirmed #${orderRef} — Thank you, ${p.customerName}!`,
    html: baseHtml("Order Confirmation", body),
  };
}

function buildDeliveredEmail(p: OrderDeliveredPayload): {
  subject: string;
  html: string;
} {
  const orderRef = p.orderId.slice(-6).toUpperCase();

  const body = `
    <p style="color:#374151;margin:0 0 8px">Hi <strong>${p.customerName}</strong>,</p>
    <p style="color:#374151;margin:0 0 20px">Great news — your order <strong>#${orderRef}</strong> has been delivered! 🎉</p>
    <p style="color:#374151;margin:0 0 20px">Total paid: <strong>$${p.total.toFixed(2)}</strong></p>
    <p style="color:#374151;margin:0">We hope you enjoy your meal. Come back soon!</p>`;

  return {
    subject: `Your order #${orderRef} has been delivered 🎉`,
    html: baseHtml("Order Delivered!", body),
  };
}

/* ── Route handler ──────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  if (!process.env.RESEND_API_KEY) {
    // Gracefully skip sending if key not configured
    return NextResponse.json({ ok: true, skipped: true });
  }

  let payload: EmailPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  let subject: string;
  let html: string;

  if (payload.type === "order_confirmation") {
    ({ subject, html } = buildConfirmationEmail(payload));
  } else if (payload.type === "order_delivered") {
    ({ subject, html } = buildDeliveredEmail(payload));
  } else {
    return NextResponse.json({ error: "Unknown email type" }, { status: 400 });
  }

  try {
    await resend.emails.send({
      from: FROM,
      to: payload.to,
      subject,
      html,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[email]", err);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 },
    );
  }
}
