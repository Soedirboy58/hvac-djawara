// ============================================
// Universal Login Page
// One login for all roles: Admin, Owner, Technician, Client
// Auto-detect role and redirect to appropriate dashboard
// ============================================

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Mail, Lock, Shield } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function UniversalLoginPage() {
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

      // Authenticate user
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      })

      if (authError) throw authError

      if (!authData.user) {
        throw new Error('Login failed')
      }

      // Detect user role and redirect
      const userType = authData.user.user_metadata?.user_type
      
      // Check if user is client
      const { data: clientData } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', authData.user.id)
        .single()

      if (clientData) {
        toast.success('Welcome back!')
        router.push('/client/dashboard')
        return
      }

      // Check if user is staff (admin/owner/technician)
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', authData.user.id)
        .single()

      if (userData) {
        toast.success('Welcome back!')
        
        // Redirect based on role
        switch (userData.role) {
          case 'admin':
          case 'owner':
            router.push('/dashboard')
            break
          case 'technician':
            router.push('/technician')
            break
          default:
            router.push('/dashboard')
        }
        return
      }

      // If no role found, default to dashboard
      toast.success('Welcome!')
      router.push('/dashboard')

    } catch (err: any) {
      console.error('Login error:', err)
      
      if (err.message.includes('Invalid login credentials')) {
        toast.error('Email or password incorrect')
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
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl">HVAC Djawara</CardTitle>
          <CardDescription>
            Sign in to your account
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
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
              <Label htmlFor="password">Password</Label>
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

            <div className="flex items-center justify-end">
              <Link 
                href="/forgot-password"
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Forgot password?
              </Link>
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

          <p className="text-xs text-center text-gray-500">
            Access for Admin, Staff, Technicians, and Premium Clients
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
