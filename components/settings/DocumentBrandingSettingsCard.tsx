'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { toast } from 'sonner'

import { createClient } from '@/lib/supabase/client'
import { getActiveTenantId } from '@/lib/supabase/active-tenant'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

type BrandingRow = {
  tenant_id: string
  company_name: string | null
  address_lines: string[] | null
  phone: string | null
  email: string | null
  logo_url: string | null
  stamp_url: string | null
  signature_image_url: string | null
  signature_name: string | null
  signature_title: string | null
  signature_scale: number | null
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Gagal membaca file'))
    reader.readAsDataURL(file)
  })
}

export function DocumentBrandingSettingsCard() {
  const supabase = useMemo(() => createClient(), [])
  const sigRef = useRef<SignatureCanvas>(null)

  const [tenantId, setTenantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [companyName, setCompanyName] = useState('')
  const [addressLinesText, setAddressLinesText] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')

  const [logoUrl, setLogoUrl] = useState('')
  const [stampUrl, setStampUrl] = useState('')
  const [signatureImageUrl, setSignatureImageUrl] = useState('')

  const [signatureName, setSignatureName] = useState('')
  const [signatureTitle, setSignatureTitle] = useState('')
  const [signatureScale, setSignatureScale] = useState('1')

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        setLoading(true)
        const tId = await getActiveTenantId(supabase)
        if (cancelled) return
        setTenantId(tId)
        if (!tId) {
          setLoading(false)
          return
        }

        const res = await supabase
          .from('document_branding_settings')
          .select(
            'tenant_id, company_name, address_lines, phone, email, logo_url, stamp_url, signature_image_url, signature_name, signature_title, signature_scale'
          )
          .eq('tenant_id', tId)
          .maybeSingle()

        if (res.error && res.error.code !== 'PGRST116') throw res.error

        const row = (res.data || null) as BrandingRow | null
        if (!row) {
          setLoading(false)
          return
        }

        setCompanyName(row.company_name || '')
        setAddressLinesText((row.address_lines || []).join('\n'))
        setPhone(row.phone || '')
        setEmail(row.email || '')
        setLogoUrl(row.logo_url || '')
        setStampUrl(row.stamp_url || '')
        setSignatureImageUrl(row.signature_image_url || '')
        setSignatureName(row.signature_name || '')
        setSignatureTitle(row.signature_title || '')
        setSignatureScale(row.signature_scale != null ? String(row.signature_scale) : '1')
      } catch (e: any) {
        console.error('document branding load error:', e)
        toast.error(e?.message || 'Gagal memuat pengaturan kop dokumen')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [supabase])

  const handleSignatureUseCanvas = () => {
    const dataUrl = sigRef.current?.toDataURL('image/png') || ''
    if (!dataUrl) {
      toast.error('Tanda tangan masih kosong')
      return
    }
    setSignatureImageUrl(dataUrl)
    toast.success('Tanda tangan disimpan ke draft')
  }

  const handleUploadToField = async (file: File, setter: (v: string) => void) => {
    try {
      const dataUrl = await fileToDataUrl(file)
      setter(dataUrl)
      toast.success('Gambar berhasil dimuat')
    } catch (e: any) {
      toast.error(e?.message || 'Gagal memuat gambar')
    }
  }

  const handleSave = async () => {
    if (!tenantId) {
      toast.error('Tenant tidak ditemukan')
      return
    }

    setSaving(true)
    try {
      const addressLines = addressLinesText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)

      const payload = {
        tenant_id: tenantId,
        company_name: companyName.trim() || null,
        address_lines: addressLines.length ? addressLines : null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        logo_url: logoUrl.trim() || null,
        stamp_url: stampUrl.trim() || null,
        signature_image_url: signatureImageUrl.trim() || null,
        signature_name: signatureName.trim() || null,
        signature_title: signatureTitle.trim() || null,
        signature_scale: Number.isFinite(Number(signatureScale)) ? Number(signatureScale) : 1,
      }

      const res = await supabase
        .from('document_branding_settings')
        .upsert(payload as any, { onConflict: 'tenant_id' })

      if (res.error) throw res.error
      toast.success('Pengaturan kop dokumen tersimpan')
    } catch (e: any) {
      console.error('document branding save error:', e)
      toast.error(e?.message || 'Gagal menyimpan pengaturan kop dokumen')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kop Dokumen</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-gray-500">
          Konsep awal: pengaturan ini akan dipakai untuk Invoice, Penawaran, PO, dan dokumen administrasi lain.
        </p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Nama Perusahaan</Label>
            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="PT. ..." disabled={loading} />
          </div>
          <div className="space-y-2">
            <Label>Telepon</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08xx..." disabled={loading} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Alamat (per baris)</Label>
            <Textarea value={addressLinesText} onChange={(e) => setAddressLinesText(e.target.value)} placeholder="Jl. ...\nKec. ..." disabled={loading} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@domain.com" disabled={loading} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Logo (URL / DataURL)</Label>
            <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://... atau data:image/..." disabled={loading} />
            <Input
              type="file"
              accept="image/*"
              disabled={loading}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleUploadToField(f, setLogoUrl)
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Stempel (URL / DataURL)</Label>
            <Input value={stampUrl} onChange={(e) => setStampUrl(e.target.value)} placeholder="https://... atau data:image/..." disabled={loading} />
            <Input
              type="file"
              accept="image/*"
              disabled={loading}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleUploadToField(f, setStampUrl)
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Nama Penandatangan</Label>
            <Input value={signatureName} onChange={(e) => setSignatureName(e.target.value)} placeholder="Nama" disabled={loading} />
          </div>
          <div className="space-y-2">
            <Label>Jabatan</Label>
            <Input value={signatureTitle} onChange={(e) => setSignatureTitle(e.target.value)} placeholder="Jabatan" disabled={loading} />
          </div>
          <div className="space-y-2">
            <Label>Ukuran Tanda Tangan (Skala)</Label>
            <Input
              type="number"
              step="0.1"
              min="0.2"
              max="3"
              value={signatureScale}
              onChange={(e) => setSignatureScale(e.target.value)}
              placeholder="1"
              disabled={loading}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Tanda Tangan (gambar)</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={() => sigRef.current?.clear()}
              >
                Clear
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={handleSignatureUseCanvas}
              >
                Pakai tanda tangan ini
              </Button>
            </div>
          </div>

          <div className="rounded-md border p-2">
            <SignatureCanvas
              ref={sigRef}
              canvasProps={{
                width: 700,
                height: 180,
                className: 'w-full h-[180px] bg-white',
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>Tanda Tangan (URL / DataURL)</Label>
            <Input
              value={signatureImageUrl}
              onChange={(e) => setSignatureImageUrl(e.target.value)}
              placeholder="https://... atau data:image/..."
              disabled={loading}
            />
            <Input
              type="file"
              accept="image/*"
              disabled={loading}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleUploadToField(f, setSignatureImageUrl)
              }}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button type="button" onClick={handleSave} disabled={loading || saving}>
            {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
