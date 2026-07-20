"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", icon: "🏠", label: "홈" },
  { href: "/courses", icon: "⛳", label: "골프장" },
  { href: "/rounds", icon: "📋", label: "스코어" },
  { href: "/profile", icon: "👤", label: "마이" },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-md justify-around border-t border-line bg-white py-2.5">
      {NAV_ITEMS.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center text-center text-[10px] ${
              isActive ? "font-semibold text-primary" : "text-muted"
            }`}
          >
            <span className="mb-0.5 block text-lg">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
