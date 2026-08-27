import { AuthProvider } from "@/lib/client/auth-provider";
import { AppShell } from "./ui/app-shell";

export default function WebLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppShell>{children}</AppShell>
    </AuthProvider>
  );
}
