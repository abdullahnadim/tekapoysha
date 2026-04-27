"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, addDoc } from "firebase/firestore";

export default function AdminNotifications() {
  const { user } = useAuth();
  
  // Security: In a real app, you would check if user.email === "your_email@gmail.com"
  // If not, redirect them away!
  
  const [targetUserId, setTargetUserId] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [successStatus, setSuccessStatus] = useState("");

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setSuccessStatus("");

    try {
      // We write to the EXACT SAME collection your layout.tsx is listening to
      await addDoc(collection(db, "notifications"), {
        userId: targetUserId.trim(), // The UID of the person receiving it
        title: title,
        message: message,
        isRead: false,
        date: new Date(),
        sender: "Admin" // Optional flag so you know it was a manual send
      });

      setSuccessStatus("Notification successfully delivered!");
      setTitle("");
      setMessage("");
      setTargetUserId("");
    } catch (error) {
      console.error("Failed to send:", error);
      setSuccessStatus("Failed to send. Check console.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <div className="mb-8 border-b border-gray-100 pb-6">
            <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
              <span className="text-red-500">🛡️</span> Admin Console
            </h1>
            <p className="text-gray-500 mt-2 font-medium">Directly push notifications to specific user devices.</p>
          </div>

          {successStatus && (
            <div className={`p-4 mb-6 rounded-xl font-bold ${successStatus.includes("Failed") ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
              {successStatus}
            </div>
          )}

          <form onSubmit={handleSendNotification} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Target User ID (Firebase UID)</label>
              <input 
                type="text" 
                required 
                value={targetUserId} 
                onChange={e => setTargetUserId(e.target.value)} 
                className="w-full rounded-xl border bg-gray-50 px-4 py-3 outline-none focus:border-red-500 font-mono text-sm" 
                placeholder="e.g., aBCdE12345XyZ..." 
              />
              <p className="text-xs text-gray-400 mt-2">You can find this in your Firebase Authentication Console.</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Notification Title</label>
              <input 
                type="text" 
                required 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                className="w-full rounded-xl border bg-gray-50 px-4 py-3 outline-none focus:border-red-500 font-bold" 
                placeholder="e.g., ⚠️ Account Warning or 🎉 Premium Unlocked!" 
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Message Body</label>
              <textarea 
                required 
                rows={4}
                value={message} 
                onChange={e => setMessage(e.target.value)} 
                className="w-full rounded-xl border bg-gray-50 px-4 py-3 outline-none focus:border-red-500 resize-none" 
                placeholder="Type the message that will appear in their dropdown..." 
              />
            </div>

            <button 
              type="submit" 
              disabled={isSending || !targetUserId || !title || !message}
              className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-colors disabled:opacity-50"
            >
              {isSending ? "Deploying Payload..." : "Fire Notification"}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}