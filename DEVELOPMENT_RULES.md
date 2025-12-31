# 5 Rules to Strictly Adhere To

## Rule 1: DON'T LIE TO ME! DO NOT MAKE ASSUMPTIONS!
**If you need information you don't have, ask! No exceptions.**
- Never assume or guess
- Never make up information
- Always ask when uncertain
- Be honest about what you know and don't know
- Verify information before using it

## Rule 2: We Always Adhere to World Class Industry Best Practices
**No exceptions.**
- Follow established best practices for the technology stack
- Use industry-standard patterns and conventions
- Implement security best practices
- Follow accessibility standards
- Use proven architectural patterns
- Stay current with framework and library best practices

## Rule 3: We Make Top-Notch, Best-in-Class, Enterprise-Grade Software
**No exceptions.**
- Code quality must be production-ready
- Performance optimized
- Scalable architecture
- Robust error handling
- Comprehensive testing where applicable
- Professional UI/UX
- Enterprise-level reliability and maintainability

## Rule 4: We Never Put Mock Data or Sample Data or False Information
**No exceptions.**
- No mock data in code
- No sample data in databases
- No placeholder/fake information
- No hardcoded test data
- All data must be real and accurate
- Use actual production data structures

## Rule 5: Each Block of Code Must Serve Core Functions in the Best Possible Way
**Without cutting corners. No exceptions.**
- Every feature must be fully implemented
- No shortcuts or temporary solutions
- Complete functionality, not partial implementations
- Proper error handling for all code paths
- Optimized for performance and maintainability
- Code must be production-ready from the start

---

# Role Descriptions with Real-World Tasks

## 1. Developer (Superuser)
**Real-World Person:** You (the developer/technical support)

**Real-World Tasks:**
- Debugging production issues when they occur
- Technical support for all users (installers, admins, managers)
- System maintenance and updates
- Data recovery and corrections when data gets corrupted
- Testing all features across all roles to ensure they work
- Bypass security restrictions for troubleshooting
- Access audit logs and hidden/deleted data for investigation
- Fix data inconsistencies and errors
- Support admin users when they encounter problems
- Test installer workflows to verify offline functionality works
- Test manager dashboards to ensure data accuracy
- Verify admin reconciliation processes work correctly

**Why They Need Full Access to ALL Routes:**
- Must test installer interface to ensure offline functionality works
- Must test manager interface to verify dashboards display correctly
- Must access admin tools for system administration
- Need to see exactly what each role sees to debug issues
- Must be able to replicate user problems by using their interfaces
- Superuser bypass allows access to everything for support purposes

**Access:**
- `/dev/*` - **PRIMARY ROUTE** - Developer Dashboard (system monitoring, support tools)
- `/admin/*` - Full admin access (for testing/support/admin tools)
- `/manager/*` - Can access manager dashboards (for testing/support)
- `/installer/*` - Can access installer interface (for testing/support)
- Can see all events including hidden/deleted ones
- Can modify all master data
- Full CRUD on everything

**IMPORTANT:** Developer has its own top-level route `/dev` - it is NOT nested under `/admin`. Developer is a superuser (technical support) completely separate from Admin (accounting/paperwork personnel).

#### Industry Best Practices for DEV Landing Page

The `/dev` landing page follows industry best practices for superuser/developer dashboards:

1. **System Health Monitoring**
   - Real-time metrics: active users, recent events, exceptions, projection status
   - Industry practice: Superusers need immediate visibility into system health to detect issues before users report them
   - Enables proactive problem detection and resolution

2. **Quick Access to All Interfaces**
   - Direct links to Admin, Manager, and Installer interfaces
   - Industry practice: Developers need fast access to all interfaces for testing, debugging, and support
   - Allows replicating user issues and testing functionality without complex navigation

3. **Support & Debugging Tools**
   - Centralized access to: Exception Center, Audit Export, System Configuration, Projections
   - Industry practice: Superusers need centralized tools for technical problem resolution
   - Reduces time-to-resolution and facilitates technical support

4. **Separate Top-Level Route**
   - Dedicated `/dev/*` route, completely separate from `/admin/*`
   - Industry practice: Technical superusers should NOT be nested under operational routes
   - Clarifies separation: DEV = technical support, Admin = accounting/paperwork

5. **Support-Focused Dashboard**
   - Prioritizes technical information and support tools over daily operations
   - Industry practice: Superuser dashboards should optimize workflow for support and debugging tasks
   - Aligns with Internal Developer Portal (IDP) patterns and enterprise superuser dashboard best practices

---

## 2. Manager (CEO / Decision Maker)
**Real-World Person:** Sergio (CEO) - Takes strategic business decisions

**Real-World Tasks:**
- Review financial dashboards daily/weekly to monitor business health
- Make strategic decisions based on analytics and KPIs
- Monitor business KPIs: profit margins, cash flow, sales pipeline velocity
- Review project economics and profitability per project
- Assess sales velocity and quote-to-contract conversion rates
- Monitor accounts receivable aging to manage cash flow
- Make decisions about resource allocation and hiring
- Review overall business performance trends over time
- Identify which projects are most/least profitable
- Make decisions about pricing and cost management

**Why They Need Read-Only Dashboards:**
- Need visibility into all business metrics across all projects
- Must see aggregated data to make strategic decisions
- Should NOT modify operational data (that's admin's job)
- Focus on high-level decision making, not day-to-day data entry
- Prevents accidental data corruption from executive users
- Read-only ensures they can't break operational workflows

**Access:**
- `/manager/dashboards/*` - Read-only dashboards only
- Can view all projects and events (but not hidden/deleted)
- Cannot modify any data
- Cannot access installer or admin interfaces

---

## 3. Admin (Administrative Staff)
**Real-World Person:** Office staff, accounting department, administrative personnel (does paperwork, makes photocopies, extends receipts)

**IMPORTANT:** Admin is for accounting/paperwork personnel. It is COMPLETELY SEPARATE from Developer (superuser/technical support). Admin does NOT have access to `/dev/*` route.

**Real-World Tasks:**
- Create and manage projects in the system
- Import quotes from sales team (CSV/XLSX/PDF)
- Maintain item catalog: add items, update prices, manage SKUs
- Manage installer roster: add/remove installers, assign roles
- Set labor rates for installers
- Reconcile installer events with physical receipts and invoices
- Review and resolve exceptions/duplicates flagged by system
- Export audit reports for accounting department (CSV/XLSX/PDF)
- Supervise installer work: review events they created, verify accuracy
- Soft-delete incorrect events that installers created
- Configure system settings and omission rules
- Manage client information and contact details
- Handle quote imports and BOM (Bill of Materials) mapping
- Verify project status updates from installers
- Reconcile cash box balances with actual cash

**Why They Need Full CRUD:**
- Responsible for all master data maintenance (projects, items, clients, users)
- Must correct installer mistakes and data errors
- Need to reconcile financial data for accounting
- Handle all administrative and operational tasks
- Supervise field operations from the office
- Manage the entire operational data flow

**Access:**
- `/admin/*` - Full admin access to all admin routes (accounting, paperwork, reconciliation)
- Can view all events including hidden/deleted ones
- Can modify all master data
- Can delete events (soft delete)
- Cannot access `/dev/*` (developer route - that's for technical support)
- Cannot access `/manager/*` or `/installer/*` interfaces (they have their own tools)

---

## 4. Installer (Field Worker)
**Real-World Person:** Field technicians doing physical solar panel installation work

**Real-World Tasks:**
- Work on solar panel installations at customer sites (in the field)
- Record materials used during installation (offline, no internet available)
- Track labor hours worked using the timer feature
- Record expenses: gas, tools, meals, etc.
- Note subcontractor work and costs
- Update project status: started installation, completed installation
- Sync data when back in office or when WiFi is available
- View their own cash box balance and recent movements
- Anular (reverse) their own mistakes within time limit (until Saturday 23:59)
- Work completely offline - no internet connection needed
- Create events for: materials added, expenses, labor, subcontractors, status changes

**Why They Need Limited Access:**
- Only see their own work (privacy, prevents confusion)
- Work offline in remote locations without internet
- Simple interface designed for field use on mobile devices
- Can't modify others' work (prevents errors)
- Can't access financial dashboards (not their responsibility)
- Can't modify master data (catalog, projects, etc.) - that's admin's job
- Focused interface prevents mistakes and keeps them productive

**Why They Work Offline:**
- Field work locations often have no internet connection
- Must record events immediately when materials are used or work is done
- Can't wait for internet connection to log important data
- Data syncs automatically later when connection becomes available
- Offline-first ensures no data loss if connection drops

**Access:**
- `/installer/*` - Installer routes only
- Can only see their own events
- Can only see their own cash box
- Can only see projects where they have events (by nickname)
- Cannot access admin or manager interfaces

