// ============================================
// Inventory Page
// Parts and equipment management
// ============================================

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, Search, Package } from 'lucide-react'
import Link from 'next/link'

export default async function InventoryPage() {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('active_tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.active_tenant_id) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            Please set up your tenant first from the dashboard.
          </p>
        </div>
      </div>
    )
  }

  // Mock inventory data
  const inventoryItems = [
    {
      id: '1',
      name: 'AC Filter HEPA',
      sku: 'FILT-001',
      category: 'Filters',
      stock: 25,
      unit: 'pcs',
      price: 150000,
      status: 'in_stock'
    },
    {
      id: '2',
      name: 'R-410A Refrigerant (5kg)',
      sku: 'REF-410',
      category: 'Refrigerants',
      stock: 8,
      unit: 'kg',
      price: 750000,
      status: 'low_stock'
    },
    {
      id: '3',
      name: 'Copper Pipe 1/4"',
      sku: 'PIPE-014',
      category: 'Pipes',
      stock: 0,
      unit: 'meter',
      price: 25000,
      status: 'out_of_stock'
    },
  ]

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-gray-500 mt-1">Manage parts and equipment stock</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search inventory by name or SKU..."
              className="pl-10"
            />
          </div>
        </div>
        <select className="h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="all">All Categories</option>
          <option value="filters">Filters</option>
          <option value="refrigerants">Refrigerants</option>
          <option value="pipes">Pipes</option>
        </select>
      </div>

      {/* Inventory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {inventoryItems.map((item) => (
          <Card key={item.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Package className="w-6 h-6 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{item.name}</h3>
                    <p className="text-xs text-gray-500">SKU: {item.sku}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Category:</span>
                  <Badge variant="secondary">{item.category}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Stock:</span>
                  <span className={`font-semibold ${
                    item.status === 'out_of_stock' ? 'text-red-600' :
                    item.status === 'low_stock' ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {item.stock} {item.unit}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Price:</span>
                  <span className="font-semibold">Rp {item.price.toLocaleString('id-ID')}</span>
                </div>
                <div className="pt-2">
                  <Badge variant={
                    item.status === 'in_stock' ? 'success' :
                    item.status === 'low_stock' ? 'warning' : 'error'
                  }>
                    {item.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
