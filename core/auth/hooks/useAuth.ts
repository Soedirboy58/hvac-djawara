'use client'

import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import { authService } from '../services/authService'
import { createClient } from '@/lib/supabase/client'

export function useAuth() {
  const router = useRouter()
  const supabase = createClient()

  const { data: session, isLoading } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession()
      return data.session
    },
  })

  const signInMutation = useMutation({
    mutationFn: authService.signIn,
    onSuccess: () => {
      router.push('/owner')
      router.refresh()
    },
  })

  const signOutMutation = useMutation({
    mutationFn: authService.signOut,
    onSuccess: () => {
      router.push('/login')
      router.refresh()
    },
  })

  return {
    session,
    isLoading,
    user: session?.user,
    signIn: signInMutation.mutate,
    signOut: signOutMutation.mutate,
    isSigningIn: signInMutation.isPending,
  }
}
