export async function getPortalUser() {
  // Mock user for now. In production, this would check cookies/session.
  return {
    id: "user-1",
    name: "Admin User",
    email: "admin@tinobot.local",
    role: "owner"
  };
}
