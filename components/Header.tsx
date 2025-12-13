'use client'

import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/domain/core/auth/hooks/useAuth'

export default function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, signOut } = useAuth()

  return (
    <header className="bg-white border-b h-16 flex items-center justify-between px-6">
      <Button variant="ghost" size="icon" onClick={onMenuClick}>
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex items-center gap-4">
        <span className="text-sm">{user?.email}</span>
        <Button variant="ghost" size="sm" onClick={() => signOut()}>
          Logout
        </Button>
      </div>
    </header>
  )
}
