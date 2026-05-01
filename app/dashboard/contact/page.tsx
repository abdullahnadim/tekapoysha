"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import Link from "next/link";

export default function ContactFeedbackPage() {
  const { user } = useAuth();
  
  const [type, setType] = useState("Feature Request");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !message.trim()) return;

    setLoading(true);
    try {
      // 1. Save to Firebase Database
      await addDoc(collection(db, "feedback"), {
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName || "Anonymous",
        type,
        message,
        status: "unread",
        createdAt: serverTimestamp(),
      });

      // 2. Trigger the Email API to notify you instantly
      await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: user.displayName || "Anonymous",
          email: user.email,
          type: type,
          message: message,
        }),
      });
      
      setSuccess(true);
      setMessage("");
      setTimeout(() => setSuccess(false), 4000); // Hide success message after 4 seconds
    } catch (error) {
      console.error("Error sending feedback:", error);
      alert("Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div className="p-8 animate-pulse text-gray-500 font-bold">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
        
        {/* HEADER */}
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Contact & Feedback</h1>
          <p className="text-gray-500 font-medium mt-1">Found a bug? Have an idea? Let us know!</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* FEEDBACK FORM */}
          <div className="lg:col-span-2 bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Send a Message</h2>
            
            {success ? (
              <div className="bg-green-50 text-green-700 p-8 rounded-2xl border border-green-100 text-center font-bold animate-in zoom-in-95">
                <span className="text-4xl block mb-2">🎉</span>
                Message sent successfully! Thank you for helping us improve TekaPoysha.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Auto-filled User Details (Disabled for clarity) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-400 mb-2">Sending From</label>
                    <input 
                      type="text" 
                      disabled 
                      value={user.displayName || "Anonymous User"} 
                      className="w-full rounded-2xl border border-gray-100 bg-gray-50 px-5 py-4 outline-none text-gray-500 font-medium cursor-not-allowed" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-400 mb-2">Email Address</label>
                    <input 
                      type="email" 
                      disabled 
                      value={user.email || ""} 
                      className="w-full rounded-2xl border border-gray-100 bg-gray-50 px-5 py-4 outline-none text-gray-500 font-medium cursor-not-allowed" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">What is this regarding?</label>
                  <select 
                    value={type} 
                    onChange={(e) => setType(e.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 outline-none focus:border-blue-500 focus:bg-white transition-colors font-medium text-gray-700 appearance-none"
                  >
                    <option value="Feature Request">💡 Feature Request</option>
                    <option value="Bug Report">🐛 Bug Report</option>
                    <option value="General Feedback">💬 General Feedback</option>
                    <option value="Need Help">🆘 I need help using the app</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Your Message *</label>
                  <textarea 
                    required
                    rows={6}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell us what's on your mind..."
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 outline-none focus:border-blue-500 focus:bg-white transition-colors font-medium text-gray-700 resize-none"
                  ></textarea>
                </div>

                <button 
                  type="submit" 
                  disabled={loading || !message.trim()}
                  className="w-full md:w-auto px-10 py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:bg-gray-300 disabled:shadow-none disabled:transform-none disabled:cursor-not-allowed"
                >
                  {loading ? "Sending..." : "Send Message"}
                </button>
              </form>
            )}
          </div>

          {/* SIDEBAR: MINI SUPPORT & DIRECT EMAIL */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-3xl border border-amber-100 text-center shadow-sm relative overflow-hidden">
              <div className="absolute -top-4 -right-4 text-7xl opacity-10 rotate-12">☕</div>
              <div className="relative z-10">
                <h3 className="text-lg font-black text-amber-900 mb-2">Loving the app?</h3>
                <p className="text-sm text-amber-700 font-medium mb-4 leading-relaxed">
                  TekaPoysha is completely free. If you want to support the developer, treat us to a cup of Chaa!
                </p>
                <Link 
                  href="/dashboard/support" 
                  className="block w-full py-3 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 transition-colors shadow-sm"
                >
                  Buy me a Chaa ☕
                </Link>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">Direct Email</h3>
              <a href="mailto:tekapoysha@gmail.com" className="flex items-center gap-3 text-gray-600 hover:text-blue-600 transition-colors font-medium">
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                tekapoysha@gmail.com
              </a>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}