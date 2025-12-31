import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AttendanceTabsClient } from './attendance-tabs-client'

export default async function AttendancePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('active_tenant_id')
    .eq('id', user.id)
    .maybeSingle()

  const tenantId = profile?.active_tenant_id ?? null
  if (!tenantId) {
    redirect('/dashboard')
  }

  const { data: roleRow } = await supabase
    .from('user_tenant_roles')
    .select('role')
    .eq('tenant_id', tenantId)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  const role = (roleRow as any)?.role ?? null
  if (!role || !['owner', 'admin_finance', 'admin_logistic', 'tech_head'].includes(role)) {
    redirect('/dashboard')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Absensi</h1>
        <p className="text-gray-500 mt-1">Konfigurasi kontrol kehadiran teknisi & helper</p>
      </div>

      <AttendanceTabsClient />
    </div>
  );
}
