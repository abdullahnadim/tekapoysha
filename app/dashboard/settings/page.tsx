"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth/AuthContext";
import { updateProfile, updatePassword } from "firebase/auth";

export default function SettingsPage() {
  const { user } = useAuth();
  
  // States
  const [displayName, setDisplayName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loadingName, setLoadingName] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Pre-fill the user's current name when the page loads
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "");
    }
  }, [user]);

  // Handle Name Change
  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoadingName(true);
    setMessage({ type: "", text: "" });
    
    try {
      await updateProfile(user, { displayName });
      setMessage({ type: "success", text: "Profile name updated successfully!" });
    } catch (error: any) {
      console.error("Error updating profile:", error);
      setMessage({ type: "error", text: "Failed to update profile name." });
    } finally {
      setLoadingName(false);
    }
  };

  // Handle Password Change
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoadingPassword(true);
    setMessage({ type: "", text: "" });
    
    try {
      await updatePassword(user, newPassword);
      setMessage({ type: "success", text: "Password updated successfully!" });
      setNewPassword(""); // Clear the field after success
    } catch (error: any) {
      console.error("Error updating password:", error);
      // Firebase requires a "recent login" to change passwords for security reasons.
      if (error.code === 'auth/requires-recent-login') {
        setMessage({ type: "error", text: "For security reasons, please log out and log back in before changing your password." });
      } else {
        setMessage({ type: "error", text: error.message });
      }
    } finally {
      setLoadingPassword(false);
    }
  };

  // Helper to get initials for the Avatar
  const getInitials = (name: string, email: string | null) => {
    if (name) return name.charAt(0).toUpperCase();
    if (email) return email.charAt(0).toUpperCase();
    return "U";
  };

  if (!user) return <div className="p-8 animate-pulse text-gray-500">Loading profile...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-6">
          <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-3xl font-black shadow-inner">
            {getInitials(user.displayName || "", user.email)}
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900">Profile Settings</h1>
            <p className="text-gray-500 mt-1 font-medium">{user.email}</p>
          </div>
        </div>

        {/* STATUS MESSAGES */}
        {message.text && (
          <div className={`p-4 rounded-xl font-bold ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6">
          
          {/* PROFILE INFO CARD */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-6 border-b pb-4">Personal Information</h2>
            
            <form onSubmit={handleUpdateName} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Display Name</label>
                <input 
                  type="text" 
                  value={displayName} 
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-xl border bg-gray-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" 
                  placeholder="What should we call you?"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
                <input 
                  type="email" 
                  disabled 
                  value={user.email || ""} 
                  className="w-full rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 text-gray-500 cursor-not-allowed" 
                />
                <p className="text-xs text-gray-400 mt-2 font-medium">Email address cannot be changed directly for security reasons.</p>
              </div>
              <button 
                type="submit" 
                disabled={loadingName || displayName === user.displayName}
                className="w-full md:w-auto px-8 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-colors shadow-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {loadingName ? "Saving..." : "Save Changes"}
              </button>
            </form>
          </div>

          {/* SECURITY CARD */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-6 border-b pb-4">Security</h2>
            
            <form onSubmit={handleUpdatePassword} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">New Password</label>
                <input 
                  type="password" 
                  required
                  minLength={6}
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl border bg-gray-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" 
                  placeholder="Enter a new secure password"
                />
                <p className="text-xs text-gray-400 mt-2 font-medium">Must be at least 6 characters long.</p>
              </div>
              
              <button 
                type="submit" 
                disabled={loadingPassword || !newPassword}
                className="w-full md:w-auto px-8 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-sm disabled:bg-red-300 disabled:cursor-not-allowed"
              >
                {loadingPassword ? "Updating..." : "Update Password"}
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}