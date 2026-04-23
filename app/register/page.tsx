"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  updateProfile, 
  GoogleAuthProvider, 
  signInWithPopup 
} from "firebase/auth";

export default function SignUpPage() {
  const router = useRouter();
  const auth = getAuth();
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // --- EMAIL & PASSWORD SIGN UP ---
  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 1. Create the account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // 2. Immediately stamp their name onto the profile!
      await updateProfile(userCredential.user, {
        displayName: name
      });

      // 3. Kick them to the dashboard
      router.push("/dashboard");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to create an account.");
    } finally {
      setLoading(false);
    }
  };

  // --- GOOGLE 1-CLICK SIGN UP ---
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");
    const provider = new GoogleAuthProvider();
    
    try {
      await signInWithPopup(auth, provider);
      // Google automatically pulls their Name and Photo, so we don't need updateProfile here!
      router.push("/dashboard");
    } catch (err: any) {
      console.error(err);
      setError("Google sign-in was cancelled or failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white p-8 sm:p-10 rounded-3xl shadow-sm border border-gray-100">
        
        {/* LOGO & TITLE */}
        <div className="flex flex-col items-center mb-8">
          <Image 
            src="/tekapoysha-logo.png" 
            alt="TekaPoysha Logo" 
            width={48} 
            height={48} 
            className="h-12 w-12 object-contain mb-3" 
          />
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Create your account</h2>
          <p className="text-gray-500 font-medium text-sm mt-1">Start tracking your shit today.</p>
        </div>

        {/* ERROR MESSAGE */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold border border-red-100 text-center">
            {error}
          </div>
        )}

        {/* GOOGLE BUTTON */}
        <button 
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3.5 bg-white border-2 border-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </button>

        <div className="flex items-center my-6">
          <div className="flex-grow border-t border-gray-100"></div>
          <span className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Or register with email</span>
          <div className="flex-grow border-t border-gray-100"></div>
        </div>

        {/* EMAIL & PASSWORD FORM */}
        <form onSubmit={handleEmailSignUp} className="space-y-4">
          <div>
            <input 
              type="text" 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full Name" 
              className="w-full px-4 py-3.5 rounded-xl border bg-gray-50 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium placeholder:text-gray-400" 
            />
          </div>
          <div>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address" 
              className="w-full px-4 py-3.5 rounded-xl border bg-gray-50 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium placeholder:text-gray-400" 
            />
          </div>
          <div>
            <input 
              type="password" 
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password (min 6 chars)" 
              className="w-full px-4 py-3.5 rounded-xl border bg-gray-50 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium placeholder:text-gray-400" 
            />
          </div>
          <button 
            type="submit" 
            disabled={loading || !name || !email || !password}
            className="w-full py-4 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-colors shadow-md disabled:bg-gray-300 disabled:cursor-not-allowed mt-2"
          >
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <p className="text-center text-sm font-medium text-gray-500 mt-8">
          Already have an account? <Link href="/login" className="text-blue-600 hover:text-blue-700 font-bold">Log in</Link>
        </p>
      </div>
    </div>
  );
}