'use client'

import { Plus } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { OrdersList } from '@/components/orders-list'
import { useState } from 'react'

export default function OrdersPage() {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Orders</h1>
          <p className="text-gray-500 mt-1">Manage customer service requests</p>
        </div>
        <Link href="/dashboard/orders/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Order
          </Button>
        </Link>
      </div>

      <OrdersList onSelectOrder={(orderId) => setSelectedOrderId(orderId)} />
    </div>
  )
}
