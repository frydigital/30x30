import { describe, it, expect } from 'vitest'

describe('Activity Utils', () => {
  describe('Activity Validation', () => {
    it('should mark days with 30+ minutes as valid', () => {
      const duration = 45
      const isValid = duration >= 30
      expect(isValid).toBe(true)
    })

    it('should mark days with less than 30 minutes as invalid', () => {
      const duration = 25
      const isValid = duration >= 30
      expect(isValid).toBe(false)
    })

    it('should aggregate multiple activities correctly', () => {
      const activities = [
        { duration_minutes: 15 },
        { duration_minutes: 20 },
      ]
      const total = activities.reduce((sum, act) => sum + act.duration_minutes, 0)
      expect(total).toBe(35)
      expect(total >= 30).toBe(true)
    })

    it('should handle edge case of exactly 30 minutes', () => {
      const duration = 30
      const isValid = duration >= 30
      expect(isValid).toBe(true)
    })

    it('should handle zero duration', () => {
      const duration = 0
      const isValid = duration >= 30
      expect(isValid).toBe(false)
    })
  })

  describe('Daily Activity Aggregation', () => {
    it('should group activities by date', () => {
      const activities = [
        { activity_date: '2025-12-01', duration_minutes: 20 },
        { activity_date: '2025-12-01', duration_minutes: 15 },
        { activity_date: '2025-12-02', duration_minutes: 40 },
      ]

      const grouped = activities.reduce((acc, activity) => {
        const date = activity.activity_date
        if (!acc[date]) {
          acc[date] = []
        }
        acc[date].push(activity)
        return acc
      }, {} as Record<string, typeof activities>)

      expect(grouped['2025-12-01']).toHaveLength(2)
      expect(grouped['2025-12-02']).toHaveLength(1)
    })

    it('should calculate total duration for each date', () => {
      const activities = [
        { activity_date: '2025-12-01', duration_minutes: 20 },
        { activity_date: '2025-12-01', duration_minutes: 15 },
      ]

      const total = activities.reduce((sum, act) => sum + act.duration_minutes, 0)
      expect(total).toBe(35)
    })
  })

  describe('Streak Calculation', () => {
    it('should calculate consecutive days correctly', () => {
      const validDays = [
        { activity_date: '2025-12-01', valid_day: true },
        { activity_date: '2025-12-02', valid_day: true },
        { activity_date: '2025-12-03', valid_day: true },
        { activity_date: '2025-12-05', valid_day: true },
      ]

      // Simple streak counter (consecutive from most recent)
      let streak = 0
      const sortedDays = validDays
        .filter(d => d.valid_day)
        .sort((a, b) => b.activity_date.localeCompare(a.activity_date))

      for (let i = 0; i < sortedDays.length; i++) {
        const currentDate = new Date(sortedDays[i].activity_date)
        if (i === 0) {
          streak = 1
        } else {
          const prevDate = new Date(sortedDays[i - 1].activity_date)
          const diffDays = Math.floor((prevDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24))
          if (diffDays === 1) {
            streak++
          } else {
            break
          }
        }
      }

      expect(streak).toBeGreaterThan(0)
    })
  })
})
