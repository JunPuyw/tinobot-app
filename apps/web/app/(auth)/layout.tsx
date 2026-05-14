// Auth pages (login, register) — no authentication required
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
    </>
  );
}
