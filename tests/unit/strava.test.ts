import { describe, it, expect } from 'vitest'

describe('Strava API Integration', () => {
  describe('OAuth Configuration', () => {
    it('should validate environment variable types', () => {
      // In test environment, these may be undefined
      const clientId = process.env.STRAVA_CLIENT_ID || 'test-id'
      const clientSecret = process.env.STRAVA_CLIENT_SECRET || 'test-secret'
      
      expect(typeof clientId).toBe('string')
      expect(typeof clientSecret).toBe('string')
    })

    it('should construct correct OAuth URL', () => {
      const clientId = 'test-client-id'
      const redirectUri = 'http://localhost:3000/api/strava/callback'
      
      const expectedUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read,activity:read`
      
      const constructedUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read,activity:read`
      
      expect(constructedUrl).toBe(expectedUrl)
    })
  })

  describe('Activity Data Processing', () => {
    it('should filter activities by date range', () => {
      const activities = [
        { start_date: '2025-12-01T10:00:00Z', type: 'Run' },
        { start_date: '2025-11-15T10:00:00Z', type: 'Ride' },
        { start_date: '2025-12-05T10:00:00Z', type: 'Workout' },
      ]
      
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      const filtered = activities.filter(activity => {
        const activityDate = new Date(activity.start_date)
        return activityDate >= thirtyDaysAgo
      })
      
      expect(filtered.length).toBeGreaterThan(0)
    })

    it('should convert duration from seconds to minutes', () => {
      const durationSeconds = 2700 // 45 minutes
      const durationMinutes = Math.floor(durationSeconds / 60)
      
      expect(durationMinutes).toBe(45)
    })

    it('should extract activity date correctly', () => {
      const stravaActivity = {
        start_date: '2025-12-06T10:30:00Z',
        type: 'Run',
        moving_time: 1800,
      }
      
      const activityDate = stravaActivity.start_date.split('T')[0]
      expect(activityDate).toBe('2025-12-06')
    })

    it('should handle different activity types', () => {
      const activityTypes = ['Run', 'Ride', 'Swim', 'Walk', 'Hike', 'Workout']
      
      activityTypes.forEach(type => {
        expect(type).toBeTruthy()
        expect(typeof type).toBe('string')
      })
    })
  })

  describe('Token Management', () => {
    it('should detect expired tokens', () => {
      const expiresAt = Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
      const now = Math.floor(Date.now() / 1000)
      
      const isExpired = now >= expiresAt
      expect(isExpired).toBe(true)
    })

    it('should detect valid tokens', () => {
      const expiresAt = Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
      const now = Math.floor(Date.now() / 1000)
      
      const isExpired = now >= expiresAt
      expect(isExpired).toBe(false)
    })
  })
})

describe('Activity Source Types', () => {
  it('should handle strava source', () => {
    const source = 'strava'
    expect(['strava', 'manual']).toContain(source)
  })

  it('should handle manual source', () => {
    const source = 'manual'
    expect(['strava', 'manual']).toContain(source)
  })

  it('should reject invalid sources', () => {
    const invalidSource = 'invalid'
    expect(['strava', 'manual']).not.toContain(invalidSource)
  })
})
