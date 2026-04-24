"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/AuthContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();

  // Your main navigation links
  const navLinks = [
    { name: "Overview", href: "/dashboard" },
    { name: "Savings", href: "/dashboard/savings" },
    { name: "Debts", href: "/dashboard/debts" },
    { name: "Analytics", href: "/dashboard/analytics" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* --- TOP NAVBAR --- */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* LOGO & LINKS */}
            <div className="flex items-center gap-8">
              
              {/* LOGO AND TEXT SIDE-BY-SIDE */}
              <Link href="/dashboard" className="flex items-center gap-3 transition-opacity hover:opacity-80">
                <Image 
                  src="/tekapoysha-logo.png" 
                  alt="TekaPoysha Logo" 
                  width={32} 
                  height={32} 
                  className="h-8 w-8 object-contain" 
                  priority 
                />
                <div className="text-xl font-black tracking-tighter hidden sm:block">
                  <span className="text-blue-600">Teka</span><span className="text-gray-900">Poysha</span>
                </div>
              </Link>
              
              {/* Desktop Menu */}
              <div className="hidden md:flex gap-2">
                {navLinks.map((link) => (
                  <Link 
                    key={link.name} 
                    href={link.href}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                      pathname === link.href 
                        ? "bg-gray-100 text-gray-900" 
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    {link.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* CLICKABLE PROFILE PILL */}
            <Link 
              href="/dashboard/settings" 
              className="flex items-center gap-3 p-1.5 pr-4 rounded-full border border-gray-100 hover:bg-gray-50 hover:border-gray-200 transition-all group"
              title="Go to Settings"
            >
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-sm group-hover:scale-105 transition-transform">
                {user?.displayName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="text-sm font-bold text-gray-700 hidden md:block">
                {user?.displayName || "Update Profile"}
              </span>
            </Link>

          </div>
        </div>
      </nav>

      {/* --- MAIN PAGE CONTENT --- */}
      <main>
        {children}
      </main>

      {/* --- MOBILE BOTTOM NAV (Appears only on phones) --- */}
      <div className="md:hidden fixed bottom-0 w-full bg-white border-t border-gray-100 flex justify-around p-3 z-40 pb-safe">
        {navLinks.map((link) => (
          <Link 
            key={link.name} 
            href={link.href}
            className={`text-xs font-bold p-2 ${pathname === link.href ? "text-blue-600" : "text-gray-400"}`}
          >
            {link.name}
          </Link>
        ))}
        {/* Mobile Settings Icon */}
        <Link 
          href="/dashboard/settings"
          className={`text-xs font-bold p-2 ${pathname === '/dashboard/settings' ? "text-blue-600" : "text-gray-400"}`}
        >
          Settings
        </Link>
      </div>
    </div>
  );
}