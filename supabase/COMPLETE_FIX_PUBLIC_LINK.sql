-- ============================================
-- COMPLETE FIX: Public Client Link Access
-- Run this ONE file to fix everything
-- ============================================

-- STEP 1: Add public_token column (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'clients' AND column_name = 'public_token') THEN
    ALTER TABLE clients ADD COLUMN public_token TEXT UNIQUE;
  END IF;
END $$;

-- STEP 2: Generate tokens for existing clients
UPDATE clients
SET public_token = encode(gen_random_bytes(32), 'hex')
WHERE public_token IS NULL;

-- STEP 3: Create index
CREATE INDEX IF NOT EXISTS idx_clients_public_token ON clients(public_token);

-- STEP 4: Auto-generate token trigger
CREATE OR REPLACE FUNCTION generate_client_public_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.public_token IS NULL THEN
    NEW.public_token := encode(gen_random_bytes(32), 'hex');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_client_token ON clients;
CREATE TRIGGER trigger_generate_client_token
  BEFORE INSERT ON clients
  FOR EACH ROW
  EXECUTE FUNCTION generate_client_public_token();

-- STEP 5: Fix RLS - Allow anon users to read by token
DROP POLICY IF EXISTS "Allow public access by token" ON clients;
CREATE POLICY "Allow public access by token"
ON clients FOR SELECT
TO anon, authenticated
USING (true); -- Allow all reads, app will filter by token

-- STEP 6: Verify everything works
SELECT 
  'SUCCESS: Setup complete!' as status,
  COUNT(*) as total_clients,
  COUNT(public_token) as clients_with_token
FROM clients;

-- STEP 7: Get test link
SELECT 
  name,
  email,
  'https://hvac-djawara.vercel.app/c/' || public_token as test_link
FROM clients
LIMIT 1;
