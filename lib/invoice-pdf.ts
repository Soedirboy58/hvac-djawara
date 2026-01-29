import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export type InvoicePdfCompany = {
  name: string
  addressLines: string[]
  phone?: string
  email?: string
  paymentLines?: string[]
  signName?: string
  signTitle?: string

  // Document branding (kop) assets (URL or data URL)
  logoUrl?: string
  stampUrl?: string
  signatureImageUrl?: string

  // Visual tuning
  signatureScale?: number
}

export type InvoicePdfBillTo = {
  name: string
  address?: string
  phone?: string
}

export type InvoicePdfItem = {
  description: string
  quantity: number
  unit: string
  unitPrice: number
  discountPercent?: number
  taxPercent?: number
}

export type InvoicePdfData = {
  invoiceNumber: string
  issueDate: string // yyyy-mm-dd
  dueDate?: string | null
  billTo: InvoicePdfBillTo
  company: InvoicePdfCompany
  items: InvoicePdfItem[]
  ppnEnabled?: boolean
  ppnPercent?: number
  pphEnabled?: boolean
  pphPercent?: number
  dpEnabled?: boolean
  dpAmount?: number
  notes?: string | null
}

function formatRupiahNumber(value: number) {
  const v = Number.isFinite(value) ? value : 0
  return v.toLocaleString('id-ID')
}

function clampInt(n: number) {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.floor(n))
}

function clampNumber(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, n))
}

function wrapAndClampLines(doc: jsPDF, parts: string[], maxWidth: number, maxLines: number) {
  const lines: string[] = []
  for (const p of parts) {
    const text = String(p || '').trim()
    if (!text) continue
    const wrapped = doc.splitTextToSize(text, maxWidth) as string[]
    for (const w of wrapped) {
      const t = String(w || '').trim()
      if (!t) continue
      lines.push(t)
      if (lines.length >= maxLines) break
    }
    if (lines.length >= maxLines) break
  }

  if (lines.length <= maxLines) return lines
  return lines.slice(0, maxLines)
}

function withEllipsis(doc: jsPDF, text: string, maxWidth: number) {
  const t = String(text || '').trim()
  if (!t) return t
  if (doc.getTextWidth(t) <= maxWidth) return t

  const ell = '…'
  let s = t
  while (s.length > 0 && doc.getTextWidth(s + ell) > maxWidth) {
    s = s.slice(0, -1)
  }
  return s ? s + ell : ell
}

// Very small Indonesian "terbilang" helper for invoice totals.
// Covers up to trillions; outputs Title Case-ish words similar to common invoices.
function terbilang(n: number): string {
  const x = clampInt(n)
  if (x === 0) return 'Nol'

  const units = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan']

  const toWords = (num: number): string => {
    if (num === 0) return ''
    if (num < 10) return units[num]
    if (num === 10) return 'Sepuluh'
    if (num === 11) return 'Sebelas'
    if (num < 20) return `${units[num - 10]} Belas`
    if (num < 100) {
      const tens = Math.floor(num / 10)
      const rest = num % 10
      return `${units[tens]} Puluh${rest ? ' ' + toWords(rest) : ''}`
    }
    if (num < 200) return `Seratus${num % 100 ? ' ' + toWords(num % 100) : ''}`
    if (num < 1000) {
      const hundreds = Math.floor(num / 100)
      const rest = num % 100
      return `${units[hundreds]} Ratus${rest ? ' ' + toWords(rest) : ''}`
    }
    if (num < 2000) return `Seribu${num % 1000 ? ' ' + toWords(num % 1000) : ''}`
    if (num < 1_000_000) {
      const thousands = Math.floor(num / 1000)
      const rest = num % 1000
      return `${toWords(thousands)} Ribu${rest ? ' ' + toWords(rest) : ''}`
    }
    if (num < 1_000_000_000) {
      const millions = Math.floor(num / 1_000_000)
      const rest = num % 1_000_000
      return `${toWords(millions)} Juta${rest ? ' ' + toWords(rest) : ''}`
    }
    if (num < 1_000_000_000_000) {
      const billions = Math.floor(num / 1_000_000_000)
      const rest = num % 1_000_000_000
      return `${toWords(billions)} Miliar${rest ? ' ' + toWords(rest) : ''}`
    }
    const trillions = Math.floor(num / 1_000_000_000_000)
    const rest = num % 1_000_000_000_000
    return `${toWords(trillions)} Triliun${rest ? ' ' + toWords(rest) : ''}`
  }

  return toWords(x).trim()
}

type LoadedImage = {
  dataUrl: string
  width: number
  height: number
}

// Helper to load + compress remote images as base64 (for jsPDF addImage)
function loadImage(
  url: string,
  opts?: { maxWidth?: number; maxHeight?: number; quality?: number }
): Promise<LoadedImage> {
  const maxWidth = Math.max(80, Number(opts?.maxWidth || 800))
  const maxHeight = Math.max(80, Number(opts?.maxHeight || 800))
  const quality = Math.min(0.9, Math.max(0.4, Number(opts?.quality || 0.7)))

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width, maxHeight / img.height)
      const targetW = Math.max(1, Math.round(img.width * scale))
      const targetH = Math.max(1, Math.round(img.height * scale))

      const canvas = document.createElement('canvas')
      canvas.width = targetW
      canvas.height = targetH
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('Failed to get canvas context'))
      ctx.drawImage(img, 0, 0, targetW, targetH)
      resolve({
        dataUrl: canvas.toDataURL('image/jpeg', quality),
        width: targetW,
        height: targetH,
      })
    }
    img.onerror = reject
    img.src = url
  })
}

async function resolveImageDataUrl(urlOrDataUrl?: string): Promise<LoadedImage | null> {
  const v = String(urlOrDataUrl || '').trim()
  if (!v) return null
  if (v.startsWith('data:image/')) {
    try {
      return await loadImage(v)
    } catch {
      return null
    }
  }
  try {
    return await loadImage(v)
  } catch (e) {
    console.warn('Failed to load image for PDF:', e)
    return null
  }
}

export async function generateInvoicePdfBlob(data: InvoicePdfData): Promise<Blob> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const pageWidth = doc.internal.pageSize.getWidth()

  const addImageFit = (img: LoadedImage, x: number, y: number, maxW: number, maxH: number) => {
    const ratio = Math.min(maxW / img.width, maxH / img.height)
    const w = Math.max(1, img.width * ratio)
    const h = Math.max(1, img.height * ratio)
    const dx = x + (maxW - w) / 2
    const dy = y + (maxH - h) / 2
    doc.addImage(img.dataUrl, 'JPEG', dx, dy, w, h)
  }

  const left = 14
  const right = pageWidth - 14
  let y = 18

  // Title
  // Optional logo (kop)
  const logoDataUrl = await resolveImageDataUrl(data.company.logoUrl)
  if (logoDataUrl) {
    try {
      addImageFit(logoDataUrl, left, 10, 18, 18)
    } catch (e) {
      console.warn('Failed to add logo image:', e)
    }
  }

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('INVOICE', pageWidth / 2, y, { align: 'center' })

  y += 6
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Nomor : ${data.invoiceNumber}`, pageWidth / 2, y, { align: 'center' })

  y += 10

  // Dates (left)
  doc.setFontSize(9)
  doc.text(`Tanggal`, left, y)
  doc.text(`: ${data.issueDate}`, left + 28, y)
  y += 5
  doc.text(`Tgl. Jatuh Tempo`, left, y)
  doc.text(`: ${data.dueDate || '-'}`, left + 28, y)

  // Bill to box (left)
  y += 10
  doc.setFontSize(9)
  const boxW = (right - left - 10) / 2
  const boxH = 28

  const pad = 3
  const contentMaxW = boxW - pad * 2
  const lineH = 4

  const infoTitleY = y

  // Titles (keep aligned)
  doc.text('Tagihan Kepada', left, infoTitleY)

  // Company box (right)
  const companyLeft = left + boxW + 10
  doc.text('Informasi Perusahaan', companyLeft, infoTitleY)

  const boxTop = infoTitleY + 3
  doc.rect(left, boxTop, boxW, boxH)

  doc.setFont('helvetica', 'bold')
  doc.text(data.billTo.name || '-', left + 3, boxTop + 6)
  doc.setFont('helvetica', 'normal')

  const billPhoneY = boxTop + boxH - 5
  const billAddrStartY = boxTop + 12
  const billAddrMaxLines = Math.max(1, Math.floor(((billPhoneY - 1) - billAddrStartY) / lineH))
  const billAddrParts = data.billTo.address ? [`Jl. ${data.billTo.address}`] : []
  const billAddrLines = wrapAndClampLines(doc, billAddrParts, contentMaxW, billAddrMaxLines)
  let by = billAddrStartY
  for (let i = 0; i < billAddrLines.length; i++) {
    const isLast = i === billAddrLines.length - 1
    const line = isLast ? withEllipsis(doc, billAddrLines[i], contentMaxW) : billAddrLines[i]
    doc.text(line, left + pad, by)
    by += lineH
  }

  if (data.billTo.phone) {
    doc.text(withEllipsis(doc, `Telp: ${data.billTo.phone}`, contentMaxW), left + pad, billPhoneY)
  }

  doc.rect(companyLeft, boxTop, boxW, boxH)
  doc.setFont('helvetica', 'bold')
  doc.text(data.company.name, companyLeft + 3, boxTop + 6)
  doc.setFont('helvetica', 'normal')

  const hasPhone = Boolean(data.company.phone)
  const hasEmail = Boolean(data.company.email)

  // Put contacts at the bottom; if both exist, combine into one line to free vertical space for address.
  const contactLines: string[] = []
  if (hasPhone && hasEmail) {
    contactLines.push(`Telp: ${data.company.phone} | Email: ${data.company.email}`)
  } else {
    if (hasPhone) contactLines.push(`Telp: ${data.company.phone}`)
    if (hasEmail) contactLines.push(`Email: ${data.company.email}`)
  }

  const contactBottomY = boxTop + boxH - 2
  const contactStartY = contactBottomY - (contactLines.length - 1) * lineH
  for (let i = 0; i < contactLines.length; i++) {
    doc.text(withEllipsis(doc, contactLines[i], contentMaxW), companyLeft + pad, contactStartY + i * lineH)
  }

  const addrLines = data.company.addressLines || []
  const addrStartY = boxTop + 12
  const addrMaxBottom = contactLines.length > 0 ? contactStartY - 1 : contactBottomY - 1
  const addrMaxLines = Math.max(1, Math.floor((addrMaxBottom - addrStartY) / lineH))
  const addrWrapped = wrapAndClampLines(doc, addrLines, contentMaxW, addrMaxLines)

  let cy = addrStartY
  for (let i = 0; i < addrWrapped.length; i++) {
    const isLast = i === addrWrapped.length - 1
    const line = isLast ? withEllipsis(doc, addrWrapped[i], contentMaxW) : addrWrapped[i]
    doc.text(line, companyLeft + pad, cy)
    cy += lineH
  }

  y = boxTop + boxH + 8

  // Items table
  const body = data.items.map((it, idx) => {
    const qty = Number.isFinite(it.quantity) ? it.quantity : 0
    const unitPrice = Number.isFinite(it.unitPrice) ? it.unitPrice : 0
    const disc = Number.isFinite(it.discountPercent) ? it.discountPercent! : 0
    const tax = Number.isFinite(it.taxPercent) ? it.taxPercent! : 0
    const line = qty * unitPrice * (1 - disc / 100) * (1 + tax / 100)

    return [
      String(idx + 1),
      it.description,
      formatRupiahNumber(qty),
      it.unit,
      disc ? `${disc}%` : '0%',
      tax ? `${tax}%` : '',
      formatRupiahNumber(unitPrice),
      formatRupiahNumber(line),
    ]
  })

  autoTable(doc, {
    startY: y,
    theme: 'grid',
    head: [[
      'No.',
      'Deskripsi',
      'Qty',
      'Satuan',
      'Disc',
      'Tax',
      'Harga/Unit',
      'Jumlah',
    ]],
    body,
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      lineWidth: 0.2,
      halign: 'center',
      valign: 'middle',
    },
    columnStyles: {
      0: { cellWidth: 8 },
      2: { cellWidth: 14, halign: 'right' },
      3: { cellWidth: 14 },
      4: { cellWidth: 12, halign: 'right' },
      5: { cellWidth: 12, halign: 'right' },
      6: { cellWidth: 24, halign: 'right' },
      7: { cellWidth: 24, halign: 'right' },
    },
  })

  const finalY = (doc as any).lastAutoTable?.finalY || y
  y = finalY + 6

  // Totals
  const ppnEnabled = Boolean(data.ppnEnabled)
  const pphEnabled = Boolean(data.pphEnabled)
  const dpEnabled = Boolean(data.dpEnabled)
  const ppnPercent = Number.isFinite(data.ppnPercent as number) ? (data.ppnPercent as number) : 11
  const pphPercent = Number.isFinite(data.pphPercent as number) ? (data.pphPercent as number) : 0
  const dpAmount = Number.isFinite(data.dpAmount as number) ? (data.dpAmount as number) : 0

  const subtotal = data.items.reduce((acc, it) => {
    const qty = Number.isFinite(it.quantity) ? it.quantity : 0
    const unitPrice = Number.isFinite(it.unitPrice) ? it.unitPrice : 0
    return acc + qty * unitPrice
  }, 0)

  const discountTotal = data.items.reduce((acc, it) => {
    const qty = Number.isFinite(it.quantity) ? it.quantity : 0
    const unitPrice = Number.isFinite(it.unitPrice) ? it.unitPrice : 0
    const disc = Number.isFinite(it.discountPercent) ? it.discountPercent! : 0
    return acc + qty * unitPrice * (disc / 100)
  }, 0)

  const dpp = Math.max(0, subtotal - discountTotal)
  const ppnAmount = ppnEnabled ? dpp * (ppnPercent / 100) : 0
  const pphAmount = pphEnabled ? dpp * (pphPercent / 100) : 0
  const grandTotal = Math.max(0, dpp + ppnAmount - pphAmount)
  const sisaTagihan = dpEnabled ? Math.max(0, grandTotal - dpAmount) : grandTotal

  const terbilangText = `${terbilang(sisaTagihan)} Rupiah`

  const leftBlockW = right - left - 60
  doc.rect(left, y, leftBlockW, 18)
  doc.setFontSize(8)
  doc.text('Terbilang :', left + 2, y + 5)
  doc.text(terbilangText, left + 2, y + 11)

  const totalsLeft = left + leftBlockW
  doc.rect(totalsLeft, y, 60, 18)
  doc.setFontSize(8)
  let ty = y + 5

  doc.text('Subtotal', totalsLeft + 2, ty)
  doc.text(`Rp ${formatRupiahNumber(subtotal)}`, right - 2, ty, { align: 'right' })
  ty += 5

  if (discountTotal > 0) {
    doc.text('Diskon', totalsLeft + 2, ty)
    doc.text(`Rp ${formatRupiahNumber(discountTotal)}`, right - 2, ty, { align: 'right' })
    ty += 5
  }

  if (ppnEnabled || pphEnabled) {
    doc.text('DPP', totalsLeft + 2, ty)
    doc.text(`Rp ${formatRupiahNumber(dpp)}`, right - 2, ty, { align: 'right' })
    ty += 5
  }

  if (ppnEnabled) {
    doc.text(`PPN (${ppnPercent}%)`, totalsLeft + 2, ty)
    doc.text(`Rp ${formatRupiahNumber(ppnAmount)}`, right - 2, ty, { align: 'right' })
    ty += 5
  }

  if (pphEnabled) {
    doc.text(`PPh (${pphPercent}%)`, totalsLeft + 2, ty)
    doc.text(`- Rp ${formatRupiahNumber(pphAmount)}`, right - 2, ty, { align: 'right' })
    ty += 5
  }

  doc.text('Total', totalsLeft + 2, ty)
  doc.text(`Rp ${formatRupiahNumber(grandTotal)}`, right - 2, ty, { align: 'right' })
  ty += 5

  if (dpEnabled && dpAmount > 0) {
    doc.text('DP', totalsLeft + 2, ty)
    doc.text(`- Rp ${formatRupiahNumber(dpAmount)}`, right - 2, ty, { align: 'right' })
    ty += 5
  }

  doc.text('Sisa Tagihan', totalsLeft + 2, ty)
  doc.text(`Rp ${formatRupiahNumber(sisaTagihan)}`, right - 2, ty, { align: 'right' })

  y += 24

  // Payment info + signature
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('Pesan', left, y)
  doc.setFont('helvetica', 'normal')

  const paymentLines = data.company.paymentLines || []
  let py = y + 5
  for (const line of paymentLines.slice(0, 6)) {
    doc.text(line, left, py)
    py += 4
  }

  const sigX = right - 55
  doc.text('Dengan Hormat,', sigX, y + 6)

  // Optional stamp + signature image
  const stampDataUrl = await resolveImageDataUrl(data.company.stampUrl)
  const signatureDataUrl = await resolveImageDataUrl(data.company.signatureImageUrl)
  if (stampDataUrl) {
    try {
      addImageFit(stampDataUrl, sigX + 28, y + 10, 22, 22)
    } catch (e) {
      console.warn('Failed to add stamp image:', e)
    }
  }
  if (signatureDataUrl) {
    try {
      const scale = clampNumber(Number(data.company.signatureScale ?? 1), 0.2, 3)
      const maxW = 55 * scale
      const maxH = 16 * scale
      addImageFit(signatureDataUrl, sigX, y + 14, maxW, maxH)
    } catch (e) {
      console.warn('Failed to add signature image:', e)
    }
  }

  doc.setFont('helvetica', 'bold')
  doc.text(data.company.signName || data.company.name, sigX, y + 32)
  doc.setFont('helvetica', 'normal')
  if (data.company.signTitle) doc.text(data.company.signTitle, sigX, y + 37)

  return doc.output('blob') as Blob
}
