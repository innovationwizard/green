GREENTELLIGENCE - Optimización y Automatización de Procesos con Inteligencia Artificial

Goal

Cut admin reconciliation from 2–4+ weeks → <24 hours, measured as: real-world material/money action → reflected on dashboards within 1 hour after sync.

Core product decisions (locked)

Single company (no multi-tenant).

Offline-first PWA (Android-first, mid/low spec), IndexedDB outbox.

Append-only event ledger as source of truth.

No approvals; correctness via audit trail + reversing events.

Spanish-only UI with your standard terms:

Proyecto, Item, Materiales, Gastos, Mano de obra, Subcontratos, Orden de cambio, Sincronizar, Anular, Eliminar.

Roles & access

Installer

Sees: their own data only (own events, own cash box, project picker by nickname).

Can: create events offline, sync, “Anular” within rule window.

Admin

Full CRUD on master data + projects + dashboards + warnings + “Eliminar” (soft delete) + reconciliation.

Manager

Dashboards + visibility; no need for master-data maintenance unless you want it.

Developer (you)

Superuser bypass for support.

Auth: Supabase Auth (email+password), session persists 30 days, admin can kill sessions.

Data model (entities)
Master data

Users (installers/admin/manager) + roster management.

Items catalog (≤1k, stable)

Fields: name, SKU/code (optional), unit, category (optional), default unit cost (used for non-purchase sources), active flag.

Supports fractional qty.

Labor rates

Per installer or role (your choice in implementation) → used for costing.

Clients (managed)

Fields: name, nickname, NIT, phone, email, notes (optional).

Salespeople (dropdown list, no login).

Projects

Created by admin; installer can update lifecycle status.

Fields: system id, human id/nickname, client_id, installation address, project type (residential/commercial), size_kW, price, expected install date, actual install date, salesperson.

Statuses: CREATED, SCHEDULED, IN_PROGRESS, INSTALLED, CLOSED, CANCELLED.

Quote structures

Quote header (per project): quoted totals (revenue + bucket totals), system_size_kw, expected_duration_days.

Quote line items: itemized, mapped to catalog.

“Quote Product Name” → BOM mapping (bundle expands into catalog SKU lines on import); CRUD by admin; overwrite allowed.

Event ledger (source of truth)

Single events table (append-only), with typed payload.

Required event types Day 1:

Material added to project (source: purchase / warehouse / borrowed from other project) — itemized

Material returned to warehouse — itemized

Material returned to source project — itemized

Expense logged — itemized

Labor logged — start/stop timer, fallback start/stop typed (self only)

Subcontractor cost logged

Change order added (revenue and/or cost deltas)

Client invoice issued

Client payment received

Vendor bill received

Vendor payment made

Cash advance issued (company → installer cash box)

Reimbursement issued

Credit purchase recorded

Client refund/chargeback issued

Vendor refund received

Project status changed

Material sources (minimum capture)

Purchase: vendor (free text OK), payment method, receipt photo optional (not required), item lines.

Warehouse: warehouse identifier, issuer, item lines.

Borrowed: from_project_id, item lines.

Money model simplifications (v1)

No partial payments, no “one payment covers multiple invoices/bills”.

No due dates; AR/AP aging based on issue date.

Amounts displayed: Q 1,234.56.

Gross only (no VAT logic).

Corrections rules
Installer “Anular”

Allowed until nearest future Saturday 23:59 (America/Guatemala).

Creates reversing event(s) (never edits the original).

Installer can only anular their own events.

Admin “Eliminar” (soft delete)

Unlimited time.

Creates reversing event(s) + marks original “hidden from normal views”.

Invisible to admin/manager dashboards; visible only via audit export.

Audit requirement: every event includes created_by, timestamps, device id, client-generated UUID, optional reason.

Offline-first behavior (installer)
Required installer screens (Day 1)

Nuevo evento (one screen per event type; supports multiple item lines)

Mis eventos (list + “Anular” only)

Temporizador (start/stop + fallback to typed times)

Estado de sincronización (pending/outbox, last sync time, errors)

Offline storage

IndexedDB:

cached project list (nickname + id)

cached item catalog (prefix search with suggestions)

outbox queue of events (with photos if any)

Sync is append-only; multiple devices can submit concurrently.

Duplicate detection (Day 1)

Rule: same project + same item lines within same day ⇒ block submit unless installer confirms.

Warnings model:

System logs potential duplicates and surfaces in admin “Exception center” + installer notice.

Cash box (per installer)

Explicit cash box entity per installer.

Derived balance from cash events (advances, cash expenses, cash returned, etc.).

Can go negative: allow but warn.

Installer view: current balance + last 5 movements.

Projections (read models for dashboards)

Computed server-side; eventually consistent and recomputable for past dates when late events arrive.

Projection tables (accepted):

project_costs_daily

project_revenue_daily

cash_ledger_daily

ar_aging_snapshot

ap_aging_snapshot

project_kpis

client_kpis

Processing architecture (Supabase)

Writes: events inserted fast.

DB triggers: lightweight only (basic validation, duplicate flags).

Supabase scheduled job runs every 10–30 minutes:

incremental processing from last checkpoint

updates projections

target dashboard freshness ≤1 hour

Admin UI modules (all required Day 1)

Projects CRUD + status override

Item catalog CRUD

User roster CRUD + roles

Labor rates CRUD

Quote import UI (CSV/XLSX)

Dashboards (4 pages below)

Audit export log (CSV/XLSX + optional PDF)

Exception center (duplicates + omission rules warnings)

Omission rules (admin-maintained, no-code)

Rule model A + B:

“If project status is X and count(event type Y) in last N days is < K → warn”

plus filters by project type (residential/commercial) and client/system size if you want.

Start with no default omission rules, but ship the rule builder UI Day 1.

Dashboards (Day 1)

All dashboards:

Default date range: last 30 days

Empty state: “No hay datos aún”

Interactive filters + drilldowns + charts, consistent styling.

Resumen ejecutivo

KPI tiles: net profit margin, total backlog value, average CAC payback (from imported sales data)

Chart: waterfall revenue → COGS → OpEx → net profit

Economía unitaria por proyecto

KPI tiles: gross margin per watt, soft cost ratio, procurement variance

Chart: bubble (x size kW, y gross margin, bubble duration)

Velocidad del pipeline de ventas (from weekly Excel import)

KPI tiles: quote-to-contract conversion, contract-to-install velocity

Chart: funnel + leakage indicators

Flujo de caja y capital de trabajo

KPI tiles: AR aging >90d, inventory turnover (from imports if needed), DSCR

Chart: dual-axis area inflows vs outflows rolling 6 months

Imports (weekly, temporary)

Admin imports weekly from Excel as CSV/XLSX strict templates (no mapping UI).

No versioning required.

Used for sales/CRM dashboards until replaced.

Quote upload: CSV/XLSX + PDF assistive extraction (Day 1)

Per project, admin can:

Import quote via CSV/XLSX template (source of truth)

Upload quote PDF and run deterministic extraction (assistive prefill)

Workflow: extract → show draft quote → admin reviews/edits → confirm import

PDF is not retained after extraction (unless you later decide otherwise)

Implementation note: ship the extractor behind a common “Quote Ingest” interface; deterministic coordinates get added once template arrives.

Onboarding wizards (Day 1)

Wizard steps in order:
A) Create admin + manager
B) Add installers roster
C) Add item catalog (bulk import CSV/XLSX)
D) Set labor rates
E) Create first project
F) Import first quote (CSV/XLSX or PDF-assisted)

No “install PWA” wizard step required.

Exports (Day 1)

Export what is displayed on dashboards and key lists:

CSV, XLSX, PDF per view

Audit export log must include full event metadata + reversing links + who/when.

Non-functional requirements

Priorities: correctness, simple installer UX, enterprise-grade corporate visual

Mobile-first UI for all roles.

Best-effort geolocation on field events (do not block submission).

Out of scope (v1)

Bank/account identifiers beyond payment method enum

Integrations (bank feeds, accounting software, WhatsApp/email)

Approvals workflows

Calendar scheduling module

Project packet generation

Push notifications / nagging

Multi-company SaaS

Acceptance criteria (go-live)

Installer can operate 100% offline for a full workday, submit events, then sync successfully.

Duplicate rule blocks same-day identical item lines and requires explicit installer confirm.

Admin reconciliation visibility improves: within ≤1 hour after sync, dashboards reflect events.

Installer can “Anular” until next Saturday EOD; admin can “Eliminar” anytime; both reverse financials correctly.

All dashboards render with empty DB (no crashes), show “No hay datos aún”.

AR/AP aging works off issue date; refunds supported as distinct event types.

Cash box per installer shows current balance + last 5 movements; negatives warn but do not block.

Full audit export available (CSV/XLSX/PDF) with per-user tracking.