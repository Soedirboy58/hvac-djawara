'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle, Loader2, ShieldCheck, AlertCircle } from 'lucide-react'

export default function TechnicianInvitePage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [loadingSession, setLoadingSession] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [email, setEmail] = useState<string>('')

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  })

  const authCode = useMemo(() => searchParams.get('code') || '', [searchParams])

  const tokenHash = useMemo(() => searchParams.get('token_hash') || '', [searchParams])
  const tokenType = useMemo(() => searchParams.get('type') || '', [searchParams])

  const queryAccessToken = useMemo(() => searchParams.get('access_token') || '', [searchParams])
  const queryRefreshToken = useMemo(() => searchParams.get('refresh_token') || '', [searchParams])

  function getHashTokens() {
    if (typeof window === 'undefined') return null
    if (!window.location.hash) return null

    const hash = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash
    const hashParams = new URLSearchParams(hash)
    const accessToken = hashParams.get('access_token') || ''
    const refreshToken = hashParams.get('refresh_token') || ''
    const type = hashParams.get('type') || ''
    return { accessToken, refreshToken, type }
  }

  function getHashError() {
    if (typeof window === 'undefined') return null
    if (!window.location.hash) return null

    const hash = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash
    const hashParams = new URLSearchParams(hash)
    const errorCode = hashParams.get('error_code') || ''
    const errorDescription = hashParams.get('error_description') || ''
    const error = hashParams.get('error') || ''
    if (!error && !errorCode && !errorDescription) return null
    return { error, errorCode, errorDescription }
  }

  useEffect(() => {
    let isMounted = true

    async function init() {
      try {
        setLoadingSession(true)
        setErrorMessage(null)

        const supabase = createClient()

        // If someone is already logged in (e.g. admin testing in the same browser),
        // signing out first avoids binding/changing the wrong account.
        const hasIncomingAuthParams =
          Boolean(authCode) ||
          Boolean(tokenHash && tokenType) ||
          Boolean(queryAccessToken && queryRefreshToken) ||
          (typeof window !== 'undefined' && Boolean(window.location.hash))

        if (hasIncomingAuthParams) {
          try {
            const { data } = await supabase.auth.getUser()
            if (data?.user) {
              await supabase.auth.signOut()
            }
          } catch {
            // ignore
          }
        }

        // If Supabase redirected here with an error (e.g. otp_expired), show a helpful message.
        const hashError = getHashError()
        if (hashError?.errorCode) {
          const code = hashError.errorCode.toLowerCase()
          if (code === 'otp_expired') {
            setErrorMessage(
              'Link undangan sudah expired atau sudah pernah dipakai. Silakan minta admin kirim ulang undangan (lebih aman pakai link manual dari dashboard / salin-tempel ke browser).'
            )
          } else {
            setErrorMessage(
              decodeURIComponent(hashError.errorDescription || '') ||
                'Link undangan tidak valid atau sudah expired. Silakan minta admin kirim ulang undangan.'
            )
          }

          // Clear hash so refresh doesn't keep the same error state
          router.replace('/technician/invite')
          return
        }

        // 1) Hash tokens (implicit) OR query tokens (some clients drop the hash)
        const hashTokens = getHashTokens()
        const accessToken = (hashTokens?.accessToken || queryAccessToken || '').trim()
        const refreshToken = (hashTokens?.refreshToken || queryRefreshToken || '').trim()
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (error) throw error
          router.replace('/technician/invite')
        }

        // 2) PKCE code (newer Supabase behavior)
        if (authCode) {
          const { error } = await supabase.auth.exchangeCodeForSession(authCode)
          if (error) throw error
          router.replace('/technician/invite')
        }

        // 3) token_hash verification (if the app is hit directly with token_hash/type)
        if (!authCode && tokenHash && tokenType) {
          const { error } = await supabase.auth.verifyOtp({
            type: tokenType as any,
            token_hash: tokenHash,
          })
          if (error) throw error
          router.replace('/technician/invite')
        }

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError) {
          const msg = String((userError as any)?.message || '')
          // Treat "Auth session missing!" as a normal invalid/expired invite case.
          if (msg.toLowerCase().includes('auth session missing')) {
            setErrorMessage('Link undangan tidak valid atau sudah expired. Silakan minta admin kirim ulang undangan.')
            return
          }
          throw userError
        }
        if (!user) {
          setErrorMessage('Link undangan tidak valid atau sudah expired. Silakan minta admin kirim ulang undangan.')
          return
        }

        setEmail(String(user.email || ''))
      } catch (err: any) {
        console.error('Invite init error:', err)
        setErrorMessage(err?.message || 'Gagal memproses undangan')
      } finally {
        if (isMounted) setLoadingSession(false)
      }
    }

    init()

    return () => {
      isMounted = false
    }
  }, [authCode, queryAccessToken, queryRefreshToken, router, tokenHash, tokenType])

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.password !== formData.confirmPassword) {
      toast.error('Password tidak cocok')
      return
    }

    if (formData.password.length < 6) {
      toast.error('Password minimal 6 karakter')
      return
    }

    setSubmitting(true)

    try {
      const supabase = createClient()

      const res = await fetch('/api/technician/complete-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: formData.password }),
      })

      const result = await res.json()
      if (!res.ok) {
        if (res.status === 409) {
          toast.info(result.error || 'Akun sudah terhubung')
          router.push('/technician/login')
          return
        }
        throw new Error(result.error || 'Gagal menyelesaikan aktivasi')
      }

      // Safety: make sure the new password actually works.
      // If activation succeeded but password didn't persist, user gets "Invalid login credentials" later.
      const activationEmail = String(email || '').trim()
      if (!activationEmail) {
        toast.success('Akun berhasil diaktifkan. Selamat bekerja!')
        router.push('/technician/dashboard')
        return
      }

      await supabase.auth.signOut()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: activationEmail,
        password: formData.password,
      })

      if (signInError) {
        console.error('Post-activation sign-in failed:', signInError)
        toast.error(
          `Aktivasi selesai, tapi login gagal. Pastikan email benar (${activationEmail}) atau minta admin kirim ulang link aktivasi.`
        )
        const qs = new URLSearchParams()
        qs.set('email', activationEmail)
        router.push(`/technician/login?${qs.toString()}`)
        return
      }

      toast.success('Akun berhasil diaktifkan. Selamat bekerja!')
      router.push('/technician/dashboard')
    } catch (err: any) {
      console.error('Set password error:', err)
      toast.error(err?.message || 'Gagal set password')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <ShieldCheck className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">Memproses Undangan</CardTitle>
            <CardDescription>Mohon tunggu sebentar...</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (errorMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-yellow-600" />
            </div>
            <CardTitle className="text-2xl">Undangan Bermasalah</CardTitle>
            <CardDescription>{errorMessage}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/technician/login" className="block">
              <Button className="w-full" size="lg">Login</Button>
            </Link>
            <div className="text-center text-sm text-muted-foreground">
              <p>Jika belum pernah aktivasi, minta admin kirim ulang undangan.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Aktivasi Akun Teknisi</CardTitle>
          <CardDescription>
            Buat password untuk akun <strong>{email || 'teknisi'}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSetPassword} className="space-y-4">
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Minimal 6 karakter"
                value={formData.password}
                onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                required
                disabled={submitting}
                minLength={6}
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Ketik ulang password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData((p) => ({ ...p, confirmPassword: e.target.value }))}
                required
                disabled={submitting}
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                'Simpan Password & Masuk'
              )}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              <p>Sudah punya akun?</p>
              <Link href="/technician/login" className="text-blue-600 hover:underline">
                Login di sini
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
