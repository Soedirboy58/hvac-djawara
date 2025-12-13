// ============================================
// Authentication Service
// Server-side auth operations
// ============================================

import { createClient } from '@/lib/supabase/server'

export class AuthService {
  static async signUp(email: string, password: string, fullName: string) {
    const supabase = await createClient()
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })

    if (error) throw error
    return data
  }

  static async signIn(email: string, password: string) {
    const supabase = await createClient()
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error
    return data
  }

  static async signOut() {
    const supabase = await createClient()
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  static async getCurrentUser() {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) throw error
    return user
  }

  static async resetPassword(email: string) {
    const supabase = await createClient()
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`,
    })

    if (error) throw error
  }

  static async updatePassword(newPassword: string) {
    const supabase = await createClient()
    
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) throw error
  }
}
