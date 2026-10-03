import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function Badge({ children, tone = "slate", dot }: { children: ReactNode; tone?: "green" | "red" | "amber" | "blue" | "slate"; dot?: boolean }) {
  return <span className={`badge badge-${tone}`}>{dot && <i className="badge-dot" />}{children}</span>;
}
export function Button({ children, variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  return <button className={`btn btn-${variant} ${className}`} {...props}>{children}</button>;
}
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}
export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description: string; actions?: ReactNode }) {
  return <div className="page-header"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1><p>{description}</p></div>{actions && <div className="page-actions">{actions}</div>}</div>;
}
export function Metric({ icon: Icon, label, value, detail, tone = "teal" }: { icon: LucideIcon; label: string; value: string | number; detail: string; tone?: string }) {
  return <Card className="metric-card"><span className={`metric-icon icon-${tone}`}><Icon size={19} /></span><div className="metric-copy"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></Card>;
}
export function StatusBadge({ status }: { status: string }) {
  const tone = status.includes("NON") || status === "Detected" ? "red" : status.includes("HUMAN") || status === "Assigned" || status === "In Progress" ? "amber" : status.includes("NOT") ? "slate" : "green";
  return <Badge tone={tone}>{status}</Badge>;
}
