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

export async function generateInvoicePdfBlob(data: InvoicePdfData): Promise<Blob> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const pageWidth = doc.internal.pageSize.getWidth()

  const left = 14
  const right = pageWidth - 14
  let y = 18

  // Title
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
  doc.text('Tagihan Kepada', left, y)
  y += 3

  const boxTop = y
  const boxW = (right - left - 10) / 2
  const boxH = 28
  doc.rect(left, boxTop, boxW, boxH)

  doc.setFont('helvetica', 'bold')
  doc.text(data.billTo.name || '-', left + 3, boxTop + 6)
  doc.setFont('helvetica', 'normal')
  if (data.billTo.address) doc.text(`Jl. ${data.billTo.address}`, left + 3, boxTop + 12)
  if (data.billTo.phone) doc.text(`Telp: ${data.billTo.phone}`, left + 3, boxTop + 18)

  // Company box (right)
  const companyLeft = left + boxW + 10
  doc.text('Informasi Perusahaan', companyLeft, y)
  y += 3

  doc.rect(companyLeft, boxTop, boxW, boxH)
  doc.setFont('helvetica', 'bold')
  doc.text(data.company.name, companyLeft + 3, boxTop + 6)
  doc.setFont('helvetica', 'normal')

  const addrLines = data.company.addressLines || []
  let cy = boxTop + 12
  for (const line of addrLines.slice(0, 2)) {
    doc.text(line, companyLeft + 3, cy)
    cy += 5
  }
  if (data.company.phone) {
    doc.text(`Telp: ${data.company.phone}`, companyLeft + 3, boxTop + 22)
  }
  if (data.company.email) {
    doc.text(`Email: ${data.company.email}`, companyLeft + 3, boxTop + 27)
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
      'Kuantitas',
      'Satuan',
      'Diskon',
      'Pajak',
      'Harga / Unit',
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
    },
    columnStyles: {
      0: { cellWidth: 8 },
      2: { cellWidth: 16, halign: 'right' },
      3: { cellWidth: 14 },
      4: { cellWidth: 12, halign: 'right' },
      5: { cellWidth: 10, halign: 'right' },
      6: { cellWidth: 22, halign: 'right' },
      7: { cellWidth: 24, halign: 'right' },
    },
  })

  const finalY = (doc as any).lastAutoTable?.finalY || y
  y = finalY + 6

  // Totals
  const subtotal = data.items.reduce((acc, it) => {
    const qty = Number.isFinite(it.quantity) ? it.quantity : 0
    const unitPrice = Number.isFinite(it.unitPrice) ? it.unitPrice : 0
    const disc = Number.isFinite(it.discountPercent) ? it.discountPercent! : 0
    const tax = Number.isFinite(it.taxPercent) ? it.taxPercent! : 0
    const line = qty * unitPrice * (1 - disc / 100) * (1 + tax / 100)
    return acc + line
  }, 0)

  const terbilangText = `${terbilang(subtotal)} Rupiah`

  const leftBlockW = right - left - 60
  doc.rect(left, y, leftBlockW, 18)
  doc.setFontSize(8)
  doc.text('Terbilang :', left + 2, y + 5)
  doc.text(terbilangText, left + 2, y + 11)

  const totalsLeft = left + leftBlockW
  doc.rect(totalsLeft, y, 60, 18)
  doc.setFontSize(8)
  doc.text('Subtotal', totalsLeft + 2, y + 5)
  doc.text(`Rp ${formatRupiahNumber(subtotal)}`, right - 2, y + 5, { align: 'right' })
  doc.text('Total', totalsLeft + 2, y + 10)
  doc.text(`Rp ${formatRupiahNumber(subtotal)}`, right - 2, y + 10, { align: 'right' })
  doc.text('Sisa Tagihan', totalsLeft + 2, y + 15)
  doc.text(`Rp ${formatRupiahNumber(subtotal)}`, right - 2, y + 15, { align: 'right' })

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

  doc.text('Dengan Hormat,', right - 55, y + 6)
  doc.setFont('helvetica', 'bold')
  doc.text(data.company.signName || data.company.name, right - 55, y + 28)
  doc.setFont('helvetica', 'normal')
  if (data.company.signTitle) doc.text(data.company.signTitle, right - 55, y + 33)

  return doc.output('blob') as Blob
}
