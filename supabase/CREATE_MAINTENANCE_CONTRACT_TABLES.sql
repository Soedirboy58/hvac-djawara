-- ============================================
-- CREATE MAINTENANCE CONTRACT TABLES
-- Sistem Kontrak Perawatan Berkala
-- Run this in Supabase SQL Editor
-- ============================================

-- Prerequisites: Ensure job_type_enum, job_category_enum, unit_category_enum exist
-- (If not, run ADD_SERVICE_DETAIL_FIELDS.sql first)

-- Step 1: Create maintenance_contracts table
CREATE TABLE IF NOT EXISTS public.maintenance_contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  contract_number VARCHAR(50) UNIQUE NOT NULL,
  
  -- Contract details
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  
  -- Recurring settings
  frequency VARCHAR(20) NOT NULL, -- 'monthly', 'quarterly', 'semi_annual', 'annual', 'custom_months'
  frequency_months INT, -- untuk custom: setiap X bulan (misal 4 bulan = quarterly)
  service_day_preference INT, -- 1-31 (tanggal preferensi, misal setiap tgl 15)
  preferred_time TIME, -- jam preferensi (misal 09:00)
  
  -- Service scope
  service_scope TEXT, -- deskripsi lingkup: "Cuci 2 ruang" atau "Cuci seluruh ruang"
  room_count INT, -- jumlah ruang yang di-service
  
  -- Service details
  job_type job_type_enum DEFAULT 'maintenance',
  job_category job_category_enum,
  service_notes TEXT,
  
  -- Pricing (akan di-calculate dari units)
  total_cost_value DECIMAL(15,2), -- total cost ke perusahaan
  total_selling_value DECIMAL(15,2), -- total yang ditagih ke client
  total_margin DECIMAL(15,2), -- margin untuk marketing
  
  -- Marketing/Sales
  marketing_partner_id UUID REFERENCES public.profiles(id), -- marketing freelance yang handle kontrak
  marketing_partner_name VARCHAR(200), -- nama marketing jika belum punya profile
  marketing_fee_percentage DECIMAL(5,2), -- % fee dari margin (optional)
  
  -- Assignment
  default_technician_id UUID REFERENCES public.profiles(id),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Step 2: Create contract_locations table (untuk multi-cabang/lokasi)
CREATE TABLE IF NOT EXISTS public.contract_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES public.maintenance_contracts(id) ON DELETE CASCADE,
  
  -- Location details
  location_name VARCHAR(200) NOT NULL, -- "Bank Permata Cabang Purbalingga"
  address TEXT,
  city VARCHAR(100),
  province VARCHAR(100),
  contact_person VARCHAR(200),
  contact_phone VARCHAR(20),
  
  -- Location coordinates (optional, untuk maps)
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Step 3: Create contract_units table
CREATE TABLE IF NOT EXISTS public.contract_units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES public.maintenance_contracts(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.contract_locations(id) ON DELETE CASCADE, -- link ke cabang
  
  -- Unit details
  unit_category unit_category_enum NOT NULL,
  brand VARCHAR(100),
  model VARCHAR(100),
  serial_number VARCHAR(100),
  capacity VARCHAR(50), -- misal "1 PK", "2.5 PK"
  
  -- Location in building
  room_name VARCHAR(200), -- "Ruang ATM", "Ruang Server", "Ruang Staff"
  room_type VARCHAR(50), -- "atm", "server", "office", "other" - untuk group by frequency
  floor_level VARCHAR(50),
  location_description TEXT,
  installation_date DATE,
  
  -- Maintenance frequency per unit
  maintenance_frequency VARCHAR(20) NOT NULL, -- 'monthly', 'quarterly', 'custom_months'
  frequency_months INT DEFAULT 1, -- 1 untuk monthly, 4 untuk quarterly
  
  -- Pricing per unit
  cost_price DECIMAL(15,2), -- harga cost ke perusahaan (35rb)
  selling_price DECIMAL(15,2), -- harga jual ke client (65rb)
  
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Step 4: Create generated_schedules table
CREATE TABLE IF NOT EXISTS public.generated_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES public.maintenance_contracts(id) ON DELETE CASCADE,
  
  -- Schedule info
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  generation_date TIMESTAMPTZ DEFAULT now(),
  
  -- Link to actual order (null jika belum di-convert jadi order)
  service_order_id UUID REFERENCES public.service_orders(id),
  
  -- Status tracking
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'confirmed', 'converted', 'skipped', 'cancelled'
  confirmed_by UUID REFERENCES public.profiles(id),
  confirmed_at TIMESTAMPTZ,
  
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(contract_id, scheduled_date)
);

-- Step 5: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_maintenance_contracts_tenant ON public.maintenance_contracts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_contracts_client ON public.maintenance_contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_contracts_active ON public.maintenance_contracts(is_active, end_date);
CREATE INDEX IF NOT EXISTS idx_maintenance_contracts_marketing ON public.maintenance_contracts(marketing_partner_id);

CREATE INDEX IF NOT EXISTS idx_contract_locations_contract ON public.contract_locations(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_locations_active ON public.contract_locations(is_active);

CREATE INDEX IF NOT EXISTS idx_contract_units_contract ON public.contract_units(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_units_location ON public.contract_units(location_id);
CREATE INDEX IF NOT EXISTS idx_contract_units_room_type ON public.contract_units(room_type);
CREATE INDEX IF NOT EXISTS idx_contract_units_frequency ON public.contract_units(maintenance_frequency);
CREATE INDEX IF NOT EXISTS idx_contract_units_active ON public.contract_units(is_active);

CREATE INDEX IF NOT EXISTS idx_generated_schedules_tenant ON public.generated_schedules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_generated_schedules_contract ON public.generated_schedules(contract_id);
CREATE INDEX IF NOT EXISTS idx_generated_schedules_date ON public.generated_schedules(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_generated_schedules_status ON public.generated_schedules(status);
CREATE INDEX IF NOT EXISTS idx_generated_schedules_order ON public.generated_schedules(service_order_id);

-- Step 6: Enable Row Level Security (RLS)
ALTER TABLE public.maintenance_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_schedules ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS Policies
-- Policies for maintenance_contracts
DROP POLICY IF EXISTS "Users can view contracts in their tenant" ON public.maintenance_contracts;
CREATE POLICY "Users can view contracts in their tenant"
  ON public.maintenance_contracts FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenant_roles
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Users can create contracts in their tenant" ON public.maintenance_contracts;
CREATE POLICY "Users can create contracts in their tenant"
  ON public.maintenance_contracts FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenant_roles
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Users can update contracts in their tenant" ON public.maintenance_contracts;
CREATE POLICY "Users can update contracts in their tenant"
  ON public.maintenance_contracts FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenant_roles
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Policies for contract_locations
DROP POLICY IF EXISTS "Users can view contract locations" ON public.contract_locations;
CREATE POLICY "Users can view contract locations"
  ON public.contract_locations FOR SELECT
  USING (
    contract_id IN (
      SELECT id FROM public.maintenance_contracts
      WHERE tenant_id IN (
        SELECT tenant_id FROM public.user_tenant_roles
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

DROP POLICY IF EXISTS "Users can manage contract locations" ON public.contract_locations;
CREATE POLICY "Users can manage contract locations"
  ON public.contract_locations FOR ALL
  USING (
    contract_id IN (
      SELECT id FROM public.maintenance_contracts
      WHERE tenant_id IN 
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenant_roles
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Policies for contract_units
DROP POLICY IF EXISTS "Users can view contract units" ON public.contract_units;
CREATE POLICY "Users can view contract units"
  ON public.contract_units FOR SELECT
  USING (
    contract_id IN (
      SELECT id FROM public.maintenance_contracts
      WHERE tenant_id IN (
        SELECT tenant_id FROM public.user_tenant_roles
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

DROP POLICY IF EXISTS "Users can manage contract units" ON public.contract_units;
CREATE POLICY "Users can manage contract units"
  ON public.contract_units FOR ALL
  USING (
    contract_id IN (
      SELECT id FROM public.maintenance_contracts
      WH8RE tenant_id IN (
        SELECT tenant_id FROM public.user_tenant_roles
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

-- PolicEes for generated_schedules
DROP POLICY IF EXISTS "Users can view schedules in their tenant" ON public.generated_schedules;
CREATE POLICY "Users can view schedules in their tenant"
  ON public.generated_schedules FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenant_roles
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Users can manage schedules in their tenant" ON public.generated_schedules;
CREATE POLICY "Users can manage schedules in their tenant"
  ON public.generated_schedules FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_tenant_roles
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Step 8: Create helper function untuk auto-update updated_at
CREATE OR REPLACE FUNCTION update_maintenance_contract_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER maintenance_contracts_updated_at
  BEFORE UPDATE ON public.maintenance_contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_maintenance_contract_updated_at();

CREATE TRIGGER generated_schedules_updated_at
  BEFORE UPDATE ON public.generated_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_maintenance_contract_updated_at();

-- Step 8: Verify tables created
DO $$locations', 'contract_
BEGIN
  RAISE NOTICE '';
  RAISE 9: Verify tables created
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ MAINTENANCE CONTRACT TABLES CREATED!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables created:';
  RAISE NOTICE '  1. maintenance_contracts - Store kontrak maintenance';
  RAISE NOTICE '  2. contract_locations - Store multiple cabang/lokasi per kontrak';
  RAISE NOTICE '  3. contract_units - Store unit AC per lokasi';
  RAISE NOTICE '  4. generated_schedules - Store jadwal auto-generated';
  RAISE NOTICE '';
  RAISE NOTICE 'Features:';
  RAISE NOTICE '  ✓ Support multi-location contracts (multiple cabang)';
  RAISE NOTICE '  ✓ Per-unit frequency (ATM monthly, other rooms quarterly)';
  RAISE NOTICE '  ✓ Cost vs Selling price per unit (markup pricing)';
  RAISE NOTICE '  ✓ Freelance marketing partner tracking';
  RAISE NOTICE '  ✓ Room type grouping (atm, server, office)';
  RAISE NOTICE '  ✓ RLS policies enabled';
  RAISE NOTICE '  ✓ Auto-updated timestamps';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Next: Run ADD_SERVICE_DETAIL_FIELDS.sql if not done yet';
  RAISE NOTICE '';
END $$;

-- Show table structure
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name IN ('maintenance_contracts', 'contract_location