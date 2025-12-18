// ============================================
// Email Verification Page
// Shows after client registration
// ============================================

'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Mail, CheckCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Check Your Email</CardTitle>
          <CardDescription>
            We've sent a verification link to your email address
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">Next Steps:</p>
                <ol className="space-y-1 list-decimal list-inside">
                  <li>Open your email inbox</li>
                  <li>Click the verification link</li>
                  <li>Login to your premium account</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="text-sm text-center text-gray-600 space-y-2">
            <p>Didn't receive the email?</p>
            <p className="text-xs">
              Check your spam folder or wait a few minutes
            </p>
          </div>

          <Link href="/client/login">
            <Button className="w-full" variant="outline">
              Go to Login
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
