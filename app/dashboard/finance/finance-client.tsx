'use client'

import { useMemo, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FinanceReimburseClient } from './finance-reimburse-client'
import { FinanceInvoiceClient } from './finance-invoice-client'

export function FinanceClient({
  tenantId,
  role,
}: {
  tenantId: string
  role: string | null
}) {
  const canSeeInvoices = useMemo(() => {
    const r = (role || '').toLowerCase()
    return r === 'owner' || r === 'admin_finance'
  }, [role])

  const [tab, setTab] = useState<'reimburse' | 'invoice'>(
    canSeeInvoices ? 'invoice' : 'reimburse'
  )

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
      <TabsList>
        <TabsTrigger value="reimburse">Reimburse</TabsTrigger>
        {canSeeInvoices && <TabsTrigger value="invoice">Invoice</TabsTrigger>}
      </TabsList>

      <TabsContent value="reimburse" className="mt-4">
        <FinanceReimburseClient tenantId={tenantId} />
      </TabsContent>

      {canSeeInvoices && (
        <TabsContent value="invoice" className="mt-4">
          <FinanceInvoiceClient tenantId={tenantId} />
        </TabsContent>
      )}
    </Tabs>
  )
}
