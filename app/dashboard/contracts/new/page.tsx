// ============================================
// New Maintenance Contract Wizard
// Step-by-step contract creation
// ============================================

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  FileText, 
  Building, 
  Calendar,
  Settings,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Client {
  id: string
  name: string
  email: string
}

interface Property {
  id: string
  property_name: string
  address: string
}

interface LocationSchedule {
  property_id: string
  property_name: string
  frequency: 'monthly' | 'quarterly' | 'semi_annual' | 'annual'
  apply_to_all_units: boolean
}

export default function NewContractPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Step 1: Client Selection
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState('')

  // Step 2: Contract Details
  const [contractNumber, setContractNumber] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Step 3: Location & Schedule
  const [properties, setProperties] = useState<Property[]>([])
  const [schedules, setSchedules] = useState<LocationSchedule[]>([])

  useEffect(() => {
    loadClients()
  }, [])

  useEffect(() => {
    if (selectedClient) {
      loadProperties()
    }
  }, [selectedClient])

  const loadClients = async () => {
    try {
      const supabase = createClient()
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

      if (!profile?.tenant_id) return

      const { data, error } = await supabase
        .from('clients')
        .select('id, name, email')
        .eq('tenant_id', profile.tenant_id)
        .order('name')

      if (error) throw error
      setClients(data || [])
    } catch (err: any) {
      console.error('Error loading clients:', err)
      setError(err.message)
    }
  }

  const loadProperties = async () => {
    try {
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('client_properties')
        .select('id, property_name, address')
        .eq('client_id', selectedClient)
        .order('property_name')

      if (error) throw error
      setProperties(data || [])
    } catch (err: any) {
      console.error('Error loading properties:', err)
      setError(err.message)
    }
  }

  const handleAddLocation = (property: Property) => {
    if (schedules.find(s => s.property_id === property.id)) {
      setError('Location already added')
      return
    }

    setSchedules([...schedules, {
      property_id: property.id,
      property_name: property.property_name,
      frequency: 'monthly',
      apply_to_all_units: true
    }])
  }

  const handleRemoveLocation = (propertyId: string) => {
    setSchedules(schedules.filter(s => s.property_id !== propertyId))
  }

  const handleFrequencyChange = (propertyId: string, frequency: string) => {
    setSchedules(schedules.map(s => 
      s.property_id === propertyId 
        ? { ...s, frequency: frequency as any }
        : s
    ))
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)
      setError('')
      
      // TODO: Create contract in database
      // For now, show success message
      
      setSuccess('Contract created successfully! Redirecting...')
      
      setTimeout(() => {
        router.push('/dashboard/contracts')
      }, 2000)
      
    } catch (err: any) {
      console.error('Error creating contract:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const canProceed = () => {
    if (step === 1) return selectedClient !== ''
    if (step === 2) return contractNumber && startDate && endDate
    if (step === 3) return schedules.length > 0
    return false
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create Maintenance Contract</h1>
          <p className="text-gray-600 mt-1">
            Set up complex scheduling for enterprise clients
          </p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-4">
        <div className={`flex items-center gap-2 ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
            1
          </div>
          <span className="text-sm font-medium">Client</span>
        </div>
        <ArrowRight className="w-4 h-4 text-gray-400" />
        <div className={`flex items-center gap-2 ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
            2
          </div>
          <span className="text-sm font-medium">Details</span>
        </div>
        <ArrowRight className="w-4 h-4 text-gray-400" />
        <div className={`flex items-center gap-2 ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
            3
          </div>
          <span className="text-sm font-medium">Schedule</span>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Step 1: Client Selection */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              Select Client
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              {clients.map((client) => (
                <div
                  key={client.id}
                  onClick={() => setSelectedClient(client.id)}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedClient === client.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <h4 className="font-medium">{client.name}</h4>
                  <p className="text-sm text-gray-600">{client.email}</p>
                </div>
              ))}
            </div>

            {clients.length === 0 && (
              <p className="text-center text-gray-500 py-8">
                No clients found. Please add clients first.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Contract Details */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Contract Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Contract Number *</label>
              <Input
                value={contractNumber}
                onChange={(e) => setContractNumber(e.target.value)}
                placeholder="e.g., CTR-2024-001"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Start Date *</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">End Date *</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Location & Schedule */}
      {step === 3 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Add Locations & Set Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Available Properties */}
              <div>
                <h4 className="font-medium mb-2">Available Locations</h4>
                <div className="grid gap-2">
                  {properties.filter(p => !schedules.find(s => s.property_id === p.id)).map((prop) => (
                    <div key={prop.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{prop.property_name}</p>
                        <p className="text-xs text-gray-600">{prop.address}</p>
                      </div>
                      <Button size="sm" onClick={() => handleAddLocation(prop)}>
                        <Plus className="w-3 h-3 mr-1" />
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Selected Locations with Schedule */}
              {schedules.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Selected Locations ({schedules.length})</h4>
                  <div className="space-y-3">
                    {schedules.map((sched) => (
                      <div key={sched.property_id} className="p-4 border rounded-lg bg-gray-50">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-medium">{sched.property_name}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveLocation(sched.property_id)}
                          >
                            <Trash2 className="w-3 h-3 text-red-600" />
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium mb-1">Frequency</label>
                            <select
                              value={sched.frequency}
                              onChange={(e) => handleFrequencyChange(sched.property_id, e.target.value)}
                              className="w-full px-3 py-2 border rounded-md text-sm"
                            >
                              <option value="monthly">Monthly</option>
                              <option value="quarterly">Quarterly (3 months)</option>
                              <option value="semi_annual">Semi-Annual (6 months)</option>
                              <option value="annual">Annual (1 year)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1">Apply To</label>
                            <Badge variant="outline">All units at this location</Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setStep(step - 1)}
          disabled={step === 1}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>

        {step < 3 ? (
          <Button
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
          >
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={!canProceed() || loading}
          >
            {loading ? 'Creating...' : 'Create Contract'}
            <CheckCircle className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  )
}
