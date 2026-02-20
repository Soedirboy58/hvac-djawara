// ============================================
// Sidebar Component
// Main navigation
// ============================================

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Users, 
  ClipboardList,
  Calendar,
  Clock,
  Package, 
  DollarSign,
  Settings,
  BarChart3,
  FileText,
  FileCheck,
  UserCog
} from 'lucide-react'
import { cn } from '@/lib/utils'

type SidebarProps = {
  role?: string | null
}

const adminNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Clients', href: '/dashboard/clients', icon: Users },
  { name: 'Service Orders', href: '/dashboard/orders', icon: ClipboardList },
  { name: 'Contract Management', href: '/dashboard/contracts', icon: FileText },
  { name: 'Schedule', href: '/dashboard/schedule', icon: Calendar },
  { name: 'Absensi', href: '/dashboard/attendance', icon: Clock },
  { name: 'People Management', href: '/dashboard/people', icon: UserCog },
  { name: 'Inventory', href: '/dashboard/inventory', icon: Package },
  { name: 'Finance', href: '/dashboard/finance', icon: DollarSign },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

const salesPartnerNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Clients', href: '/dashboard/clients', icon: Users },
  { name: 'Service Orders', href: '/dashboard/orders', icon: ClipboardList },
  { name: 'Contract Management', href: '/dashboard/contracts', icon: FileText },
  { name: 'Schedule', href: '/dashboard/schedule', icon: Calendar },
  { name: 'Finance', href: '/dashboard/finance', icon: DollarSign },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname()
  const navigation = role === 'sales_partner' ? salesPartnerNavigation : adminNavigation

  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col">
      <div className="p-6">
        <h1 className="text-2xl font-bold">Djawara HVAC</h1>
        <p className="text-xs text-gray-400 mt-1">Service Platform</p>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {navigation.map((item) => {
          const isDashboard = item.href === '/dashboard'
          const isActive = isDashboard
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + '/')
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center px-4 py-3 rounded-lg transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )}
            >
              <item.icon className="w-5 h-5 mr-3" />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <p className="text-xs text-gray-400 text-center">
          &copy; 2025 Djawara HVAC
        </p>
      </div>
    </div>
  )
}
