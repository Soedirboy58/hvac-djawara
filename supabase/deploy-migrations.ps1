# ============================================
# Deploy Migrations to Supabase
# Purpose: Execute all migration files in correct order
# Usage: .\deploy-migrations.ps1
# ============================================

$ErrorActionPreference = "Stop"

# Database connection string
$DB_URL = "postgresql://postgres.tukbuzdngodvcysncwke:aWl32jXp2CRQQWq7@aws-1-ap-south-1.pooler.supabase.com:6543/postgres"

Write-Host "🚀 Starting Supabase Migration Deployment..." -ForegroundColor Cyan
Write-Host ""

# Migration files in execution order (from MIGRATION-MAP.md)
$migrations = @(
    # Phase 1: Shared Functions & Types
    "00_shared/types/enum_types.sql",
    "00_shared/functions/handle_updated_at.sql",
    "00_shared/functions/text_helpers.sql",
    "00_shared/functions/auth_helpers.sql",
    
    # Phase 2: Core Tables
    "01_core/20251201000001_create_tenants.sql",
    "01_core/20251201000002_create_profiles.sql",
    "01_core/20251201000003_create_user_tenant_roles.sql",
    
    # Phase 3: RLS Policies
    "01_core/20251201000004_apply_core_rls_policies.sql"
)

# Check if psql is available
$psqlAvailable = Get-Command psql -ErrorAction SilentlyContinue

if (-not $psqlAvailable) {
    Write-Host "⚠️  psql not found. Please use Supabase Dashboard instead:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   1. Open: https://supabase.com/dashboard/project/tukbuzdngodvcysncwke/sql/new" -ForegroundColor White
    Write-Host "   2. Copy-paste each file content in order:" -ForegroundColor White
    Write-Host ""
    
    foreach ($migration in $migrations) {
        $fullPath = Join-Path $PSScriptRoot "migrations/$migration"
        Write-Host "   📄 $migration" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "   3. Execute each SQL file one by one" -ForegroundColor White
    Write-Host ""
    Write-Host "💡 Alternative: Install PostgreSQL client tools" -ForegroundColor Cyan
    Write-Host "   scoop install postgresql" -ForegroundColor White
    Write-Host ""
    exit 0
}

# Execute migrations using psql
Write-Host "📦 Found psql - deploying migrations..." -ForegroundColor Green
Write-Host ""

$successCount = 0
$failCount = 0

foreach ($migration in $migrations) {
    $fullPath = Join-Path $PSScriptRoot "migrations/$migration"
    
    if (Test-Path $fullPath) {
        Write-Host "⏳ Deploying: $migration" -ForegroundColor Cyan
        
        try {
            # Execute SQL file
            $result = psql $DB_URL -f $fullPath 2>&1
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "   ✅ Success" -ForegroundColor Green
                $successCount++
            } else {
                Write-Host "   ❌ Failed: $result" -ForegroundColor Red
                $failCount++
            }
        } catch {
            Write-Host "   ❌ Error: $_" -ForegroundColor Red
            $failCount++
        }
    } else {
        Write-Host "   ⚠️  File not found: $fullPath" -ForegroundColor Yellow
        $failCount++
    }
    
    Write-Host ""
}

# Summary
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "📊 Migration Summary" -ForegroundColor Cyan
Write-Host "   ✅ Successful: $successCount" -ForegroundColor Green
Write-Host "   ❌ Failed: $failCount" -ForegroundColor Red
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

if ($failCount -eq 0) {
    Write-Host ""
    Write-Host "🎉 All migrations deployed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "   1. Verify in Supabase Dashboard: https://supabase.com/dashboard/project/tukbuzdngodvcysncwke/editor" -ForegroundColor White
    Write-Host "   2. Run seed data: psql `$DB_URL -f seed/01_core_seed.sql" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "⚠️  Some migrations failed. Check errors above." -ForegroundColor Yellow
    Write-Host ""
    exit 1
}
