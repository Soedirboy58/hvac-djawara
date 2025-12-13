'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Home, 
  Users, 
  ClipboardList, 
  Calendar,
  KanbanSquare,
  UserCog,
  Clock,
  TrendingUp,
  GraduationCap,
  Megaphone,
  Settings
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

// Owner/Admin Navigation
const ownerNavigation = [
  { name: 'Beranda', href: '/owner', icon: Home },
  { name: 'Clients', href: '/owner/clients', icon: Users },
  { name: 'Orders', href: '/owner/orders', icon: ClipboardList },
  { name: 'Schedule', href: '/owner/schedule', icon: Calendar },
  { name: 'Kanban', href: '/owner/kanban', icon: KanbanSquare },
  { name: 'Team', href: '/owner/team', icon: UserCog },
  { name: 'Timecard', href: '/owner/timecard', icon: Clock },
  { name: 'Performance', href: '/owner/performance', icon: TrendingUp },
  { name: 'Upskill', href: '/owner/upskill', icon: GraduationCap },
  { name: 'Announcements', href: '/owner/announcements', icon: Megaphone },
  { name: 'Settings', href: '/owner/settings', icon: Settings },
]

// Teknisi/Helper Navigation
const technicianNavigation = [
  { name: 'Beranda', href: '/technician', icon: Home },
  { name: 'My Jobs', href: '/technician/jobs', icon: ClipboardList },
  { name: 'Timecard', href: '/technician/timecard', icon: Clock },
  { name: 'Performance', href: '/technician/performance', icon: TrendingUp },
  { name: 'Upskill', href: '/technician/upskill', icon: GraduationCap },
  { name: 'Announcements', href: '/technician/announcements', icon: Megaphone },
]

// Client/Sales Navigation  
const salesNavigation = [
  { name: 'Beranda', href: '/sales', icon: Home },
  { name: 'My Clients', href: '/sales/clients', icon: Users },
  { name: 'Orders', href: '/sales/orders', icon: ClipboardList },
]

const navigation = ownerNavigation // Default to owner for now

export default function Sidebar({ isOpen }: { isOpen: boolean }) {
  const pathname = usePathname()

  if (!isOpen) return null

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-gray-900 text-white">
      <div className="p-6">
        <h1 className="text-2xl font-bold">Djawara HVAC</h1>
      </div>
      <nav className="space-y-1 px-3">
        {navigation.map((item) => {
          const Icon = item.icon
          const isActive = pathname.startsWith(item.href)
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                isActive ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
