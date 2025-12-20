# Djawara HVAC Platform

> **Last Updated:** December 20, 2025  
> **Status:** ✅ Production Ready - All Core Features Working  
> **Latest Fix:** PDF Generation (Client-Side Architecture)

---

## 🤖 FOR AI AGENTS - START HERE

**📖 Read These Documents First:**
1. **[docs/ai-handoff/2025-12-20-PDF-GENERATION-FIX.md](docs/ai-handoff/2025-12-20-PDF-GENERATION-FIX.md)** ← Latest session (PDF system complete)
2. **[PROJECT-SUMMARY.md](PROJECT-SUMMARY.md)** ← System architecture overview
3. **[DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)** ← Database structure reference

**✅ Current System Status:**
- PDF Generation: ✅ Working (client-side jsPDF)
- Technical Reports: ✅ Complete workflow
- Photo Upload: ✅ Real-time with progress
- Timeline Updates: ✅ Badge detection working
- All Portals: ✅ Admin, technician, client, public

**🔧 Key Files:**
- `components/technician/EnhancedTechnicalDataForm.tsx` - Report form (1215 lines)
- `components/client-portal/DownloadPDFButton.tsx` - PDF download (65 lines)
- `lib/pdf-generator.ts` - Client-side PDF gen (273 lines)
- `app/api/reports/[orderId]/pdf/route.ts` - API endpoint (107 lines)

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
