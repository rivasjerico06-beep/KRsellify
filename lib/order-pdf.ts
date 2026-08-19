/**
 * ORDER DOCUMENTS — invoice and receipt PDFs
 * ------------------------------------------
 * One plain, one-page document rendered in two variants:
 *
 *   invoice — the bill for the order.
 *   receipt — the same, headed RECEIPT and stamped with the payment state.
 *
 * Both carry the ship-to block, and both are pulled from the admin only.
 *
 * Both are deliberately unstyled: black text on white, thin rules,
 * left-aligned labels and right-aligned amounts. These are documents to file
 * or hand to a courier, not pieces of the storefront's design, so none of the
 * site's navy/teal/gold palette appears here.
 *
 * jsPDF is imported dynamically so it stays out of the page bundles until
 * someone actually downloads something.
 */

import type { jsPDF as JsPdfDoc } from 'jspdf'

export interface InvoiceBrand {
  /** Seller name in the header, e.g. "Maga Offers" */
  name: string
  /** Site shown under the name, e.g. "themagaoffer.com" */
  site: string
  /** Address customers reply to */
  supportEmail: string
}

export const DEFAULT_INVOICE_BRAND: InvoiceBrand = {
  name: "PATRIOT'S ONLINE SHOP",
  // Domain and mailbox are live endpoints, not branding — renaming them here
  // would print an address that doesn't resolve and a mailbox nobody reads.
  site: 'themagaoffer.com',
  supportEmail: 'themagaoffer@gmail.com',
}

/**
 * Everything a document needs, and nothing more. Kept structural rather than
 * reusing lib/types' Order so the customer-facing pages — which each carry
 * their own narrower order shape — can pass theirs straight in.
 */
export interface OrderDocumentData {
  id?: string
  order_number?: number | null
  created_at?: string
  status?: string
  payment_method?: string | null
  coupon_code?: string | null
  total: number
  discount_amount?: number | null
  guest_email?: string | null
  customer_email?: string | null
  customer_name?: string | null
  customer_address?: string | null
  customer_city?: string | null
  customer_phone?: string | null
  items: {
    name: string
    qty: number
    price: number
    bundle_label?: string
    bundle_price?: number
  }[]
  shipping_address?: {
    firstName?: string
    lastName?: string
    address?: string
    apartment?: string
    city?: string
    region?: string
    postalCode?: string
    country?: string
    phone?: string
  } | null
}

type Order = OrderDocumentData
export type DocumentVariant = 'invoice' | 'receipt'

// ── Code 128B ─────────────────────────────────────────────────
// Widths of alternating bars and spaces, starting with a bar. Every symbol
// is 11 modules wide except the stop pattern, which is 13.
const C128_PATTERNS = [
  '212222','222122','222221','121223','121322','131222','122213','122312','132212','221213',
  '221312','231212','112232','122132','122231','113222','123122','123221','223211','221132',
  '221231','213212','223112','312131','311222','321122','321221','312212','322112','322211',
  '212123','212321','232121','111323','131123','131321','112313','132113','132311','211313',
  '231113','231311','112133','112331','132131','113123','113321','133121','313121','211331',
  '231131','213113','213311','213131','311123','311321','331121','312113','312311','332111',
  '314111','221411','431111','111224','111422','121124','121421','141122','141221','112214',
  '112412','122114','122411','142112','142211','241211','221114','413111','241112','134111',
  '111242','121142','121241','114212','124112','124211','411212','421112','421211','212141',
  '214121','412121','111143','111341','131141','114113','114311','411113','411311','113141',
  '114131','311141','411131','211412','211214','211232','2331112',
]
const C128_START_B = 104
const C128_STOP = 106

/**
 * Encodes text as Code 128B and returns the bar/space module widths, starting
 * with a bar. Characters outside ASCII 32–126 are dropped rather than encoded
 * wrong — an order reference never contains them.
 */
function code128b(text: string): number[] {
  const values = [...text]
    .map(c => c.charCodeAt(0))
    .filter(c => c >= 32 && c <= 126)
    .map(c => c - 32)

  // Checksum is the start value plus each data value weighted by its
  // 1-based position, modulo 103.
  let checksum = C128_START_B
  values.forEach((v, i) => { checksum += v * (i + 1) })
  checksum %= 103

  const symbols = [C128_START_B, ...values, checksum, C128_STOP]
  return symbols.flatMap(s => [...C128_PATTERNS[s]].map(Number))
}

// ── Formatting helpers ────────────────────────────────────────

const money = (n: number) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const PAYMENT_LABELS: Record<string, string> = {
  paypal:   'PayPal',
  stripe:   'Card',
  paymongo: 'Card',
  wire:     'Bank transfer',
}

function paymentLabel(order: Order): string {
  const m = order.payment_method?.toLowerCase()
  return (m && PAYMENT_LABELS[m]) || '—'
}

/**
 * What to stamp on a receipt. Anything downstream of payment counts as paid;
 * an order still awaiting a wire must not claim to be, and a cancelled one
 * says so rather than staying silent.
 */
function paidStamp(status?: string): string | null {
  switch (status) {
    case 'paid':
    case 'confirmed':
    case 'packed':
    case 'shipped':
    case 'delivered':
      return 'PAID'
    case 'pending_payment':
      return 'AWAITING PAYMENT'
    case 'cancelled':
      return 'CANCELLED'
    default:
      return null
  }
}

function orderRef(order: Order): string {
  return String(order.order_number ?? order.id?.slice(0, 6).toUpperCase() ?? '—')
}

/** Unit price of a line, honouring bundle pricing the same way the cart does. */
function linePrice(item: Order['items'][number]): number {
  return item.bundle_price != null ? item.bundle_price : item.price * item.qty
}

function shipLines(order: Order): string[] {
  const s = order.shipping_address
  const out: string[] = []
  if (s) {
    const name = [s.firstName, s.lastName].filter(Boolean).join(' ')
    if (name) out.push(name)
    if (s.address) out.push([s.address, s.apartment].filter(Boolean).join(', '))
    const cityLine = [[s.city, s.region].filter(Boolean).join(', '), s.postalCode].filter(Boolean).join(' ')
    if (cityLine) out.push(cityLine)
    if (s.country) out.push(s.country)
    if (s.phone) out.push(s.phone)
  } else {
    // Registered customers have no shipping_address on the order; their
    // details are enriched onto it from their profile instead.
    if (order.customer_name) out.push(order.customer_name)
    if (order.customer_address) out.push(order.customer_address)
    if (order.customer_city) out.push(order.customer_city)
    if (order.customer_phone) out.push(order.customer_phone)
  }
  return out
}

/** Fetches the site logo as a data URL. Returns null if it isn't reachable. */
async function loadLogo(): Promise<string | null> {
  try {
    const res = await fetch('/logo.png')
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise<string | null>(resolve => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

// ── Document ──────────────────────────────────────────────────

const PAGE_W = 612          // US Letter, points
const PAGE_H = 792
const M = 54                // margin
const RIGHT = PAGE_W - M

/**
 * Draws the document onto an existing page. Split out from the download so the
 * layout can be exercised outside a browser — nothing in here touches the DOM,
 * the network or the filesystem.
 */
export function renderOrderDocument(
  doc: JsPdfDoc,
  order: Order,
  brand: InvoiceBrand = DEFAULT_INVOICE_BRAND,
  logo: string | null = null,
  variant: DocumentVariant = 'invoice',
) {
  const rule = (y: number) => {
    doc.setDrawColor(170)
    doc.setLineWidth(0.5)
    doc.line(M, y, RIGHT, y)
  }
  const text = (s: string, x: number, y: number, size = 10, bold = false, align: 'left' | 'right' | 'center' = 'left') => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(size)
    doc.setTextColor(20)
    doc.text(s, x, y, { align })
  }

  let y = M

  // Logo — optional, the document reads fine without it
  if (logo) {
    try { doc.addImage(logo, 'PNG', M, y, 46, 46) } catch { /* unreadable image */ }
    y += 62
  }

  // Seller / customer-service header
  text(brand.name, M, y, 15, true)
  text('Customer service', RIGHT, y, 9, true, 'right')
  y += 14
  text(brand.site, M, y, 9.5)
  text(brand.supportEmail, RIGHT, y, 9.5, false, 'right')

  y += 24
  rule(y)

  // Date
  y += 18
  const placed = order.created_at ? new Date(order.created_at) : null
  text(
    placed
      ? placed.toLocaleString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric',
          hour: 'numeric', minute: '2-digit',
        })
      : '—',
    M, y, 10.5,
  )
  if (variant === 'receipt') text('RECEIPT', RIGHT, y, 10.5, true, 'right')
  y += 12
  rule(y)

  // Customer + payment method
  y += 18
  text(order.customer_email ?? order.guest_email ?? '—', M, y, 10)
  text(`Payment method  ${paymentLabel(order)}`, RIGHT, y, 10, false, 'right')
  y += 12
  rule(y)

  // Order reference, and on a receipt whether the money has landed
  y += 18
  text(`Order #${orderRef(order)}`, M, y, 11, true)
  if (variant === 'receipt') {
    const stamp = paidStamp(order.status)
    if (stamp) text(stamp, RIGHT, y, 11, true, 'right')
  }
  y += 12
  rule(y)

  // Line items — name left, qty and amount right
  y += 20
  const items = Array.isArray(order.items) ? order.items : []
  const QTY_X = RIGHT - 110
  for (const item of items) {
    if (y > PAGE_H - 220) { doc.addPage(); y = M + 20 }
    const nameLines: string[] = doc.splitTextToSize(item.name ?? '—', QTY_X - M - 16)
    text(nameLines[0] ?? '—', M, y, 10)
    text(String(item.qty ?? 1), QTY_X, y, 10, false, 'right')
    text(money(linePrice(item)), RIGHT, y, 10, false, 'right')
    for (const extra of nameLines.slice(1)) { y += 13; text(extra, M, y, 10) }
    if (item.bundle_label) {
      y += 13
      doc.setTextColor(110)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.text(item.bundle_label, M, y)
    }
    y += 18
  }

  y += 2
  rule(y)

  // Totals
  const discount = Number(order.discount_amount ?? 0)
  const total = Number(order.total ?? 0)
  const LABEL_X = RIGHT - 130
  y += 20
  text('Items', LABEL_X, y, 10, false, 'right')
  text(String(items.reduce((s, i) => s + (i.qty ?? 1), 0)), RIGHT, y, 10, false, 'right')
  if (discount > 0) {
    y += 16
    text('Subtotal', LABEL_X, y, 10, false, 'right')
    text(money(total + discount), RIGHT, y, 10, false, 'right')
    y += 16
    text(order.coupon_code ? `Discount (${order.coupon_code})` : 'Discount', LABEL_X, y, 10, false, 'right')
    text(`-${money(discount)}`, RIGHT, y, 10, false, 'right')
  }
  y += 18
  text('Total', LABEL_X, y, 11.5, true, 'right')
  text(money(total), RIGHT, y, 11.5, true, 'right')

  y += 14
  rule(y)

  // Ship to — on both documents. Receipts are pulled from the admin, not
  // handed to the customer, so the delivery address is the useful part
  // rather than something the reader already knows.
  const ship = shipLines(order)
  if (ship.length) {
    y += 20
    text('Ship to', M, y, 9, true)
    for (const line of ship) { y += 14; text(line, M, y, 10) }
    y += 12
    rule(y)
  }

  // Barcode — Code 128B of the order reference, centred
  const ref = `ORDER-${orderRef(order)}`
  const modules = code128b(ref)
  const totalModules = modules.reduce((s, w) => s + w, 0)
  const BAR_W = 232
  const unit = BAR_W / totalModules
  const barH = 34
  y += 34
  let x = (PAGE_W - BAR_W) / 2
  doc.setFillColor(0, 0, 0)
  modules.forEach((w, i) => {
    if (i % 2 === 0) doc.rect(x, y, unit * w, barH, 'F')   // even index = bar
    x += unit * w
  })
  y += barH + 12
  doc.setFont('courier', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(20)
  doc.text(ref, PAGE_W / 2, y, { align: 'center' })

  // Sign-off
  y += 30
  text('Thank you for your order!', PAGE_W / 2, y, 10, false, 'center')
}

/** Builds a document and hands it to the browser as a download. */
async function download(order: Order, brand: InvoiceBrand, variant: DocumentVariant) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  renderOrderDocument(doc, order, brand, await loadLogo(), variant)
  doc.save(`${variant}-${orderRef(order)}.pdf`)
}

/** The seller's copy — carries the ship-to block. */
export const downloadInvoicePdf = (order: Order, brand: InvoiceBrand = DEFAULT_INVOICE_BRAND) =>
  download(order, brand, 'invoice')

/** The customer's copy — headed RECEIPT and stamped with the payment state. */
export const downloadReceiptPdf = (order: Order, brand: InvoiceBrand = DEFAULT_INVOICE_BRAND) =>
  download(order, brand, 'receipt')
