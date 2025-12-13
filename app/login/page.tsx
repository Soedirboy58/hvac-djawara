import { Metadata } from 'next'
import Link from 'next/link'
import { LoginForm } from '@/app/auth/login-form'

export const metadata: Metadata = {
  title: 'Login - Djawara HVAC',
  description: 'Login to your account',
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Djawara HVAC</h1>
          <p className="text-gray-600 mt-2">Service Management Platform</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold mb-6">Login</h2>
          
          <LoginForm />

          <div className="mt-6 text-center text-sm">
            <span className="text-gray-600">Belum punya akun? </span>
            <Link href="/register" className="text-blue-600 hover:underline font-medium">
              Daftar di sini
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-gray-500 mt-8">
          &copy; 2025 Djawara HVAC. All rights reserved.
        </p>
      </div>
    </div>
  )
}
