import type { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { AppShellLayout } from "./app-shell-layout";

type AppShellProps = {
  title: string;
  children: ReactNode;
};

export function AppShell({ title, children }: AppShellProps) {
  return (
    <AppShellLayout
      title={title}
      sidebar={<Sidebar />}
      mobileSidebar={<Sidebar />}
      topbar={<Topbar title={title} />}
    >
      {children}
    </AppShellLayout>
  );
}