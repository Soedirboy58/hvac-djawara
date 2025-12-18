-- ============================================
-- Add Public Token to Clients Table
-- For public link access (basic features)
-- ============================================

-- 1. Add public_token column
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS public_token TEXT UNIQUE;

-- 2. Create index for faster lookup
CREATE INDEX IF NOT EXISTS idx_clients_public_token ON clients(public_token);

-- 3. Generate tokens for existing clients (without tokens)
UPDATE clients
SET public_token = encode(gen_random_bytes(32), 'hex')
WHERE public_token IS NULL;

-- 4. Make public_token NOT NULL for future records
ALTER TABLE clients 
ALTER COLUMN public_token SET NOT NULL;

-- 5. Create trigger to auto-generate token on insert
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

-- 6. Verify tokens generated
SELECT 
  id,
  name,
  email,
  public_token,
  'https://hvac-djawara.vercel.app/c/' || public_token as public_link
FROM clients
LIMIT 5;

COMMENT ON COLUMN clients.public_token IS 'Unique token for public link access (no login required)';
