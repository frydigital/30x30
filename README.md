# 30x30 Challenge

A public-facing leaderboard tracking daily streak activity for 30 days, with a minimum of 30 minutes of activity per day.

## Features

- **Public Leaderboard**: See who's leading the 30x30 challenge
- **Strava Integration**: Automatically sync activities from Strava
- **Magic Link Authentication**: Secure, passwordless login via email
- **Personal Dashboard**: Track your streak, manage settings, and view your activity calendar
- **Privacy Controls**: Choose whether to appear on the public leaderboard

## Tech Stack

- **Frontend**: Next.js 15 with App Router
- **UI Components**: Shadcn UI with Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (Magic Link)
- **Activity Data**: Strava API

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase account
- A Strava API application

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
   - `STRAVA_CLIENT_ID`: Your Strava API client ID
   - `STRAVA_CLIENT_SECRET`: Your Strava API client secret
   - `NEXT_PUBLIC_APP_URL`: Your app URL (e.g., http://localhost:3000)

4. Set up the database:
   - Go to your Supabase dashboard
   - Navigate to SQL Editor
   - Run the schema from `supabase/schema.sql`

5. Configure Supabase Auth:
   - Enable Email provider in Authentication settings
   - Disable "Confirm email" or configure email templates
   - Add your app URL to the allowed redirect URLs

6. Configure Strava API:
   - Create an API application at https://www.strava.com/settings/api
   - Set the callback URL to `{your-app-url}/api/strava/callback`

7. Run the development server:
   ```bash
   npm run dev
   ```

8. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   └── strava/         # Strava OAuth & sync endpoints
│   ├── auth/               # Auth callback handlers
│   ├── dashboard/          # User dashboard
│   ├── login/              # Login page
│   └── page.tsx            # Public leaderboard
├── components/
│   └── ui/                 # Shadcn UI components
├── lib/
│   ├── strava/             # Strava API utilities
│   ├── supabase/           # Supabase client setup
│   ├── types.ts            # TypeScript types
│   └── utils.ts            # Utility functions
└── middleware.ts           # Auth middleware
```

## How It Works

1. Users sign up/login with their email (magic link)
2. Connect their Strava account to authorize activity access
3. Sync activities from Strava (last 30 days)
4. Activities are aggregated per day
5. Days with 30+ minutes count toward the streak
6. Streaks are calculated based on consecutive valid days
7. Public profiles appear on the leaderboard

## License

MIT
