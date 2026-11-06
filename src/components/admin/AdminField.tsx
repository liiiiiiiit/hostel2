import type { ReactNode } from "react";

export function AdminField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="field-label block min-w-0">
      <span className="block text-sm text-slate-600 mb-2">{label}</span>
      {children}
    </label>
  );
}
