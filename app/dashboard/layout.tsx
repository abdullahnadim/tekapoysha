"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, query, where, onSnapshot, updateDoc, doc } from "firebase/firestore";

interface AppNotification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  date: any;
  userId?: string;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user } = useAuth();

  // Notification States
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Unread Count
  const unreadCount = notifications.filter(n => !n.isRead).length;

  // --- REAL-TIME LISTENER (Global Broadcasts Included) ---
  useEffect(() => {
    if (!user) return;

    // Listen for personal notifications AND "GLOBAL" announcements
    const q = query(
      collection(db, "notifications"), 
      where("userId", "in", [user.uid, "GLOBAL"])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Pull the list of Global IDs this user has already read from local memory
      const readGlobalIds = JSON.parse(localStorage.getItem('readGlobalNotifs') || '[]');
      
      const fetched: AppNotification[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as AppNotification;
        
        // If it's a global notification, check local storage to see if they read it
        if (data.userId === "GLOBAL") {
          data.isRead = readGlobalIds.includes(doc.id);
        }

        fetched.push({ id: doc.id, ...data });
      });
      
      // Sort newest first
      fetched.sort((a, b) => {
        const dA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
        const dB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
        return dB.getTime() - dA.getTime();
      });

      setNotifications(fetched);
    });

    return () => unsubscribe();
  }, [user]);

  // --- MARK AS READ HANDLERS ---
  const markAsRead = async (id: string) => {
    const notification = notifications.find(n => n.id === id);
    if (!notification) return;

    if (notification.userId === "GLOBAL") {
      // It's a broadcast! Save the read receipt locally
      const readGlobalIds = JSON.parse(localStorage.getItem('readGlobalNotifs') || '[]');
      if (!readGlobalIds.includes(id)) {
        readGlobalIds.push(id);
        localStorage.setItem('readGlobalNotifs', JSON.stringify(readGlobalIds));
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      }
    } else {
      // Personal notification! Update Firebase
      try {
        await updateDoc(doc(db, "notifications", id), { isRead: true });
      } catch (error) {
        console.error("Error marking as read:", error);
      }
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.isRead);
    unread.forEach(async (n) => {
      await markAsRead(n.id);
    });
  };

  const navItems = [
    {
      name: "Overview", href: "/dashboard",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    {
      name: "Savings", href: "/dashboard/savings",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    },
    {
      name: "Debts", href: "/dashboard/debts",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    },
    {
      name: "Analytics", href: "/dashboard/analytics",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative">
      
      {/* --- TOP HEADER (Perfectly Centered 3-Column Layout) --- */}
      <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between w-full relative">
          
          {/* 1. LEFT COLUMN: LOGO */}
          <div className="w-1/3 flex items-center">
            <Link href="/dashboard" className="flex items-center gap-2 min-w-fit">
              <Image 
                src="/tekapoysha-logo.png" 
                alt="TekaPoysha Logo" 
                width={32} 
                height={32} 
                className="h-8 w-8 object-contain" 
              />
              <h1 className="hidden md:block text-2xl font-black text-blue-600 tracking-tight whitespace-nowrap">
                TekaPoysha
              </h1>
            </Link>
          </div>

          {/* 2. CENTER COLUMN: NAVIGATION */}
          <nav className="hidden md:flex w-1/3 justify-center gap-8">
            {navItems.map((item) => (
              <Link 
                key={item.name} 
                href={item.href}
                className={`font-bold transition-colors ${pathname === item.href ? "text-blue-600" : "text-gray-500 hover:text-gray-900"}`}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* 3. RIGHT COLUMN: ACTIONS & PROFILE */}
          <div className="w-1/3 flex items-center justify-end gap-4">
            
            {/* THE BELL ICON */}
            <button 
              onClick={() => setIsPanelOpen(!isPanelOpen)}
              className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-red-500 border-2 border-white rounded-full">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* THE PROFILE SECTION (Avatar + Name with Fallback) */}
            <div className="flex items-center gap-3 pl-2 sm:pl-4 sm:border-l border-gray-100 cursor-pointer group">
              <span className="hidden md:block text-sm font-bold text-gray-700 group-hover:text-blue-600 transition-colors">
                {user?.displayName || user?.email?.split('@')[0] || "My Account"}
              </span>
              <div className="w-9 h-9 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-full flex items-center justify-center text-white font-bold shadow-sm group-hover:shadow-md transition-all">
                {user?.displayName ? user.displayName.charAt(0).toUpperCase() : (user?.email ? user.email.charAt(0).toUpperCase() : 'U')}
              </div>
            </div>

          </div>

          {/* --- NOTIFICATION DROPDOWN PANEL --- */}
          {isPanelOpen && (
            <>
              {/* Invisible backdrop to click away and close */}
              <div className="fixed inset-0 z-40" onClick={() => setIsPanelOpen(false)}></div>
              
              <div className="absolute top-16 right-4 md:right-8 w-80 max-h-[80vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-gray-100 z-50 animate-in slide-in-from-top-4 fade-in duration-200">
                <div className="p-4 border-b border-gray-50 flex justify-between items-center sticky top-0 bg-white/90 backdrop-blur-md rounded-t-3xl">
                  <h3 className="font-bold text-gray-900">Notifications</h3>
                  {unreadCount > 0 && (
                    <button onClick={markAllAsRead} className="text-xs font-bold text-blue-600 hover:text-blue-800">
                      Mark all read
                    </button>
                  )}
                </div>
                
                <div className="divide-y divide-gray-50">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 font-medium text-sm">
  You&apos;re all caught up! 🍃
</div>
                  ) : (
                    notifications.map((notif) => (
                      <div 
                        key={notif.id} 
                        onClick={() => markAsRead(notif.id)}
                        className={`p-4 transition-colors cursor-pointer hover:bg-gray-50 ${!notif.isRead ? 'bg-blue-50/50' : ''}`}
                      >
                        <div className="flex gap-3">
                          <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${!notif.isRead ? 'bg-blue-600' : 'bg-transparent'}`}></div>
                          <div>
                            <p className={`text-sm ${!notif.isRead ? 'font-bold text-gray-900' : 'font-medium text-gray-600'}`}>
                              {notif.title}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{notif.message}</p>
                            <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-wider">
                              {new Date(notif.date?.toDate ? notif.date.toDate() : notif.date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 pb-32 md:pb-8">
        {children}
      </main>

      {/* HIGH IMPACT MOBILE BOTTOM NAVBAR */}
      <div 
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-lg border-t border-gray-100 shadow-[0_-10px_40px_rgba(0,0,0,0.08)]"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }} 
      >
        <nav className="flex justify-around items-center px-2 pt-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href; 
            return (
              <Link 
                key={item.name} 
                href={item.href}
                className={`flex flex-col items-center justify-center w-full py-2 px-1 rounded-2xl transition-all ${
                  isActive ? "text-blue-600" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                }`}
                style={{ WebkitTapHighlightColor: 'transparent' }} 
              >
                <div className={`mb-1 transition-transform ${isActive ? "scale-110" : "scale-100"}`}>
                  {item.icon}
                </div>
                <span className={`text-[10px] uppercase tracking-widest font-black ${isActive ? "opacity-100" : "opacity-70"}`}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

    </div>
  );
}