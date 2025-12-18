// ============================================
// Audit Log Viewer
// Display history of all client data changes
// ============================================

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  History,
  Loader2,
  AlertCircle,
  User,
  Clock
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface AuditLog {
  id: string
  created_at: string
  changed_by: string
  change_type: string
  old_values: any
  new_values: any
  changes_summary: string
  staff_name?: string
}

interface AuditLogViewerProps {
  clientId: string
}

export function AuditLogViewer({ clientId }: AuditLogViewerProps) {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchAuditLogs()
  }, [clientId])

  async function fetchAuditLogs() {
    // Note: Audit logging is currently disabled
    // The client_audit_log table was removed to fix delete functionality
    setLogs([])
    setLoading(false)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5" />
          Change History
        </CardTitle>
        <p className="text-sm text-gray-500">
          Track all modifications to client data
        </p>
      </CardHeader>

      <CardContent>
        {error && (
          <Alert className="mb-4 border-red-200 bg-red-50">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {logs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No changes recorded yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {logs.map((log) => (
              <Card key={log.id} className="border-l-4 border-l-blue-500">
                <CardContent className="py-4">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">{log.staff_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      {new Date(log.created_at).toLocaleString('id-ID', {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      })}
                    </div>
                  </div>

                  {/* Changes Summary */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">
                      {log.change_type === 'created' ? 'Record Created' : 'Changes Made'}:
                    </p>
                    
                    {log.change_type === 'updated' && log.changes_summary ? (
                      <div className="bg-gray-50 rounded p-3">
                        <p className="text-sm text-gray-700 break-words">
                          {log.changes_summary}
                        </p>
                      </div>
                    ) : (
                      <div className="bg-green-50 rounded p-3">
                        <p className="text-sm text-green-700">
                          New client record created
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
