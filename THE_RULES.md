# THE RULES - STRICT DEVELOPMENT GUIDELINES

## ⚠️ THESE RULES MUST BE STRICTLY ADHERED TO AT ALL TIMES ⚠️

### Rule 1: DON'T LIE TO ME! DO NOT MAKE ASSUMPTIONS!
- **NEVER** make up information or guess when you don't know something
- **ALWAYS** ask for clarification if something is unclear
- **NEVER** assume requirements or implementation details
- **ALWAYS** verify facts before stating them
- **NEVER** hide errors or problems - report them immediately

### Rule 2: We always adhere to world class industry best practices
- **ALWAYS** follow established industry standards and patterns
- **ALWAYS** use proven, battle-tested approaches
- **ALWAYS** consider security, performance, scalability, and maintainability
- **ALWAYS** follow framework conventions (Next.js, React, Supabase, etc.)
- **ALWAYS** implement proper error handling and validation
- **ALWAYS** write clean, readable, well-documented code

### Rule 3: We make top-notch, best-in-class, enterprise-grade software
- **ALWAYS** write production-ready code, never prototypes or quick hacks
- **ALWAYS** implement proper error handling, logging, and monitoring
- **ALWAYS** ensure code is maintainable, testable, and scalable
- **ALWAYS** follow enterprise architecture patterns
- **ALWAYS** consider edge cases and failure scenarios
- **ALWAYS** optimize for performance and user experience

### Rule 4: We never put mock data or sample data or false information
- **NEVER** use placeholder data, mock data, or fake information
- **ALWAYS** use real data from the database or API
- **NEVER** hardcode sample values or test data
- **ALWAYS** fetch actual data from Supabase or other data sources
- **NEVER** display "Lorem ipsum" or placeholder text
- **ALWAYS** show real, accurate information or proper empty states

### Rule 5: Each block of code must serve core functions in the best possible way
- **ALWAYS** write code that directly serves the application's core purpose
- **NEVER** add unnecessary complexity or features
- **ALWAYS** optimize for the specific use case
- **ALWAYS** ensure code is efficient and performs well
- **NEVER** add code "just in case" - only add what's needed
- **ALWAYS** refactor when code can be improved

---

## Role Definitions

### Developer (DEV) - Superuser
- **Full access** to ALL routes (`/dev/*`, `/admin/*`, `/manager/*`, `/installer/*`)
- **Purpose**: Testing, debugging, and support across all interfaces
- **Landing Page**: `/dev` - System health monitoring, quick access to all interfaces
- **Best Practice**: Dedicated developer interface separate from admin (admin is for paperwork/accounting staff)

### Manager (CEO)
- **Read-only** dashboards for strategic decision-making
- **Cannot modify** data
- **Landing Page**: `/manager` - Executive summary KPIs (revenue, costs, net profit, margin)
- **Best Practice**: High-level strategic view, no operational controls

### Admin (Office Staff)
- **Full CRUD** on master data, reconciliation, supervision
- **Uses admin interface only**
- **Landing Page**: `/admin/dashboards` - Operational work queue metrics
- **Best Practice**: Focus on operational tasks (exceptions, imports, projections, configuration)
- **Note**: Admin is for personnel that does accounting, paperwork, makes photocopies, extends receipts

### Installer (Field Worker)
- **Offline event creation**, own data only
- **Simple field-focused interface**
- **Landing Page**: `/installer/eventos` - Event creation and sync status
- **Best Practice**: Offline-first PWA, simple and focused on field work

---

## Enforcement

**These rules are NON-NEGOTIABLE and must be followed in EVERY interaction and code change.**

**Violation of these rules will result in immediate correction and re-implementation.**

