# OVERVIEW TEKNIS - DJAWARA HVAC PLATFORM
## Status Progress & Context untuk AI Agent

> **Dokumen ini adalah LIVING DOCUMENT** yang terus diupdate setiap ada progress. AI Agent WAJIB baca dokumen ini sebelum mulai task baru dan WAJIB update setelah selesai task.

---

## 📊 STATUS PROJECT (Terakhir Update: December 1, 2025)

### Project Info
- **Supabase URL**: https://tukbuzdngodvcysncwke.supabase.co
- **Git Repository**: https://github.com/Soedirboy58/hvac-djawara
- **Vercel Team ID**: team_EFUJ3BjhY6B6IIs3KK7lBst3
- **Project Phase**: Fase 1 - MVP Development

### Current Phase
**FASE: Fase 1 - MVP (Single Tenant) - Sprint 1**

### Progress Overview
- ✅ **Architecture Design**: 100% (SELESAI)
- ✅ **Database Setup**: 100% (MIGRATIONS READY TO DEPLOY)
- ✅ **Frontend Setup**: 100% (DOMAIN-DRIVEN ARCHITECTURE COMPLETE)
- 🟡 **MVP Features**: 40% (AUTH + CRM CLIENTS DONE)

### Overall Progress: **60%** (Frontend MVP initialized with domain-driven design)

---

## 🎯 MILESTONE TRACKING

### Milestone 1: Foundation Setup (Target: Week 1-2)
**Status**: � **IN PROGRESS** (70% Complete)

**Tasks:**
- [x] Create Supabase project ✅
- [ ] Initialize Next.js project (NEXT IMMEDIATE STEP)
- [ ] Setup folder structure sesuai PANDUAN-AWAL.md
- [ ] Install dependencies (Tailwind, shadcn/ui, TanStack Query, Zustand)
- [x] Setup environment variables ✅
- [x] Create initial migrations (auth, tenants, profiles) ✅
- [ ] Deploy Supabase migrations (files ready, awaiting execution)
- [x] Test Supabase connection ✅
- [ ] Setup Vercel project (deployment)

**Deliverable**: Development environment siap, bisa login ke Supabase

**Files Created (14 files):**
```
✅ .env.local, .env.example, .gitignore
✅ supabase/migrations/00_shared/functions/handle_updated_at.sql
✅ supabase/migrations/00_shared/functions/auth_helpers.sql (6 functions)
✅ supabase/migrations/00_shared/functions/text_helpers.sql (3 functions)
✅ supabase/migrations/00_shared/types/enum_types.sql (3 enums)
✅ supabase/migrations/01_core/20251201000001_create_tenants.sql
✅ supabase/migrations/01_core/20251201000002_create_profiles.sql
✅ supabase/migrations/01_core/20251201000003_create_user_tenant_roles.sql
✅ supabase/migrations/01_core/20251201000004_apply_core_rls_policies.sql
✅ supabase/seed/01_core_seed.sql
✅ supabase/MIGRATION-MAP.md
✅ supabase/README.md
```

---

### Milestone 2: Auth Flow (Target: Week 2-3)
**Status**: 🔴 NOT STARTED

**Tasks:**
- [ ] Create auth.users trigger (auto-create profile)
- [ ] Implement login page
- [ ] Implement register page
- [ ] Implement forgot password flow
- [ ] Setup middleware untuk protected routes
- [ ] Create Supabase client (browser & server)
- [ ] Test auth flow end-to-end
- [ ] Add error handling untuk auth errors

**Deliverable**: User bisa register, login, dan masuk dashboard kosong

---

### Milestone 3: Multi-Tenant Infrastructure (Target: Week 3-4)
**Status**: 🔴 NOT STARTED

**Tasks:**
- [ ] Create tenants table migration
- [ ] Create user_tenant_roles migration
- [ ] Implement RLS helper functions (get_active_tenant_id, has_role)
- [ ] Create tenant onboarding flow
- [ ] Implement tenant switcher component
- [ ] Test tenant isolation (create 2 tenants, verify data tidak bocor)
- [ ] Seed sample data (2-3 tenants untuk testing)

**Deliverable**: Multi-tenant infrastructure ready, RLS working

---

### Milestone 4: CRM Module (Target: Week 4-6)
**Status**: 🔴 NOT STARTED

**Tasks:**
- [ ] Create clients table migration + RLS
- [ ] Create client_assets table migration + RLS
- [ ] Create maintenance_history table migration + RLS
- [ ] Implement clientService (CRUD)
- [ ] Implement useClients hook
- [ ] Create ClientList component
- [ ] Create ClientForm component
- [ ] Create ClientDetail page
- [ ] Implement assetService
- [ ] Create AssetCard component
- [ ] Create Asset detail page
- [ ] Test dengan berbagai role (owner, admin, sales, client)

**Deliverable**: Admin bisa kelola clients & assets lengkap

---

### Milestone 5: Service Operations (Target: Week 6-8)
**Status**: 🔴 NOT STARTED

**Tasks:**
- [ ] Create service_orders migration + RLS
- [ ] Create quotation_items migration + RLS
- [ ] Create service_jobs migration + RLS
- [ ] Create job_assignments migration + RLS
- [ ] Create job_notes migration + RLS
- [ ] Implement orderService
- [ ] Implement jobService
- [ ] Create OrderList & OrderForm
- [ ] Create QuotationViewer
- [ ] Create JobKanban component (teknisi view)
- [ ] Create JobDetail page (update status, checklist)
- [ ] Implement job assignment flow (admin)
- [ ] Test workflow: create order → assign teknisi → update status

**Deliverable**: Core service operations working end-to-end

---

## 🗂️ DATABASE STATUS

### Tables Created: 0/37

**CORE / IDENTITY (0/3):**
- [ ] profiles
- [ ] user_tenant_roles
- [ ] permissions (optional)

**TENANT / COMPANY (0/3):**
- [ ] tenants
- [ ] branches
- [ ] tenant_settings

**CRM / CLIENT (0/3):**
- [ ] clients
- [ ] client_assets
- [ ] maintenance_history

**SERVICE OPERATIONS (0/7):**
- [ ] service_orders
- [ ] quotation_items
- [ ] service_jobs
- [ ] job_assignments
- [ ] job_checklists
- [ ] job_materials_used
- [ ] job_notes

**ASSETS & INVENTORY (0/6):**
- [ ] company_assets
- [ ] products
- [ ] warehouses
- [ ] warehouse_stocks
- [ ] stock_movements
- [ ] suppliers

**FINANCE (0/4):**
- [ ] invoices
- [ ] payments
- [ ] expenses
- [ ] cashflow_summary

**ANALYTICS (0/2):**
- [ ] kpi_metrics
- [ ] reports

**COMMUNICATION (0/4):**
- [ ] conversations
- [ ] conversation_participants
- [ ] messages
- [ ] notifications

**STOREFRONT (0/3):**
- [ ] storefront_pages
- [ ] service_catalog
- [ ] service_requests

**SALES PARTNER (0/2):**
- [ ] sales_partners
- [ ] partner_commissions

### Migrations Created: 0
**Location**: `/supabase/migrations/`

**Format**: `YYYYMMDDHHMMSS_description.sql`

**Next Migration Number**: `20251201000001`

---

## 🧩 DOMAIN MODULES STATUS

### Core Modules (0/3)
- [ ] domain/core/auth
- [ ] domain/core/tenant
- [ ] domain/core/user

### Business Modules (0/7)
- [ ] domain/crm/clients
- [ ] domain/crm/assets
- [ ] domain/service-ops/orders
- [ ] domain/service-ops/jobs
- [ ] domain/service-ops/scheduling
- [ ] domain/inventory/products
- [ ] domain/inventory/warehouses
- [ ] domain/inventory/suppliers
- [ ] domain/finance/invoices
- [ ] domain/finance/payments
- [ ] domain/finance/expenses

### Advanced Modules (0/5)
- [ ] domain/analytics/dashboards
- [ ] domain/analytics/reports
- [ ] domain/communication/chat
- [ ] domain/communication/notifications
- [ ] domain/storefront/catalog
- [ ] domain/sales-partner/commissions

---

## 🎨 UI COMPONENTS STATUS

### shadcn/ui Components Installed: 0
**Needed Components:**
- [ ] button
- [ ] input
- [ ] card
- [ ] dialog
- [ ] select
- [ ] table
- [ ] form
- [ ] label
- [ ] textarea
- [ ] dropdown-menu
- [ ] toast
- [ ] calendar
- [ ] date-picker
- [ ] tabs
- [ ] badge
- [ ] avatar
- [ ] separator

### Custom Components Created: 0
- [ ] DashboardLayout
- [ ] Sidebar
- [ ] Header
- [ ] TenantSwitcher
- [ ] Loading
- [ ] EmptyState
- [ ] ErrorBoundary
- [ ] ConfirmDialog

---

## 🔧 TECHNICAL DECISIONS LOG

### Decision 1: Use shadcn/ui instead of full component library
**Date**: December 1, 2025
**Reason**: More flexible, smaller bundle size, full control
**Impact**: Need to install components one by one
**Status**: ✅ Approved

### Decision 2: Use TanStack Query for data fetching
**Date**: December 1, 2025
**Reason**: Better caching, auto-refetch, optimistic updates
**Alternative**: SWR, React Server Components only
**Status**: ✅ Approved

### Decision 3: Use Zustand for global state (minimal)
**Date**: December 1, 2025
**Reason**: Lightweight, simple API, good for tenant context
**Alternative**: Redux Toolkit, Jotai, Context API
**Status**: ✅ Approved

### Decision 4: Domain-Driven folder structure
**Date**: December 1, 2025
**Reason**: Scalable, modular, clear separation of concerns
**Alternative**: Feature-based, flat structure
**Status**: ✅ Approved

---

## 🐛 KNOWN ISSUES & BLOCKERS

### Active Blockers: 0
*No blockers at the moment*

### Known Issues: 0
*No known issues yet*

### Technical Debt: 0
*Will be tracked as project progresses*

---

## 📦 DEPENDENCIES

### Production Dependencies (to be installed)
```json
{
  "next": "^14.2.0",
  "react": "^18.3.0",
  "react-dom": "^18.3.0",
  "@supabase/supabase-js": "^2.39.0",
  "@supabase/ssr": "^0.1.0",
  "@tanstack/react-query": "^5.17.0",
  "zustand": "^4.4.7",
  "react-hook-form": "^7.49.0",
  "zod": "^3.22.4",
  "@hookform/resolvers": "^3.3.3",
  "date-fns": "^3.0.0",
  "recharts": "^2.10.0",
  "clsx": "^2.1.0",
  "tailwind-merge": "^2.2.0",
  "lucide-react": "^0.309.0"
}
```

### Dev Dependencies (to be installed)
```json
{
  "typescript": "^5.3.0",
  "@types/node": "^20.10.0",
  "@types/react": "^18.2.0",
  "@types/react-dom": "^18.2.0",
  "tailwindcss": "^3.4.0",
  "postcss": "^8.4.0",
  "autoprefixer": "^10.4.0",
  "eslint": "^8.56.0",
  "eslint-config-next": "^14.2.0",
  "prettier": "^3.1.0",
  "vitest": "^1.1.0",
  "@playwright/test": "^1.40.0"
}
```

### Installation Status: ⬜ Not Installed

---

## 🔐 ENVIRONMENT VARIABLES

### Required Variables
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://tukbuzdngodvcysncwke.supabase.co          # ✅ Set
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...     # ✅ Set
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...         # ✅ Set

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000               # ✅ Set (dev)
NEXT_PUBLIC_APP_NAME=Djawara HVAC Platform              # ✅ Set

# Features (optional)
NEXT_PUBLIC_ENABLE_CHAT=true           # ✅ Set
NEXT_PUBLIC_ENABLE_ANALYTICS=true      # ✅ Set
```

### Setup Status: ✅ Fully Configured

---

## 🧪 TESTING STATUS

### Unit Tests: 0/0 (Not Started)
### Integration Tests: 0/0 (Not Started)
### E2E Tests: 0/0 (Not Started)

### Test Coverage: N/A

---

## 📝 NEXT ACTIONS (Priority Order)

### Immediate (This Week)
1. **Create Supabase Project**
   - Assignee: [Owner/Developer Name]
   - Deadline: [Date]
   - Status: 🔴 TODO

2. **Initialize Next.js Project**
   - Assignee: [Owner/Developer Name]
   - Deadline: [Date]
   - Status: 🔴 TODO

3. **Setup Folder Structure**
   - Assignee: [Owner/Developer Name]
   - Deadline: [Date]
   - Status: 🔴 TODO

### Short Term (Next 2 Weeks)
4. **Create Initial Migrations (Core Tables)**
   - Tables: tenants, profiles, user_tenant_roles
   - Assignee: [Owner/Developer Name]
   - Status: 🔴 TODO

5. **Implement Auth Flow**
   - Pages: login, register, forgot-password
   - Assignee: [Owner/Developer Name]
   - Status: 🔴 TODO

6. **Setup RLS Helper Functions**
   - Functions: get_active_tenant_id, has_role
   - Assignee: [Owner/Developer Name]
   - Status: 🔴 TODO

### Medium Term (Next Month)
7. **Build CRM Module**
   - Assignee: [Owner/Developer Name]
   - Status: 🔴 TODO

8. **Build Service Operations Module**
   - Assignee: [Owner/Developer Name]
   - Status: 🔴 TODO

---

## 🎯 SPRINT PLANNING

### Current Sprint: N/A (Pre-Development)
**Start Date**: Not Started
**End Date**: Not Started
**Goals**: N/A

### Sprint Backlog: Empty

### Completed Sprints: 0

---

## 📚 CODE QUALITY METRICS

### Code Review Status
- **Pending Review**: 0 PRs
- **Approved**: 0 PRs
- **Merged**: 0 PRs

### Code Standards
- **ESLint Errors**: N/A
- **TypeScript Errors**: N/A
- **Build Status**: N/A

---

## 🚀 DEPLOYMENT STATUS

### Environments

**Production**
- URL: Not Deployed
- Last Deploy: N/A
- Status: 🔴 Not Ready

**Staging**
- URL: Not Deployed
- Last Deploy: N/A
- Status: 🔴 Not Ready

**Development**
- URL: http://localhost:3000
- Status: 🔴 Not Running

---

## 📊 PERFORMANCE METRICS

### Current Metrics: N/A (No Data Yet)

**Target Metrics:**
- Page Load Time: < 2s
- API Response Time: < 500ms
- Lighthouse Score: > 90
- Core Web Vitals: All Green

---

## 🔄 RECENT UPDATES

### December 1, 2025
**Changed:**
- ✅ Created PANDUAN-AWAL.md (architecture blueprint complete)
- ✅ Created OVERVIEW-TEKNIS.md (this file)
- ✅ Completed architecture design (all 6 phases)

**Next:**
- Create Supabase project
- Initialize Next.js project
- Start Milestone 1: Foundation Setup

---

## 💬 NOTES FOR AI AGENTS

### Context untuk AI Agent yang Baru Join
Jika kamu adalah AI Agent yang baru mulai bekerja di project ini:

1. **WAJIB baca** PANDUAN-AWAL.md terlebih dahulu
2. **Pahami** current phase dan progress (lihat Status Project di atas)
3. **Check** next actions dan ambil task yang sesuai skill/scope kamu
4. **Jangan** mulai coding sebelum:
   - Memahami domain yang relevan
   - Tahu RLS pattern yang harus digunakan
   - Clear tentang deliverable task
5. **SELALU update** dokumen ini setelah selesai task

### Template Update Progress
Setiap kali selesai task, update bagian yang relevan dengan format:

```markdown
### [Date] - [Your Name/Agent ID]
**Task**: [Nama task]
**Domain**: [Domain yang dikerjakan]
**Changes**:
- Created: [File/tabel yang dibuat]
- Modified: [File yang diubah]
- Testing: [Hasil testing]

**Status**: ✅ DONE / 🟡 IN PROGRESS / 🔴 BLOCKED

**Notes**: [Catatan penting, blocker, atau pertanyaan]

**Next Task**: [Task selanjutnya yang akan dikerjakan]
```

### Cara Report Blocker
Jika menemukan blocker, tambahkan di bagian "Known Issues & Blockers":

```markdown
### Blocker #[number]: [Judul Blocker]
**Date**: [Date]
**Reported By**: [Your Name]
**Severity**: 🔴 Critical / 🟡 Medium / 🟢 Low
**Description**: [Deskripsi blocker]
**Impact**: [Apa yang terblokir]
**Possible Solution**: [Saran solusi jika ada]
**Status**: 🔴 OPEN / 🟡 INVESTIGATING / ✅ RESOLVED
```

### Cara Request Clarification
Jika butuh klarifikasi, jangan asumsikan. Tulis pertanyaan di bagian ini:

```markdown
## ❓ PENDING QUESTIONS

### Question #[number]: [Judul Pertanyaan]
**Asked By**: [Your Name]
**Date**: [Date]
**Context**: [Context pertanyaan]
**Question**: [Pertanyaan spesifik]
**Urgency**: 🔴 Urgent / 🟡 Normal / 🟢 Low
**Answer**: [Akan diisi oleh owner/lead]
**Status**: ⬜ PENDING / ✅ ANSWERED
```

---

## 🎓 ONBOARDING CHECKLIST UNTUK AI AGENT BARU

Sebelum mulai coding, pastikan sudah:
- [ ] Baca PANDUAN-AWAL.md lengkap (minimal 30 menit)
- [ ] Baca OVERVIEW-TEKNIS.md ini lengkap
- [ ] Pahami tech stack (Supabase + Next.js + Vercel)
- [ ] Pahami konsep multi-tenant & RLS
- [ ] Tahu struktur folder yang digunakan
- [ ] Tahu naming conventions
- [ ] Tahu RLS patterns (minimal 5 pattern utama)
- [ ] Tahu flow tenant isolation
- [ ] Setup local environment (jika sudah ada codebase)
- [ ] Test login dengan sample data (jika sudah ada)

Setelah onboarding, update status di sini:
```markdown
### AI Agent: [Your Name/ID]
**Joined**: [Date]
**Onboarding Completed**: [Date]
**Assigned Domain**: [Domain yang akan handle]
**Current Task**: [Task pertama]
```

---

## 📞 ESCALATION PATH

### Jika Butuh Keputusan Teknis
1. Check PANDUAN-AWAL.md (mungkin sudah ada jawabannya)
2. Check Technical Decisions Log (apakah sudah pernah dibahas)
3. Jika tidak ada, tambahkan di Pending Questions
4. Tag owner/lead developer

### Jika Menemukan Bug Critical
1. Report di Known Issues & Blockers
2. Tandai severity sebagai 🔴 Critical
3. Stop development di area tersebut
4. Segera notify owner/lead

### Jika Estimasi Task Meleset >50%
1. Update progress di Sprint Planning
2. Breakdown task jadi lebih kecil
3. Report blocker jika ada
4. Diskusikan re-prioritization

---

## 🔮 FUTURE ENHANCEMENTS (Backlog)

Fitur-fitur yang bagus tapi belum prioritas (bisa dikerjakan di Fase 4+):

**AI & Machine Learning:**
- [ ] AI-powered auto-assignment (ML model)
- [ ] Predictive maintenance (prediksi breakdown)
- [ ] Smart scheduling optimization

**Integration:**
- [ ] IoT integration (sensor AC real-time)
- [ ] WhatsApp Business API integration
- [ ] Payment gateway (Stripe/Xendit)
- [ ] E-Faktur integration (Indonesia tax)

**Mobile:**
- [ ] React Native app (iOS/Android)
- [ ] Advanced offline mode
- [ ] Biometric authentication

**Enterprise:**
- [ ] SSO (SAML, OAuth2)
- [ ] Custom permissions per tenant
- [ ] Audit log & compliance
- [ ] Data export API
- [ ] White-label (custom branding)

**Business:**
- [ ] Subscription billing automation
- [ ] Multi-currency support
- [ ] Payroll system
- [ ] Contract management
- [ ] Franchise management

---

## 📄 APPENDIX

### A. Migration Naming Convention
```
YYYYMMDDHHMMSS_description.sql

Examples:
20251201000001_create_tenants_table.sql
20251201000002_create_profiles_table.sql
20251201000003_create_user_tenant_roles_table.sql
20251201000004_add_rls_to_tenants.sql
20251201000005_create_helper_functions.sql
```

### B. Branch Naming Convention
```
feature/[domain]-[description]
bugfix/[issue-description]
hotfix/[critical-issue]

Examples:
feature/crm-client-management
feature/service-ops-job-kanban
bugfix/rls-tenant-isolation
hotfix/payment-calculation-error
```

### C. PR Template
```markdown
## Description
[Deskripsi perubahan]

## Type of Change
- [ ] New feature
- [ ] Bug fix
- [ ] Refactoring
- [ ] Documentation
- [ ] Performance improvement

## Domain
[Domain yang diubah]

## Changes Made
- [Change 1]
- [Change 2]

## Testing Done
- [ ] Tested with owner role
- [ ] Tested with admin role
- [ ] Tested with technician role
- [ ] Tested tenant isolation
- [ ] Manual testing
- [ ] Unit tests added/updated

## Screenshots (if UI changes)
[Attach screenshots or video]

## Checklist
- [ ] Code follows project conventions
- [ ] Documentation updated (if needed)
- [ ] No console errors
- [ ] TypeScript types correct
- [ ] RLS policies working
- [ ] Tested on mobile view (if UI)

## Related Issues
Closes #[issue number]
```

---

## 🏁 VERSION HISTORY

### v0.1.0 - December 1, 2025
- Initial document creation
- Architecture design complete
- Pre-development phase

---

**DOKUMEN INI HARUS SELALU UP-TO-DATE**

Setiap AI Agent yang selesai task WAJIB update dokumen ini dengan progress terbaru.

Jika ada yang outdated atau tidak akurat, segera perbaiki dan commit.

**Last Updated**: December 1, 2025
**Updated By**: Initial Setup
**Next Review**: [Setelah Milestone 1 selesai]

---

*Catatan: Dokumen ini akan terus berkembang seiring development progress. Pastikan selalu check version terbaru sebelum start task.*
