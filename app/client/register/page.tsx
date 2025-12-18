// ============================================
// Client Registration Page
// Premium upgrade: Register account with email verification
// ============================================

'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Crown, CheckCircle, Mail, Lock, User, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function ClientRegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [clientData, setClientData] = useState<any>(null)
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  })

  const supabase = createClient()

  useEffect(() => {
    if (token) {
      fetchClientData()
    } else {
      setLoading(false)
    }
  }, [token])

  async function fetchClientData() {
    try {
      const { data, error } = await supabase
        .rpc('get_client_by_public_token', { p_token: token })
        .single()

      if (error) throw error

      if (!data) {
        throw new Error('Invalid registration link')
      }

      // Check if already registered
      if (data.has_account) {
        toast.info('You already have an account. Please login.')
        router.push('/client/login')
        return
      }

      setClientData(data)
    } catch (err: any) {
      console.error('Error fetching client:', err)
      toast.error(err.message || 'Invalid registration link')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    try {
      setSubmitting(true)

      // Register with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: clientData.client_email,
        password: formData.password,
        options: {
          data: {
            full_name: clientData.client_name,
            user_type: 'client',
            client_id: clientData.client_id
          },
          emailRedirectTo: `${window.location.origin}/client/dashboard`
        }
      })

      if (authError) throw authError

      if (authData.user) {
        // Link user to client record
        const { error: updateError } = await supabase
          .from('clients')
          .update({
            user_id: authData.user.id,
            is_premium_member: true,
            portal_activated_at: new Date().toISOString()
          })
          .eq('id', clientData.client_id)

        if (updateError) {
          console.error('Error linking user to client:', updateError)
        }

        toast.success('Account created! Please check your email to verify.')
        
        // Redirect to check email page
        router.push('/client/verify-email')
      }

    } catch (err: any) {
      console.error('Registration error:', err)
      toast.error(err.message || 'Registration failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!token || !clientData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle>Invalid Link</CardTitle>
            <CardDescription>
              This registration link is invalid or has expired
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button className="w-full">Back to Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl">Upgrade to Premium</CardTitle>
          <CardDescription>
            Create your account to access exclusive features
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Benefits */}
          <Alert className="border-amber-200 bg-amber-50">
            <Crown className="w-4 h-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <p className="font-medium mb-2">Premium Benefits:</p>
              <ul className="text-sm space-y-1">
                <li>✓ Rate technician services</li>
                <li>✓ View detailed work reports</li>
                <li>✓ Loyalty points program</li>
                <li>✓ Priority support</li>
                <li>✓ Full service history</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Client Info */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-gray-500" />
              <span className="font-medium">{clientData.client_name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">{clientData.client_email}</span>
            </div>
          </div>

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Create Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Minimum 8 characters"
                  className="pl-10"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={8}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter password"
                  className="pl-10"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <Crown className="w-4 h-4 mr-2" />
                  Activate Premium Account
                </>
              )}
            </Button>
          </form>

          <p className="text-xs text-center text-gray-500">
            By creating an account, you agree to our Terms of Service and Privacy Policy
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
