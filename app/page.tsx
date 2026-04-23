"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/components/auth/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();
  
  // NEW: A state to hold the screen while Firebase checks your cookies
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (user) {
      // If logged in, instantly send to dashboard
      router.push("/dashboard");
    } else {
      // Give Firebase a tiny fraction of a second to load before showing the login button.
      // This prevents the "flash" of the login screen if you are actually logged in.
      const timer = setTimeout(() => setIsChecking(false), 600);
      return () => clearTimeout(timer);
    }
  }, [user, router]);

  // --- NEW: THE LOADING SHIELD ---
  // If we are checking, OR if a user was found (and is currently being redirected),
  // show a minimal, pulsing logo instead of the login button.
  if (isChecking || user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="animate-pulse flex flex-col items-center">
          <Image 
            src="/tekapoysha-logo.png" 
            alt="Loading TekaPoysha" 
            width={64} 
            height={64} 
            className="h-16 w-16 opacity-50 mb-4" 
            priority
          />
        </div>
      </div>
    );
  }

  // --- THE ACTUAL LOGIN SCREEN ---
  // This only renders if we are 100% sure they are completely logged out.
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="text-center max-w-md w-full bg-white p-10 rounded-3xl shadow-sm border border-gray-100 animate-in fade-in zoom-in duration-500">
        
        <div className="flex items-center justify-center gap-3 mb-2">
          <Image 
            src="/tekapoysha-logo.png" 
            alt="TekaPoysha Logo" 
            width={48} 
            height={48} 
            className="h-12 w-12 object-contain" 
            priority 
          />
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter">
            <span className="text-blue-600">Teka</span>Poysha
          </h1>
        </div>

        <p className="text-gray-500 mb-8 font-medium">A genuine <span className="text-blue-600"><b>maal</b></span> to save your shits</p>
        
        <Link 
          href="/login" 
          className="block w-full py-4 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-colors shadow-md"
        >
          Log In to Continue
        </Link>
      </div>
    </div>
  );
}