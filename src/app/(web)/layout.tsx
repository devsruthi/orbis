import { AppShell } from "./ui/app-shell";

export default function WebLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
