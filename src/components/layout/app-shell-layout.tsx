"use client";

import type { ReactNode } from "react";
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
    <div className="min-h-screen bg-gray-100">
      <div className="flex min-h-screen">
        <div className="hidden md:block">{sidebar}</div>

        {mobileMenuOpen ? (
          <div className="fixed inset-0 z-40 md:hidden">
            <button
              type="button"
              aria-label="Cerrar menú"
              className="absolute inset-0 bg-black/40"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white shadow-xl">
              {mobileSidebar}
            </div>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="sticky top-0 z-30 border-b border-gray-200 bg-white px-4 py-3 md:hidden">
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Abrir menú"
                onClick={() => setMobileMenuOpen(true)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-300 bg-white text-gray-700 transition hover:bg-gray-50"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>

              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                  Panel
                </p>
                <p className="truncate text-base font-semibold text-gray-900">
                  {title}
                </p>
              </div>
            </div>
          </div>

          {topbar}

          <main className="flex-1 p-4 md:p-6">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}