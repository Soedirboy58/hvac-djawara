// ============================================
// Share Client Public Link Component
// Generate & share unique public link for client
// ============================================

'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Link as LinkIcon, 
  QrCode, 
  Copy, 
  CheckCircle, 
  Loader2,
  MessageCircle,
  Crown,
  Share2
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { createClient } from '@/lib/supabase/client'

interface EnablePortalAccessProps {
  client: {
    id: string
    name: string
    email?: string
    phone: string
    portal_enabled: boolean
    portal_activated_at?: string
  }
}

export function EnablePortalAccess({ client }: EnablePortalAccessProps) {
  const [loading, setLoading] = useState(false)
  const [invitation, setInvitation] = useState<{
    token: string
    link: string
    expires_at: string
  } | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // If portal already enabled
  if (client.portal_enabled && client.portal_activated_at) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Client Portal Access</CardTitle>
          <CardDescription>Portal access status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                Portal Activated
              </p>
              <p className="text-xs text-gray-500">
                Activated on {new Date(client.portal_activated_at).toLocaleDateString('id-ID')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // If invitation already sent (pending activation)
  if (client.portal_invitation_token && !invitation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Portal Invitation Sent</CardTitle>
          <CardDescription>Waiting for client to activate</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              Invitation has been sent to this client. They need to click the link and set their password to activate portal access.
            </AlertDescription>
          </Alert>
          <Button
            variant="outline"
            className="w-full mt-4"
            onClick={() => handleGenerateInvitation(true)}
          >
            Resend Invitation
          </Button>
        </CardContent>
      </Card>
    )
  }

  async function handleGeneratePublicLink() {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/generate-portal-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: client.id }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate invitation')
      }

      setInvitation({
        token: data.token,
        link: data.invitation_link,
        expires_at: data.expires_at,
      })
    } catch (err) {
      console.error('Error generating invitation:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate invitation')
    } finally {
      setLoading(false)
    }
  }

  function handleCopyLink() {
    if (!invitation) return
    navigator.clipboard.writeText(invitation.link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleShareWhatsApp() {
    if (!invitation) return
    const message = encodeURIComponent(
      `Halo ${client.name},\n\n` +
      `Anda telah terdaftar di Client Portal HVAC Djawara! 🎉\n\n` +
      `Klik link berikut untuk aktivasi akun Anda:\n` +
      `${invitation.link}\n\n` +
      `Link berlaku hingga: ${new Date(invitation.expires_at).toLocaleDateString('id-ID')}\n\n` +
      `Terima kasih!`
    )
    const whatsappUrl = `https://wa.me/${client.phone.replace(/\D/g, '')}?text=${message}`
    window.open(whatsappUrl, '_blank')
  }

  function handleShareEmail() {
    if (!invitation) return
    const subject = encodeURIComponent('Aktivasi Client Portal HVAC Djawara')
    const body = encodeURIComponent(
      `Halo ${client.name},\n\n` +
      `Anda telah terdaftar di Client Portal HVAC Djawara!\n\n` +
      `Silakan klik link berikut untuk mengaktifkan akun Anda:\n` +
      `${invitation.link}\n\n` +
      `Link berlaku hingga: ${new Date(invitation.expires_at).toLocaleDateString('id-ID')}\n\n` +
      `Dengan portal ini, Anda dapat:\n` +
      `• Melihat status order real-time\n` +
      `• Download BAST & Invoice\n` +
      `• Lihat jadwal maintenance\n` +
      `• Akses histori service\n\n` +
      `Terima kasih,\n` +
      `Tim HVAC Djawara`
    )
    window.location.href = `mailto:${client.email}?subject=${subject}&body=${body}`
  }

  // Show invitation result
  if (invitation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Portal Invitation Generated ✅</CardTitle>
          <CardDescription>
            Share this link or QR code with the client
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* QR Code */}
          <div className="flex justify-center p-6 bg-gray-50 rounded-lg">
            <QRCodeSVG 
              value={invitation.link} 
              size={200}
              level="M"
              includeMargin={true}
            />
          </div>

          {/* Invitation Link */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Invitation Link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={invitation.link}
                readOnly
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md bg-gray-50"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyLink}
              >
                {copied ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Expires: {new Date(invitation.expires_at).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>

          {/* Share Options */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Share via
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={handleShareWhatsApp}
                className="w-full"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                WhatsApp
              </Button>
              <Button
                variant="outline"
                onClick={handleShareEmail}
                className="w-full"
                disabled={!client.email}
              >
                <Mail className="w-4 h-4 mr-2" />
                Email
              </Button>
            </div>
          </div>

          <Alert>
            <AlertDescription className="text-xs">
              <strong>Next Steps:</strong><br />
              1. Share link/QR code dengan client<br />
              2. Client click link dan set password<br />
              3. Client otomatis dapat akses portal
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  // Initial state - show enable button
  return (
    <Card>
      <CardHeader>
        <CardTitle>Enable Client Portal Access</CardTitle>
        <CardDescription>
          Generate invitation link for {client.name}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="bg-blue-50 rounded-lg p-4 space-y-2">
          <p className="text-sm font-medium text-blue-900">
            Client will receive:
          </p>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Invitation link (valid 7 days)</li>
            <li>• QR code untuk easy access</li>
            <li>• Instructions untuk set password</li>
          </ul>
        </div>

        <Button
          onClick={() => handleGenerateInvitation()}
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <QrCode className="w-4 h-4 mr-2" />
              Generate Portal Invitation
            </>
          )}
        </Button>

        <p className="text-xs text-gray-500 text-center">
          Client data sudah tersimpan. Tidak perlu input manual lagi.
        </p>
      </CardContent>
    </Card>
  )
}
