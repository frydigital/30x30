import { vi, describe, it, expect, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mock dependencies before importing the route handler ──────────────────

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/organizations/subdomain', () => ({
  extractSubdomain: vi.fn(),
}))

import { createAdminClient } from '@/lib/supabase/admin'
import { extractSubdomain } from '@/lib/organizations/subdomain'
import { POST } from '@/app/api/amilia/webhook/route'

// ── Shared fixtures ────────────────────────────────────────────────────────

/** The full example payload from the Amilia docs / problem statement */
const SAMPLE_EVENT = {
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
    DropIn: {
      OccurrenceId: 6,
      OccurrenceDate: '2022-09-02T14:41:03.5283954-04:00',
    },
    DateCreated: '2022-09-01T14:41:03.5283954-04:00',
    Person: {
      Id: 1,
      FirstName: 'First',
      LastName: 'Last',
      FullName: 'First Last',
      DateOfBirth: '2002-09-01',
      Email: 'test@email.com',
      Address: {
        Latitude: 45.0,
        Longitude: -73.0,
        Address1: '1234 First street',
        Address2: 'App 3',
        City: 'TestVille',
        Country: 'CA',
        StateProvince: 'QC',
        ZipPostalCode: 'H0H 0H0',
      },
      Telephone: '(514) 123-4567',
      TelephoneMobile: '(514) 987-6543',
      TelephoneWork: '(514) 133-5567',
    },
    AccountOwner: { AccountId: 7, AccountOwnerPersonId: 8 },
    Staff: { Id: 2, FirstName: 'Staff', LastName: 'Member', State: 'Normal' },
    InvoiceItem: { Id: 35374222 },
    IsCancelled: false,
  },
}

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Build a NextRequest that POSTs a JSON body to the webhook endpoint.
 * Defaults to using the ?org= query param (localhost dev style).
 */
function makeRequest(
  body: unknown,
  url = 'http://localhost/api/amilia/webhook?org=testorg',
): NextRequest {
  return new NextRequest(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

/**
 * Create a chainable mock Supabase query builder that resolves to `result`
 * on any terminal call (.single(), .insert()).
 * Supports the following chaining patterns used by the route handler:
 *   from(table).select().eq().eq().single()
 *   from(table).upsert({}, opts).select().single()
 *   from(table).insert({})
 *   from(table).select().eq().limit(n).single()
 * Add to the chain-method list below if new query methods are introduced.
 */
function makeChain(result: { data: unknown; error?: unknown }) {
  const c: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'limit', 'upsert']) {
    c[m] = vi.fn().mockReturnValue(c)
  }
  c.single = vi.fn().mockResolvedValue(result)
  c.insert = vi.fn().mockResolvedValue({ data: null, error: null })
  return c
}

/**
 * Wire up a mock Supabase client where each table responds with the
 * provided results.  Unspecified tables default to a no-error empty response.
 */
function mockSupabase(tables: {
  organizations?: { data: unknown; error?: unknown }
  organization_settings?: { data: unknown; error?: unknown }
  organization_members?: { data: unknown; error?: unknown }
  organization_invitations?: { data: unknown; error?: unknown }
}) {
  const defaultResult = { data: null, error: null }

  const chains: Record<string, ReturnType<typeof makeChain>> = {
    organizations: makeChain(tables.organizations ?? defaultResult),
    organization_settings: makeChain(tables.organization_settings ?? defaultResult),
    organization_members: makeChain(tables.organization_members ?? defaultResult),
    organization_invitations: makeChain(tables.organization_invitations ?? defaultResult),
    amilia_webhook_logs: makeChain(defaultResult),
  }

  vi.mocked(createAdminClient).mockReturnValue({
    from: (table: string) => chains[table] ?? makeChain(defaultResult),
  } as unknown as ReturnType<typeof createAdminClient>)
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('POST /api/amilia/webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: org slug resolved from ?org= query param
    vi.mocked(extractSubdomain).mockReturnValue(null)
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
  })

  // ── Organisation context ───────────────────────────────────────────────

  describe('organisation context', () => {
    it('returns 400 when no org slug is present (no subdomain, no query param)', async () => {
      vi.mocked(extractSubdomain).mockReturnValue(null)
      const req = makeRequest(SAMPLE_EVENT, 'http://localhost/api/amilia/webhook')
      const res = await POST(req)

      expect(res.status).toBe(400)
      expect((await res.json()).error).toMatch(/organization context/i)
    })

    it('resolves org slug from the ?org= query parameter', async () => {
      mockSupabase({
        organizations: { data: null, error: { code: 'PGRST116' } },
      })
      const req = makeRequest(SAMPLE_EVENT, 'http://localhost/api/amilia/webhook?org=myteam')
      const res = await POST(req)

      // Org not found → 404, but slug was resolved (not 400)
      expect(res.status).toBe(404)
    })

    it('resolves org slug from the subdomain when extractSubdomain returns a value', async () => {
      vi.mocked(extractSubdomain).mockReturnValue('myteam')
      mockSupabase({
        organizations: { data: null, error: { code: 'PGRST116' } },
      })
      const req = makeRequest(SAMPLE_EVENT, 'http://myteam.30x30.app/api/amilia/webhook')
      const res = await POST(req)

      expect(res.status).toBe(404)
    })

    it('returns 404 when the organisation is not found', async () => {
      mockSupabase({
        organizations: { data: null, error: { code: 'PGRST116', message: 'not found' } },
      })
      const req = makeRequest(SAMPLE_EVENT)
      const res = await POST(req)

      expect(res.status).toBe(404)
      expect((await res.json()).error).toMatch(/not found/i)
    })
  })

  // ── Payload validation ─────────────────────────────────────────────────

  describe('payload validation', () => {
    it('returns 400 for an invalid (non-JSON) request body', async () => {
      const req = new NextRequest('http://localhost/api/amilia/webhook?org=testorg', {
        method: 'POST',
        body: 'not-json{{{{',
        headers: { 'content-type': 'application/json' },
      })
      const res = await POST(req)

      expect(res.status).toBe(400)
      expect((await res.json()).error).toMatch(/invalid json/i)
    })

    it('ignores (200) events with Context other than "Registration"', async () => {
      const event = { ...SAMPLE_EVENT, Context: 'Payment' }
      const req = makeRequest(event)
      const res = await POST(req)

      expect(res.status).toBe(200)
      expect((await res.json()).message).toMatch(/not handled/i)
    })

    it('ignores (200) events with Action other than "Create"', async () => {
      const event = { ...SAMPLE_EVENT, Action: 'Update' }
      const req = makeRequest(event)
      const res = await POST(req)

      expect(res.status).toBe(200)
      expect((await res.json()).message).toMatch(/not handled/i)
    })

    it('ignores (200) cancelled registrations (IsCancelled: true)', async () => {
      const event = {
        ...SAMPLE_EVENT,
        Payload: { ...SAMPLE_EVENT.Payload, IsCancelled: true },
      }
      const req = makeRequest(event)
      const res = await POST(req)

      expect(res.status).toBe(200)
      expect((await res.json()).message).toMatch(/cancelled/i)
    })

    it('returns 400 when the registrant email is missing', async () => {
      const event = {
        ...SAMPLE_EVENT,
        Payload: {
          ...SAMPLE_EVENT.Payload,
          Person: { ...SAMPLE_EVENT.Payload.Person, Email: '' },
        },
      }
      mockSupabase({
        organizations: { data: { id: 'org-1', name: 'Test Org', slug: 'testorg' } },
        organization_settings: { data: { settings: {} } },
      })
      const req = makeRequest(event)
      const res = await POST(req)

      expect(res.status).toBe(400)
      expect((await res.json()).error).toMatch(/email/i)
    })
  })

  // ── ID filtering ───────────────────────────────────────────────────────

  describe('ID filtering', () => {
    const ORG = { id: 'org-1', name: 'Test Org', slug: 'testorg' }

    it('ignores (200) events where Program ID does not match the configured value', async () => {
      mockSupabase({
        organizations: { data: ORG },
        organization_settings: { data: { settings: { amilia_program_id: 999 } } },
      })
      const req = makeRequest(SAMPLE_EVENT) // Payload.Program.Id = 1
      const res = await POST(req)

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.message).toMatch(/program id/i)
      expect(body.message).toMatch(/does not match/i)
    })

    it('passes (processes) events where Program ID matches the configured value', async () => {
      mockSupabase({
        organizations: { data: ORG },
        organization_settings: { data: { settings: { amilia_program_id: 1 } } },
        organization_members: { data: { user_id: 'owner-uid' } },
        organization_invitations: { data: { token: 'tok-abc' } },
      })
      const req = makeRequest(SAMPLE_EVENT) // Payload.Program.Id = 1
      const res = await POST(req)

      expect(res.status).toBe(200)
      expect((await res.json()).success).toBe(true)
    })

    it('ignores (200) events where Activity ID does not match the configured value', async () => {
      mockSupabase({
        organizations: { data: ORG },
        organization_settings: { data: { settings: { amilia_activity_id: 999 } } },
      })
      const req = makeRequest(SAMPLE_EVENT) // Payload.Activity.Id = 2
      const res = await POST(req)

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.message).toMatch(/activity id/i)
      expect(body.message).toMatch(/does not match/i)
    })

    it('passes (processes) events where Activity ID matches the configured value', async () => {
      mockSupabase({
        organizations: { data: ORG },
        organization_settings: { data: { settings: { amilia_activity_id: 2 } } },
        organization_members: { data: { user_id: 'owner-uid' } },
        organization_invitations: { data: { token: 'tok-abc' } },
      })
      const req = makeRequest(SAMPLE_EVENT) // Payload.Activity.Id = 2
      const res = await POST(req)

      expect(res.status).toBe(200)
      expect((await res.json()).success).toBe(true)
    })

    it('ignores (200) when Program ID matches but Activity ID does not', async () => {
      mockSupabase({
        organizations: { data: ORG },
        organization_settings: {
          data: { settings: { amilia_program_id: 1, amilia_activity_id: 999 } },
        },
      })
      const req = makeRequest(SAMPLE_EVENT)
      const res = await POST(req)

      expect(res.status).toBe(200)
      expect((await res.json()).message).toMatch(/activity id/i)
    })

    it('processes events when no Program ID or Activity ID is configured', async () => {
      mockSupabase({
        organizations: { data: ORG },
        organization_settings: { data: { settings: {} } },
        organization_members: { data: { user_id: 'owner-uid' } },
        organization_invitations: { data: { token: 'tok-abc' } },
      })
      const req = makeRequest(SAMPLE_EVENT)
      const res = await POST(req)

      expect(res.status).toBe(200)
      expect((await res.json()).success).toBe(true)
    })
  })

  // ── Invitation creation ────────────────────────────────────────────────

  describe('invitation creation', () => {
    const ORG = { id: 'org-1', name: 'Test Org', slug: 'testorg' }

    it('returns 500 when the organisation owner cannot be found', async () => {
      mockSupabase({
        organizations: { data: ORG },
        organization_settings: { data: { settings: {} } },
        organization_members: { data: null, error: { code: 'PGRST116', message: 'not found' } },
      })
      const req = makeRequest(SAMPLE_EVENT)
      const res = await POST(req)

      expect(res.status).toBe(500)
      expect((await res.json()).error).toMatch(/owner not found/i)
    })

    it('returns 500 when the invitation upsert fails', async () => {
      mockSupabase({
        organizations: { data: ORG },
        organization_settings: { data: { settings: {} } },
        organization_members: { data: { user_id: 'owner-uid' } },
        organization_invitations: {
          data: null,
          error: { code: '23505', message: 'constraint violation' },
        },
      })
      const req = makeRequest(SAMPLE_EVENT)
      const res = await POST(req)

      expect(res.status).toBe(500)
      expect((await res.json()).error).toMatch(/failed to create invitation/i)
    })

    it('returns 200 with success and invite URL for a valid registration', async () => {
      mockSupabase({
        organizations: { data: ORG },
        organization_settings: { data: { settings: {} } },
        organization_members: { data: { user_id: 'owner-uid' } },
        organization_invitations: { data: { token: 'secure-invite-token' } },
      })
      const req = makeRequest(SAMPLE_EVENT)
      const res = await POST(req)

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.message).toContain('test@email.com')
      expect(body.inviteUrl).toContain('secure-invite-token')
      expect(body.inviteUrl).toMatch(/\/join\?token=/)
    })

    it('includes the registrant email in the invite URL path', async () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://30x30.app'
      mockSupabase({
        organizations: { data: ORG },
        organization_settings: { data: { settings: {} } },
        organization_members: { data: { user_id: 'owner-uid' } },
        organization_invitations: { data: { token: 'tok-xyz' } },
      })
      const req = makeRequest(SAMPLE_EVENT)
      const res = await POST(req)

      const body = await res.json()
      expect(body.inviteUrl).toBe('https://30x30.app/join?token=tok-xyz')
    })
  })
})

