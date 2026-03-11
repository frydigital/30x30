import { describe, expect, it } from 'vitest'
import type { AmiliaWebhookEvent } from '@/lib/types'

// ── Helpers ────────────────────────────────────────────────────────────────

function makeRegistrationEvent(overrides: Partial<AmiliaWebhookEvent['Payload']> = {}): AmiliaWebhookEvent {
  return {
    Context: 'Registration',
    Action: 'Create',
    Name: 'Registration Create',
    EventTime: '2022-09-01T14:41:03.548669-04:00',
    Payload: {
      RegistrationId: 'SUB-/DI-/PL-456',
      Program: { Id: 1, Name: 'Test Program' },
      Activity: { Id: 2, Name: 'Test Activity' },
      Category: { Id: 3, Name: 'Test Category' },
      SubCategory: { Id: 4, Name: 'Test SubCategory' },
      Group: { Id: 5, Name: 'Test Group' },
      DropIn: null,
      DateCreated: '2022-09-01T14:41:03.5283954-04:00',
      Person: {
        Id: 1,
        FirstName: 'First',
        LastName: 'Last',
        FullName: 'First Last',
        DateOfBirth: '2002-09-01',
        Email: 'test@email.com',
        Address: null,
        Telephone: null,
        TelephoneMobile: null,
        TelephoneWork: null,
      },
      AccountOwner: null,
      Staff: null,
      InvoiceItem: null,
      IsCancelled: false,
      ...overrides,
    },
  }
}

// ── Validation logic (mirrors the route handler) ───────────────────────────

function shouldHandleEvent(event: AmiliaWebhookEvent): { handle: boolean; reason?: string } {
  if (event.Context !== 'Registration' || event.Action !== 'Create') {
    return { handle: false, reason: 'Not a Registration/Create event' }
  }
  if (event.Payload?.IsCancelled) {
    return { handle: false, reason: 'Registration is cancelled' }
  }
  return { handle: true }
}

function matchesAmiliaFilter(
  event: AmiliaWebhookEvent,
  programId?: number | null,
  activityId?: number | null
): boolean {
  if (programId != null && event.Payload?.Program?.Id !== programId) return false
  if (activityId != null && event.Payload?.Activity?.Id !== activityId) return false
  return true
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('Amilia Webhook — event filtering', () => {
  it('handles a valid Registration/Create event', () => {
    const event = makeRegistrationEvent()
    expect(shouldHandleEvent(event)).toEqual({ handle: true })
  })

  it('ignores events that are not Registration/Create', () => {
    const event: AmiliaWebhookEvent = { ...makeRegistrationEvent(), Context: 'Payment', Action: 'Create' }
    const result = shouldHandleEvent(event)
    expect(result.handle).toBe(false)
  })

  it('ignores events with Action other than Create', () => {
    const event: AmiliaWebhookEvent = { ...makeRegistrationEvent(), Action: 'Update' }
    const result = shouldHandleEvent(event)
    expect(result.handle).toBe(false)
  })

  it('ignores cancelled registrations', () => {
    const event = makeRegistrationEvent({ IsCancelled: true })
    const result = shouldHandleEvent(event)
    expect(result.handle).toBe(false)
    expect(result.reason).toMatch(/cancelled/i)
  })
})

describe('Amilia Webhook — ID filtering', () => {
  it('passes when no program or activity ID is configured', () => {
    const event = makeRegistrationEvent()
    expect(matchesAmiliaFilter(event)).toBe(true)
  })

  it('passes when program ID matches configured value', () => {
    const event = makeRegistrationEvent({ Program: { Id: 42, Name: 'My Program' } })
    expect(matchesAmiliaFilter(event, 42)).toBe(true)
  })

  it('rejects when program ID does not match', () => {
    const event = makeRegistrationEvent({ Program: { Id: 99, Name: 'Other Program' } })
    expect(matchesAmiliaFilter(event, 42)).toBe(false)
  })

  it('passes when activity ID matches configured value', () => {
    const event = makeRegistrationEvent({ Activity: { Id: 7, Name: 'My Activity' } })
    expect(matchesAmiliaFilter(event, null, 7)).toBe(true)
  })

  it('rejects when activity ID does not match', () => {
    const event = makeRegistrationEvent({ Activity: { Id: 99, Name: 'Other Activity' } })
    expect(matchesAmiliaFilter(event, null, 7)).toBe(false)
  })

  it('passes when both program and activity IDs match', () => {
    const event = makeRegistrationEvent({
      Program: { Id: 1, Name: 'Test Program' },
      Activity: { Id: 2, Name: 'Test Activity' },
    })
    expect(matchesAmiliaFilter(event, 1, 2)).toBe(true)
  })

  it('rejects when program matches but activity does not', () => {
    const event = makeRegistrationEvent({
      Program: { Id: 1, Name: 'Test Program' },
      Activity: { Id: 99, Name: 'Other Activity' },
    })
    expect(matchesAmiliaFilter(event, 1, 2)).toBe(false)
  })
})

describe('Amilia Webhook — payload shape', () => {
  it('extracts email from Person field', () => {
    const event = makeRegistrationEvent()
    expect(event.Payload.Person.Email).toBe('test@email.com')
  })

  it('identifies a registration as non-cancelled by default', () => {
    const event = makeRegistrationEvent()
    expect(event.Payload.IsCancelled).toBe(false)
  })

  it('correctly reads program and activity IDs', () => {
    const event = makeRegistrationEvent()
    expect(event.Payload.Program.Id).toBe(1)
    expect(event.Payload.Activity.Id).toBe(2)
  })
})
