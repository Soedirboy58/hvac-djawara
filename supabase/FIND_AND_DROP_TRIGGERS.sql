-- Step 1: Find all triggers on clients table
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'clients'
ORDER BY trigger_name;

-- Step 2: Drop audit triggers (run this after seeing results above)
-- Uncomment and run if you see audit-related triggers:
-- DROP TRIGGER IF EXISTS audit_clients_changes ON clients;
-- DROP TRIGGER IF EXISTS log_client_changes ON clients;
-- DROP TRIGGER IF EXISTS client_audit_trigger ON clients;
