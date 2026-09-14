"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Demo" },
  { href: "/audit", label: "Audit Trail" },
  { href: "/architecture", label: "Architecture" },
  { href: "/failure-test", label: "Failure Test" },
  { href: "/thesis", label: "Thesis" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <header className="border-b border-border bg-panel/60 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent" />
          <span className="font-mono text-sm font-semibold tracking-tight text-ink">
            The Decision Engine
          </span>
        </Link>
        <nav className="flex flex-wrap gap-1 text-sm">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-md px-3 py-1.5 transition-colors ${
                  active ? "bg-accent/15 text-accent" : "text-muted hover:bg-white/5 hover:text-ink"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
