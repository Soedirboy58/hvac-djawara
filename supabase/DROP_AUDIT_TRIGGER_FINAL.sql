-- ============================================
-- DROP AUDIT TRIGGER - Final Fix
-- ============================================

-- Drop the problematic trigger that tries to write to client_audit_log
DROP TRIGGER IF EXISTS trigger_track_client_changes ON clients;

-- Drop the function too (it's broken without the audit table)
DROP FUNCTION IF EXISTS track_client_changes();

-- Now the delete function will work!
-- Test by running: SELECT delete_client_safe('some-client-id');
