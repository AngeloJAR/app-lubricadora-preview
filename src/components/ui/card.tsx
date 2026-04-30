import type { ReactNode } from "react";

type CardProps = {
  title?: string;
  description?: string;
  right?: ReactNode;
  children: ReactNode;
};

export function Card({ title, description, right, children }: CardProps) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      {title && (
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <h3 className="text-base font-semibold tracking-tight text-slate-950">
              {title}
            </h3>

            {description && (
              <p className="mt-1 text-sm text-slate-500">
                {description}
              </p>
            )}
          </div>

          {right && (
            <div className="shrink-0">
              {right}
            </div>
          )}
        </div>
      )}

      <div className="px-5 py-4">{children}</div>
    </section>
  );
}