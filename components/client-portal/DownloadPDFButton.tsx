'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'
import { generateTechnicalReportPDF } from '@/lib/pdf-generator'

interface DownloadPDFButtonProps {
  orderId: string
  orderNumber: string
  className?: string
  size?: 'sm' | 'default' | 'lg'
}

export function DownloadPDFButton({ orderId, orderNumber, className, size = 'sm' }: DownloadPDFButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleDownload = async () => {
    try {
      setLoading(true)
      
      // Fetch report data from API
      const response = await fetch(`/api/reports/${orderId}/pdf`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch report data')
      }
      
      const data = await response.json()
      
      // Generate PDF in browser
      const pdfBlob = await generateTechnicalReportPDF(data)
      
      // Trigger download
      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Laporan-Teknis-${orderNumber}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading PDF:', error)
      alert(`Gagal download PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleDownload}
      disabled={loading}
      size={size}
      className={className}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Download className="w-4 h-4 mr-2" />
          Download PDF Report
        </>
      )}
    </Button>
  )
}
