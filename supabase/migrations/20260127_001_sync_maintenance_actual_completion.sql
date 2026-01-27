-- Migration: Sync maintenance schedule to actual completion
-- Date: 2026-01-27
-- Purpose:
-- - When a maintenance order is completed, update last_generated_date based on actual completion
--   so next_scheduled_date shifts automatically without manual edits.

BEGIN;

CREATE OR REPLACE FUNCTION public.sync_maintenance_schedule_on_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_completion_date DATE;
BEGIN
  -- Only apply to orders linked to a maintenance schedule
  IF NEW.maintenance_schedule_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Only react when order is completed
  IF NEW.status IS DISTINCT FROM 'completed' THEN
    RETURN NEW;
  END IF;

  v_completion_date := COALESCE(
    (NEW.completed_at AT TIME ZONE 'UTC')::date,
    NEW.actual_end_time::date,
    NEW.scheduled_date,
    CURRENT_DATE
  );

  UPDATE public.property_maintenance_schedules
  SET
    last_generated_date = v_completion_date,
    updated_at = NOW()
  WHERE id = NEW.maintenance_schedule_id
    AND (last_generated_date IS NULL OR last_generated_date IS DISTINCT FROM v_completion_date);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_maintenance_on_complete ON public.service_orders;
CREATE TRIGGER trigger_sync_maintenance_on_complete
  AFTER UPDATE OF status, completed_at, actual_end_time
  ON public.service_orders
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION public.sync_maintenance_schedule_on_complete();

COMMIT;