"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth/AuthContext";
import { updateProfile, updatePassword, signOut, getAuth } from "firebase/auth"; 
import { useRouter } from "next/navigation"; 
import { db } from "@/lib/firebase/config"; 
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore"; 

interface PaymentMethod {
  id: string;
  name: string;
  balance: number;
  type?: string; 
}

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter(); 
  
  // Auth States
  const [displayName, setDisplayName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loadingName, setLoadingName] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Wallet States
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [newMethodName, setNewMethodName] = useState("");
  const [newMethodBalance, setNewMethodBalance] = useState(""); 
  const [newMethodType, setNewMethodType] = useState("auto"); // Explicit Type
  const [loadingMethod, setLoadingMethod] = useState(false);

  // 1. Pre-fill name and fetch True Wallets
  useEffect(() => {
    if (!user) return;
    
    setDisplayName(user.displayName || "");

    const q = query(collection(db, "paymentMethods"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const methods: PaymentMethod[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        methods.push({ 
          id: doc.id, 
          name: data.name,
          balance: data.balance || 0,
          type: data.type || "auto"
        });
      });
      setPaymentMethods(methods);
    });

    return () => unsubscribe();
  }, [user]);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoadingName(true);
    setMessage({ type: "", text: "" });
    try {
      await updateProfile(user, { displayName });
      setMessage({ type: "success", text: "Profile name updated successfully!" });
    } catch (error: any) {
      setMessage({ type: "error", text: "Failed to update profile name." });
    } finally {
      setLoadingName(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoadingPassword(true);
    setMessage({ type: "", text: "" });
    try {
      await updatePassword(user, newPassword);
      setMessage({ type: "success", text: "Password updated successfully!" });
      setNewPassword(""); 
    } catch (error: any) {
      if (error.code === 'auth/requires-recent-login') {
        setMessage({ type: "error", text: "Security alert: Please log out and log back in before changing your password." });
      } else {
        setMessage({ type: "error", text: error.message });
      }
    } finally {
      setLoadingPassword(false);
    }
  };

  const handleAddMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMethodName.trim()) return;
    
    setLoadingMethod(true);
    try {
      await addDoc(collection(db, "paymentMethods"), {
        userId: user.uid,
        name: newMethodName.trim(),
        balance: parseFloat(newMethodBalance) || 0, 
        type: newMethodType, // Save explicit category
        createdAt: serverTimestamp()
      });
      setNewMethodName(""); 
      setNewMethodBalance("");
      setNewMethodType("auto");
    } catch (error) {
      console.error("Error adding wallet:", error);
      setMessage({ type: "error", text: "Failed to create wallet." });
    } finally {
      setLoadingMethod(false);
    }
  };

  const handleDeleteMethod = async (id: string) => {
    if (!window.confirm("Delete this wallet? Note: This does not delete past transactions, but removes it from your active accounts.")) return;
    try {
      await deleteDoc(doc(db, "paymentMethods", id));
    } catch (error) {
      console.error("Error deleting wallet:", error);
    }
  };

  const handleLogout = async () => {
    try {
      const auth = getAuth();
      await signOut(auth); 
      router.push("/"); 
    } catch (error) {
      setMessage({ type: "error", text: "Failed to sign out. Please try again." });
    }
  };

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

          {/* PREMIUM WALLET MANAGEMENT CARD */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-bold text-gray-900">Your Wallets</h2>
              <span className="bg-blue-100 text-blue-700 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">Premium</span>
            </div>
            <p className="text-sm text-gray-500 mb-6 border-b pb-4">Create wallets for your physical cash, bKash, and bank accounts to track exact real-time balances.</p>
            
            {/* Display Active True Wallets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {paymentMethods.length === 0 && (
                <div className="col-span-full p-4 border-2 border-dashed border-gray-200 rounded-2xl text-center text-gray-400 font-medium">
                  No wallets created yet. Add one below!
                </div>
              )}
              {paymentMethods.map(method => (
                <div key={method.id} className="flex justify-between items-center bg-gray-50 border border-gray-100 p-4 rounded-2xl hover:border-blue-200 hover:shadow-sm transition-all group">
                  <div>
                    <p className="font-bold text-gray-900 flex items-center gap-2">
                      {method.name}
                      {method.type && method.type !== 'auto' && (
                        <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded uppercase tracking-wider">{method.type}</span>
                      )}
                    </p>
                    <p className="text-sm font-black text-blue-600 mt-0.5">৳ {method.balance.toLocaleString()}</p>
                  </div>
                  <button 
                    onClick={() => handleDeleteMethod(method.id)} 
                    className="text-gray-300 hover:text-red-500 transition-colors p-2 bg-white rounded-full shadow-sm hover:bg-red-50"
                    title="Delete Wallet"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            {/* Add New True Wallet Input */}
            <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
              <h3 className="text-sm font-bold text-blue-900 mb-4">Create New Wallet</h3>
              <form onSubmit={handleAddMethod} className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input 
                    type="text" 
                    required
                    value={newMethodName} 
                    onChange={(e) => setNewMethodName(e.target.value)}
                    placeholder="Wallet Name (e.g., bKash)"
                    className="flex-[2] rounded-xl border bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                  <div className="flex-1 relative">
                    <span className="absolute left-4 top-3.5 text-gray-400 font-bold">৳</span>
                    <input 
                      type="number" 
                      required
                      value={newMethodBalance} 
                      onChange={(e) => setNewMethodBalance(e.target.value)}
                      placeholder="Starting Balance"
                      className="w-full rounded-xl border bg-white pl-8 pr-4 py-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <select 
                    value={newMethodType} 
                    onChange={(e) => setNewMethodType(e.target.value)}
                    className="flex-1 rounded-xl border bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-gray-700 font-medium"
                  >
                    <option value="auto">✨ Auto-Detect Type</option>
                    <option value="cash">💵 Cash / Physical</option>
                    <option value="bank">🏦 Bank Account</option>
                    <option value="mobile">📱 Mobile Banking</option>
                  </select>
                  <button 
                    type="submit" 
                    disabled={!newMethodName.trim() || newMethodBalance === "" || loadingMethod} 
                    className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                  >
                    {loadingMethod ? "..." : "Add Wallet"}
                  </button>
                </div>
              </form>
            </div>
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
              </div>
              <button 
                type="submit" 
                disabled={loadingPassword || !newPassword}
                className="w-full md:w-auto px-8 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-colors shadow-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {loadingPassword ? "Updating..." : "Update Password"}
              </button>
            </form>
          </div>

          {/* DANGER ZONE / LOGOUT */}
          <div className="bg-red-50 p-8 rounded-3xl border border-red-100 mt-4">
            <h2 className="text-xl font-bold text-red-900 mb-2">Account Actions</h2>
            <p className="text-red-700 text-sm mb-6 font-medium">Ready to leave? Make sure you have saved all your recent transactions.</p>
            <button 
              onClick={handleLogout}
              className="w-full md:w-auto px-8 py-3 bg-white text-red-600 border-2 border-red-200 font-bold rounded-xl hover:bg-red-600 hover:text-white transition-colors shadow-sm"
            >
              Sign Out of TekaPoysha
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}