# Djawara HVAC Platform

> **Last Updated:** January 01, 2026  
> **Status:** ✅ Production Ready - People + Reimburse + Workforce (Attendance) + Maintenance Schedule + Admin KPIs Live  
> **Latest Updates:** Maintenance Schedule: tenant resolver fix + first maintenance date suggestion; Admin Dashboard: KPI + maintenance/reimburse notifications; Maintenance urgency buckets standardized (Overdue vs Due Soon ≤7)

---

## 🤖 FOR AI AGENTS - START HERE

### 📖 **CRITICAL: Read These Documents in Order**

1. **[docs/ai-agent/CURRENT_STATE.md](docs/ai-agent/CURRENT_STATE.md)** ← **START HERE** - system map + runbook (rolling)
2. **[docs/ai-agent/2026-01-01-MAINTENANCE-SCHEDULE-DASHBOARD-URGENCY-HANDOFF.md](docs/ai-agent/2026-01-01-MAINTENANCE-SCHEDULE-DASHBOARD-URGENCY-HANDOFF.md)** - Maintenance schedule fixes + admin KPIs + urgency sync (Jan 01)
3. **[docs/ai-agent/2025-12-26-ORDERS-ASSIGNMENT-HELPER-READONLY-HANDOFF.md](docs/ai-agent/2025-12-26-ORDERS-ASSIGNMENT-HELPER-READONLY-HANDOFF.md)** - Orders UX + assignments (technician vs helper) + helper read-only (Dec 26)
4. **[docs/ai-agent/2025-12-26-SALES-PARTNER-DASHBOARD-CLIENT-REFERRAL-HANDOFF.md](docs/ai-agent/2025-12-26-SALES-PARTNER-DASHBOARD-CLIENT-REFERRAL-HANDOFF.md)** - Sales Partner dashboard + client referral fixes (Dec 26)
5. **[docs/ai-agent/2025-12-25-ATTENDANCE-ADMIN-ROSTER-AVATAR-HANDOFF.md](docs/ai-agent/2025-12-25-ATTENDANCE-ADMIN-ROSTER-AVATAR-HANDOFF.md)** - Admin attendance monitoring + avatar parity (Dec 25)
6. **[docs/ai-agent/2025-12-25-TEAM-INVITE-HELPER-MAGANG-HANDOFF.md](docs/ai-agent/2025-12-25-TEAM-INVITE-HELPER-MAGANG-HANDOFF.md)** - Team invite activation + helper/magang roles (Dec 25)
7. **[docs/ai-agent/2025-12-22-REIMBURSE-PEOPLE-TECHNICIAN-HANDOFF.md](docs/ai-agent/2025-12-22-REIMBURSE-PEOPLE-TECHNICIAN-HANDOFF.md)** - People Management + Reimburse (Dec 22)
8. **[docs/ai-handoff/2025-12-21-TECHNICAL-DATA-ENHANCEMENTS.md](docs/ai-handoff/2025-12-21-TECHNICAL-DATA-ENHANCEMENTS.md)** - Technical data + PDF/inventory context
9. **[PROJECT-SUMMARY.md](PROJECT-SUMMARY.md)** - System architecture overview
10. **[DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)** - Database structure reference

### ✅ **Current System Status (December 26, 2025)**

**Core Features:**
- PDF Generation: ✅ Working (optimized, no emojis, single signature)
- Preview PDF: ✅ Opens in new tab (no auto-download)
- Technical Reports: ✅ Complete workflow with conditional forms
- Inventory Integration: ✅ Search and select existing AC units
- Save to Inventory: ✅ Technicians can add new units from field
- Quick Actions: ✅ Preview/Edit buttons in dashboard cards
- Photo Upload: ✅ Real-time with progress
- Timeline Updates: ✅ Badge detection working
- All Portals: ✅ Admin, technician, client, public

**Newly Live (Dec 22):**
- ✅ People Management technician sync (verified technicians appear in team cardbox)
- ✅ Technician avatar crop + persistence (server-side profile update)
- ✅ Resend activation link for technicians
- ✅ Reimburse module (Finance): categories + inbox + status actions
- ✅ Reimburse module (Technician): submit + history + dashboard indicator

**Newly Live (Dec 25):**
- ✅ Team invitation activation flow for staff roles (`/team/invite/[token]`)
- ✅ Helper & Magang roles enabled as addable roles in People Management
- ✅ Admin attendance control UI + API (`/dashboard/attendance`, `/api/admin/working-hours-config`)
- ✅ Admin monitoring roster absensi hari ini (`/api/admin/attendance-today`)
- ✅ Attendance timezone correctness (Asia/Jakarta) for late/early flags + total hours (technician attendance APIs)
- ✅ People Management: hapus undangan, remove member dari tenant, dan delete teknisi (secured APIs)
- ✅ Avatar upload parity: helper/support bisa upload foto profil (via service-role avatar update)
- ✅ Fix: team invites no longer incorrectly use the client portal `/invite/[token]` route

**Recent Enhancements (Dec 21):**
- ✅ Inventory search in AC unit data entry (3 work types)
- ✅ Save new units to client inventory feature
- ✅ Quick preview/edit buttons in order cards
- ✅ PDF preview page (`/technician/orders/[id]/preview`)
- ✅ AC units data now saves for troubleshooting & instalasi
- ✅ Comprehensive debug logging for data persistence

**Known Issues:**
- 🔍 Data persistence investigation ongoing (debug logs added)
- 🔍 Some auth redirects (improved error handling)

**Newly Live (Dec 26):**
- ✅ Orders: time slot inputs (create/edit), unit fields (unit_count + unit_category), and technician/helper assignment separation using `work_order_assignments.role_in_order`
- ✅ Helper/magang: technician portal read-only (no check-in/out, no technical form) + helper dashboard cards are non-clickable
- ✅ DB: added `supabase/ADD_UNIT_COUNT_TO_SERVICE_ORDERS.sql` to add `service_orders.unit_count`
- ✅ Sales Partner role-based sidebar + `/dashboard` landing scaffold
- ✅ Server-side guards: sales partner cannot access Attendance/People/Inventory/Analytics via URL
- ✅ Finance page accessible for sales partner (menu no longer dead-end)
- ✅ Client referral dropdown only lists sales partners
- ✅ Sales partner clients list only shows referred clients (`referred_by_id = auth.uid()`)
- ✅ Client detail now displays referral info (supports `referred_by_id` + `referred_by_name`)

**Common Setup Issue:**
- If browser console shows CORS blocked calls to `supabase.co/rest/v1/...`, add your app origin in Supabase → Project Settings → API → CORS Allowed Origins.

### 🔧 **Key Files (Updated Dec 21)**

**Technical Data Entry:**
- `components/technician/EnhancedTechnicalDataForm.tsx` - Main report form with conditional sections (1582 lines)
- `components/technician/ACUnitDataTable.tsx` - AC unit data with inventory search (550 lines)
- `components/technician/MaintenanceUnitTable.tsx` - Maintenance unit data entry

**PDF System:**
- `lib/pdf-generator.ts` - Client-side PDF generation (606 lines)
- `app/api/reports/[orderId]/pdf/route.ts` - API endpoint (107 lines)
- `components/client-portal/DownloadPDFButton.tsx` - PDF download (65 lines)

**Dashboard & Navigation:**
- `app/technician/dashboard/page.tsx` - Dashboard with quick actions (399 lines)
- `app/technician/orders/[id]/page.tsx` - Order detail page (499 lines)
- `app/technician/orders/[id]/preview/page.tsx` - PDF preview page (NEW - 197 lines)

**Workforce / Attendance (Admin + Technician):**
- `app/dashboard/attendance/page.tsx` - Admin attendance page (config + roster)
- `app/dashboard/attendance/attendance-config-card.tsx` - Admin jam kerja + overtime base config
- `app/dashboard/attendance/attendance-roster-card.tsx` - Admin monitoring roster hari ini
- `app/api/admin/working-hours-config/route.ts` - Admin API read/write working hours config
- `app/api/admin/attendance-today/route.ts` - Admin API roster absensi hari ini
- `app/api/technician/attendance/clock-in/route.ts` - Technician clock-in (Jakarta-time)
- `app/api/technician/attendance/clock-out/route.ts` - Technician clock-out (Jakarta-time)
- `app/api/technician/attendance/today/route.ts` - Technician today+recent (normalize + auto-heal)

**People Management (Membership + Invites + Deletion):**
- `app/api/people/remove-member/route.ts` - Remove member from tenant (plus best-effort technician cleanup)
- `app/api/technician/delete/route.ts` - Delete technician record (secured)

**Database:**
- `ac_units` table - Client AC inventory (read/write for save feature)
- `technician_work_logs` table - Technical reports storage
- `service_orders` table - Order management

### 🎯 **Quick Context for New Session**

**What Was Just Implemented:**
1. Inventory search - Technicians can pick existing AC units instead of re-typing
2. Save to inventory - New AC units found in field can be added to client inventory
3. Quick actions - Preview PDF and Edit buttons directly in dashboard cards
4. Data persistence fix - AC units now save for all work types (not just pengecekan)
5. Debug logging - Comprehensive console logs to track data flow

**Current Focus Area:**
- Investigating data persistence issue (user reports data not saving)
- Debug logs active in console for tracking
- Waiting for user testing with console logs

**Testing Needed:**
- [ ] Verify AC units data persists after save
- [ ] Check inventory save creates records in ac_units table
- [ ] Confirm preview PDF shows saved data
- [ ] Test quick actions in dashboard
- [ ] Performance test with large inventory (>50 units)

**Important Notes:**
- Table name is `ac_units` (NOT `ac_inventory`)
- Work types using ACUnitDataTable: pengecekan (performa), troubleshooting, instalasi
- Preview uses same PDF generator as download (data consistency ensured)
- Inventory filtered by client_id (multi-tenant safe)

---

## 🚀 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **State Management**: TanStack Query + Zustand
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form + Zod

## 📁 Project Structure (Domain-Driven Design)

```
djawara-hvac/
├── app/                          # Next.js App Router
│   ├── (auth)/                  # Auth route group
│   │   ├── layout.tsx           # Auth layout
│   │   └── login/               # Login page
│   ├── (dashboard)/             # Dashboard route group
│   │   ├── layout.tsx           # Dashboard layout wrapper
│   │   ├── owner/               # Owner dashboard
│   │   └── shared/              # Shared modules
│   │       ├── clients/         # CRM clients
│   │       └── orders/          # Service orders
│   ├── globals.css              # Global styles
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Home redirect
│   └── providers.tsx            # React Query provider
│
├── domain/                      # Domain logic (DDD)
│   ├── core/                    # Core domain
│   │   ├── auth/                # Authentication domain
│   │   │   ├── types/           # Auth types
│   │   │   ├── services/        # Auth services
│   │   │   └── hooks/           # Auth hooks
│   │   └── tenant/              # Tenant domain
│   │       ├── types/
│   │       ├── services/
│   │       └── hooks/
│   └── crm/                     # CRM domain
│       └── clients/             # Clients subdomain
│           ├── types/
│           ├── services/
│           ├── hooks/
│           └── components/
│
├── components/                  # Shared UI components
│   ├── layouts/                 # Layout components
│   │   ├── DashboardLayout.tsx
│   │   ├── Sidebar.tsx
│   │   └── Header.tsx
│   └── ui/                      # Base UI components
│       ├── button.tsx
│       ├── input.tsx
│       ├── card.tsx
│       └── ...
│
├── lib/                         # Core libraries
│   ├── supabase/                # Supabase clients
│   │   ├── client.ts            # Browser client
│   │   └── server.ts            # Server client
│   └── utils/                   # Utilities
│       ├── cn.ts                # Class name merger
│       └── formatters.ts        # Date/currency formatters
│
├── supabase/                    # Database
│   └── migrations/              # SQL migrations
│
└── middleware.ts                # Auth middleware
```

## 🛠️ Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Create Environment File

Create `.env.local` in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tukbuzdngodvcysncwke.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<YOUR_ANON_KEY>
```

**Get your Supabase anon key:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/tukbuzdngodvcysncwke)
2. Navigate to **Project Settings** → **API**
3. Copy the **"anon public"** key

### 3. Deploy Database Schema

1. Go to [Supabase SQL Editor](https://supabase.com/dashboard/project/tukbuzdngodvcysncwke/sql/new)
2. Open `supabase/DEPLOY_MASTER.sql`
3. Copy entire file content
4. Paste into SQL Editor
5. Click **RUN**
6. Verify success messages (✓)

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📚 Development Guide

### Domain-Driven Architecture

This project follows **Domain-Driven Design (DDD)** principles:

- **domain/**: Business logic organized by domain
  - `core/`: Core domains (auth, tenant)
  - `crm/`: Customer relationship management
  - Each domain has: types, services, hooks, components

- **app/**: Next.js pages and routing
- **components/**: Shared UI components
- **lib/**: Core libraries and utilities

### Creating a New Domain Feature

Example: Adding a new "Inventory" domain

1. **Create domain structure:**
```
domain/
└── inventory/
    └── parts/
        ├── types/part.types.ts
        ├── services/partService.ts
        ├── hooks/useParts.ts
        └── components/PartList.tsx
```

2. **Define types** (`types/part.types.ts`):
```typescript
export interface Part {
  id: string
  tenant_id: string
  name: string
  sku: string
  quantity: number
}
```

3. **Create service** (`services/partService.ts`):
```typescript
import { createClient } from '@/lib/supabase/client'

export const partService = {
  async getParts() {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('inventory_parts')
      .select('*')
    if (error) throw error
    return data
  }
}
```

4. **Create hook** (`hooks/useParts.ts`):
```typescript
'use client'
import { useQuery } from '@tanstack/react-query'
import { partService } from '../services/partService'

export function useParts() {
  const { data: parts, isLoading } = useQuery({
    queryKey: ['parts'],
    queryFn: partService.getParts,
  })
  
  return { parts, isLoading }
}
```

5. **Create page** (`app/(dashboard)/shared/inventory/page.tsx`):
```typescript
'use client'
import { useParts } from '@/domain/inventory/parts/hooks/useParts'

export default function InventoryPage() {
  const { parts, isLoading } = useParts()
  
  if (isLoading) return <div>Loading...</div>
  
  return <div>{/* Render parts */}</div>
}
```

### Authentication Flow

1. User visits `/login`
2. Submits credentials
3. `authService.signIn()` calls Supabase Auth
4. On success, `useAuth` hook redirects to `/owner`
5. Middleware checks authentication on protected routes
6. If not authenticated, redirects to `/login`

### Data Fetching Pattern

Uses **TanStack Query** for server state:

```typescript
// In service
export const clientService = {
  async getClients() {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('clients')
      .select('*')
    if (error) throw error
    return data
  }
}

// In hook
export function useClients() {
  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: clientService.getClients,
  })
  return { clients, isLoading }
}

// In component
export default function ClientsPage() {
  const { clients, isLoading } = useClients()
  // ...
}
```

## � Client Portal Architecture

### Two-Tier Access System

#### 1. Public Link (Basic Access)
- **URL Pattern:** `/c/[public_token]`
- **No login required**
- **Features:**
  - View service history
  - View upcoming maintenance schedules
  - AC unit statistics
  - Basic technician information
- **Use Case:** Quick access for clients without creating account

#### 2. Premium Account (Full Access)
- **Login URL:** `/client/login`
- **Registration:** `/client/register?token=[public_token]`
- **Features:**
  - All basic features
  - Rate technician services (1-5 stars)
  - View detailed work reports with photos
  - Loyalty points accumulation
  - Priority customer support
  - Password reset capability
- **Authentication:** Email/password with email verification

### Client Flow
```
1. Admin creates client → Public token auto-generated
2. Admin shares public link: /c/[token]
3. Client views basic info (no login)
4. Client clicks "Activate Premium"
5. Client registers with email/password
6. Email verification sent
7. Client verifies email
8. Client logs in → Full premium access
```

## 🚀 Deployment

### Current Production
- **URL:** https://hvac-djawara.vercel.app
- **Platform:** Vercel
- **Database:** Supabase PostgreSQL
- **Auto-deploy:** Enabled on push to `main`

### Deploy to Vercel

1. **Push to GitHub:**
```bash
git add .
git commit -m "feat: your feature description"
git push origin main
git push putra22 main  # Backup remote
```

2. **Connect to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Add environment variables:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Click **Deploy**

3. **Update Supabase settings:**
   - Go to Supabase Dashboard → Authentication → URL Configuration
   - Add your Vercel URL to allowed redirect URLs
   - Configure email templates for verification & password reset

## 📝 Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## 🔐 Multi-Tenancy

The platform implements **row-level security (RLS)** for multi-tenant isolation:

- Each user can belong to multiple tenants
- Active tenant is stored in `profiles.active_tenant_id`
- All queries automatically filtered by tenant
- RLS policies enforce data isolation

## 🎯 Features

### ✅ Core System
- ✅ Authentication (Multi-role: Admin, Owner, Technician, Client)
- ✅ Multi-tenant architecture with RLS
- ✅ Owner Dashboard
- ✅ CRM - Client Management (Card/Table view, Bulk actions)
- ✅ Service Orders Management
- ✅ Jobs Kanban Board
- ✅ Technician Management
- ✅ AC Unit & Property Management

### ✅ Client Portal (Dual-Access System)
- ✅ **Public Link Access** (No login required)
  - View service history
  - View AC unit statistics
  - View upcoming maintenance
  - Access via unique token: `/c/[token]`
  
- ✅ **Premium Client Access** (Email/Password login)
  - All public features PLUS:
  - Rate technician services (1-5 stars)
  - View detailed work reports
  - Loyalty points system
  - Priority support
  - Premium dashboard at `/client/dashboard`

### ✅ Authentication System
- ✅ Client registration with email verification
- ✅ Password reset flow (forgot password)
- ✅ Auto-redirect for premium clients
- ✅ Universal login concept (single entry for all roles)
- ✅ Public token generation for client sharing

### ✅ Maintenance & Reports
- ✅ Maintenance schedule auto-generation
- ✅ Service reports with photos
- ✅ Technician work reports
- ✅ Client feedback & rating system

### 🚧 Coming Soon
- 🚧 Inventory Management
- 🚧 Finance & Billing (Invoicing)
- 🚧 Push Notifications
- 🚧 Mobile App (React Native)
- 🚧 Advanced Analytics

## 📄 License

Proprietary - Djawara HVAC Platform

## 👥 Contributors

- **Repository**: [Soedirboy58/hvac-djawara](https://github.com/Soedirboy58/hvac-djawara)

---

**Last Updated**: December 2025

## 📁 Project Structure

```
djawara-hvac/
├── app/                      # Next.js App Router
│   ├── (auth)/              # Authentication routes
│   │   ├── login/           # Login page
│   │   └── register/        # Registration page
│   ├── (dashboard)/         # Protected dashboard routes
│   │   └── dashboard/       # Main dashboard
│   │       ├── clients/     # CRM - Client management
│   │       ├── orders/      # Service orders
│   │       └── jobs/        # Jobs kanban board
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Home page (redirects)
│   └── providers.tsx        # React Query provider
├── components/              # Reusable components
│   ├── layout/             # Layout components
│   │   ├── sidebar.tsx     # Navigation sidebar
│   │   └── header.tsx      # Top header
│   └── ui/                 # UI primitives
│       ├── button.tsx
│       ├── input.tsx
│       ├── card.tsx
│       ├── badge.tsx
│       ├── label.tsx
│       └── modal.tsx
├── hooks/                   # Custom React hooks
│   ├── use-auth.ts         # Authentication hook
│   ├── use-tenants.ts      # Tenant management
│   └── use-clients.ts      # CRM data fetching
├── lib/                     # Core utilities
│   ├── supabase/           # Supabase clients
│   │   ├── client.ts       # Browser client
│   │   ├── server.ts       # Server client
│   │   └── middleware.ts   # Auth middleware
│   └── utils.ts            # Helper functions
├── services/               # API services
│   ├── auth.service.ts     # Auth operations
│   └── client.service.ts   # CRM operations
├── types/                  # TypeScript types
│   └── database.types.ts   # Supabase schema types
├── middleware.ts           # Next.js middleware
├── next.config.js          # Next.js configuration
├── tailwind.config.ts      # Tailwind configuration
└── tsconfig.json           # TypeScript configuration
```

## 🔐 Authentication

- Email/Password authentication via Supabase Auth
- Server-side session management using `@supabase/ssr`
- Protected routes with middleware
- Auto-redirect for authenticated/unauthenticated users

## 🏢 Multi-Tenancy

- Tenant isolation at database level (RLS policies)
- Active tenant switching
- User can belong to multiple tenants
- Tenant-scoped data access

## 🎯 Core Features (MVP)

### ✅ Implemented
- [x] Authentication (Login/Register)
- [x] Dashboard layout with sidebar navigation
- [x] CRM - Client list and client form
- [x] Service Orders - Order list with filters
- [x] Jobs Board - Kanban view for technician assignments
- [x] Responsive UI components
- [x] Dark mode support (Tailwind)
- [x] Form validation (Zod schemas)

### 🚧 TODO (Requires Database Tables)
- [ ] Create clients table in Supabase
- [ ] Create service_orders table
- [ ] Create jobs table
- [ ] Connect CRM to real database
- [ ] Implement order creation workflow
- [ ] Add drag-and-drop for jobs kanban
- [ ] Inventory management module
- [ ] Finance/billing module
- [ ] Analytics dashboard

## 🗄️ Database

Database migrations are in `/supabase/migrations/` directory:
- Core tables: `tenants`, `profiles`, `user_tenant_roles`
- RLS policies for multi-tenant isolation
- Helper functions for tenant access control

**Deployment**: Already deployed to Supabase instance
- URL: `https://tukbuzdngodvcysncwke.supabase.co`

## 🚀 Deployment

### Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial MVP build"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Connect repository to Vercel
   - Add environment variables in Vercel dashboard
   - Deploy automatically on push

3. **Environment Variables in Vercel**
   ```
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   NEXT_PUBLIC_SITE_URL
   ```

## 📝 Development Workflow

1. **Start development server**
   ```bash
   npm run dev
   ```

2. **Make changes** to components/pages

3. **Type check**
   ```bash
   npm run type-check
   ```

4. **Build for production**
   ```bash
   npm run build
   ```

5. **Start production server**
   ```bash
   npm start
   ```

## 🔧 Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## 🎨 Styling

- **Tailwind CSS** with custom theme (see `tailwind.config.ts`)
- **CSS Variables** for dynamic theming
- **Class Variance Authority** for component variants
- **Responsive** design (mobile-first)

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [TanStack Query](https://tanstack.com/query/latest)
- [Tailwind CSS](https://tailwindcss.com/docs)

## 📄 License

Proprietary - Djawara HVAC Platform

## 👥 Team

- **Developer**: Soedirboy58
- **Repository**: [github.com/Soedirboy58/hvac-djawara](https://github.com/Soedirboy58/hvac-djawara)

## 📖 Documentation

### AI Handoff & Continuity
- **[AI Session Handoff Guide](docs/ai-handoff/AI_SESSION_HANDOFF.md)** - Complete session context for AI chat transitions
  - Current project status
  - Architecture decisions
  - Pending SQL migrations
  - Known issues & solutions
  - Quick reference commands

### Feature Guides
- **[Client Premium Auth Guide](CLIENT_PREMIUM_AUTH_GUIDE.md)** - Dual-access authentication system
- **[Client Portal Architecture](CLIENT_PORTAL_ARCHITECTURE.md)** - Portal design & implementation
- **[Database Schema](DATABASE_SCHEMA.md)** - Complete database documentation
- **[API Endpoints](API_ENDPOINTS.md)** - API reference

### SQL Scripts
- **[Client Flow Guide](supabase/CLIENT_FLOW_GUIDE.sql)** - Complete SQL reference with examples
- **[Manual Password Reset](supabase/MANUAL_PASSWORD_RESET.sql)** - Admin password reset procedures

---

**Status**: Production Ready ✅  
**Last Updated**: December 18, 2025

**Current Version Features:**
- ✅ Multi-role authentication system
- ✅ Client dual-access portal (public + premium)
- ✅ Service management with reports & ratings
- ✅ Maintenance auto-scheduling
- ✅ Comprehensive admin dashboard
