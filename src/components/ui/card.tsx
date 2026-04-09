import type { ReactNode } from "react";

type CardProps = {
  title?: string;
  description?: string;
  right?: ReactNode;
  children: ReactNode;
};

export function Card({ title, description, right, children }: CardProps) {
  return (
    <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
      {title ? (
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            {description ? (
              <p className="mt-1 text-sm text-gray-500">{description}</p>
            ) : null}
          </div>

          {right ? <div>{right}</div> : null}
        </div>
      ) : null}

      <div className="px-5 py-4">{children}</div>
    </section>
  );
}