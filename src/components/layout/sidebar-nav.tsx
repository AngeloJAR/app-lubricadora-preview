"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeDollarSign,
  Banknote,
  Boxes,
  BriefcaseBusiness,
  CalendarClock,
  Car,
  ClipboardList,
  Gauge,
  HandCoins,
  LayoutDashboard,
  Package,
  ReceiptText,
  Search,
  Settings,
  ShoppingCart,
  Sparkles,
  UserRound,
  Users,
  Wrench,
} from "lucide-react";

type SidebarLink = {
  href?: string;
  label: string;
  type?: "section";
};

type SidebarNavProps = {
  links: SidebarLink[];
  onNavigate?: () => void;
};

function getIcon(link: SidebarLink) {
  const href = link.href ?? "";
  const label = link.label.toLowerCase();

  if (href === "/dashboard") return LayoutDashboard;
  if (href === "/dashboard/finanzas") return BadgeDollarSign;
  if (href === "/dashboard/clientes") return Users;
  if (href === "/dashboard/mantenimientos") return CalendarClock;

  if (href === "/busqueda") return Search;
  if (href === "/ordenes" || href === "/mis-ordenes") return Wrench;
  if (href === "/ordenes/preorden") return ClipboardList;
  if (href === "/clientes") return Users;
  if (href === "/vehiculos") return Car;
  if (href === "/recordatorios") return CalendarClock;

  if (href === "/servicios") return ClipboardList;
  if (href === "/productos") return Package;
  if (href === "/combos") return Boxes;

  if (href === "/caja") return Banknote;
  if (href === "/gastos") return ReceiptText;
  if (href === "/pagos-empleados") return HandCoins;
  if (href === "/cotizaciones") return BadgeDollarSign;

  if (href === "/fidelizacion") return Sparkles;

  if (href === "/usuarios") return UserRound;
  if (href === "/configuracion") return Settings;
  if (href === "/compras") return ShoppingCart;

  if (label.includes("proveedor")) return BriefcaseBusiness;
  if (label.includes("inventario") || label.includes("stock")) return Boxes;

  return Gauge;
}
export function SidebarNav({ links, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-3">
      {links.map((link, index) => {
        if (link.type === "section") {
          return (
            <div
              key={`${link.label}-${index}`}
              className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 first:pt-1"
            >
              {link.label}
            </div>
          );
        }

        const isActive =
          link.href === "/dashboard"
            ? pathname === link.href
            : pathname === link.href || pathname.startsWith(`${link.href}/`);

        const Icon = getIcon(link);

        return (
          <Link
            key={link.href}
            href={link.href!}
            onClick={onNavigate}
            className={`group flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium transition-all ${isActive
              ? "bg-yellow-50 text-yellow-800 ring-1 ring-yellow-200 shadow-sm"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
          >
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${isActive
                ? "bg-yellow-100 text-yellow-700"
                : "bg-slate-100 text-slate-700 group-hover:bg-slate-200"
                }`}
            >
              <Icon className="h-4 w-4" />
            </span>

            <span className="truncate">{link.label}</span>

            {isActive && (
              <span className="ml-auto h-2 w-2 rounded-full bg-yellow-500" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}