-- ============================================
-- FIX AUDIT LOG CONSTRAINT
-- Run this FIRST, separately from other migrations
-- ============================================

-- Step 1: Drop the trigger temporarily
DROP TRIGGER IF EXISTS trigger_track_client_changes ON public.clients;

-- Step 2: Make changed_by nullable
ALTER TABLE public.client_audit_log ALTER COLUMN changed_by DROP NOT NULL;

-- Step 3: Recreate the trigger function
CREATE OR REPLACE FUNCTION public.track_client_changes()
RETURNS TRIGGER AS $$
DECLARE
  change_summary TEXT;
BEGIN
  -- Build change summary
  IF TG_OP = 'UPDATE' THEN
    change_summary := 'Updated: ';
    IF OLD.name IS DISTINCT FROM NEW.name THEN
      change_summary := change_summary || 'name, ';
    END IF;
    IF OLD.email IS DISTINCT FROM NEW.email THEN
      change_summary := change_summary || 'email, ';
    END IF;
    IF OLD.phone IS DISTINCT FROM NEW.phone THEN
      change_summary := change_summary || 'phone, ';
    END IF;
    IF OLD.address IS DISTINCT FROM NEW.address THEN
      change_summary := change_summary || 'address, ';
    END IF;
    IF OLD.client_type IS DISTINCT FROM NEW.client_type THEN
      change_summary := change_summary || 'client_type, ';
    END IF;
    change_summary := rtrim(change_summary, ', ');
  ELSIF TG_OP = 'INSERT' THEN
    change_summary := 'Client created';
  ELSIF TG_OP = 'DELETE' THEN
    change_summary := 'Client deleted';
  END IF;

  -- Insert audit log (changed_by can be NULL for system operations)
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.client_audit_log (
      client_id, changed_by, change_type, table_name, record_id,
      old_values, changes_summary, created_at
    ) VALUES (
      OLD.id,
      auth.uid(),
      'deleted',
      TG_TABLE_NAME,
      OLD.id,
      to_jsonb(OLD),
      change_summary,
      NOW()
    );
    RETURN OLD;
  ELSE
    INSERT INTO public.client_audit_log (
      client_id, changed_by, change_type, table_name, record_id,
      old_values, new_values, changes_summary, created_at
    ) VALUES (
      COALESCE(NEW.id, OLD.id),
      auth.uid(),
      LOWER(TG_OP),
      TG_TABLE_NAME,
      COALESCE(NEW.id, OLD.id),
      CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
      to_jsonb(NEW),
      change_summary,
      NOW()
    );
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Recreate the trigger
CREATE TRIGGER trigger_track_client_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.track_client_changes();

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Audit log constraint fixed!';
  RAISE NOTICE '✅ Trigger recreated with NULL support';
END $$;
