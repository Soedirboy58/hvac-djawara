import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getActiveTenantId } from '@/lib/supabase/active-tenant'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency, formatDate } from '@/lib/utils/formatters'
import { Calendar, ClipboardList, DollarSign, MapPin, Users, Wallet } from 'lucide-react'

const JAKARTA_TZ = 'Asia/Jakarta'

function getJakartaWeekday(date: Date): number {
  // 0=Sunday ... 6=Saturday
  const wd = new Intl.DateTimeFormat('en-US', { timeZone: JAKARTA_TZ, weekday: 'short' }).format(date)
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return map[wd] ?? date.getDay()
}

function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function getJakartaParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: JAKARTA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, p) => {
      if (p.type !== 'literal') acc[p.type] = p.value
      return acc
    }, {})

  const yyyy = parts.year
  const mm = parts.month
  const dd = parts.day

  return { yyyy, mm, dd }
}

function addMonthsYYYYMM(yyyy: string, mm: string, deltaMonths: number) {
  const y = Number(yyyy)
  const m = Number(mm)
  const total = (y * 12 + (m - 1)) + deltaMonths
  const ny = Math.floor(total / 12)
  const nm = (total % 12) + 1
  return { yyyy: String(ny), mm: String(nm).padStart(2, '0') }
}

function safeNumber(value: any) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function daysElapsedInMonthJakarta(now: Date) {
  const { dd } = getJakartaParts(now)
  return Math.max(1, Number(dd) || 1)
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    pending: 'Pending',
    scheduled: 'Scheduled',
    in_progress: 'In Progress',
    completed: 'Completed',
    approved: 'Approved',
    complaint: 'Complaint',
    invoiced: 'Invoiced',
    paid: 'Paid',
    cancelled: 'Cancelled',
  }
  return map[status] || status
}

export default async function AdminDashboard({ page }: { page: number }) {
  const supabase = await createClient()

  const tenantId = await getActiveTenantId(supabase)
  if (!tenantId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No active tenant found.</p>
        </CardContent>
      </Card>
    )
  }

  const now = new Date()
  const { yyyy, mm } = getJakartaParts(now)
  const monthStart = `${yyyy}-${mm}-01`
  const nextMonth = addMonthsYYYYMM(yyyy, mm, 1)
  const monthEndExclusive = `${nextMonth.yyyy}-${nextMonth.mm}-01`

  const todayParts = getJakartaParts(now)
  const today = `${todayParts.yyyy}-${todayParts.mm}-${todayParts.dd}`

  const daysElapsed = daysElapsedInMonthJakarta(now)

  // Business-week anchor (Mon–Sat, Jakarta)
  // If today is Monday, default to showing the *previous* business-week
  // so the KPI doesn't reset to 0 at the start of the week.
  const weekdayJakarta = getJakartaWeekday(now)
  const anchorForWeek = weekdayJakarta === 1 ? addDays(now, -7) : now
  const deltaToMonday = (getJakartaWeekday(anchorForWeek) - 1 + 7) % 7
  const weekStartDate = addDays(anchorForWeek, -deltaToMonday)
  const saturdayDate = addDays(weekStartDate, 5)

  const weekStartParts = getJakartaParts(weekStartDate)
  const saturdayParts = getJakartaParts(saturdayDate)
  const weekStartYMD = `${weekStartParts.yyyy}-${weekStartParts.mm}-${weekStartParts.dd}`
  const saturdayYMD = `${saturdayParts.yyyy}-${saturdayParts.mm}-${saturdayParts.dd}`

  // KPI: customers
  const { count: customersCount } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('is_active', true)

  // KPI: average jobs/day (month-to-date, based on scheduled_date)
  const doneStatuses = ['completed', 'approved', 'invoiced', 'paid']
  const { count: jobsDoneMonth } = await supabase
    .from('service_orders')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .in('status', doneStatuses as any)
    .gte('scheduled_date', monthStart)
    .lt('scheduled_date', monthEndExclusive)

  const avgJobsPerDay = (jobsDoneMonth || 0) / daysElapsed

  // KPI: revenue avg/day (paid invoices month-to-date)
  let paidRevenueMonth = 0
  let avgRevenuePerDay = 0
  let receivableTotal = 0

  const invoiceProbe = await supabase.from('invoices').select('id').limit(1)
  if (!invoiceProbe.error) {
    const monthStartTs = `${monthStart}T00:00:00+07:00`
    const monthEndTs = `${monthEndExclusive}T00:00:00+07:00`

    const { data: paidInvoices } = await supabase
      .from('invoices')
      .select('amount_total, paid_at')
      .eq('tenant_id', tenantId)
      .eq('status', 'paid')
      .gte('paid_at', monthStartTs)
      .lt('paid_at', monthEndTs)

    paidRevenueMonth = (paidInvoices || []).reduce((acc, it: any) => acc + safeNumber(it.amount_total), 0)
    avgRevenuePerDay = paidRevenueMonth / daysElapsed

    const { data: unpaidInvoices } = await supabase
      .from('invoices')
      .select('amount_total')
      .eq('tenant_id', tenantId)
      .eq('status', 'unpaid')

    receivableTotal = (unpaidInvoices || []).reduce((acc, it: any) => acc + safeNumber(it.amount_total), 0)
  }

  // KPI: supplier debt (not implemented) → proxy: approved reimburse not yet paid
  let supplierDebt = 0
  const reimburseProbe = await supabase.from('reimburse_requests').select('id').limit(1)
  if (!reimburseProbe.error) {
    const { data: approvedReimburse } = await supabase
      .from('reimburse_requests')
      .select('amount')
      .eq('tenant_id', tenantId)
      .eq('status', 'approved')

    supplierDebt = (approvedReimburse || []).reduce((acc, it: any) => acc + safeNumber(it.amount), 0)
  }

  // KPI: weekly expenses (expense_transactions, Mon–Sat by occurred_date)
  let weeklyExpenses = 0
  const expenseProbe = await supabase.from('expense_transactions').select('id').limit(1)
  if (!expenseProbe.error) {
    const { data: expenseRows } = await supabase
      .from('expense_transactions')
      .select('amount, occurred_date')
      .eq('tenant_id', tenantId)
      .eq('activity', 'operational')
      .gte('occurred_date', weekStartYMD)
      .lte('occurred_date', saturdayYMD)

    weeklyExpenses = (expenseRows || []).reduce((acc, it: any) => acc + safeNumber(it.amount), 0)
  }

  // Ranking: unit_category (jenis AC) for this month (best-effort)
  let unitCategoryRanking: Array<{ label: string; count: number }> = []
  const unitCategoryProbe = await supabase.from('service_orders').select('id, unit_category').limit(1)
  if (!unitCategoryProbe.error) {
    const { data: ordersWithCategory } = await supabase
      .from('service_orders')
      .select('unit_category')
      .eq('tenant_id', tenantId)
      .gte('scheduled_date', monthStart)
      .lt('scheduled_date', monthEndExclusive)
      .limit(1000)

    const counts = new Map<string, number>()
    for (const row of ordersWithCategory || []) {
      const raw = String((row as any)?.unit_category || '').trim()
      if (!raw) continue
      counts.set(raw, (counts.get(raw) || 0) + 1)
    }
    unitCategoryRanking = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([label, count]) => ({ label, count }))
  }

  // Ranking: areas by client city (month)
  const { data: orderCities } = await supabase
    .from('service_orders')
    .select('client:clients(city)')
    .eq('tenant_id', tenantId)
    .gte('scheduled_date', monthStart)
    .lt('scheduled_date', monthEndExclusive)
    .limit(2000)

  const cityCounts = new Map<string, number>()
  for (const row of orderCities || []) {
    const city = String((row as any)?.client?.city || '').trim()
    if (!city) continue
    cityCounts.set(city, (cityCounts.get(city) || 0) + 1)
  }
  const areaRanking = Array.from(cityCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([label, count]) => ({ label, count }))

  // Notifications: reimburse inbox
  let reimburseInbox: any[] = []
  if (!reimburseProbe.error) {
    const { data } = await supabase
      .from('reimburse_requests')
      .select(
        `id, amount, description, status, submitted_at,
         category:reimburse_categories(name),
         submitter:profiles(full_name)`
      )
      .eq('tenant_id', tenantId)
      .eq('status', 'submitted')
      .order('submitted_at', { ascending: false })
      .limit(10)

    reimburseInbox = data || []
  }

  // Notifications: maintenance needs action (overdue + next 7 days) with no generated order
  const maintenanceProbe = await supabase.from('v_upcoming_maintenance').select('schedule_id').limit(1)
  const { data: maintenanceDue } = !maintenanceProbe.error
    ? await supabase
        .from('v_upcoming_maintenance')
        .select('schedule_id, client_name, property_name, next_scheduled_date, unit_count, days_until, order_exists')
        .eq('tenant_id', tenantId)
        .eq('order_exists', false)
        .lte('days_until', 7)
        .order('days_until', { ascending: true })
        .limit(10)
    : ({ data: [] } as any)

  // Today routes table (paginated)
  const pageSize = 10
  const safePage = Number.isFinite(page) && page > 0 ? page : 1
  const from = (safePage - 1) * pageSize
  const to = from + pageSize - 1

  const activeTodayStatuses = ['pending', 'scheduled', 'in_progress', 'complaint']

  // Option B: show orders that overlap "today".
  // - scheduled_date = today (normal)
  // - OR scheduled earlier but estimated_end_date >= today
  // - OR in_progress scheduled earlier with no estimated_end_date (ongoing)
  const activeStatusesList = activeTodayStatuses.join(',')
  const todayOverlapFilter = [
    `and(scheduled_date.eq.${today},status.in.(${activeStatusesList}))`,
    `and(scheduled_date.lt.${today},estimated_end_date.gte.${today},status.in.(${activeStatusesList}))`,
    `and(status.eq.in_progress,scheduled_date.lt.${today},estimated_end_date.is.null)`,
  ].join(',')

  const { count: todayCount } = await supabase
    .from('service_orders')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .or(todayOverlapFilter)

  // Try include unit fields; if schema doesn't have them, retry without.
  let todayOrders: any[] = []
  const todayQueryWithUnits = await supabase
    .from('service_orders')
    .select('id, order_number, service_title, scheduled_time, status, unit_count, unit_category, client:clients(name)')
    .eq('tenant_id', tenantId)
    .or(todayOverlapFilter)
    .order('scheduled_date', { ascending: true })
    .order('scheduled_time', { ascending: true })
    .range(from, to)

  if (!todayQueryWithUnits.error) {
    todayOrders = todayQueryWithUnits.data || []
  } else {
    const fallback = await supabase
      .from('service_orders')
      .select('id, order_number, service_title, scheduled_time, status, client:clients(name)')
      .eq('tenant_id', tenantId)
      .or(todayOverlapFilter)
      .order('scheduled_date', { ascending: true })
      .order('scheduled_time', { ascending: true })
      .range(from, to)
    todayOrders = fallback.data || []
  }

  const orderIds = todayOrders.map((o) => o.id).filter(Boolean)
  const assignmentsByOrder = new Map<string, Array<{ name: string; role: string }>>()

  if (orderIds.length > 0) {
    const { data: assignments } = await supabase
      .from('work_order_assignments')
      .select('service_order_id, role_in_order, technician:technicians(full_name)')
      .in('service_order_id', orderIds)

    for (const row of assignments || []) {
      const orderId = String((row as any)?.service_order_id || '')
      if (!orderId) continue
      const name = String((row as any)?.technician?.full_name || '').trim()
      if (!name) continue
      const role = String((row as any)?.role_in_order || '').trim()
      const list = assignmentsByOrder.get(orderId) || []
      list.push({ name, role })
      assignmentsByOrder.set(orderId, list)
    }
  }

  const roleRank = (role: string) => {
    const r = role.toLowerCase()
    if (r === 'supervisor') return 0
    if (r === 'primary') return 1
    if (r === 'assistant') return 2
    return 3
  }

  const totalPages = Math.max(1, Math.ceil((todayCount || 0) / pageSize))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-600 mt-1">Ringkasan KPI & operasional (bulan berjalan)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ClipboardList className="h-4 w-4" /> Rata-rata Pekerjaan / Hari
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgJobsPerDay.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Berdasarkan order selesai (status final) di bulan ini</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" /> Jumlah Customer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customersCount || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Customer aktif di tenant ini</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Omset Rata-rata / Hari
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(Math.round(avgRevenuePerDay))}</div>
            <p className="text-xs text-muted-foreground mt-1">Invoice paid di bulan ini</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wallet className="h-4 w-4" /> Piutang
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(Math.round(receivableTotal))}</div>
            <p className="text-xs text-muted-foreground mt-1">Invoice status unpaid</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Utang Supplier
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(Math.round(supplierDebt))}</div>
            <p className="text-xs text-muted-foreground mt-1">Proxy: reimburse approved (belum dibayar)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Total Pengeluaran Mingguan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(Math.round(weeklyExpenses))}</div>
            <p className="text-xs text-muted-foreground mt-1">Expense operasional (Senin–Sabtu, minggu terakhir)</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Ranking Jenis AC (1 Bulan)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {unitCategoryRanking.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada data unit_category untuk diranking.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jenis</TableHead>
                    <TableHead className="w-[120px] text-right">Jumlah</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unitCategoryRanking.map((it) => (
                    <TableRow key={it.label}>
                      <TableCell>{it.label}</TableCell>
                      <TableCell className="text-right">{it.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Wilayah Terbanyak Order (1 Bulan)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {areaRanking.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada data kota pada customer/order.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Wilayah</TableHead>
                    <TableHead className="w-[120px] text-right">Order</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {areaRanking.map((it) => (
                    <TableRow key={it.label}>
                      <TableCell>{it.label}</TableCell>
                      <TableCell className="text-right">{it.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rute Kerja Hari Ini</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">Tanggal: {today}</p>
            <div className="flex items-center gap-2">
              <Link href="/dashboard/schedule">
                <Button variant="outline" size="sm">Buka Kalender</Button>
              </Link>
              <Link href="/dashboard/orders">
                <Button variant="outline" size="sm">Buka Orders</Button>
              </Link>
            </div>
          </div>

          {todayOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">Tidak ada order untuk hari ini.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jam</TableHead>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead>Judul</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead className="w-[90px] text-right">Qty</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todayOrders.map((row: any) => {
                  const members = (assignmentsByOrder.get(row.id) || [])
                    .slice()
                    .sort((a, b) => roleRank(a.role) - roleRank(b.role))
                    .map((m) => m.name)

                  const teamText = members.length > 0 ? members.join(', ') : '-'
                  const qty = row.unit_count ?? '-'
                  return (
                    <TableRow key={row.id}>
                      <TableCell>{row.scheduled_time || '-'}</TableCell>
                      <TableCell>{row.client?.name || '-'}</TableCell>
                      <TableCell>
                        <Link className="underline" href={`/dashboard/orders/${row.id}`}>
                          {row.service_title}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-[280px] truncate" title={teamText}>{teamText}</TableCell>
                      <TableCell className="text-right">{qty}</TableCell>
                      <TableCell>{statusLabel(String(row.status || ''))}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Total: {todayCount || 0}</p>
            <div className="flex items-center gap-2">
              <Link href={`/dashboard?page=${Math.max(1, safePage - 1)}`}>
                <Button size="sm" variant="outline" disabled={safePage <= 1}>Prev</Button>
              </Link>
              <span className="text-sm text-muted-foreground">
                Page {safePage} / {totalPages}
              </span>
              <Link href={`/dashboard?page=${Math.min(totalPages, safePage + 1)}`}>
                <Button size="sm" variant="outline" disabled={safePage >= totalPages}>Next</Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Notif Reimburse</CardTitle>
          </CardHeader>
          <CardContent>
            {reimburseInbox.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tidak ada reimburse baru.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Pengaju</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="text-right">Nominal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reimburseInbox.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.submitted_at ? formatDate(r.submitted_at) : '-'}</TableCell>
                      <TableCell>{r.submitter?.full_name || '-'}</TableCell>
                      <TableCell>{r.category?.name || '-'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Math.round(safeNumber(r.amount)))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notif Maintenance (Overdue + ≤7 Hari)</CardTitle>
          </CardHeader>
          <CardContent>
            {(maintenanceDue || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Tidak ada jadwal maintenance yang perlu action.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pelanggan</TableHead>
                    <TableHead>Properti</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(maintenanceDue || []).map((m: any) => (
                    <TableRow key={m.schedule_id}>
                      <TableCell>{m.client_name}</TableCell>
                      <TableCell>{m.property_name}</TableCell>
                      <TableCell>{m.next_scheduled_date ? formatDate(m.next_scheduled_date) : '-'}</TableCell>
                      <TableCell>
                        {typeof m.days_until === 'number'
                          ? m.days_until < 0
                            ? `Overdue (${Math.abs(m.days_until)} hari)`
                            : m.days_until === 0
                              ? 'Hari ini'
                              : `H-${m.days_until}`
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">{m.unit_count ?? '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
