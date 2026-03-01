import { Order } from "@/types";

export interface ReceiptSettings {
  restaurantName: string;
  address?: string;
  phone?: string;
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function row(label: string, value: string, bold = false) {
  const w = bold ? "font-weight:bold;" : "";
  return `<div class="row" style="${w}"><span>${esc(label)}</span><span>${esc(value)}</span></div>`;
}

export function printReceipt(
  order: Order,
  settings: ReceiptSettings = { restaurantName: "FoodOrder" },
) {
  const date =
    (order.createdAt as import("firebase/firestore").Timestamp)
      ?.toDate()
      .toLocaleString([], {
        month: "short",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }) ?? "";

  const paymentLabel =
    order.paymentStatus === "paid"
      ? "PAID"
      : `${
          order.paymentMethod === "scan"
            ? "Scan QR"
            : order.paymentMethod.charAt(0).toUpperCase() +
              order.paymentMethod.slice(1)
        } (pending)`;

  /* ── Build item rows ── */
  const itemRows = order.items
    .map((item) => {
      const optLines = item.selectedOptions
        ? Object.entries(item.selectedOptions)
            .filter(([, v]) => (Array.isArray(v) ? v.length > 0 : !!v))
            .map(
              ([k, v]) =>
                `<div class="opt">${esc(k)}: ${esc(Array.isArray(v) ? v.join(", ") : v)}</div>`,
            )
            .join("")
        : "";
      return `
  <div class="item-row">
    <div class="item-left">
      <span class="qty">${item.quantity}x</span>
      <span class="item-name">${esc(item.name)}</span>
    </div>
    <span class="item-price">$${(item.unitPrice * item.quantity).toFixed(2)}</span>
  </div>
  ${optLines}`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Receipt</title>
<style>
  @page {
    size: 58mm auto;
    margin: 4mm 6mm;
  }
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    max-width: 100%;
    overflow-wrap: break-word;
    word-break: break-word;
  }
  html, body {
    width: 100%;
  }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 9pt;
    line-height: 1.5;
    color: #000;
    background: #fff;
  }
  /* ── Header ── */
  .header { text-align: center; margin-bottom: 2mm; }
  .restaurant-name { font-size: 12pt; font-weight: bold; }
  .header-sub { font-size: 8pt; margin-top: 1mm; }
  /* ── Dividers ── */
  hr {
    border: none;
    border-top: 1px dashed #000;
    margin: 1.5mm 0;
    width: 100%;
  }
  /* ── Meta block ── */
  .meta-line { font-size: 9pt; margin-bottom: 0.8mm; }
  .meta-line.em { font-weight: bold; font-size: 10pt; }
  /* ── Items ── */
  .item-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    width: 100%;
    margin-bottom: 1.5mm;
    gap: 2mm;
  }
  .item-left {
    display: flex;
    gap: 1mm;
    flex: 1 1 0;
    min-width: 0;
  }
  .qty { flex-shrink: 0; white-space: nowrap; }
  .item-name { flex: 1 1 0; min-width: 0; }
  .item-price { flex-shrink: 0; white-space: nowrap; text-align: right; }
  .opt {
    font-size: 8pt;
    padding-left: 3mm;
    margin-bottom: 0.8mm;
    color: #222;
  }
  /* ── Totals ── */
  .row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    width: 100%;
    margin-bottom: 1mm;
    gap: 2mm;
  }
  .row span:first-child { flex: 1 1 0; min-width: 0; }
  .row span:last-child  { flex-shrink: 0; white-space: nowrap; text-align: right; }
  .row.total { font-size: 11pt; font-weight: bold; margin-top: 1.5mm; }
  .row.discount { color: #1a6b1a; }
  /* ── Footer ── */
  .footer { text-align: center; margin-top: 3mm; font-size: 8.5pt; }
</style>
</head>
<body>

<div class="header">
  <div class="restaurant-name">${esc(settings.restaurantName.toUpperCase())}</div>
  ${settings.address ? `<div class="header-sub">${esc(settings.address)}</div>` : ""}
  ${settings.phone ? `<div class="header-sub">Tel: ${esc(settings.phone)}</div>` : ""}
</div>

<hr/>

<div class="meta">
  <div class="meta-line em">ORDER #${esc(order.id.slice(-6).toUpperCase())}</div>
  <div class="meta-line">${esc(date)}</div>
  <div class="meta-line em">${order.orderType === "walkin" ? `TABLE ${order.tableNumber ?? "\u2014"}` : "DELIVERY"}</div>
  <div class="meta-line">${esc(order.customerName)}</div>
  ${order.customerPhone ? `<div class="meta-line">Tel: ${esc(order.customerPhone)}</div>` : ""}
</div>

<hr/>

${itemRows}

<hr/>

${row("Subtotal", `$${order.subtotal.toFixed(2)}`)}
${order.discount > 0 ? `<div class="row discount"><span>${esc(order.promoCode ? `Discount (${order.promoCode})` : "Discount")}</span><span>-$${order.discount.toFixed(2)}</span></div>` : ""}
${order.deliveryFee > 0 ? row("Delivery Fee", `$${order.deliveryFee.toFixed(2)}`) : ""}
${row("Tax", `$${order.tax.toFixed(2)}`)}
<div class="row total"><span>TOTAL</span><span>$${order.total.toFixed(2)}</span></div>

<hr/>

${row("Payment", paymentLabel)}



<script>
  window.onload = function() {
    window.focus();
    window.print();
    window.onafterprint = function() { window.close(); };
    setTimeout(function() { window.close(); }, 8000);
  };
<\/script>
</body>
</html>`;

  openPrintWindow(html);
}

/** Print a combined receipt for multiple orders from the same table. */
export function printTableReceipt(
  orders: Order[],
  settings: ReceiptSettings = { restaurantName: "FoodOrder" },
) {
  if (orders.length === 0) return;
  if (orders.length === 1) {
    printReceipt(orders[0], settings);
    return;
  }

  // Use the first order for table/customer meta
  const first = orders[0];
  const date =
    (first.createdAt as import("firebase/firestore").Timestamp)
      ?.toDate()
      .toLocaleString([], {
        month: "short",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }) ?? "";

  // Build item blocks — one section per order
  const itemBlocks = orders
    .map((order, idx) => {
      const itemRows = order.items
        .map((item) => {
          const optLines = item.selectedOptions
            ? Object.entries(item.selectedOptions)
                .filter(([, v]) => (Array.isArray(v) ? v.length > 0 : !!v))
                .map(
                  ([k, v]) =>
                    `<div class="opt">${esc(k)}: ${esc(Array.isArray(v) ? v.join(", ") : v)}</div>`,
                )
                .join("")
            : "";
          return `
  <div class="item-row">
    <div class="item-left">
      <span class="qty">${item.quantity}x</span>
      <span class="item-name">${esc(item.name)}</span>
    </div>
    <span class="item-price">$${(item.unitPrice * item.quantity).toFixed(2)}</span>
  </div>
  ${optLines}`;
        })
        .join("");

      return `
${idx > 0 ? `<div class="order-sep">Order #${esc(order.id.slice(-6).toUpperCase())}</div>` : ""}
${itemRows}`;
    })
    .join("");

  // Combined totals
  const subtotal = orders.reduce((s, o) => s + o.subtotal, 0);
  const discount = orders.reduce((s, o) => s + o.discount, 0);
  const deliveryFee = orders.reduce((s, o) => s + o.deliveryFee, 0);
  const tax = orders.reduce((s, o) => s + o.tax, 0);
  const total = orders.reduce((s, o) => s + o.total, 0);

  // Payment based on last-updated order (they're all paid together)
  const lastOrder = orders[orders.length - 1];
  const paymentLabel =
    lastOrder.paymentStatus === "paid"
      ? "PAID"
      : `${
          lastOrder.paymentMethod === "scan"
            ? "Scan QR"
            : lastOrder.paymentMethod.charAt(0).toUpperCase() +
              lastOrder.paymentMethod.slice(1)
        } (pending)`;

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Receipt</title>
<style>
  @page { size: 58mm auto; margin: 4mm 6mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; max-width: 100%; overflow-wrap: break-word; word-break: break-word; }
  html, body { width: 100%; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 9pt; line-height: 1.5; color: #000; background: #fff; }
  .header { text-align: center; margin-bottom: 2mm; }
  .restaurant-name { font-size: 12pt; font-weight: bold; }
  .header-sub { font-size: 8pt; margin-top: 1mm; }
  hr { border: none; border-top: 1px dashed #000; margin: 1.5mm 0; width: 100%; }
  .meta-line { font-size: 9pt; margin-bottom: 0.8mm; }
  .meta-line.em { font-weight: bold; font-size: 10pt; }
  .order-sep { font-size: 8pt; font-weight: bold; color: #444; margin: 1.5mm 0 0.8mm; border-top: 1px solid #ccc; padding-top: 1mm; }
  .item-row { display: flex; justify-content: space-between; align-items: flex-start; width: 100%; margin-bottom: 1.5mm; gap: 2mm; }
  .item-left { display: flex; gap: 1mm; flex: 1 1 0; min-width: 0; }
  .qty { flex-shrink: 0; white-space: nowrap; }
  .item-name { flex: 1 1 0; min-width: 0; }
  .item-price { flex-shrink: 0; white-space: nowrap; text-align: right; }
  .opt { font-size: 8pt; padding-left: 3mm; margin-bottom: 0.8mm; color: #222; }
  .row { display: flex; justify-content: space-between; align-items: baseline; width: 100%; margin-bottom: 1mm; gap: 2mm; }
  .row span:first-child { flex: 1 1 0; min-width: 0; }
  .row span:last-child { flex-shrink: 0; white-space: nowrap; text-align: right; }
  .row.total { font-size: 11pt; font-weight: bold; margin-top: 1.5mm; }
  .row.discount { color: #1a6b1a; }
  .footer { text-align: center; margin-top: 3mm; font-size: 8.5pt; }
</style>
</head>
<body>

<div class="header">
  <div class="restaurant-name">${esc(settings.restaurantName.toUpperCase())}</div>
  ${settings.address ? `<div class="header-sub">${esc(settings.address)}</div>` : ""}
  ${settings.phone ? `<div class="header-sub">Tel: ${esc(settings.phone)}</div>` : ""}
</div>

<hr/>

<div class="meta">
  <div class="meta-line em">TABLE ${first.tableNumber ?? "—"}</div>
  <div class="meta-line">${esc(date)}</div>
  <div class="meta-line">${esc(first.customerName)}</div>
  ${first.customerPhone ? `<div class="meta-line">Tel: ${esc(first.customerPhone)}</div>` : ""}
  <div class="meta-line">${orders.length} order${orders.length > 1 ? "s" : ""} combined</div>
</div>

<hr/>

<div class="meta-line em">Order #${esc(first.id.slice(-6).toUpperCase())}</div>
${itemBlocks}

<hr/>

${row("Subtotal", `$${subtotal.toFixed(2)}`)}
${discount > 0 ? `<div class="row discount"><span>Discount</span><span>-$${discount.toFixed(2)}</span></div>` : ""}
${deliveryFee > 0 ? row("Delivery Fee", `$${deliveryFee.toFixed(2)}`) : ""}
${row("Tax", `$${tax.toFixed(2)}`)}
<div class="row total"><span>TOTAL</span><span>$${total.toFixed(2)}</span></div>

<hr/>

${row("Payment", paymentLabel)}

<div class="footer">Thank you for dining with us!</div>

<script>
  window.onload = function() {
    window.focus();
    window.print();
    window.onafterprint = function() { window.close(); };
    setTimeout(function() { window.close(); }, 8000);
  };
<\/script>
</body>
</html>`;

  openPrintWindow(html);
}

function openPrintWindow(html: string) {
  const win = window.open("", "_blank", "width=240,height=500");
  if (!win) {
    alert(
      "Pop-up blocked. Please allow pop-ups for this site to print receipts.",
    );
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}
