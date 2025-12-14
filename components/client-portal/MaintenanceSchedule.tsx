// ============================================
// Maintenance Schedule Configuration
// 2-Level System: Simple (no contract) vs Contract-based
// ============================================

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  Calendar,
  Clock,
  Save,
  AlertCircle,
  CheckCircle,
  Home,
  FileText,
  ArrowRight,
  Building,
  Edit,
  Trash2,
  Pause,
  Play,
  Eye
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface MaintenanceScheduleProps {
  clientId: string
}

type SetupMode = 'choose' | 'simple' | 'contract'

export function MaintenanceSchedule({ clientId }: MaintenanceScheduleProps) {
  const [mode, setMode] = useState<SetupMode>('choose')
  const [properties, setProperties] = useState<any[]>([])
  const [schedules, setSchedules] = useState<any[]>([])
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null)
  const [schedule, setSchedule] = useState({
    frequency: 'monthly',
    custom_days: 30,
    start_date: '',
    maintenance_type: 'cleaning_inspection',
    notes: ''
  })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const supabase = createClient()

  // Load properties and schedules
  useEffect(() => {
    loadData()
  }, [clientId])

  async function loadData() {
    setLoading(true)
    try {
      // Load client properties
      const { data: props } = await supabase
        .from('client_properties')
        .select('*')
        .eq('client_id', clientId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      setProperties(props || [])

      // Load existing schedules
      const { data: scheds } = await supabase
        .from('property_maintenance_schedules')
        .select(`
          *,
          property:client_properties(property_name, address)
        `)
        .eq('client_id', clientId)
        .eq('is_active', true)

      setSchedules(scheds || [])
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSimpleSave() {
    if (!selectedProperty) {
      setError('Please select a property')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      // Get tenant_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('active_tenant_id')
        .single()

      if (!profile?.active_tenant_id) {
        throw new Error('No active tenant found')
      }

      if (editingId) {
        // UPDATE existing schedule
        const { error: updateError } = await supabase
          .from('property_maintenance_schedules')
          .update({
            property_id: selectedProperty,
            frequency: schedule.frequency,
            custom_interval_days: schedule.custom_days,
            start_date: schedule.start_date,
            maintenance_type: schedule.maintenance_type,
            notes: schedule.notes,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingId)

        if (updateError) throw updateError
      } else {
        // INSERT new schedule
        const { error: insertError } = await supabase
          .from('property_maintenance_schedules')
          .insert({
            tenant_id: profile.active_tenant_id,
            client_id: clientId,
            property_id: selectedProperty,
            frequency: schedule.frequency,
            custom_interval_days: schedule.custom_days,
            start_date: schedule.start_date,
            maintenance_type: schedule.maintenance_type,
            notes: schedule.notes,
            apply_to_all_units: true,
            is_active: true
          })

        if (insertError) throw insertError
      }

      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        setMode('choose')
        setSelectedProperty(null)
        setEditingId(null)
        loadData() // Reload to show updated schedule
      }, 2000)
    } catch (err) {
      console.error('Error saving schedule:', err)
      setError(err instanceof Error ? err.message : 'Failed to save schedule')
    } finally {
      setSaving(false)
    }
  }

  async function handleContractRequest() {
    // Redirect to contract request flow
    window.location.href = '/dashboard/contract-requests'
  }

  async function handlePauseResume(scheduleId: string, currentStatus: boolean) {
    try {
      const { error } = await supabase
        .from('property_maintenance_schedules')
        .update({ is_active: !currentStatus })
        .eq('id', scheduleId)

      if (error) throw error

      await loadData()
      alert(currentStatus ? 'Schedule paused' : 'Schedule resumed')
    } catch (err) {
      console.error('Error updating schedule:', err)
      alert('Failed to update schedule')
    }
  }

  async function handleDelete(scheduleId: string) {
    if (!confirm('Delete this maintenance schedule? This cannot be undone.')) return

    try {
      const { error } = await supabase
        .from('property_maintenance_schedules')
        .delete()
        .eq('id', scheduleId)

      if (error) throw error

      await loadData()
      alert('Schedule deleted successfully')
    } catch (err) {
      console.error('Error deleting schedule:', err)
      alert('Failed to delete schedule')
    }
  }

  async function handleEdit(sched: any) {
    setEditingId(sched.id)
    setSelectedProperty(sched.property_id)
    setSchedule({
      frequency: sched.frequency,
      custom_days: sched.custom_interval_days || 30,
      start_date: sched.start_date,
      maintenance_type: sched.maintenance_type,
      notes: sched.notes || ''
    })
    setMode('simple')
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-gray-500">Loading...</p>
        </CardContent>
      </Card>
    )
  }

  // Show mode chooser
  if (mode === 'choose') {
    return (
      <div className="space-y-6">
        {/* Active Schedules */}
        {schedules.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Active Maintenance Schedules ({schedules.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {schedules.map((sched) => (
                  <div key={sched.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Building className="w-4 h-4 text-gray-400" />
                          <h4 className="font-semibold text-gray-900">
                            {sched.property?.property_name}
                          </h4>
                          {sched.is_active ? (
                            <Badge className="bg-green-100 text-green-700 border-green-200">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                              Paused
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-3">
                          {sched.property?.address}
                        </p>
                        
                        {/* Schedule Info */}
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Frequency</p>
                            <Badge variant="outline" className="text-xs">
                              {sched.frequency === 'monthly' ? '📅 Monthly' :
                               sched.frequency === 'quarterly' ? '📅 Quarterly (3 months)' :
                               sched.frequency === 'semi_annual' ? '📅 Semi-Annual (6 months)' :
                               sched.frequency === 'annual' ? '📅 Annual (1 year)' :
                               `📅 Every ${sched.custom_interval_days} days`}
                            </Badge>
                          </div>
                          
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Next Maintenance</p>
                            {sched.next_scheduled_date ? (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-blue-600" />
                                <span className="text-sm font-medium text-blue-600">
                                  {new Date(sched.next_scheduled_date).toLocaleDateString('id-ID', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">Not scheduled yet</span>
                            )}
                          </div>
                        </div>

                        {/* Last Generated */}
                        {sched.last_generated_date && (
                          <p className="text-xs text-gray-500">
                            Last service: {new Date(sched.last_generated_date).toLocaleDateString('id-ID')}
                          </p>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(sched)}
                          className="w-full"
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePauseResume(sched.id, sched.is_active)}
                          className="w-full"
                        >
                          {sched.is_active ? (
                            <>
                              <Pause className="w-3 h-3 mr-1" />
                              Pause
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3 mr-1" />
                              Resume
                            </>
                          )}
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(sched.id)}
                          className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Setup Type Chooser */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Add New Maintenance Schedule
            </CardTitle>
            <p className="text-sm text-gray-500">
              Choose setup type based on your needs
            </p>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Simple Setup */}
              <button
                onClick={() => setMode('simple')}
                className="border-2 border-gray-200 rounded-lg p-6 hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200">
                    <Home className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold">Simple Setup</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Quick maintenance schedule setup per property
                </p>
                <ul className="text-sm text-gray-600 space-y-1 mb-4">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    No contract approval needed
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Fast setup (2 minutes)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Per-property scheduling
                  </li>
                </ul>
                <div className="flex items-center text-blue-600 font-medium">
                  Setup Now <ArrowRight className="w-4 h-4 ml-2" />
                </div>
              </button>

              {/* Contract-based */}
              <button
                onClick={handleContractRequest}
                className="border-2 border-gray-200 rounded-lg p-6 hover:border-purple-500 hover:bg-purple-50 transition-all text-left group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200">
                    <FileText className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold">Contract-based</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Formal contract with quotation & approval
                </p>
                <ul className="text-sm text-gray-600 space-y-1 mb-4">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Multi-location support
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Per-unit frequency control
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Professional quotation
                  </li>
                </ul>
                <div className="flex items-center text-purple-600 font-medium">
                  Request Contract <ArrowRight className="w-4 h-4 ml-2" />
                </div>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Simple Setup Form
  if (mode === 'simple') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="w-5 h-5" />
            {editingId ? 'Edit Maintenance Schedule' : 'Simple Maintenance Setup'}
          </CardTitle>
          <p className="text-sm text-gray-500">
            {editingId ? 'Update schedule details and frequency' : 'Quick setup for recurring maintenance per property'}
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Maintenance schedule saved successfully!
              </AlertDescription>
            </Alert>
          )}

          {/* Property Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Property *
            </label>
            {properties.length === 0 ? (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertCircle className="w-4 h-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  No properties found. Please add a property first in the Properties tab.
                </AlertDescription>
              </Alert>
            ) : (
              <select
                value={selectedProperty || ''}
                onChange={(e) => setSelectedProperty(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              >
                <option value="">-- Choose Property --</option>
                {properties.map((prop) => (
                  <option key={prop.id} value={prop.id}>
                    {prop.property_name} - {prop.address}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Frequency Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maintenance Frequency *
            </label>
            <select
              value={schedule.frequency}
              onChange={(e) => setSchedule({ ...schedule, frequency: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="monthly">Monthly (Every month)</option>
              <option value="quarterly">Quarterly (Every 3 months)</option>
              <option value="semi_annual">Semi-Annual (Every 6 months)</option>
              <option value="annual">Annual (Every year)</option>
              <option value="custom">Custom Interval</option>
            </select>
          </div>

          {/* Custom Days Input */}
          {schedule.frequency === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Interval (Days)
              </label>
              <Input
                type="number"
                value={schedule.custom_days}
                onChange={(e) => setSchedule({ ...schedule, custom_days: parseInt(e.target.value) })}
                min={1}
                placeholder="e.g., 45 days"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter number of days between maintenance visits
              </p>
            </div>
          )}

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              First Maintenance Date *
            </label>
            <Input
              type="date"
              value={schedule.start_date}
              onChange={(e) => setSchedule({ ...schedule, start_date: e.target.value })}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              The system will auto-schedule subsequent visits based on frequency
            </p>
          </div>

          {/* Maintenance Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maintenance Type
            </label>
            <select
              value={schedule.maintenance_type}
              onChange={(e) => setSchedule({ ...schedule, maintenance_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="cleaning_inspection">Cleaning & Inspection</option>
              <option value="preventive">Preventive Maintenance</option>
              <option value="full_service">Full Service</option>
              <option value="custom">Custom Service</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={schedule.notes}
              onChange={(e) => setSchedule({ ...schedule, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Any special instructions or requirements..."
            />
          </div>

          {/* Info Box */}
          <Alert className="bg-blue-50 border-blue-200">
            <Clock className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Example for Monthly:</strong> If you set first date as Jan 15, 2026,
              next maintenance will be auto-scheduled for Feb 15, Mar 15, and so on.
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button 
              variant="outline"
              onClick={() => {
                setMode('choose')
                setSelectedProperty(null)
                setEditingId(null)
                setError(null)
              }}
              className="w-1/3"
            >
              {editingId ? 'Cancel Edit' : 'Back'}
            </Button>
            <Button 
              onClick={handleSimpleSave} 
              disabled={saving || !schedule.start_date || !selectedProperty}
              className="w-2/3"
            >
              {saving ? (
                <>{editingId ? 'Updating...' : 'Saving...'}</>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {editingId ? 'Update Schedule' : 'Save Schedule'}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return null
}
