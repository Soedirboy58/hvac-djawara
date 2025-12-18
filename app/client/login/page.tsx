// ============================================
// Client Login Page
// For premium authenticated clients
// ============================================

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Mail, Lock, Crown, Link as LinkIcon, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function ClientLoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    try {
      setLoading(true)

      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      })

      if (error) throw error

      if (data.user) {
        // Verify user is a client
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('id, is_premium_member')
          .eq('user_id', data.user.id)
          .single()

        if (clientError || !clientData) {
          await supabase.auth.signOut()
          throw new Error('This account is not registered as a client')
        }

        if (!clientData.is_premium_member) {
          toast.info('Please upgrade to premium to access full features')
        }

        toast.success('Login successful!')
        router.push('/client/dashboard')
      }
    } catch (err: any) {
      console.error('Login error:', err)
      
      if (err.message.includes('Invalid login credentials')) {
        toast.error('Invalid email or password')
      } else if (err.message.includes('Email not confirmed')) {
        toast.error('Please verify your email first')
      } else {
        toast.error(err.message || 'Login failed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to home */}
        <Link 
          href="/"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>

        <Card>
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                <Crown className="w-8 h-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Client Login</CardTitle>
            <CardDescription>
              Access your premium account
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Info Alert */}
            <Alert className="border-blue-200 bg-blue-50">
              <LinkIcon className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-blue-800 text-sm">
                <p className="font-medium mb-1">Have a tracking link?</p>
                <p className="text-xs">
                  Use your public link for basic tracking. Login is for premium features only.
                </p>
              </AlertDescription>
            </Alert>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="pl-10"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="pl-10"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">
                  New here?
                </span>
              </div>
            </div>

            {/* Upgrade CTA */}
            <div className="text-center space-y-3">
              <p className="text-sm text-gray-600">
                Don't have a premium account yet?
              </p>
              <Button
                variant="outline"
                className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
                asChild
              >
                <Link href="/">
                  <Crown className="w-4 h-4 mr-2" />
                  Contact us to upgrade
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
