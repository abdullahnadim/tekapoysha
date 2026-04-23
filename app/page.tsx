"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();

  // If they are already logged in, instantly send them to the Dashboard!
  useEffect(() => {
    if (user) {
      router.push("/dashboard");
    }
  }, [user, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="text-center max-w-md w-full bg-white p-10 rounded-3xl shadow-sm border border-gray-100">
        <h1 className="text-4xl font-black text-gray-900 tracking-tighter mb-2">
          <span className="text-blue-600">Teka</span>Poysha
        </h1>
        <p className="text-gray-500 mb-8 font-medium">A genuine <span className="text-blue-600"><b>maal</b></span> to save your shits</p>
        
        {/* Replace this with your actual Google/Email Login button if you have one! */}
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