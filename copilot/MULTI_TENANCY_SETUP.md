# Multi-Tenancy Setup Guide

This guide walks through setting up the multi-tenant 30x30 Challenge application with subdomain-based organization routing.

## Prerequisites

- Supabase project created
- Node.js 18+ installed
- Domain name (e.g., `30x30.app`) with DNS access
- Vercel account (or other hosting platform)

## 1. Database Setup

### Step 1: Run Base Schema
1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Run the contents of `supabase/schema.sql`

### Step 2: Run Multi-Tenancy Schema
1. In the same SQL Editor
2. Run the contents of `supabase/multi-tenancy-schema.sql`
3. This creates:
   - Organizations table
   - Organization members table with roles
   - Organization settings table
   - Organization invitations table
   - RLS policies for data isolation
   - Helper functions for organization management

### Step 3: Verify Database Setup
Run this query to verify tables were created:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('organizations', 'organization_members', 'organization_settings', 'organization_invitations');
```

You should see all four tables listed.

## 2. Environment Configuration

### Local Development (.env.local)
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Multi-tenancy
NEXT_PUBLIC_BASE_DOMAIN=30x30.app
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: Strava & Garmin
STRAVA_CLIENT_ID=your_strava_client_id
STRAVA_CLIENT_SECRET=your_strava_client_secret
GARMIN_CONSUMER_KEY=your_garmin_consumer_key
GARMIN_CONSUMER_SECRET=your_garmin_consumer_secret
```

### Production Environment
In Vercel (or your hosting platform), set:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_BASE_DOMAIN=30x30.app
NEXT_PUBLIC_APP_URL=https://30x30.app
```

## 3. DNS Configuration

### For Production (Wildcard Subdomain)

Configure DNS records for your domain to support wildcard subdomains:

1. **Root Domain (A Record)**
   ```
   Type: A
   Name: @
   Value: [Your server IP or use Vercel's IP]
   TTL: 3600
   ```

2. **WWW (CNAME)**
   ```
   Type: CNAME
   Name: www
   Value: 30x30.app
   TTL: 3600
   ```

3. **Wildcard Subdomain (CNAME)**
   ```
   Type: CNAME
   Name: *
   Value: cname.vercel-dns.com (or your hosting provider's value)
   TTL: 3600
   ```

### For Vercel

1. In your Vercel project settings, go to "Domains"
2. Add your domains:
   - `30x30.app` (root domain)
   - `*.30x30.app` (wildcard for subdomains)
3. Vercel will provide DNS instructions specific to your setup

**Note**: Wildcard SSL certificates are automatically provisioned by Vercel.

### For Local Development

Local development doesn't support real subdomains. The app uses query parameters instead:
- Root: `http://localhost:3000`
- Organization: `http://localhost:3000?org=acme`

## 4. Supabase Auth Configuration

### Enable Email OTP
1. Go to Supabase Dashboard → Authentication → Providers
2. Enable "Email" provider
3. Configure OTP settings:
   - ✅ Enable Email OTP
   - Set OTP expiration (default: 1 hour)
   - Customize email templates (optional)

### Configure Redirect URLs
Add allowed redirect URLs in Supabase:
1. Go to Authentication → URL Configuration
2. Add these patterns:
   ```
   http://localhost:3000/**
   https://30x30.app/**
   https://*.30x30.app/**
   ```

### Email Templates (Optional)
Customize the OTP email template:
1. Go to Authentication → Email Templates
2. Edit "Magic Link" template
3. Customize subject and body

## 5. Application Deployment

### Deploy to Vercel

1. **Connect Repository**
   ```bash
   vercel
   ```

2. **Configure Build Settings**
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

3. **Add Environment Variables**
   - Use Vercel dashboard or CLI to add environment variables
   - Ensure `NEXT_PUBLIC_BASE_DOMAIN` matches your domain

4. **Deploy**
   ```bash
   vercel --prod
   ```

### Verify Deployment
1. Visit `https://30x30.app`
2. Create a test organization at `/create-organization`
3. Test subdomain access: `https://[org-slug].30x30.app`

## 6. Organization Management Workflows

### Creating an Organization

1. User must be authenticated
2. Navigate to `/create-organization`
3. Fill in:
   - Organization name
   - Unique slug (becomes subdomain)
   - Description (optional)
4. User becomes the organization owner
5. Organization is accessible at `[slug].30x30.app`

### Inviting Members

1. Organization admin/owner logs in
2. Navigate to organization subdomain
3. Go to `/org/admin`
4. In "Invite Members" section:
   - Enter member email
   - Select role (Member/Admin/Owner)
   - Click "Send Invitation"
5. Share invitation link with new member

### Joining an Organization

Two methods:

**Method 1: Via Invitation Link**
1. Receive invitation email/link with token
2. Click link (format: `/join?token=...`)
3. Sign up with email and username
4. Verify OTP code
5. Automatically added to organization

**Method 2: Via Subdomain Signup**
1. Visit organization subdomain (`[slug].30x30.app`)
2. Click "Join Organization" or navigate to `/join`
3. Sign up with email and username
4. Verify OTP code
5. Added to organization as member

## 7. Role-Based Permissions

### Role Hierarchy
1. **Owner** (highest authority)
   - Full control over organization
   - Can manage all members including admins
   - Can delete organization
   - Cannot be removed from organization

2. **Admin**
   - Can invite and manage members
   - Can update organization settings
   - Cannot remove owners
   - Can be removed by owners

3. **Member** (basic access)
   - Can view organization leaderboard
   - Can track their own activities
   - Can view other members
   - Cannot manage organization or other members

### Permission Checks in Code

Use the `has_organization_permission` function:
```typescript
import { hasOrganizationPermission } from '@/lib/organizations';

// Check if user is at least a member
const isMember = await hasOrganizationPermission(
  supabase,
  organizationId,
  'member'
);

// Check if user is admin or owner
const isAdmin = await hasOrganizationPermission(
  supabase,
  organizationId,
  'admin'
);
```

## 8. Row-Level Security (RLS)

All data is isolated by organization using RLS policies:

- ✅ Users can only access data from their organizations
- ✅ Public leaderboards show only public profiles
- ✅ Organization data requires membership
- ✅ Admin actions require admin/owner role

**Important**: When adding new tables, always:
1. Enable RLS: `ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;`
2. Add organization_id column if relevant
3. Create appropriate policies for data access

## 9. Testing Multi-Tenancy

### Manual Testing Checklist

**Organization Creation**
- [ ] Authenticated user can create organization
- [ ] Organization slug is validated (3-63 chars, lowercase, alphanumeric + hyphens)
- [ ] Duplicate slugs are rejected
- [ ] Creator becomes owner
- [ ] Organization settings are created

**Member Management**
- [ ] Admins can invite members
- [ ] Invitation tokens are secure (32-byte random)
- [ ] Invitations expire after 7 days
- [ ] Members can be removed by admins
- [ ] Owners cannot be removed
- [ ] Role changes work correctly

**Data Isolation**
- [ ] Members can only see their organization's data
- [ ] Activities are scoped to organization
- [ ] Leaderboards show correct organization members
- [ ] Cross-organization data access is blocked

**Subdomain Routing**
- [ ] Root domain shows public leaderboard
- [ ] Organization subdomains load correctly
- [ ] Invalid subdomains redirect appropriately
- [ ] Authentication works across subdomains

### Automated Testing (Future)
Consider adding:
- Integration tests for organization CRUD
- RLS policy tests
- Role permission tests
- Subdomain routing tests

## 10. Troubleshooting

### Issue: Subdomain not working locally
**Solution**: Use query parameter instead: `http://localhost:3000?org=yourslug`

### Issue: "Organization not found" error
**Check**:
- Organization exists in database
- Organization is_active = true
- Slug matches exactly (case-sensitive check)

### Issue: User can't join organization
**Check**:
- Organization invitation is valid and not expired
- organization_id in user metadata matches existing org
- Email matches invitation email

### Issue: RLS policy blocking access
**Check**:
- User is authenticated
- User is a member of the organization
- User has required role for the operation

### Issue: Wildcard SSL not working
**Solution**:
- Verify DNS wildcard record is set up correctly
- Wait for DNS propagation (can take up to 48 hours)
- Check hosting provider supports wildcard SSL

## 11. Security Best Practices

1. **Token Generation**
   - Always use `crypto.getRandomValues()` for secure tokens
   - Minimum 32 bytes of entropy
   - Use base64url encoding for URL safety

2. **Organization Validation**
   - Validate organization_id server-side in database triggers
   - Never trust client-provided organization context
   - Use RLS policies as primary security layer

3. **Role Checks**
   - Always verify user role before admin operations
   - Use database functions for permission checks
   - Implement role hierarchy (owner > admin > member)

4. **URL Construction**
   - Use environment variables for base URLs
   - Validate organization slugs before building URLs
   - Sanitize user input in slugs

## 12. Monitoring & Maintenance

### Metrics to Monitor
- Organization creation rate
- Member invitation acceptance rate
- Failed authentication attempts
- RLS policy violations
- Database query performance

### Regular Maintenance
- Review and expire old invitations
- Clean up inactive organizations
- Monitor subdomain usage
- Update RLS policies as needed

## 13. Future Enhancements

Planned features not yet implemented:

1. **Stripe Integration**
   - Organization-level subscriptions
   - Per-user billing options
   - Usage-based pricing

2. **API Keys**
   - Secure storage in organization_settings
   - API key rotation
   - Usage tracking

3. **Custom Domains**
   - Support for custom domains per organization
   - SSL certificate management
   - Domain verification

4. **Organization Switcher**
   - UI for users in multiple organizations
   - Quick switch between orgs
   - Recent organizations list

5. **Advanced Analytics**
   - Organization-level activity reports
   - Member engagement metrics
   - Leaderboard history

## Support

For issues or questions:
- GitHub Issues: [frydigital/30x30](https://github.com/frydigital/30x30/issues)
- Documentation: See README.md
- Database Schema: See `supabase/multi-tenancy-schema.sql`
