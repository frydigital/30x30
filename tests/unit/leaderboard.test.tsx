import { render, screen } from "@testing-library/react";
import type { OrganizationLeaderboardEntry } from "@/lib/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockCreateClient } = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClient,
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

import OrganizationLeaderboardPage from "@/app/(sidebar)/dashboard/leaderboard/page";

type EqCall = {
  table: string;
  column: string;
  value: unknown;
};

function buildSupabaseClient(
  leaderboardData: OrganizationLeaderboardEntry[],
  eqCalls: EqCall[]
) {
  const organizationChain = {
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn().mockResolvedValue({
      data: { id: "org-1", name: "Acme Fitness", is_active: true },
    }),
  };
  organizationChain.select.mockReturnValue(organizationChain);
  organizationChain.eq.mockImplementation((column: string, value: unknown) => {
    eqCalls.push({ table: "organizations", column, value });
    return organizationChain;
  });

  const membershipChain = {
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn().mockResolvedValue({ data: { role: "member" } }),
  };
  membershipChain.select.mockReturnValue(membershipChain);
  membershipChain.eq.mockImplementation((column: string, value: unknown) => {
    eqCalls.push({ table: "organization_members", column, value });
    return membershipChain;
  });

  const leaderboardChain: {
    select: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    order: ReturnType<typeof vi.fn>;
    then: (
      resolve: (value: { data: OrganizationLeaderboardEntry[] }) => unknown,
      reject?: (reason?: unknown) => unknown
    ) => unknown;
  } = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    then: (resolve) => resolve({ data: leaderboardData }),
  };

  leaderboardChain.select.mockReturnValue(leaderboardChain);
  leaderboardChain.eq.mockImplementation((column: string, value: unknown) => {
    eqCalls.push({ table: "organization_leaderboard", column, value });
    return leaderboardChain;
  });
  leaderboardChain.order.mockReturnValue(leaderboardChain);

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      }),
    },
    from: vi.fn((table: string) => {
      if (table === "organizations") return organizationChain;
      if (table === "organization_members") return membershipChain;
      if (table === "organization_leaderboard") return leaderboardChain;
      throw new Error(`Unexpected table ${table}`);
    }),
  };
}

describe("Organization leaderboard visibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows users who are public on the leaderboard", async () => {
    const eqCalls: EqCall[] = [];
    const leaderboardData: OrganizationLeaderboardEntry[] = [
      {
        user_id: "user-1",
        username: "Public Runner",
        avatar_url: null,
        organization_id: "org-1",
        member_role: "member",
        current_streak: 8,
        longest_streak: 15,
        total_valid_days: 20,
        is_public: true,
      },
    ];

    mockCreateClient.mockResolvedValue(buildSupabaseClient(leaderboardData, eqCalls));

    const ui = await OrganizationLeaderboardPage({
      searchParams: Promise.resolve({ org: "acme" }),
    });

    render(ui);

    expect(screen.getByText("Acme Fitness Leaderboard")).toBeInTheDocument();
    expect(screen.getByText("Public Runner")).toBeInTheDocument();
    expect(eqCalls).toContainEqual({
      table: "organization_leaderboard",
      column: "is_public",
      value: true,
    });
  });

  it("does not show users when public leaderboard option is deselected", async () => {
    const eqCalls: EqCall[] = [];
    const leaderboardData: OrganizationLeaderboardEntry[] = [
      {
        user_id: "user-2",
        username: "Private Rider",
        avatar_url: null,
        organization_id: "org-1",
        member_role: "member",
        current_streak: 4,
        longest_streak: 10,
        total_valid_days: 14,
        is_public: false,
      },
    ];

    mockCreateClient.mockResolvedValue(buildSupabaseClient(leaderboardData, eqCalls));

    const ui = await OrganizationLeaderboardPage({
      searchParams: Promise.resolve({ org: "acme" }),
    });

    render(ui);

    expect(screen.queryByText("Private Rider")).not.toBeInTheDocument();
    expect(screen.getByText("No Activity Yet")).toBeInTheDocument();
    expect(eqCalls).toContainEqual({
      table: "organization_leaderboard",
      column: "is_public",
      value: true,
    });
  });
});
