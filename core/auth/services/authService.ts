import { createClient } from '@/lib/supabase/client'
import type { AuthCredentials } from '../types/auth.types'

export const authService = {
  async signIn(credentials: AuthCredentials) {
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    })
    if (error) throw error
    return { user: data.user, session: data.session }
  },

  async signUp(credentials: AuthCredentials & { fullName: string }) {
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: {
        data: { full_name: credentials.fullName },
      },
    })
    if (error) throw error
    return data
  },

  async signOut() {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },
}
