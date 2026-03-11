# 30x30 Challenge

A multi-tenant fitness tracking platform for organizations and teams to run 30x30 challenges - tracking daily streak activity for 30 days with a minimum of 30 minutes of activity per day.

## Features

### Multi-Tenancy & Organizations
- **Organization Management**: Create and manage organizations with unique subdomains (e.g., `acme.30x30.app`)
- **Role-Based Access Control**: Three-tier permission system (Owner, Admin, Member)
- **Team Leaderboards**: Organization-specific leaderboards for team competitions
- **Member Management**: Invite team members via email with role assignment
- **Organization Settings**: Manage custom domains and API keys (future)

### Activity Tracking
- **Public Leaderboard**: See who's leading the 30x30 challenge globally
- **Multiple Data Sources**: 
  - **Strava Integration**: Automatically sync activities from Strava
  - **Garmin Connect Integration**: Automatically sync activities from Garmin
  - **Manual Entry**: Log activities manually for any workout
- **Magic Link Authentication**: Secure, passwordless login via email with OTP
- **Personal Dashboard**: Track your streak, manage settings, and view your activity calendar
- **Privacy Controls**: Choose whether to appear on the public leaderboard

## Tech Stack

- **Frontend**: Next.js 15 with App Router
- **UI Components**: Shadcn UI with Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (Magic Link)
- **Activity Data**: Strava API, Garmin Connect API, Manual Entry

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase account
- A Strava API application (optional)
- A Garmin Connect API application (optional)

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/frydigital/30x30.git
   cd 30x30
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key
   - `NEXT_PUBLIC_BASE_DOMAIN`: Your base domain (e.g., 30x30.app)
   - `STRAVA_CLIENT_ID`: Your Strava API client ID (optional)
   - `STRAVA_CLIENT_SECRET`: Your Strava API client secret (optional)
   - `GARMIN_CONSUMER_KEY`: Your Garmin API consumer key (optional)
   - `GARMIN_CONSUMER_SECRET`: Your Garmin API consumer secret (optional)
   - `NEXT_PUBLIC_APP_URL`: Your app URL (e.g., http://localhost:3000)

4. Set up the database:
   - Go to your Supabase dashboard
   - Navigate to SQL Editor
   - Run the schema from `supabase/schema.sql`
   - Run the multi-tenancy schema from `supabase/multi-tenancy-schema.sql`

5. Configure Supabase Auth:
   - Enable Email provider in Authentication settings
   - Disable "Confirm email" or configure email templates
   - Add your app URL to the allowed redirect URLs

6. Configure Strava API (optional):
   - Create an API application at https://www.strava.com/settings/api
   - Set the callback URL to `{your-app-url}/api/strava/callback`

7. Configure Garmin Connect API (optional):
   - Apply for API access at https://developer.garmin.com/
   - Set the callback URL to `{your-app-url}/api/garmin/callback`

8. Run the development server:
   ```bash
   npm run dev
   ```

9. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── strava/         # Strava OAuth & sync endpoints
│   │   ├── garmin/         # Garmin OAuth & sync endpoints
│   │   └── activities/     # Manual activity entry
│   ├── auth/               # Auth callback handlers
│   ├── dashboard/          # User dashboard
│   ├── login/              # Login page
│   └── page.tsx            # Public leaderboard
├── components/
│   └── ui/                 # Shadcn UI components
├── lib/
│   ├── strava/             # Strava API utilities
│   ├── garmin/             # Garmin API utilities
│   ├── supabase/           # Supabase client setup
│   ├── types.ts            # TypeScript types
│   └── utils.ts            # Utility functions
└── middleware.ts           # Auth middleware
```

## How It Works

### For Organizations
1. Organization owners create an organization at `/create-organization`
2. Each organization gets a unique subdomain (e.g., `teamname.30x30.app`)
3. Admins invite members via email with role assignments
4. Members join through invitation links or subdomain signup
5. Organization leaderboards show team-specific rankings
6. Admins manage members, roles, and organization settings

### For Individuals
1. Users sign up/login with their email (magic link with OTP)
2. Join organizations or use personal tracking
3. Connect fitness platforms (Strava, Garmin) or add activities manually
4. Sync activities from connected platforms (last 30 days)
5. Activities from all sources are aggregated per day
6. Days with 30+ minutes count toward the streak
7. Streaks are calculated based on consecutive valid days
8. Public profiles appear on the leaderboard

### Multi-Tenant Architecture
- **Subdomain Routing**: Each organization has its own subdomain
- **Row-Level Security**: Database policies ensure data isolation between organizations
- **Role-Based Permissions**: Owner, Admin, and Member roles with hierarchical permissions
- **Organization Context**: All activities and data are scoped to organizations

## License

MIT
