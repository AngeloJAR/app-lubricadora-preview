import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: Variant;
};

export function Button({
  children,
  className = "",
  variant = "primary",
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-60";

  const variants: Record<Variant, string> = {
    primary:
      "bg-yellow-500 text-white shadow-sm hover:bg-yellow-600",

    secondary:
      "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",

    ghost:
      "text-slate-600 hover:bg-slate-100",

    danger:
      "bg-red-500 text-white shadow-sm hover:bg-red-600",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}