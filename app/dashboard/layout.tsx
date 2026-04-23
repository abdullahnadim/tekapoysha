"use client";

import { useAuth } from "@/components/auth/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { auth } from "@/lib/firebase/config";
import { signOut } from "firebase/auth";
import Link from "next/link";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Show loading state while fetching user to prevent errors
  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>;
  }

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-bold text-gray-900">Teka Poysha</h1>
          <div className="flex gap-4 text-sm font-medium">
            <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 transition-colors">
              Overview
            </Link>
            <Link href="/dashboard/debts" className="text-gray-600 hover:text-gray-900 transition-colors">
              Debts
            </Link>
          </div>
          <Link href="/dashboard/savings" className="text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">Savings</Link>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500 hidden sm:block">{user.email}</span>
          <button 
            onClick={handleLogout} 
            className="text-sm font-medium text-red-600 hover:text-red-800 transition-colors"
          >
            Log Out
          </button>
        </div>
      </nav>
      
      {/* Main Content Area */}
      <main className="flex-1 p-6 max-w-6xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}