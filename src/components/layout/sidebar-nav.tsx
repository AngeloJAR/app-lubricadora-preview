"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type SidebarLink = {
  href?: string;
  label: string;
  type?: "section";
};

type SidebarNavProps = {
  links: SidebarLink[];
  onNavigate?: () => void;
};

export function SidebarNav({ links, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
      {links.map((link, index) => {
        if (link.type === "section") {
          return (
            <div
              key={`${link.label}-${index}`}
              className="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 first:pt-1"
            >
              {link.label}
            </div>
          );
        }

        const isActive =
          link.href === "/dashboard"
            ? pathname === link.href
            : pathname === link.href || pathname.startsWith(`${link.href}/`);

        return (
          <Link
            key={link.href}
            href={link.href!}
            onClick={onNavigate}
            className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
              isActive
                ? "bg-yellow-500 text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}