# AI Coding Instructions for 30x30 Challenge

## Overview
Multi-tenant fitness tracking platform built with Next.js 16 App Router, Supabase (PostgreSQL with RLS), and subdomain-based organization routing. Users track 30-day fitness streaks, with teams having isolated data and leaderboards.

## User & Admin Hierarchy

The platform has a multi-level access control system:

### 1. Public Users (No Account)
- View public leaderboard at root domain (`30x30.app`)
- Browse marketing pages
- Sign up to create organization or join existing ones

### 2. Participants (Organization Members)
- **Role**: `member` in `organization_members` table
- **Access**: Organization-scoped pages (`/org/*`)
- **Capabilities**:
  - Track personal activities (manual, Strava, Garmin)
  - View organization leaderboard
  - See their own profile and stats
  - Cannot manage other users or organization settings

### 3. Organization Admins
- **Role**: `admin` in `organization_members` table
- **Access**: All member access + `/org/admin`
- **Capabilities**:
  - Invite and remove members
  - Manage member roles (except owners)
  - Update organization settings
  - View member list and activity
  - Cannot remove organization owners
  - Cannot delete organization

### 4. Organization Owners (Group Admins)
- **Role**: `owner` in `organization_members` table
- **Access**: All admin access + full control
- **Capabilities**:
  - All admin capabilities
  - Manage organization subscription
  - Remove admins
  - Delete organization
  - Transfer ownership
  - **Cannot be removed** from organization

**Note**: User who creates an organization automatically becomes owner.

### 5. Superadmins (Platform Administrators)
- **Table**: `superadmins` table (separate from organization roles)
- **Access**: `/superadmin/*` routes (root domain only)
- **Capabilities**:
  - View all organizations and statistics
  - Manage subscriptions across all organizations
  - Activate/deactivate organizations
  - View platform-wide metrics
  - Grant/revoke superadmin access
  - Manage subscription plans
  - Access any organization's data (via RLS policies)

**Check superadmin status**: `isSuperadmin(supabase, userId)` from `lib/superadmin/index.ts`

**Important**: Superadmin is NOT an organization role. A user can be both a superadmin and a member of organizations.

## Architecture Pattern: Multi-Tenancy via Subdomains

### Subdomain Routing (Critical)
- **Production**: `teamslug.30x30.app` → Organization context
- **Development**: `localhost:3000?org=teamslug` → Query param fallback
- **Root domain**: `30x30.app` or `localhost:3000` → Public leaderboard

**Key files**:
- `src/proxy.ts`: Custom middleware for subdomain extraction and route protection
- `src/lib/organizations/subdomain.ts`: Subdomain utilities (`extractSubdomain`, `getOrganizationSlugFromRequest`)

### Organization Context Flow
1. **Request arrives** → `proxy.ts` extracts subdomain → Sets `x-organization-slug` header
2. **Client components** → Call `extractSubdomain(window.location.hostname)` or read `?org=` query param
3. **Server components** → Get slug from `searchParams.org` (must be passed through pages)
4. **Context Provider** → `OrganizationProvider` (client-side) loads org data and user role

**Important**: Server components cannot read custom headers in Next.js 16. Pass organization slug through `searchParams`.

## Data Isolation: Row-Level Security (RLS)

### RLS Policy Pattern
All multi-tenant tables have `organization_id` column with policies enforcing data isolation:

```sql
-- Example from supabase/multi-tenancy-schema.sql
CREATE POLICY "Members view org data" ON activities
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );
```

**When adding new tables**:
1. Add `organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE`
2. Enable RLS: `ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;`
3. Create policies for SELECT/INSERT/UPDATE/DELETE based on organization membership
4. Add index: `CREATE INDEX idx_your_table_organization ON your_table(organization_id);`

### Role Hierarchy
- **Owner** (3): Full control, cannot be removed
- **Admin** (2): Manage members, update settings
- **Member** (1): View leaderboard, track activities

Check permissions with `useOrganizationPermission(requiredRole)` (client) or `hasOrganizationPermission(supabase, orgId, role)` (server).

## Database Patterns

### Supabase Client Creation
- **Server Components**: `import { createClient } from '@/lib/supabase/server'` → Reads cookies with `next/headers`
- **Client Components**: `import { createClient } from '@/lib/supabase/client'` → Browser client
- **API Routes**: Use server client
- **Middleware**: Custom client in `updateSession()` with cookie handling

### Activity Aggregation
Activities are aggregated into `daily_activities` (sum of durations per day):
- Insert/update activity → Call `recalculateDailyActivities(supabase, userId)` from `lib/activities/utils.ts`
- Database trigger `calculate_streak()` updates `streaks` table automatically
- Valid day: `total_duration_minutes >= 30`

### Database Functions
Use `supabase.rpc()` for complex operations:
- `create_organization(p_name, p_slug, p_description)` → Creates org + owner membership + settings
- `calculate_streak()` → Auto-recalculates streaks on daily_activities changes
- `has_organization_permission(p_org_id, p_user_id, p_required_role)` → Server-side role check

## Key Workflows

### Organization Creation
1. User authenticated → Navigate to `/create-organization` (root domain only)
2. Validate slug: 3-63 chars, `^[a-z0-9][a-z0-9-]*[a-z0-9]$`
3. Call `createOrganization()` from `lib/organizations/index.ts`
4. Redirect to `buildOrganizationUrl(slug)` → subdomain

### Member Invitation
1. Admin generates secure token: `crypto.getRandomValues(new Uint8Array(32))`
2. Store in `organization_invitations` with 7-day expiry
3. Share link: `/join?token=...`
4. New user signs up → OTP flow → `handle_new_user` trigger validates org_id in metadata

### Subdomain Signup (No Token)
1. Visit `teamslug.30x30.app/join`
2. Client extracts slug → Shows org name
3. Sign up with `organization_id` in user metadata
4. Database trigger validates and creates membership

## Development Commands

```bash
npm run dev           # Start dev server (localhost:3000)
npm run build         # Production build
npm run lint          # ESLint check
```

**Testing multi-tenancy locally**: Use `localhost:3000?org=testorg` query parameter.

## Common Patterns

### Protected Organization Routes
Routes under `/org/*` require organization context and membership:

```typescript
// Server component pattern (e.g., app/org/leaderboard/page.tsx)
export default async function Page({ searchParams }) {
  const params = await searchParams;
  const orgSlug = params.org; // Get from query param
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  
  // Load org and verify membership
  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('slug', orgSlug)
    .single();
    
  // Check membership...
}
```

### Client Component Pattern
```typescript
'use client';
import { extractSubdomain } from '@/lib/organizations/subdomain';

// Get org slug in client
const hostname = window.location.hostname;
const slug = extractSubdomain(hostname) || 
             new URLSearchParams(window.location.search).get('org');
```

### Strava/Garmin OAuth
- OAuth callback stores `access_token`, `refresh_token`, `expires_at` in `*_connections` table
- Sync endpoint fetches activities from last 30 days
- Activities stored with `source: 'strava' | 'garmin' | 'manual'`
- Trigger auto-recalculates daily totals and streaks

## File Organization

```
src/
├── app/
│   ├── api/              # API routes (OAuth callbacks, manual entry, sync)
│   ├── org/              # Organization-scoped pages (leaderboard, admin)
│   ├── superadmin/       # Platform admin pages (dashboard, orgs, subscriptions)
│   ├── create-organization/  # Root domain only
│   └── join/             # Join org via invitation or subdomain
├── components/
│   ├── organization/     # OrganizationHeader (client component)
│   └── ui/               # Shadcn components (button, card, badge, etc.)
└── lib/
    ├── organizations/
    │   ├── index.ts      # CRUD functions (createOrganization, inviteMembers)
    │   ├── subdomain.ts  # Subdomain utilities
    │   └── context.tsx   # OrganizationProvider, useOrganization()
    ├── superadmin/
    │   └── index.ts      # Superadmin utilities (manage orgs, subscriptions)
    ├── supabase/         # Client/server/middleware setup
    ├── activities/       # Activity aggregation utilities
    └── types.ts          # TypeScript interfaces
```

## Testing Checklist for Multi-Tenancy

When modifying organization features, verify:
- ✅ Data isolation: Users only see their org's data
- ✅ Role permissions: Admin actions blocked for members
- ✅ Subdomain routing: Org routes redirect properly on root domain
- ✅ RLS policies: Database blocks cross-org queries
- ✅ Query param fallback: Works in development (`?org=slug`)

## Common Pitfalls

1. **Don't read custom headers in server components** → Use `searchParams` instead
2. **Always validate organization_id server-side** → Use database triggers/functions
3. **Token generation**: Use `crypto.getRandomValues()`, never `Math.random()`
4. **Slug validation**: Must match regex `^[a-z0-9][a-z0-9-]*[a-z0-9]$` and be 3-63 chars
5. **Activity updates**: Always call `recalculateDailyActivities()` after insert/update/delete
6. **Organization context**: Pass slug explicitly through page props, don't rely on globals

## Environment Variables

Required in `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_BASE_DOMAIN=30x30.app        # Critical for subdomain routing
NEXT_PUBLIC_APP_URL=http://localhost:3000
STRAVA_CLIENT_ID=...                      # Optional
STRAVA_CLIENT_SECRET=...                  # Optional
```

## Reference Documentation

- Multi-tenancy setup: `MULTI_TENANCY_SETUP.md`
- Database schema: `supabase/schema.sql`, `supabase/multi-tenancy-schema.sql`, `supabase/superadmin-schema.sql`
- Organization utilities: `src/lib/organizations/index.ts`
- Superadmin utilities: `src/lib/superadmin/index.ts`

## Superadmin Patterns

### Superadmin Access Control
Routes under `/superadmin/*` are protected:
1. Must be accessed from root domain (not organization subdomain)
2. User must exist in `superadmins` table
3. Authentication checked in each page component

```typescript
// In superadmin page
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) redirect("/login");

const isSuper = await isSuperadmin(supabase);
if (!isSuper) redirect("/dashboard");
```

### Subscription Management
Organizations are automatically assigned a "Free" plan on creation:
- Trigger `create_default_subscription` runs after org insert
- Superadmins can upgrade/downgrade plans via `/superadmin/subscriptions`
- Subscription changes logged in `subscription_history` table

### Database Schema Notes
Run schemas in this order:
1. `supabase/schema.sql` - Base tables (profiles, activities, etc.)
2. `supabase/multi-tenancy-schema.sql` - Organization tables and RLS
3. `supabase/superadmin-schema.sql` - Superadmin and subscription tables
