export async function getWorkspacesByUser(userId: string) {
  // Mock workspaces for now.
  return [
    {
      id: "ws-1",
      name: "Personal",
      type: "personal",
      role: "owner",
      credits: 12.5,
      budgetLimitUSD: 50,
      usedUSD: 7.25,
      reservedUSD: 0
    },
    {
      id: "ws-2",
      name: "Team",
      type: "team",
      role: "admin",
      credits: 120,
      budgetLimitUSD: 500,
      usedUSD: 138.4,
      reservedUSD: 10
    }
  ];
}
