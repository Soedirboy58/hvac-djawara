// ============================================
// Login Form Component
// ============================================

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'

const loginSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      // Debug: Check if env vars are available
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.error('Missing Supabase environment variables')
        setError('Konfigurasi Supabase tidak lengkap. Hubungi admin.')
        setIsLoading(false)
        return
      }

      const supabase = createClient()
      
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (signInError) {
        console.error('Auth error:', signInError.message)
        setError(signInError.message)
        return
      }

      if (authData?.user) {
        console.log('✓ Login successful for user:', authData.user.email)
        
        // Check user role to redirect appropriately
        const { data: userRoles } = await supabase
          .from('user_tenant_roles')
          .select('role')
          .eq('user_id', authData.user.id)
          .eq('is_active', true)
          .single()

        // Check if user is in technicians table
        const { data: techData } = await supabase
          .from('technicians')
          .select('id')
          .eq('user_id', authData.user.id)
          .single()

        // Redirect based on role/type
        if (techData || userRoles?.role === 'technician' || userRoles?.role === 'helper') {
          console.log('✓ Technician login - redirecting to /technician/dashboard')
          router.push('/technician/dashboard')
        } else {
          console.log('✓ Staff login - redirecting to /dashboard')
          router.push('/dashboard')
        }
        
        router.refresh()
      } else {
        console.warn('Login succeeded but no user returned:', authData)
        setError('Login berhasil tapi data user tidak ditemukan')
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      console.error('Login error:', errorMsg, err)
      setError(`Terjadi kesalahan: ${errorMsg}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input
          {...register('email')}
          type="email"
          id="email"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="nama@perusahaan.com"
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
          Password
        </label>
        <div className="relative">
          <input
            {...register('password')}
            type={showPassword ? 'text' : 'password'}
            id="password"
            className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && (
          <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
        )}
        <div className="mt-2 text-right">
          <Link href="/forgot-password?role=user" className="text-sm text-blue-600 hover:text-blue-700">
            Lupa password?
          </Link>
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? 'Memproses...' : 'Login'}
      </button>
    </form>
  )
}
