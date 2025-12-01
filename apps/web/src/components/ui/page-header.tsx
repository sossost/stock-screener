import Link from "next/link";
import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
}

export function PageHeader({
  title,
  backHref,
  backLabel = "← 뒤로",
  actions,
}: PageHeaderProps) {
  return (
    <header className="bg-white border-b sticky top-0 z-10">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {backHref && (
              <Link
                href={backHref}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                {backLabel}
              </Link>
            )}
            <h1 className="text-xl font-bold text-gray-900">{title}</h1>
          </div>
          {actions && <div className="flex items-center gap-3">{actions}</div>}
        </div>
      </div>
    </header>
  );
}
