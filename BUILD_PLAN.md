# GREEN APP - Build Plan & Implementation Order

## Optimal Build Order (Dependencies First)

### Phase 1: Foundation & Infrastructure
1. **Project Setup**
   - Next.js 14+ with App Router (PWA-ready)
   - TypeScript strict mode
   - Tailwind CSS for styling
   - Supabase client libraries
   - IndexedDB wrapper (idb library)
   - PWA manifest and service worker

2. **Database Schema (Supabase)**
   - Master data tables (users, items, clients, projects, labor_rates, salespeople)
   - Event ledger table (append-only)
   - Projection tables (project_costs_daily, project_revenue_daily, cash_ledger_daily, ar_aging_snapshot, ap_aging_snapshot, project_kpis, client_kpis)
   - Cash box tracking
   - Quote structures
   - Omission rules
   - Duplicate detection flags

3. **Authentication & Authorization**
   - Supabase Auth integration
   - Role-based access control (RBAC) middleware
   - Session management (30-day persistence)
   - Admin session kill capability

### Phase 2: Core Event System
4. **Event Ledger Infrastructure**
   - Event type definitions and TypeScript types
   - Event payload schemas (JSONB)
   - Event creation service
   - Event validation logic
   - Audit trail fields (created_by, timestamps, device_id, client_uuid, reason)

5. **Offline-First Infrastructure**
   - IndexedDB schema design
   - Outbox queue implementation
   - Sync service (conflict resolution, append-only)
   - Project catalog cache
   - Item catalog cache with prefix search
   - Photo storage handling

### Phase 3: Master Data Management
6. **Master Data CRUD APIs**
   - Users/roster management
   - Items catalog (with fractional qty support)
   - Clients management
   - Projects CRUD
   - Labor rates management
   - Salespeople management

7. **Quote System**
   - Quote header/line items structure
   - CSV/XLSX import parser
   - PDF extraction interface (placeholder for deterministic extraction)
   - BOM mapping (Quote Product Name → catalog SKU expansion)

### Phase 4: Installer Experience
8. **Installer UI Components**
   - Event creation forms (all event types)
   - Multi-line item entry
   - Project picker (nickname-based)
   - Item search with autocomplete
   - Timer component (start/stop + manual entry)
   - Cash box view (balance + last 5 movements)
   - Sync status indicator
   - Event list with "Anular" capability

9. **Installer Event Logic**
   - Material events (purchase/warehouse/borrowed)
   - Expense logging
   - Labor logging
   - Subcontractor costs
   - Change orders
   - Invoice/payment events
   - Cash advance/reimbursement
   - Project status changes

### Phase 5: Correction System
10. **Anular/Eliminar Logic**
    - Time window validation (Saturday 23:59 Guatemala timezone)
    - Reversing event generation
    - Soft delete marking
    - Financial reversal calculations
    - Audit trail preservation

11. **Duplicate Detection**
    - Same-day duplicate detection
    - Confirmation flow for duplicates
    - Warning system
    - Exception center integration

### Phase 6: Projection System
12. **Projection Computation**
    - Incremental processing from checkpoint
    - Project cost calculations (daily aggregation)
    - Revenue calculations
    - Cash ledger aggregation
    - AR/AP aging snapshots
    - KPI calculations (project and client level)
    - Supabase Edge Function or pg_cron for scheduled jobs

### Phase 7: Admin Interface
13. **Admin Master Data UI**
    - Projects CRUD with status override
    - Item catalog CRUD
    - User roster CRUD with role assignment
    - Labor rates CRUD
    - Clients CRUD
    - Salespeople management

14. **Admin Advanced Features**
    - Exception center (duplicates + omission warnings)
    - Omission rules builder UI
    - Audit export (CSV/XLSX/PDF)
    - Quote import UI
    - Weekly sales import (CSV/XLSX templates)

### Phase 8: Dashboards
15. **Dashboard Infrastructure**
    - Date range filtering (default: last 30 days)
    - Empty states ("No hay datos aún")
    - Chart library integration (recharts or similar)
    - Export functionality (CSV/XLSX/PDF)

16. **Individual Dashboards**
    - Resumen ejecutivo (Executive Summary)
    - Economía unitaria por proyecto (Unit Economics)
    - Velocidad del pipeline de ventas (Sales Pipeline)
    - Flujo de caja y capital de trabajo (Cash Flow)

### Phase 9: Onboarding & Polish
17. **Onboarding Wizards**
    - Step-by-step wizard component
    - Admin/manager creation
    - Installer roster import
    - Item catalog bulk import
    - Labor rates setup
    - First project creation
    - First quote import

18. **UI/UX Polish**
    - Spanish translations throughout
    - Mobile-first responsive design
    - Enterprise-grade visual design
    - Loading states and error handling
    - Geolocation (best-effort, non-blocking)
    - PWA installation prompts

### Phase 10: Testing & Validation
19. **Acceptance Criteria Validation**
    - Offline operation (full workday)
    - Duplicate detection blocking
    - Dashboard freshness (<1 hour)
    - Anular time window enforcement
    - Empty state handling
    - AR/AP aging accuracy
    - Cash box calculations
    - Audit export completeness

## Technology Stack

- **Frontend**: Next.js 14+ (App Router), React 18+, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Offline**: IndexedDB (via idb library)
- **Charts**: Recharts
- **PDF**: pdf-parse or similar for extraction
- **CSV/XLSX**: papaparse, xlsx libraries
- **PWA**: next-pwa or workbox
- **State Management**: React Context + React Query for server state
- **Forms**: React Hook Form + Zod validation

## File Structure

```
green/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth pages
│   ├── (installer)/       # Installer routes
│   ├── (admin)/           # Admin routes
│   ├── (manager)/         # Manager routes
│   └── api/               # API routes
├── components/
│   ├── installer/         # Installer-specific components
│   ├── admin/             # Admin-specific components
│   ├── shared/            # Shared components
│   └── dashboards/        # Dashboard components
├── lib/
│   ├── supabase/          # Supabase client & utilities
│   ├── indexeddb/         # IndexedDB wrapper
│   ├── events/             # Event system
│   ├── sync/               # Sync service
│   ├── projections/        # Projection calculations
│   └── utils/              # Utilities
├── types/                  # TypeScript types
├── supabase/
│   ├── migrations/         # SQL migrations
│   └── functions/          # Edge Functions
└── public/                 # Static assets, PWA manifest
```

