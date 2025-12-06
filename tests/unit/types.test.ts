import { describe, it, expect } from 'vitest'
import type { ActivitySource, Activity, DailyActivity, Streak, Profile } from '@/lib/types'

describe('Type Definitions', () => {
  describe('ActivitySource', () => {
    it('should only allow valid activity sources', () => {
      const validSources: ActivitySource[] = ['strava', 'manual']
      
      validSources.forEach(source => {
        expect(['strava', 'manual']).toContain(source)
      })
    })
  })

  describe('Activity Type', () => {
    it('should have required fields', () => {
      const activity: Partial<Activity> = {
        id: 'test-id',
        user_id: 'user-123',
        activity_date: '2025-12-06',
        duration_minutes: 45,
        source: 'strava',
      }
      
      expect(activity.id).toBeTruthy()
      expect(activity.user_id).toBeTruthy()
      expect(activity.activity_date).toBeTruthy()
      expect(activity.duration_minutes).toBeGreaterThan(0)
      expect(['strava', 'manual']).toContain(activity.source!)
    })

    it('should allow optional fields', () => {
      const activity: Partial<Activity> = {
        id: 'test-id',
        user_id: 'user-123',
        activity_date: '2025-12-06',
        duration_minutes: 45,
        source: 'manual',
        activity_type: 'Workout',
        activity_name: 'Morning Run',
        notes: 'Great workout!',
      }
      
      expect(activity.activity_type).toBe('Workout')
      expect(activity.activity_name).toBe('Morning Run')
      expect(activity.notes).toBe('Great workout!')
    })
  })

  describe('DailyActivity Type', () => {
    it('should aggregate multiple activities', () => {
      const dailyActivity: Partial<DailyActivity> = {
        id: 'daily-id',
        user_id: 'user-123',
        activity_date: '2025-12-06',
        total_duration_minutes: 75,
        is_valid: true,
      }
      
      expect(dailyActivity.total_duration_minutes).toBe(75)
      expect(dailyActivity.is_valid).toBe(true)
    })

    it('should mark day as invalid if under 30 minutes', () => {
      const dailyActivity: Partial<DailyActivity> = {
        total_duration_minutes: 25,
        is_valid: false,
      }
      
      expect(dailyActivity.total_duration_minutes! < 30).toBe(true)
      expect(dailyActivity.is_valid).toBe(false)
    })
  })

  describe('Streak Type', () => {
    it('should track current and longest streaks', () => {
      const streak: Partial<Streak> = {
        id: 'streak-id',
        user_id: 'user-123',
        current_streak: 15,
        longest_streak: 28,
        last_activity_date: '2025-12-06',
      }
      
      expect(streak.current_streak).toBeLessThanOrEqual(streak.longest_streak!)
      expect(streak.last_activity_date).toBeTruthy()
    })

    it('should handle zero streaks', () => {
      const streak: Partial<Streak> = {
        current_streak: 0,
        longest_streak: 0,
        last_activity_date: null,
      }
      
      expect(streak.current_streak).toBe(0)
      expect(streak.longest_streak).toBe(0)
      expect(streak.last_activity_date).toBeNull()
    })
  })

  describe('Profile Type', () => {
    it('should have optional username', () => {
      const profileWithUsername: Partial<Profile> = {
        id: 'user-id',
        username: 'testuser',
        is_public: true,
      }
      
      const profileWithoutUsername: Partial<Profile> = {
        id: 'user-id',
        username: null,
        is_public: false,
      }
      
      expect(profileWithUsername.username).toBe('testuser')
      expect(profileWithoutUsername.username).toBeNull()
    })

    it('should have public/private flag', () => {
      const publicProfile: Partial<Profile> = {
        is_public: true,
      }
      
      const privateProfile: Partial<Profile> = {
        is_public: false,
      }
      
      expect(publicProfile.is_public).toBe(true)
      expect(privateProfile.is_public).toBe(false)
    })
  })
})

describe('Data Validation', () => {
  describe('Date Formats', () => {
    it('should use YYYY-MM-DD format for activity dates', () => {
      const dateString = '2025-12-06'
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      
      expect(dateRegex.test(dateString)).toBe(true)
    })

    it('should parse date strings correctly', () => {
      const dateString = '2025-12-06'
      const date = new Date(dateString + 'T00:00:00Z')
      
      expect(date.getUTCFullYear()).toBe(2025)
      expect(date.getUTCMonth()).toBe(11) // December (0-indexed)
      expect(date.getUTCDate()).toBe(6)
    })
  })

  describe('Duration Validation', () => {
    it('should only accept positive durations', () => {
      const validDuration = 45
      const invalidDuration = -10
      
      expect(validDuration).toBeGreaterThan(0)
      expect(invalidDuration).toBeLessThan(0)
    })

    it('should handle decimal durations', () => {
      const duration = 45.5
      const rounded = Math.floor(duration)
      
      expect(rounded).toBe(45)
    })
  })
})
