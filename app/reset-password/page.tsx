'use client'

import { Suspense, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Lock, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

type AuthRole = 'user' | 'technician'

function getLoginPath(role: AuthRole) {
  return role === 'technician' ? '/technician/login' : '/login'
}

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  })

  const role: AuthRole = useMemo(() => {
    return searchParams.get('role') === 'technician' ? 'technician' : 'user'
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (formData.password !== formData.confirmPassword) {
      toast.error('Password dan konfirmasi password tidak sama')
      return
    }

    if (formData.password.length < 8) {
      toast.error('Password minimal 8 karakter')
      return
    }

    try {
      setLoading(true)

      const { error } = await supabase.auth.updateUser({
        password: formData.password
      })

      if (error) throw error

      toast.success('Password berhasil diperbarui')

      setTimeout(() => {
        router.push(getLoginPath(role))
      }, 1200)
    } catch (err: any) {
      console.error('Reset password error:', err)
      toast.error(err?.message || 'Gagal memperbarui password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Reset Password</CardTitle>
          <CardDescription>
            Masukkan password baru untuk akun Anda
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password Baru</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Minimal 8 karakter"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pl-10"
                  required
                  minLength={8}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Ulangi password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="pl-10"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Simpan Password Baru
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100" />}>
      <ResetPasswordContent />
    </Suspense>
  )
}
