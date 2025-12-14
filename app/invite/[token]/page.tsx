// ============================================
// Client Portal Invitation Page (PUBLIC)
// Client clicks link → Set password → Activated
// NO AUTH REQUIRED - Public route
// ============================================

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Building2, Lock, CheckCircle, XCircle, Loader2, Eye, EyeOff } from 'lucide-react'

interface InvitationData {
  is_valid: boolean
  client_id: string
  client_name: string
  client_email: string
  expires_at: string
  error_message: string | null
}

export default function ClientInvitePage({ params }: { params: { token: string } }) {
  const router = useRouter()
  const supabase = createClient()
  
  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [email, setEmail] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [activating, setActivating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Validate token on mount
  useEffect(() => {
    validateToken()
  }, [params.token])

  async function validateToken() {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .rpc('validate_invitation_token', { p_token: params.token })
        .single()

      if (error) throw error

      setInvitation(data)
      if (data.is_valid && data.client_email) {
        setEmail(data.client_email)
      }
    } catch (err) {
      console.error('Error validating token:', err)
      setError('Failed to validate invitation')
    } finally {
      setLoading(false)
    }
  }

  async function handleActivate(e: React.FormEvent) {
    e.preventDefault()
    
    if (!invitation?.is_valid) return
    
    // Validate password
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    try {
      setActivating(true)
      setError(null)

      // Call API to activate portal
      const response = await fetch('/api/client/activate-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: params.token,
          email: email,
          password: password,
          client_id: invitation.client_id,
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Activation failed')
      }

      setSuccess(true)
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/client/login')
      }, 2000)
    } catch (err) {
      console.error('Error activating portal:', err)
      setError(err instanceof Error ? err.message : 'Failed to activate portal')
    } finally {
      setActivating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-blue-600" />
            <p className="text-gray-600">Validating invitation...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Invalid token
  if (!invitation?.is_valid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Invalid Invitation
            </CardTitle>
            <CardDescription>
              {invitation?.error_message || 'This invitation link is not valid'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 text-center mb-4">
              Possible reasons:
            </p>
            <ul className="text-sm text-gray-600 space-y-1 mb-6">
              <li>• Link has expired (7 days validity)</li>
              <li>• Link has already been used</li>
              <li>• Invalid or corrupted link</li>
            </ul>
            <div className="space-y-2">
              <Button 
                className="w-full" 
                onClick={() => router.push('/')}
              >
                Back to Home
              </Button>
              <p className="text-xs text-center text-gray-500">
                Trying to view your data? Use the public link sent to you.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Portal Activated! 🎉
            </CardTitle>
            <CardDescription>
              Your client portal access has been successfully activated
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-gray-600 mb-4">
              Redirecting to login page...
            </p>
            <Loader2 className="w-6 h-6 mx-auto animate-spin text-blue-600" />
          </CardContent>
        </Card>
      </div>
    )
  }

  // Set password form
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <Building2 className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Welcome to HVAC Portal
          </CardTitle>
          <CardDescription>
            Set your password to activate your portal access
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Client Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 mb-1">Account for:</p>
            <p className="font-semibold text-gray-900">{invitation.client_name}</p>
            <p className="text-sm text-gray-600 mt-1">{invitation.client_email}</p>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert className="mb-4 border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Activation Form */}
          <form onSubmit={handleActivate} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                required
                disabled={!!invitation.client_email}
              />
              <p className="text-xs text-gray-500 mt-1">
                {invitation.client_email ? 'Email pre-filled from your account' : 'Enter your email for login'}
              </p>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <Input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                required
              />
            </div>

            {/* Password Requirements */}
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs font-medium text-blue-900 mb-2">Password requirements:</p>
              <ul className="text-xs text-blue-700 space-y-1">
                <li className={password.length >= 8 ? 'text-green-600' : ''}>
                  • At least 8 characters
                </li>
                <li className={password === confirmPassword && password.length > 0 ? 'text-green-600' : ''}>
                  • Passwords match
                </li>
              </ul>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={activating}
            >
              {activating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Activating Portal...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Activate Portal Access
                </>
              )}
            </Button>
          </form>

          {/* Expiry Notice */}
          <p className="text-xs text-center text-gray-500 mt-4">
            This invitation expires on{' '}
            {new Date(invitation.expires_at).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
