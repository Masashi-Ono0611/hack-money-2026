"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Activity,
  ArrowLeftRight,
  Zap,
  Settings,
  Server,
} from "lucide-react";
import Image from "next/image";

const NAV_ITEMS = [
  { href: "/dashboard", label: "DASHBOARD", icon: LayoutDashboard },
  { href: "/dashboard/analytics", label: "ANALYTICS", icon: Activity },
  { href: "/settlement", label: "SETTLEMENT", icon: ArrowLeftRight },
  { href: "/admin", label: "L2 ADMIN", icon: Server },
  { href: "/dashboard/demo", label: "DEMO", icon: Zap },
  { href: "/dashboard/settings", label: "SETTINGS", icon: Settings },
];

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps = {}) {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 shrink-0 flex-col justify-between border-r border-[#2f2f2f] bg-[#080808]">
      {/* Top */}
      <div>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-8">
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#00FF8830] bg-[#00FF880d]">
            <Image
              src="/ghost_yield_icon_nobg.png"
              alt="Ghost icon"
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
              style={{ transform: "translateX(1px) translateY(1px)" }}
              priority
            />
          </div>
          <span className="font-mono text-base font-semibold tracking-wider text-white">
            GHOST YIELD
          </span>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-0.5 px-0 py-2">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={`flex items-center gap-3 px-5 py-3.5 font-mono text-xs font-medium tracking-wider transition-all duration-200 ${
                  isActive
                    ? "border-l-2 border-[#00FF88] bg-[#00FF8810] text-white"
                    : "border-l-2 border-transparent text-[#a0a0a0] hover:bg-[#ffffff08] hover:text-white hover:translate-x-0.5"
                }`}
              >
                <Icon
                  size={16}
                  className={isActive ? "text-[#00FF88]" : "text-[#a0a0a0]"}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom */}
      <div>
        {/* System Status */}
        <div className="border-t border-[#2f2f2f] bg-[#0A0A0A] px-5 py-5">
          <p className="mb-2.5 font-mono text-[11px] font-medium tracking-wider text-[#a0a0a0]">
            {"// SYSTEM STATUS"}
          </p>
          <div className="space-y-2.5">
            <div className="flex justify-between">
              <span className="font-mono text-[11px] font-medium text-[#a0a0a0]">
                NETWORK
              </span>
              <span className="font-mono text-[11px] font-semibold text-[#00FF88]">
                [CONNECTED]
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-mono text-[11px] font-medium text-[#a0a0a0]">
                YELLOW_SDK
              </span>
              <span className="font-mono text-[11px] font-semibold text-[#00FF88]">
                [LIVE]
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-mono text-[11px] font-medium text-[#a0a0a0]">
                CHAINS
              </span>
              <span className="font-mono text-[11px] font-semibold text-white">
                2 ACTIVE
              </span>
            </div>
          </div>
        </div>

        {/* User */}
        <div className="flex items-center gap-3 border-t border-[#2f2f2f] px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#3f3f3f] bg-[#1A1A1A]">
            <span className="font-mono text-xs font-semibold text-[#00FF88]">
              OP
            </span>
          </div>
          <div>
            <p className="font-mono text-[13px] font-medium text-white">
              OPERATOR_01
            </p>
            <p className="font-mono text-[11px] text-[#00FF88]">ONLINE</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
