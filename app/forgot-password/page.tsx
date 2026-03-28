'use client'

import { Suspense, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

type AuthRole = 'user' | 'technician'

function getLoginPath(role: AuthRole) {
  return role === 'technician' ? '/technician/login' : '/login'
}

function ForgotPasswordContent() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const supabase = createClient()

  const role: AuthRole = useMemo(() => {
    return searchParams.get('role') === 'technician' ? 'technician' : 'user'
  }, [searchParams])

  const loginPath = getLoginPath(role)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    try {
      setLoading(true)

      const redirectTo = `${window.location.origin}/reset-password?role=${role}`
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })

      if (error) throw error

      setEmailSent(true)
      toast.success('Link reset password berhasil dikirim')
    } catch (err: any) {
      console.error('Forgot password error:', err)
      toast.error(err?.message || 'Gagal mengirim email reset password')
    } finally {
      setLoading(false)
    }
  }

  if (emailSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Cek Email Anda</CardTitle>
            <CardDescription>
              Kami sudah mengirim link reset password
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-blue-200 bg-blue-50">
              <Mail className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-blue-800 text-sm">
                <p className="font-medium mb-1">Langkah berikutnya:</p>
                <ol className="space-y-1 list-decimal list-inside text-xs">
                  <li>Buka inbox email ({email})</li>
                  <li>Klik link reset password</li>
                  <li>Masukkan password baru</li>
                  <li>Login ulang dengan password baru</li>
                </ol>
              </AlertDescription>
            </Alert>

            <p className="text-xs text-center text-gray-600">
              Jika belum menerima email, cek folder spam dan coba lagi beberapa menit berikutnya
            </p>

            <Link href={loginPath}>
              <Button variant="outline" className="w-full">
                Kembali ke Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link
          href={loginPath}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Kembali ke Login
        </Link>

        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">Lupa Password</CardTitle>
            <CardDescription>
              Masukkan email akun untuk menerima link reset password
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="nama@perusahaan.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                    Mengirim...
                  </>
                ) : (
                  'Kirim Link Reset Password'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100" />}>
      <ForgotPasswordContent />
    </Suspense>
  )
}
