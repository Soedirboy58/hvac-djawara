// ============================================
// Share Client Public Link Component
// Generate & share unique public link (permanent, no expiry)
// ============================================

'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { 
  Link as LinkIcon, 
  QrCode, 
  Copy, 
  CheckCircle, 
  Loader2,
  MessageCircle,
  Crown,
  ExternalLink
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { createClient } from '@/lib/supabase/client'

interface ShareClientLinkProps {
  client: {
    id: string
    name: string
    email?: string
    phone: string
    portal_enabled: boolean
    portal_activated_at?: string
  }
}

export function ShareClientLink({ client }: ShareClientLinkProps) {
  const [loading, setLoading] = useState(true)
  const [publicLink, setPublicLink] = useState<{
    token: string
    public_link: string
    whatsapp_link: string
  } | null>(null)
  const [copied, setCopied] = useState(false)
  const supabase = createClient()

  const isPremium = client.portal_enabled && client.portal_activated_at

  useEffect(() => {
    generatePublicLink()
  }, [client.id])

  async function generatePublicLink() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .rpc('generate_public_view_link', { p_client_id: client.id })
        .single()

      if (!error && data) {
        setPublicLink(data)
      }
    } catch (err) {
      console.error('Error generating public link:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleCopyLink() {
    if (!publicLink) return
    navigator.clipboard.writeText(publicLink.public_link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleShareWhatsApp() {
    if (!publicLink) return
    window.open(publicLink.whatsapp_link, '_blank')
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <Loader2 className="w-6 h-6 mx-auto animate-spin text-blue-600 mb-2" />
          <p className="text-sm text-gray-600">Generating link...</p>
        </CardContent>
      </Card>
    )
  }

  if (!publicLink) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-sm text-gray-600">Failed to generate link</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isPremium ? (
            <>
              <Crown className="w-5 h-5 text-amber-500" />
              Premium Member
            </>
          ) : (
            <>
              <LinkIcon className="w-5 h-5" />
              Client Public Link
            </>
          )}
        </CardTitle>
        <CardDescription>
          {isPremium 
            ? 'Premium member with full portal access'
            : 'Share this link to let client view their data (no login required)'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Premium Status */}
        {isPremium ? (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-semibold text-gray-900">Portal Activated</p>
                <p className="text-sm text-gray-600">
                  Member since {new Date(client.portal_activated_at!).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900 font-medium mb-1">
              💡 Free Tier Member
            </p>
            <p className="text-xs text-blue-700">
              Client can view data via public link. Upgrade to premium for full access.
            </p>
          </div>
        )}

        {/* QR Code */}
        <div className="text-center">
          <div className="inline-block p-4 bg-white rounded-lg shadow-sm border">
            <QRCodeSVG 
              value={publicLink.public_link}
              size={180}
              level="H"
              includeMargin
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Scan to view client data
          </p>
        </div>

        {/* Link Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Public Link
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={publicLink.public_link}
              readOnly
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
            />
            <Button
              size="icon"
              variant="outline"
              onClick={handleCopyLink}
            >
              {copied ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            🔒 Permanent link - never expires
          </p>
        </div>

        {/* Share Actions */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700 mb-2">Share via:</p>
          
          <Button 
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            onClick={handleShareWhatsApp}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Share via WhatsApp
          </Button>

          <Button 
            variant="outline"
            className="w-full"
            onClick={() => window.open(publicLink.public_link, '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Preview Link
          </Button>
        </div>

        {/* Next Steps */}
        {!isPremium && (
          <div className="border-t pt-4">
            <p className="text-sm font-medium text-gray-900 mb-2">
              📱 Upgrade Client to Premium:
            </p>
            <ol className="text-xs text-gray-600 space-y-1">
              <li>1. Share public link to client</li>
              <li>2. Client views their data (no login)</li>
              <li>3. Client clicks "Activate Premium"</li>
              <li>4. Client sets password → Premium activated!</li>
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
