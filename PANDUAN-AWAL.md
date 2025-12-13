# PANDUAN AWAL - DJAWARA HVAC PLATFORM
## Blueprint Lengkap untuk AI Agent & Developer

> **Dokumen ini adalah GRAND PLAN lengkap** untuk membangun platform SaaS multi-tenant untuk perusahaan jasa spesialis (HVAC/AC Service). Setiap AI Agent atau developer yang mengerjakan platform ini WAJIB membaca dokumen ini terlebih dahulu.

---

## 📋 DAFTAR ISI

1. [Konteks & Tujuan Platform](#konteks--tujuan-platform)
2. [Stakeholder & Role](#stakeholder--role)
3. [Fitur Platform (High-Level)](#fitur-platform-high-level)
4. [Tech Stack (Non-Negotiable)](#tech-stack-non-negotiable)
5. [Domain Architecture](#domain-architecture)
6. [Multi-Tenant & Role Design](#multi-tenant--role-design)
7. [Database Schema (37 Tabel)](#database-schema-37-tabel)
8. [RLS & Security Patterns](#rls--security-patterns)
9. [Folder Structure](#folder-structure)
10. [Roadmap Implementasi (3 Fase)](#roadmap-implementasi-3-fase)
11. [Aturan Kerja untuk AI Agent](#aturan-kerja-untuk-ai-agent)

---

## 🎯 KONTEKS & TUJUAN PLATFORM

### Nama Platform
**Djawara HVAC Platform** (bisa diganti nama sesuai branding)

### Deskripsi
Platform **SaaS Multi-Tenant** untuk perusahaan jasa spesialis (AC Service, HVAC, Electrical, dll.) yang mendukung:
- Operasional end-to-end: Order → Scheduling → Eksekusi → Invoice → Analytics
- Multi-tenant: 1 platform bisa dipakai banyak perusahaan (franchise/subscription model)
- Data isolation 100%: Data antar perusahaan TIDAK pernah campur
- Multi-role: Owner, Investor, Admin, Teknisi, Sales Mitra, Client

### Nilai Bisnis Utama
1. **Owner**: Monitor cashflow & pertumbuhan bisnis real-time
2. **Teknisi**: Jadwal terstruktur, task jelas, absensi digital
3. **Client**: Transparansi (tracking order, histori maintenance)
4. **Sales Mitra**: Kelola client sendiri dengan monitoring penuh
5. **Investor**: Lihat ROI dan kesehatan bisnis

### Target Market
- Perusahaan jasa AC/HVAC kecil-menengah (5-50 teknisi)
- Franchise AC service
- Freelance teknisi yang mau kelola client mereka
- Investor yang ingin monitor bisnis jasa

---

## 👥 STAKEHOLDER & ROLE

### 1. **Owner** (Pemilik Perusahaan)
**Akses:**
- Lihat semua data di perusahaannya (tenant)
- Analisis cashflow, growth, behavior customer
- Approval keputusan besar (pengeluaran >10jt, kebijakan)
- Monitoring jadwal & rekap proyek

**Fitur Khusus:**
- Dashboard analytics lengkap
- Approval workflow
- User & role management
- Tenant settings

---

### 2. **Investor**
**Akses:**
- Read-only untuk analytics & finance summary
- Lihat laju pertumbuhan bisnis (return, pipeline, health)

**Fitur Khusus:**
- ROI dashboard
- Growth trend chart
- Business health score

---

### 3. **Admin Keuangan**
**Akses:**
- Full access ke finance domain
- CRUD invoice, payment, expense
- Cashflow report

**Fitur Khusus:**
- Invoice generator
- Payment tracking
- Expense approval request

---

### 4. **Admin Logistik**
**Akses:**
- Full access ke inventory & supplier
- Kelola stok, warehouse, alat kerja
- Purchase order (opsional)

**Fitur Khusus:**
- Stock management
- Low stock alert
- Supplier database

---

### 5. **Kepala Teknisi / Tech Head**
**Akses:**
- Kelola tim teknisi
- Assign & reschedule job
- Evaluasi kinerja tim

**Fitur Khusus:**
- Team dashboard
- Job assignment
- Performance analytics

---

### 6. **Teknisi Reguler**
**Akses:**
- Lihat job yang di-assign ke dirinya
- Update status job, input hasil kerja
- Input material terpakai
- Absensi (check-in/check-out)

**Fitur Khusus:**
- Kanban board (my jobs)
- Job checklist
- Material usage form
- Upload foto hasil kerja

---

### 7. **Helper** (Asisten Teknisi)
**Akses:**
- Sama dengan teknisi tapi lebih terbatas
- Tidak bisa assign job ke orang lain

---

### 8. **Sales Mitra / Partner**
**Akses:**
- Input order dari client freelance mereka
- Lihat monitoring dashboard (penjadwalan, laporan, total pelanggan)
- Track komisi

**Fitur Khusus:**
- My clients dashboard
- Order input form
- Commission tracker

---

### 9. **Client - Rumah** (Household)
**Akses:**
- Lihat order & aset mereka
- Request service via storefront
- Track order status
- Lihat histori maintenance

**Fitur Khusus:**
- Client portal (dashboard sederhana)
- Order history
- Asset maintenance log
- Approve quotation via link (tanpa login)

---

### 10. **Client - Kantor/Industri** (Corporate)
**Akses:**
- Sama dengan household, tapi bisa multi-user per perusahaan
- Lihat semua unit AC di gedung mereka

**Fitur Khusus:**
- Multi-location asset tracking
- Contract management (SLA)
- Bulk service request

---

## 🎨 FITUR PLATFORM (HIGH-LEVEL)

### Core Features (MVP - Fase 1)
- ✅ **CRM**: Database pelanggan & aset unit AC mereka
- ✅ **Service Operations**: Order → Job → Assignment → Update Status
- ✅ **Inventory**: Sparepart, stok, warehouse
- ✅ **Finance**: Invoice, payment, expense (basic)
- ✅ **User Management**: Auth, role, permission

### Advanced Features (Fase 2)
- ✅ **Multi-Tenant**: Support banyak perusahaan dengan data terpisah
- ✅ **Sales Partner**: Sales mitra bisa kelola client mereka
- ✅ **Client Portal**: Client bisa login & lihat histori
- ✅ **Storefront**: Landing page public per tenant (subdomain)
- ✅ **Quotation Link**: Client approve penawaran tanpa login

### Premium Features (Fase 3)
- ✅ **Analytics**: Dashboard kaya grafik (cashflow, growth, KPI)
- ✅ **Communication**: Chat internal + notification (email/WhatsApp)
- ✅ **Automation**: Auto-assign job, recurring maintenance
- ✅ **Mobile**: PWA (installable, offline mode)
- ✅ **Reporting**: Export PDF/Excel

---

## 🛠️ TECH STACK (NON-NEGOTIABLE)

### Backend
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (email/password, OAuth)
- **RLS**: Row Level Security untuk tenant isolation
- **Realtime**: Supabase Realtime (untuk chat)
- **Storage**: Supabase Storage (foto, dokumen)
- **Edge Functions**: Supabase Edge Functions (serverless)

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui
- **State Management**: TanStack Query + Zustand
- **Forms**: React Hook Form + Zod

### Deployment
- **Hosting**: Vercel
- **CI/CD**: GitHub Actions (optional) atau Vercel auto-deploy
- **Domain**: Wildcard subdomain untuk storefront (`*.platform.com`)

### Development Tools
- **Package Manager**: npm atau pnpm
- **Linter**: ESLint
- **Formatter**: Prettier
- **Testing**: Vitest (unit) + Playwright (E2E)
- **Version Control**: Git + GitHub

---

## 🏗️ DOMAIN ARCHITECTURE

Platform dibagi menjadi **10 domain utama**:

### 1. CORE / IDENTITY DOMAIN
**Tujuan**: Mengelola identitas user, auth, role, tenant

**Entitas Utama**:
- `profiles` (extended dari auth.users)
- `user_tenant_roles` (junction table)
- `permissions` (optional)

**Aktor**: Semua user

**Use Case**:
- User register & login
- Assign role ke user
- Switch tenant (jika user punya akses ke >1 tenant)
- Permission checking

---

### 2. TENANT / COMPANY DOMAIN
**Tujuan**: Mengelola perusahaan jasa yang subscribe platform

**Entitas Utama**:
- `tenants` (perusahaan)
- `branches` (cabang)
- `tenant_settings` (konfigurasi)

**Aktor**: Owner, Admin

**Use Case**:
- Register tenant baru (onboarding)
- Kelola data perusahaan
- Kelola cabang (multi-lokasi)
- Konfigurasi (jam kerja, zona layanan)

---

### 3. CRM / CLIENT DOMAIN
**Tujuan**: Mengelola data pelanggan & aset unit mereka

**Entitas Utama**:
- `clients` (pelanggan)
- `client_assets` (unit AC/HVAC)
- `maintenance_history` (histori maintenance)

**Aktor**: Admin, Sales Mitra, Client (read-only)

**Use Case**:
- CRUD pelanggan
- Manage aset/unit AC per pelanggan
- Lihat histori maintenance
- Segmentasi pelanggan (VIP, reguler, one-time)

---

### 4. SERVICE OPERATIONS DOMAIN
**Tujuan**: Mengelola siklus pekerjaan dari request → selesai

**Entitas Utama**:
- `service_orders` (order/request service)
- `quotation_items` (item penawaran)
- `service_jobs` (breakdown pekerjaan)
- `job_assignments` (assign teknisi)
- `job_checklists` (checklist kerja)
- `job_materials_used` (material terpakai)
- `job_notes` (catatan progress)

**Aktor**: Admin, Tech Head, Teknisi, Client, Sales

**Use Case**:
- Terima request service
- Buat quotation & kirim ke client
- Client approve/reject quotation
- Assign teknisi ke job
- Kanban board pekerjaan
- Update status real-time
- Input material terpakai
- Absensi teknisi
- Reschedule job

---

### 5. ASSETS & INVENTORY DOMAIN
**Tujuan**: Mengelola aset perusahaan & stok sparepart

**Entitas Utama**:
- `company_assets` (alat kerja, kendaraan)
- `products` (sparepart/produk)
- `warehouses` (gudang)
- `warehouse_stocks` (stok per gudang)
- `stock_movements` (log pergerakan stok)
- `suppliers` (supplier)

**Aktor**: Admin Logistik, Teknisi (read-only)

**Use Case**:
- CRUD alat kerja
- Assign alat ke teknisi
- CRUD sparepart
- Manage stok per gudang
- Stock in/out
- Low stock alert
- Supplier database

---

### 6. FINANCE DOMAIN
**Tujuan**: Mengelola transaksi keuangan

**Entitas Utama**:
- `invoices` (tagihan)
- `payments` (pembayaran)
- `expenses` (pengeluaran)
- `cashflow_summary` (summary cashflow)

**Aktor**: Owner, Admin Finance, Investor (read-only)

**Use Case**:
- Generate invoice dari order
- Catat pembayaran (cash, transfer, cicilan)
- Catat pengeluaran
- Approval pengeluaran besar (owner)
- Cashflow report

---

### 7. ANALYTICS & REPORTING DOMAIN
**Tujuan**: Dashboard & laporan untuk berbagai role

**Entitas Utama**:
- `kpi_metrics` (KPI denormalized)
- `reports` (generated reports)

**Aktor**: Owner, Investor, Tech Head, Sales

**Use Case**:
- Dashboard owner (cashflow, revenue, job completion)
- Dashboard investor (ROI, growth)
- Dashboard sales (client count, komisi)
- Dashboard tech head (kinerja tim)
- Export report (PDF/Excel)

---

### 8. COMMUNICATION DOMAIN
**Tujuan**: Chat & notifikasi

**Entitas Utama**:
- `conversations` (thread chat)
- `conversation_participants` (peserta chat)
- `messages` (pesan)
- `notifications` (notifikasi)

**Aktor**: Semua user

**Use Case**:
- Chat internal (admin ↔ teknisi)
- Chat support (client ↔ perusahaan)
- Notifikasi (job assigned, status changed, payment, dll.)
- Generate quotation link (public)

---

### 9. STOREFRONT / MARKETPLACE DOMAIN
**Tujuan**: Halaman public per tenant

**Entitas Utama**:
- `storefront_pages` (konten halaman)
- `service_catalog` (katalog layanan)
- `service_requests` (request dari public)

**Aktor**: Client (public), Admin (setup)

**Use Case**:
- Landing page per tenant (subdomain)
- Service catalog
- Request service form (tanpa login)
- Track order via kode booking
- Login client untuk histori lengkap

---

### 10. SALES PARTNER / MITRA DOMAIN
**Tujuan**: Kelola sales mitra/freelance

**Entitas Utama**:
- `sales_partners` (profile mitra)
- `partner_commissions` (komisi)

**Aktor**: Sales Mitra, Admin

**Use Case**:
- Sales input order dari client mereka
- Dashboard sales (client, order, transaksi)
- Track laporan per client
- Hitung & track komisi

---

## 🔐 MULTI-TENANT & ROLE DESIGN

### Konsep Multi-Tenant
- **Shared Database, Shared Schema**
- Setiap tabel transaksional punya kolom `tenant_id`
- RLS (Row Level Security) memastikan data antar tenant tidak bocor
- 1 user bisa punya banyak role di banyak tenant

### Struktur Tenant
```
tenants (perusahaan)
  ↓
branches (cabang, opsional)
  ↓
user_tenant_roles (user + role di tenant tertentu)
```

### Flow Tenant Selection
```
User Login
  ↓
Fetch user_tenant_roles (user punya akses ke tenant mana saja?)
  ↓
Jika >1 tenant: tampilkan tenant switcher
  ↓
User pilih tenant → set active_tenant_id di profiles
  ↓
Semua query otomatis filter by active_tenant_id (via RLS)
```

### Role & Permission Matrix

| Role | Finance | Service Ops | Inventory | Analytics | Approval |
|------|---------|-------------|-----------|-----------|----------|
| **Owner** | FULL | FULL | FULL | FULL | YES |
| **Investor** | Summary | - | - | LIMITED | - |
| **Admin Finance** | FULL | View | - | Finance | Request |
| **Admin Logistic** | - | View | FULL | Logistic | - |
| **Tech Head** | - | FULL | View | Team KPI | - |
| **Technician** | - | Assigned | Use | - | - |
| **Helper** | - | Assigned | Use | - | - |
| **Sales Partner** | My Comm | View Own | - | My Stats | - |
| **Client** | Invoice | Own | - | - | - |

---

## 🗄️ DATABASE SCHEMA (37 TABEL)

### DOMAIN 1: CORE / IDENTITY (3 tabel)
1. **profiles** - Extended user profile
2. **user_tenant_roles** - Junction user ↔ tenant ↔ role
3. **permissions** - Granular permissions (opsional)

### DOMAIN 2: TENANT / COMPANY (3 tabel)
4. **tenants** - Perusahaan jasa
5. **branches** - Cabang perusahaan
6. **tenant_settings** - Konfigurasi per tenant

### DOMAIN 3: CRM / CLIENT (3 tabel)
7. **clients** - Database pelanggan
8. **client_assets** - Unit/aset milik client
9. **maintenance_history** - Histori maintenance per aset

### DOMAIN 4: SERVICE OPERATIONS (7 tabel)
10. **service_orders** - Order/request service
11. **quotation_items** - Item dalam penawaran
12. **service_jobs** - Breakdown pekerjaan
13. **job_assignments** - Assignment teknisi
14. **job_checklists** - Checklist pekerjaan
15. **job_materials_used** - Material terpakai
16. **job_notes** - Catatan progress

### DOMAIN 5: ASSETS & INVENTORY (6 tabel)
17. **company_assets** - Alat kerja perusahaan
18. **products** - Katalog sparepart/produk
19. **warehouses** - Gudang
20. **warehouse_stocks** - Stok per gudang
21. **stock_movements** - Log pergerakan stok
22. **suppliers** - Database supplier

### DOMAIN 6: FINANCE (4 tabel)
23. **invoices** - Invoice/tagihan
24. **payments** - Pembayaran
25. **expenses** - Pengeluaran
26. **cashflow_summary** - Summary cashflow (materialized view)

### DOMAIN 7: ANALYTICS (2 tabel)
27. **kpi_metrics** - KPI denormalized
28. **reports** - Generated reports

### DOMAIN 8: COMMUNICATION (4 tabel)
29. **conversations** - Thread chat
30. **conversation_participants** - Peserta chat
31. **messages** - Pesan
32. **notifications** - Notifikasi

### DOMAIN 9: STOREFRONT (3 tabel)
33. **storefront_pages** - Konten halaman public
34. **service_catalog** - Katalog layanan
35. **service_requests** - Request dari public (lead)

### DOMAIN 10: SALES PARTNER (2 tabel)
36. **sales_partners** - Profile sales mitra
37. **partner_commissions** - Komisi per transaksi

### Aturan Tabel
**WAJIB di semua tabel transaksional:**
- `id` (uuid, PK)
- `tenant_id` (uuid, FK → tenants.id)
- `created_at`, `updated_at` (timestamp)

**WAJIB di tabel sensitif:**
- `created_by`, `updated_by`, `deleted_by` (uuid, FK → profiles.id)
- `deleted_at` (timestamp, untuk soft delete)

**Gunakan:**
- UUID untuk semua PK (bukan integer auto-increment)
- JSONB untuk data semi-structured (metadata, custom_fields)
- ENUM atau CHECK constraint untuk status fields

---

## 🛡️ RLS & SECURITY PATTERNS

### Pattern 1: TENANT ISOLATION (Universal)
**Fungsi**: User hanya akses data di tenant mereka

```sql
-- Helper function
CREATE FUNCTION auth.get_active_tenant_id() RETURNS uuid AS $$
BEGIN
  RETURN (SELECT active_tenant_id FROM profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Policy (apply ke semua tabel)
CREATE POLICY "tenant_isolation"
ON [table_name]
FOR ALL
USING (tenant_id = auth.get_active_tenant_id());
```

---

### Pattern 2: ROLE-BASED FULL ACCESS
**Fungsi**: Owner & Admin lihat semua data di tenant

```sql
-- Helper function
CREATE FUNCTION auth.has_role(check_roles text[]) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_tenant_roles
    WHERE user_id = auth.uid()
      AND tenant_id = auth.get_active_tenant_id()
      AND role = ANY(check_roles)
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Policy
CREATE POLICY "owner_admin_full_access"
ON [table_name]
FOR ALL
USING (auth.has_role(ARRAY['owner', 'admin_finance', 'admin_logistic']));
```

---

### Pattern 3: ASSIGNED DATA ONLY
**Fungsi**: Teknisi hanya lihat job mereka

```sql
CREATE POLICY "technician_assigned_jobs"
ON service_jobs
FOR SELECT
USING (
  id IN (
    SELECT service_job_id FROM job_assignments 
    WHERE assigned_to_user_id = auth.uid()
  )
  OR
  auth.has_role(ARRAY['owner', 'tech_head'])
);
```

---

### Pattern 4: OWN DATA ONLY
**Fungsi**: Client hanya lihat data mereka

```sql
CREATE POLICY "client_own_orders"
ON service_orders
FOR SELECT
USING (
  client_id IN (
    SELECT id FROM clients WHERE user_id = auth.uid()
  )
  OR
  auth.has_role(ARRAY['owner', 'admin_finance'])
);
```

---

### Pattern 5: SALES PARTNER SCOPE
**Fungsi**: Sales hanya lihat client & order mereka

```sql
CREATE POLICY "sales_partner_own_clients"
ON clients
FOR SELECT
USING (
  sales_partner_id = auth.uid()
  OR
  auth.has_role(ARRAY['owner', 'admin_finance'])
);
```

---

### Security Checklist
- ✅ Semua tabel WAJIB enable RLS
- ✅ Tidak ada tabel tanpa policy (default = deny all)
- ✅ Tenant isolation di SEMUA policy
- ✅ Test RLS dengan berbagai role sebelum production
- ✅ Audit trail untuk tabel kritis (finance, approval)
- ✅ Soft delete untuk data penting (jangan hard delete)

---

## 📁 FOLDER STRUCTURE

```
djawara-hvac/
├── supabase/
│   ├── migrations/              # Database migrations
│   ├── functions/               # Edge Functions
│   ├── seed.sql                 # Sample data
│   └── config.toml
│
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── (auth)/              # Auth pages (login, register)
│   │   ├── (dashboard)/         # Internal dashboard
│   │   │   ├── owner/           # Owner views
│   │   │   ├── investor/        # Investor views
│   │   │   ├── admin/           # Admin views (finance + logistic)
│   │   │   ├── tech-head/       # Tech head views
│   │   │   ├── technician/      # Teknisi views
│   │   │   ├── sales/           # Sales partner views
│   │   │   └── shared/          # Shared views (clients, orders, jobs)
│   │   ├── (client)/            # Client portal
│   │   ├── (storefront)/        # Public storefront
│   │   │   └── [tenantSlug]/    # Dynamic tenant route
│   │   └── api/                 # API routes (minimal)
│   │
│   ├── domain/                  # Domain-Driven Design
│   │   ├── core/                # Auth, tenant, user
│   │   ├── crm/                 # Clients, assets
│   │   ├── service-ops/         # Orders, jobs, scheduling
│   │   ├── inventory/           # Products, warehouses, suppliers
│   │   ├── finance/             # Invoices, payments, expenses
│   │   ├── analytics/           # Dashboards, reports, KPI
│   │   ├── communication/       # Chat, notifications
│   │   ├── storefront/          # Catalog, requests, tracking
│   │   └── sales-partner/       # Commissions, dashboard
│   │
│   ├── components/              # Shared components
│   │   ├── ui/                  # shadcn/ui components
│   │   ├── layouts/             # Layouts (sidebar, header)
│   │   ├── forms/               # Form components
│   │   └── common/              # Common components
│   │
│   ├── lib/                     # Core utilities
│   │   ├── supabase/            # Supabase clients
│   │   ├── utils/               # Helpers, formatters
│   │   └── hooks/               # Global hooks
│   │
│   ├── styles/                  # Global styles
│   └── middleware.ts            # Auth middleware
│
├── .env.local
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

### Struktur Domain (DDD Pattern)
```
domain/
  └── [domain-name]/
      └── [subdomain]/
          ├── hooks/        # React hooks (useClients, useOrders)
          ├── services/     # Business logic + Supabase queries
          ├── components/   # Domain-specific UI
          └── types/        # TypeScript types
```

---

## 🗺️ ROADMAP IMPLEMENTASI (3 FASE)

### FASE 1: MVP - SINGLE TENANT (8 minggu)
**Tujuan**: Platform minimal untuk 1 perusahaan

**Sprint 1-2: Foundation & Auth**
- Setup Supabase + Next.js
- Auth flow (login, register)
- Dashboard layout
- RLS basic

**Sprint 3-4: CRM & Client Management**
- CRUD clients
- CRUD client assets
- Maintenance history

**Sprint 5-6: Service Operations**
- Service orders & quotation
- Service jobs & assignments
- Kanban board untuk teknisi

**Sprint 7-8: Basic Inventory & Finance**
- Products & stock management
- Invoices & payments
- Basic expense tracking

**Deliverable**: 1 perusahaan bisa operasional penuh

---

### FASE 2: MULTI-TENANT & SCALING (8 minggu)
**Tujuan**: Transform jadi SaaS multi-tenant

**Sprint 9-10: Multi-Tenant Infrastructure**
- Strengthen RLS
- Tenant onboarding flow
- Tenant switcher
- Testing dengan 3+ tenant

**Sprint 11-12: Role Management & Permissions**
- User invite system
- RBAC implementation
- Permission checks di UI

**Sprint 13-14: Sales Partner & Client Portal**
- Sales partner dashboard
- Client portal (login, histori)
- Commission tracking

**Sprint 15-16: Storefront & Public Pages**
- Landing page per tenant (subdomain)
- Service catalog
- Public request form
- Order tracking tanpa login

**Deliverable**: Platform siap onboarding banyak perusahaan

---

### FASE 3: ADVANCED FEATURES (8 minggu)
**Tujuan**: Competitive advantage features

**Sprint 17-18: Analytics & Dashboards**
- Owner dashboard (cashflow, growth)
- Investor dashboard (ROI)
- Sales & tech head dashboard
- Report generator (PDF/Excel)

**Sprint 19-20: Communication & Notifications**
- Internal chat (Supabase Realtime)
- Client support chat
- Email/push notifications
- Notification triggers

**Sprint 21-22: Automation & Scheduling**
- Auto-assign job
- Recurring maintenance jobs
- Calendar view (drag-drop)
- Cron jobs (reminder, summary)

**Sprint 23-24: Quotation Link & Mobile**
- Public quotation approval (tanpa login)
- PWA setup (installable)
- Offline mode untuk teknisi
- Mobile optimization

**Deliverable**: Platform production-ready dengan fitur lengkap

---

### Timeline Total
- **Dengan Team (2-3 orang)**: 24 minggu (6 bulan)
- **Solo Developer**: 36-48 minggu (9-12 bulan)

---

## 🤖 ATURAN KERJA UNTUK AI AGENT

### Prinsip Utama
1. **JANGAN PERNAH KELUAR DARI TECH STACK** yang sudah ditentukan (Supabase + Next.js + Vercel)
2. **IKUTI FOLDER STRUCTURE** yang sudah dirancang
3. **GUNAKAN RLS PATTERNS** yang sudah didefinisikan
4. **KONSISTEN DENGAN NAMING CONVENTIONS**
5. **SELALU VALIDASI TENANT ISOLATION** di setiap fitur baru

---

### Sebelum Mulai Coding
**WAJIB BACA:**
1. File ini (PANDUAN-AWAL.md)
2. OVERVIEW-TEKNIS.md (status progress & context)
3. Domain yang relevan dengan task kamu

**WAJIB TANYA:**
- "Fitur ini untuk role apa saja?"
- "Apakah perlu RLS policy baru?"
- "Apakah perlu migration baru?"

---

### Saat Membuat Fitur Baru
**Checklist:**
- ✅ Buat migration dulu (jika perlu tabel/kolom baru)
- ✅ Buat RLS policy sesuai pattern
- ✅ Buat service di `/domain/[domain]/[subdomain]/services/`
- ✅ Buat hook di `/domain/[domain]/[subdomain]/hooks/`
- ✅ Buat component di `/domain/[domain]/[subdomain]/components/`
- ✅ Buat page di `/app/[route-group]/[path]/`
- ✅ Test dengan berbagai role
- ✅ Update OVERVIEW-TEKNIS.md dengan progress

---

### Saat Debugging
**JANGAN:**
- ❌ Hapus RLS policy tanpa konsultasi
- ❌ Ubah tech stack
- ❌ Hard-code tenant_id
- ❌ Skip error handling
- ❌ Commit tanpa test

**LAKUKAN:**
- ✅ Check RLS policy dulu (80% bug karena RLS salah)
- ✅ Check active_tenant_id di user session
- ✅ Test dengan user dari tenant berbeda
- ✅ Log error dengan context lengkap
- ✅ Tulis unit test untuk bug fix

---

### Naming Conventions
**File:**
- Component: `PascalCase.tsx` (ClientForm.tsx)
- Hook: `camelCase.ts` dengan prefix "use" (useClients.ts)
- Service: `camelCase.ts` dengan suffix "Service" (clientService.ts)
- Type: `camelCase.types.ts` (client.types.ts)

**Code:**
- Variable/Function: `camelCase`
- Component: `PascalCase`
- Constant: `UPPER_SNAKE_CASE`
- Type/Interface: `PascalCase`

**Database:**
- Table: `snake_case` (service_orders)
- Column: `snake_case` (created_at)
- Enum: `snake_case` (pending_approval)

---

### Git Workflow
**Branch Naming:**
- Feature: `feature/domain-name-feature-description`
- Bugfix: `bugfix/issue-description`
- Hotfix: `hotfix/critical-issue`

**Commit Message:**
```
[DOMAIN] Deskripsi singkat

- Detail perubahan 1
- Detail perubahan 2

Related: #issue-number
```

Contoh:
```
[CRM] Add client assets management

- Create client_assets table migration
- Add RLS policies for client assets
- Implement AssetCard component
- Add asset detail page

Related: #12
```

---

### Testing Requirements
**Setiap PR WAJIB punya:**
- ✅ Test dengan minimal 2 role berbeda
- ✅ Test tenant isolation (data tidak bocor antar tenant)
- ✅ Test error handling (network error, validation error)
- ✅ Screenshot/video jika UI changes

**Critical Features (WAJIB unit test):**
- Finance (invoice, payment)
- RLS helper functions
- Auto-assignment logic
- Commission calculation

---

### Documentation Updates
**Setiap Fitur Baru:**
- Update OVERVIEW-TEKNIS.md:
  - Status progress
  - Fitur yang sudah selesai
  - Blocker (jika ada)
  - Next steps
- Update README.md (jika perlu):
  - Cara setup fitur baru
  - Environment variables baru

---

### Red Flags (Harus Konsultasi Dulu)
🚨 **STOP dan tanya owner jika:**
- Mau ubah database schema yang sudah production
- Mau hapus/ubah RLS policy yang sudah ada
- Mau ganti tech stack
- Mau tambah dependency baru (npm package)
- Estimasi task >3 hari (perlu breakdown)
- Ada breaking change di API/component

---

### Performance Guidelines
**Optimization:**
- Use React Server Components (RSC) untuk data fetching
- Use TanStack Query untuk caching
- Lazy load heavy components
- Optimize images dengan `next/image`
- Use database index untuk kolom yang sering di-query

**Avoid:**
- ❌ N+1 query problem
- ❌ Fetch data di loop
- ❌ Large bundle size (>500kb per route)
- ❌ Unoptimized images

---

### Security Guidelines
**ALWAYS:**
- ✅ Validate input di frontend & backend
- ✅ Sanitize user input (XSS prevention)
- ✅ Use parameterized queries (SQL injection prevention)
- ✅ Verify tenant_id di setiap operation
- ✅ Rate limiting untuk public endpoint

**NEVER:**
- ❌ Expose sensitive data di client
- ❌ Trust client-side validation saja
- ❌ Hard-code credentials
- ❌ Disable RLS (even untuk testing)
- ❌ Use `SELECT *` tanpa RLS

---

## 📞 COMMUNICATION PROTOCOL

### Daily Standup (untuk Team)
**Format:**
1. Apa yang dikerjakan kemarin?
2. Apa yang akan dikerjakan hari ini?
3. Ada blocker?

### Weekly Review
**Format:**
1. Progress vs roadmap (%)
2. Fitur yang selesai minggu ini
3. Blocker yang resolved
4. Blocker yang belum resolved
5. Plan minggu depan

### Bug Report
**Format:**
```markdown
## Bug Description
[Deskripsi singkat bug]

## Steps to Reproduce
1. [Step 1]
2. [Step 2]
3. [Step 3]

## Expected Behavior
[Apa yang seharusnya terjadi]

## Actual Behavior
[Apa yang benar-benar terjadi]

## Environment
- Role: [owner/admin/technician/client]
- Tenant: [tenant slug]
- Browser: [Chrome/Firefox/Safari]
- Device: [Desktop/Mobile]

## Screenshots/Logs
[Attach screenshot atau error log]
```

---

## 🎯 SUCCESS METRICS

### Fase 1 (MVP)
- ✅ 1 perusahaan adopsi & pakai minimal 3 bulan
- ✅ 80%+ user satisfaction
- ✅ 0 critical bugs setelah 1 bulan

### Fase 2 (Multi-Tenant)
- ✅ 10 perusahaan onboard
- ✅ 5 paying customer
- ✅ MRR > $500

### Fase 3 (Advanced)
- ✅ 50 perusahaan total
- ✅ 20 paying customer
- ✅ MRR > $2000
- ✅ NPS > 50

---

## 🚀 QUICK START UNTUK AI AGENT BARU

### Pertama Kali Join Project
1. ✅ Baca file ini (PANDUAN-AWAL.md) LENGKAP
2. ✅ Baca OVERVIEW-TEKNIS.md untuk status terkini
3. ✅ Setup local environment:
   ```bash
   git clone [repo]
   cd djawara-hvac
   npm install
   cp .env.example .env.local
   # Edit .env.local dengan Supabase credentials
   npm run dev
   ```
4. ✅ Explore Supabase dashboard:
   - Table structure
   - RLS policies
   - Sample data
5. ✅ Test login dengan sample user (berbagai role)

### Sebelum Start Task Baru
1. ✅ Baca task description di OVERVIEW-TEKNIS.md
2. ✅ Identifikasi domain yang relevan
3. ✅ Check apakah perlu migration baru
4. ✅ List RLS policy yang perlu dibuat
5. ✅ Breakdown task jadi checklist kecil

### Saat Development
1. ✅ Buat branch baru dari `main`
2. ✅ Kerjakan task sesuai checklist
3. ✅ Test dengan minimal 2 role
4. ✅ Update OVERVIEW-TEKNIS.md
5. ✅ Commit dengan message yang jelas
6. ✅ Push & create PR

### Setelah Task Selesai
1. ✅ Self-review code
2. ✅ Test di berbagai device (desktop, mobile)
3. ✅ Update documentation
4. ✅ Screenshot/video hasil
5. ✅ Tag reviewer di PR

---

## 📚 RESOURCES & REFERENCES

### Documentation
- [Supabase Docs](https://supabase.com/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [TanStack Query](https://tanstack.com/query/latest)

### RLS Examples
- [Supabase RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)
- [Multi-tenant with RLS](https://supabase.com/docs/guides/auth/multi-tenancy)

### Design Patterns
- [Domain-Driven Design (DDD)](https://martinfowler.com/bliki/DomainDrivenDesign.html)
- [React Patterns](https://reactpatterns.com)

---

## ⚠️ CRITICAL NOTES

### JANGAN PERNAH:
1. ❌ Disable RLS di production
2. ❌ Hard-code tenant_id
3. ❌ Expose service role key di client
4. ❌ Commit credentials ke Git
5. ❌ Deploy tanpa test tenant isolation
6. ❌ Ubah tech stack tanpa diskusi
7. ❌ Skip migration untuk schema change
8. ❌ Hapus data production (always soft delete)

### SELALU:
1. ✅ Test dengan berbagai role & tenant
2. ✅ Validate input di frontend & backend
3. ✅ Handle error dengan graceful
4. ✅ Log error dengan context lengkap
5. ✅ Update documentation
6. ✅ Write clear commit message
7. ✅ Ask jika tidak yakin
8. ✅ Backup database sebelum major migration

---

## 🆘 TROUBLESHOOTING COMMON ISSUES

### Issue: "Row not found" padahal data ada
**Cause**: RLS policy terlalu ketat atau salah
**Fix**:
1. Check `active_tenant_id` di user session
2. Check RLS policy di tabel tersebut
3. Test query dengan user yang berbeda role
4. Pastikan `tenant_id` di data match dengan user

### Issue: "Permission denied for table"
**Cause**: RLS policy belum dibuat atau salah
**Fix**:
1. Enable RLS di tabel: `ALTER TABLE [table] ENABLE ROW LEVEL SECURITY;`
2. Buat policy untuk role yang perlu akses
3. Test dengan `SELECT * FROM [table]` as that user

### Issue: Data bocor antar tenant
**Cause**: RLS policy tidak strict atau ada bypass
**Fix**:
1. Audit semua policy di tabel tersebut
2. Pastikan semua policy punya `tenant_id = auth.get_active_tenant_id()`
3. Test dengan user dari 2 tenant berbeda
4. JANGAN pernah pakai service role key di client

### Issue: Slow query
**Cause**: Missing index atau N+1 query
**Fix**:
1. Check `EXPLAIN ANALYZE` di query
2. Tambah index di kolom yang sering di-filter
3. Use `select()` dengan explicit columns (jangan `*`)
4. Denormalize data jika perlu (dengan trade-off)

---

## 📝 CHANGELOG TEMPLATE

Setiap update major, tulis di CHANGELOG.md:

```markdown
## [Versi] - YYYY-MM-DD

### Added
- Fitur baru yang ditambahkan

### Changed
- Perubahan pada fitur existing

### Fixed
- Bug yang di-fix

### Removed
- Fitur yang dihapus (jika ada)

### Security
- Security fix (jika ada)
```

---

## 🎓 LEARNING PATH UNTUK NEW DEVELOPER

### Week 1: Setup & Foundation
- Setup local environment
- Explore Supabase dashboard
- Baca dokumentasi RLS
- Test login dengan sample data

### Week 2: Domain Understanding
- Pelajari 1 domain (pilih CRM atau Service Ops)
- Trace flow: service → hook → component → page
- Modifikasi 1 component kecil (misal: tambah kolom di table)

### Week 3: First Feature
- Ambil task kecil (misal: tambah field di client form)
- Buat migration, service, component
- Test & submit PR

### Week 4: Independent Work
- Ambil task medium (misal: buat fitur baru 1 page)
- Follow checklist di aturan kerja
- Review code orang lain

---

**DOKUMEN INI ADALAH SUMBER KEBENARAN (SOURCE OF TRUTH)**

Jika ada konflik antara dokumentasi ini dengan code yang ada, **prioritaskan dokumen ini** dan perbaiki code-nya.

Jika ada pertanyaan atau butuh klarifikasi, **JANGAN asumsikan** - tanya dulu ke owner/lead developer.

**Good luck & happy coding! 🚀**

---

*Last updated: December 1, 2025*
*Version: 1.0.0*
*Maintainer: Owner/Lead Developer*
