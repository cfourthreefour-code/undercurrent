"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";

const TABS = [
  { href: "/people", label: "People" },
  { href: "/trends", label: "Trends" },
  { href: "/risks", label: "Risks" },
  { href: "/cost", label: "Cost" },
  { href: "/pricing", label: "Pricing" },
  { href: "/reports", label: "Report" },
];

export default function TopNav({ onChatToggle }: { onChatToggle: () => void }) {
  const path = usePathname();

  return (
    <nav className="fixed top-0 right-0 left-0 z-50 flex h-14 items-center justify-between border-b border-[var(--card-border)] bg-white px-6">
      <Link href="/graph" className="flex items-center">
        <Image src="/undercurrent-u.svg" alt="Undercurrent" width={28} height={28} />
      </Link>

      {TABS.map(({ href, label }) => {
        const active = path === href || path?.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
              active
                ? "font-semibold text-[var(--foreground)]"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {label}
          </Link>
        );
      })}

      <button
        onClick={onChatToggle}
        aria-label="Open chat"
        className="rounded-lg p-2 text-[var(--muted)] transition-colors hover:bg-gray-100 hover:text-[var(--foreground)]"
      >
        <MessageCircle className="h-5 w-5" />
      </button>
    </nav>
  );
}
