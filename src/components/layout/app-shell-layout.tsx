"use client";

import type { ReactNode } from "react";
import { Menu, PanelLeftClose, X } from "lucide-react";
import { useState } from "react";

type AppShellLayoutProps = {
  title: string;
  sidebar: ReactNode;
  mobileSidebar: ReactNode;
  topbar: ReactNode;
  children: ReactNode;
};

export function AppShellLayout({
  title,
  sidebar,
  mobileSidebar,
  topbar,
  children,
}: AppShellLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen">
        <aside className="hidden md:block">{sidebar}</aside>

        {mobileMenuOpen ? (
          <div className="fixed inset-0 z-50 md:hidden">
            <button
              type="button"
              aria-label="Cerrar menú"
              className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
              onClick={() => setMobileMenuOpen(false)}
            />

            <div className="absolute inset-y-0 left-0 z-50 flex w-72 max-w-[86vw] flex-col border-r border-slate-200 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                    <PanelLeftClose className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Menú
                    </p>
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {title}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  aria-label="Cerrar menú"
                  onClick={() => setMobileMenuOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                {mobileSidebar}
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 px-4 py-3 shadow-sm backdrop-blur md:hidden">
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Abrir menú"
                onClick={() => setMobileMenuOpen(true)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Panel
                </p>
                <h1 className="truncate text-base font-semibold text-slate-950">
                  {title}
                </h1>
              </div>
            </div>
          </header>

          {topbar}

          <main className="flex-1 p-3 sm:p-4 md:p-6">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}