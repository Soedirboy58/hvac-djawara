import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminDashboard from './admin-dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, ClipboardList, FileText, Calendar, DollarSign } from 'lucide-react'

export default async function DashboardHomePage({
  searchParams,
}: {
  searchParams?: { page?: string }
}) {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('active_tenant_id')
    .eq('id', user.id)
    .maybeSingle()

  const tenantId = profile?.active_tenant_id ?? null

  const { data: roleRow } = await supabase
    .from('user_tenant_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .maybeSingle()

  const role = (roleRow as any)?.role ?? null

  if (role === 'sales_partner') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Sales Partner</h1>
          <p className="text-gray-500 mt-1">
            Ringkasan KPI & aktivitas sales (placeholder)
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" /> Jumlah Pelanggan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground mt-1">Akan dihitung dari referral & client milik sales</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" /> Invoice Tertagih
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Rp 0</div>
              <p className="text-xs text-muted-foreground mt-1">Placeholder — akan terhubung ke finance sales</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ClipboardList className="h-4 w-4" /> Order Masuk
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground mt-1">Akan dihitung dari permintaan service sales</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Menu Utama</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Link href="/dashboard/clients"><Button variant="outline"><Users className="h-4 w-4 mr-2" />Clients</Button></Link>
            <Link href="/dashboard/orders"><Button variant="outline"><ClipboardList className="h-4 w-4 mr-2" />Service Orders</Button></Link>
            <Link href="/dashboard/contracts"><Button variant="outline"><FileText className="h-4 w-4 mr-2" />Contract Management</Button></Link>
            <Link href="/dashboard/schedule"><Button variant="outline"><Calendar className="h-4 w-4 mr-2" />Schedule</Button></Link>
            <Link href="/dashboard/finance"><Button variant="outline"><DollarSign className="h-4 w-4 mr-2" />Finance</Button></Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const page = Math.max(1, Number(searchParams?.page || '1') || 1)
  return <AdminDashboard page={page} />
}
