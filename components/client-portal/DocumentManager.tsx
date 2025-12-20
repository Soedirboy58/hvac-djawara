// ============================================
// Client Documents Manager
// Upload, view, and manage client documents (SPK, penawaran, invoice, etc)
// ============================================

'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Plus, 
  FileText, 
  Download, 
  Trash2, 
  Upload,
  Loader2,
  AlertCircle,
  Calendar,
  File,
  Image as ImageIcon,
  CheckCircle,
  Eye
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Document {
  id: string
  document_name: string
  document_type: string
  file_path: string
  file_size: number
  file_type: string
  document_number?: string
  document_date?: string
  status: string
  uploaded_at: string
  uploaded_by_name?: string
}

interface DocumentManagerProps {
  clientId: string
}

export function DocumentManager({ clientId }: DocumentManagerProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const [uploadForm, setUploadForm] = useState({
    document_name: '',
    document_type: 'spk',
    document_number: '',
    document_date: '',
    notes: '',
    file: null as File | null
  })

  const documentTypes = [
    { value: 'spk', label: 'SPK (Surat Perintah Kerja)', icon: '📋' },
    { value: 'penawaran', label: 'Penawaran/Quotation', icon: '💰' },
    { value: 'invoice', label: 'Invoice/Tagihan', icon: '🧾' },
    { value: 'bast', label: 'BAST (Berita Acara)', icon: '📝' },
    { value: 'kontrak', label: 'Kontrak/Agreement', icon: '📄' },
    { value: 'po', label: 'Purchase Order', icon: '🛒' },
    { value: 'kwitansi', label: 'Kwitansi/Receipt', icon: '💵' },
    { value: 'warranty', label: 'Warranty Certificate', icon: '🛡️' },
    { value: 'foto_sebelum', label: 'Foto Sebelum', icon: '📸' },
    { value: 'foto_sesudah', label: 'Foto Sesudah', icon: '📷' },
    { value: 'lainnya', label: 'Lainnya', icon: '📎' }
  ]

  useEffect(() => {
    fetchDocuments()
  }, [clientId])

  async function fetchDocuments() {
    try {
      const { data, error: fetchError } = await supabase
        .from('client_documents')
        .select(`
          *,
          profiles!client_documents_uploaded_by_fkey (full_name)
        `)
        .eq('client_id', clientId)
        .eq('status', 'active')
        .order('uploaded_at', { ascending: false })

      if (fetchError) throw fetchError

      const formatted = data?.map(d => ({
        ...d,
        uploaded_by_name: d.profiles?.full_name || 'System'
      })) || []

      setDocuments(formatted)
    } catch (err) {
      console.error('Error fetching documents:', err)
      setError('Failed to load documents')
    } finally {
      setLoading(false)
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!uploadForm.file) return

    setUploading(true)
    setError(null)

    try {
      // Get user and tenant info
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profile } = await supabase
        .from('profiles')
        .select('active_tenant_id')
        .eq('id', user?.id)
        .single()

      // Upload file to storage
      const fileExt = uploadForm.file.name.split('.').pop()
      const fileName = `${clientId}/${Date.now()}_${uploadForm.document_type}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('client-documents')
        .upload(fileName, uploadForm.file)

      if (uploadError) throw uploadError

      // Save metadata to database
      const { error: dbError } = await supabase
        .from('client_documents')
        .insert({
          client_id: clientId,
          tenant_id: profile?.active_tenant_id,
          document_name: uploadForm.document_name,
          document_type: uploadForm.document_type,
          file_path: fileName,
          file_size: uploadForm.file.size,
          file_type: uploadForm.file.type,
          document_number: uploadForm.document_number || null,
          document_date: uploadForm.document_date || null,
          notes: uploadForm.notes || null,
          uploaded_by: user?.id
        })

      if (dbError) throw dbError

      resetUploadForm()
      fetchDocuments()
    } catch (err) {
      console.error('Error uploading document:', err)
      setError(err instanceof Error ? err.message : 'Failed to upload document')
    } finally {
      setUploading(false)
    }
  }

  async function handleDownload(doc: Document) {
    try {
      const { data, error } = await supabase.storage
        .from('client-documents')
        .download(doc.file_path)

      if (error) throw error

      // Create download link
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = doc.document_name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error downloading:', err)
      setError('Failed to download document')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus dokumen ini?')) return

    try {
      const { error: deleteError } = await supabase
        .from('client_documents')
        .update({ status: 'deleted' })
        .eq('id', id)

      if (deleteError) throw deleteError
      fetchDocuments()
    } catch (err) {
      console.error('Error deleting document:', err)
      setError('Failed to delete document')
    }
  }

  function resetUploadForm() {
    setUploadForm({
      document_name: '',
      document_type: 'spk',
      document_number: '',
      document_date: '',
      notes: '',
      file: null
    })
    setShowUpload(false)
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  function getDocumentIcon(type: string) {
    const docType = documentTypes.find(t => t.value === type)
    return docType?.icon || '📄'
  }

  function getDocumentLabel(type: string) {
    const docType = documentTypes.find(t => t.value === type)
    return docType?.label || type
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Dokumen & Arsip</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              SPK, Penawaran, Invoice, BAST, Kontrak, dan dokumen lainnya
            </p>
          </div>
          {!showUpload && (
            <Button onClick={() => setShowUpload(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Upload Dokumen
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {/* Upload Form */}
        {showUpload && (
          <Card className="border-2 border-blue-200">
            <CardContent className="pt-6">
              <form onSubmit={handleUpload} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipe Dokumen *
                    </label>
                    <select
                      value={uploadForm.document_type}
                      onChange={(e) => setUploadForm({ ...uploadForm, document_type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    >
                      {documentTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.icon} {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nama Dokumen *
                    </label>
                    <Input
                      value={uploadForm.document_name}
                      onChange={(e) => setUploadForm({ ...uploadForm, document_name: e.target.value })}
                      placeholder="e.g., SPK-2024-001"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nomor Dokumen
                    </label>
                    <Input
                      value={uploadForm.document_number}
                      onChange={(e) => setUploadForm({ ...uploadForm, document_number: e.target.value })}
                      placeholder="SPK-001, INV-2024-001"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tanggal Dokumen
                    </label>
                    <Input
                      type="date"
                      value={uploadForm.document_date}
                      onChange={(e) => setUploadForm({ ...uploadForm, document_date: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload File * (PDF, Word, Excel, Image)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                    onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                  {uploadForm.file && (
                    <p className="text-xs text-gray-500 mt-1">
                      {uploadForm.file.name} ({formatFileSize(uploadForm.file.size)})
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Catatan
                  </label>
                  <textarea
                    value={uploadForm.notes}
                    onChange={(e) => setUploadForm({ ...uploadForm, notes: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Catatan tambahan..."
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button type="submit" disabled={uploading} className="flex-1">
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Dokumen
                      </>
                    )}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetUploadForm}>
                    Batal
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Documents List */}
        {documents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Belum ada dokumen</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <Card key={doc.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="text-2xl">{getDocumentIcon(doc.document_type)}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900">
                            {doc.document_name}
                          </h4>
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                            {getDocumentLabel(doc.document_type)}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600">
                          {doc.document_number && (
                            <div>
                              <span className="text-gray-500">No: </span>
                              {doc.document_number}
                            </div>
                          )}
                          {doc.document_date && (
                            <div>
                              <span className="text-gray-500">Tanggal: </span>
                              {new Date(doc.document_date).toLocaleDateString('id-ID')}
                            </div>
                          )}
                          <div>
                            <span className="text-gray-500">Ukuran: </span>
                            {formatFileSize(doc.file_size)}
                          </div>
                          <div>
                            <span className="text-gray-500">Upload: </span>
                            {new Date(doc.uploaded_at).toLocaleDateString('id-ID')}
                          </div>
                        </div>

                        <p className="text-xs text-gray-500 mt-1">
                          Diupload oleh {doc.uploaded_by_name}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* If it's a BAST technical report, use API route */}
                      {doc.document_type === 'bast' && doc.related_order_id ? (
                        <a
                          href={`/api/reports/${doc.related_order_id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </a>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDownload(doc)}
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(doc.id)}
                        className="text-red-600 hover:text-red-700"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Summary */}
        {documents.length > 0 && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Total Dokumen</span>
              <span className="font-semibold text-gray-900">{documents.length} file</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
