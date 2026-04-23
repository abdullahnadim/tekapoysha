"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation"; // <-- STEP 1: Imported Router
import { useAuth } from "@/components/auth/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, query, where, onSnapshot, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { Transaction } from "@/types";

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter(); // <-- STEP 2: Activated Router
  
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balances, setBalances] = useState({
    Bank: 0, Cash: 0, bKash: 0, Metro: 0, Savings: 0
  });

  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null);

  const formatDateForInput = (dateObj: any) => {
    if (!dateObj) return "";
    const d = dateObj?.toDate ? dateObj.toDate() : new Date(dateObj);
    return d.toISOString().split('T')[0];
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTxn || !editingTxn.id) return;
    try {
      const txnRef = doc(db, "transactions", editingTxn.id);
      await updateDoc(txnRef, {
        amount: Number(editingTxn.amount),
        account: editingTxn.account,
        category: editingTxn.category,
        description: editingTxn.description,
        date: new Date(editingTxn.date as string),
      });
      setEditingTxn(null);
    } catch (error) {
      console.error("Error updating:", error);
      alert("Failed to update.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure?")) return;
    try {
      await deleteDoc(doc(db, "transactions", id));
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  // --- REAL-TIME LISTENER ---
  useEffect(() => {
    // 👇 STEP 3: THE FIX 👇
    // If there is no user, stop loading immediately and kick them to login!
    if (!user) {
      setLoading(false); 
      router.push("/"); // Change this to "/login" if your login page is there
      return; 
    }
    // 👆 END OF STEP 3 👆

    // If there IS a user, fetch the data safely:
    const q = query(collection(db, "transactions"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: Transaction[] = [];
      let newBalances = { Bank: 0, Cash: 0, bKash: 0, Metro: 0, Savings: 0 };
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        fetched.push({ id: doc.id, ...data } as Transaction);
        const amount = Number(data.amount);
        
        if (data.type === "income") {
          const acc = data.account as keyof typeof newBalances;
          newBalances[acc] = (newBalances[acc] || 0) + amount;
        } else if (data.type === "expense") {
          const acc = data.account as keyof typeof newBalances;
          newBalances[acc] = (newBalances[acc] || 0) - amount;
        } else if (data.type === "transfer") {
          const from = data.fromAccount as keyof typeof newBalances;
          const to = data.toAccount as keyof typeof newBalances;
          if (from) newBalances[from] = (newBalances[from] || 0) - amount;
          if (to) newBalances[to] = (newBalances[to] || 0) + amount;
        }
      });
      
      fetched.sort((a, b) => {
        const dA = (a.date as any)?.toDate ? (a.date as any).toDate() : new Date(a.date);
        const dB = (b.date as any)?.toDate ? (b.date as any).toDate() : new Date(b.date);
        return dB.getTime() - dA.getTime();
      });
      
      setTransactions(fetched);
      setBalances(newBalances);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [user, router]); // Added router to dependency array to keep React happy

  // --- UI RENDERING ---
  
  if (loading) return <div className="p-8 animate-pulse text-gray-500">Loading Teka Poysha...</div>;

  // 👇 STEP 4: THE SAFETY NET 👇
  // If the redirect takes a split second, show this instead of a broken dashboard.
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center bg-white p-8 rounded-3xl shadow-sm border border-gray-100 max-w-sm w-full">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-500 mb-6">You need to log in to view this dashboard.</p>
          <Link href="/" className="block w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }
  // 👆 END OF STEP 4 👆

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER SECTION */}
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Overview</h2>
          <p className="text-gray-500 mt-1">Manage your accounts and transactions.</p>
        </div>

        {/* BALANCES SECTION */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Bank</h3>
            <p className="text-3xl font-black text-gray-900">৳ {balances.Bank.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Cash</h3>
            <p className="text-3xl font-black text-gray-900">৳ {balances.Cash.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">bKash</h3>
            <p className="text-3xl font-black text-gray-900">৳ {balances.bKash.toLocaleString('en-IN')}</p>
          </div>
        </div>

        {/* TRANSACTIONS SECTION */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-gray-900">Recent Activity</h3>
            <Link href="/dashboard/add" className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all">+ Add New</Link>
          </div>

          <div className="divide-y divide-gray-50">
            {transactions.length === 0 ? (
              <p className="p-10 text-center text-gray-400">No data found.</p>
            ) : (
              transactions.slice(0, 10).map((txn) => (
                <div key={txn.id} className="p-5 flex justify-between items-center hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${txn.type === 'income' ? 'bg-green-50 text-green-600' : txn.type === 'transfer' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
                      {txn.type === 'income' ? '↓' : txn.type === 'transfer' ? '⇄' : '↑'}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-base">{txn.category}</p>
                      <p className="text-xs text-gray-400 font-medium">
                        {txn.type === 'transfer' ? `${txn.fromAccount} to ${txn.toAccount}` : txn.account} • {new Date((txn.date as any)?.toDate ? (txn.date as any).toDate() : txn.date).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className={`text-lg font-black ${txn.type === 'income' ? 'text-green-600' : txn.type === 'transfer' ? 'text-blue-600' : 'text-gray-900'}`}>
                        {txn.type === 'income' ? '+' : txn.type === 'transfer' ? '' : '-'} ৳ {Number(txn.amount).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setEditingTxn({...txn, date: formatDateForInput(txn.date)})} className="p-2 text-gray-300 hover:text-blue-600 transition-colors">✎</button>
                      <button onClick={() => txn.id && handleDelete(txn.id)} className="p-2 text-gray-300 hover:text-red-600 transition-colors">🗑</button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* EDIT MODAL */}
        {editingTxn && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
              <h2 className="text-2xl font-bold mb-6">Update Record</h2>
              <form onSubmit={handleUpdate} className="space-y-4">
                <input type="number" value={editingTxn.amount} onChange={(e) => setEditingTxn({...editingTxn, amount: Number(e.target.value)})} className="w-full p-4 rounded-2xl border bg-gray-50 outline-none focus:border-blue-500" placeholder="Amount" />
                <input type="text" value={editingTxn.description} onChange={(e) => setEditingTxn({...editingTxn, description: e.target.value})} className="w-full p-4 rounded-2xl border bg-gray-50 outline-none focus:border-blue-500" placeholder="Description" />
                <div className="flex gap-4">
                  <button type="button" onClick={() => setEditingTxn(null)} className="flex-1 p-4 rounded-2xl bg-gray-100 font-bold">Cancel</button>
                  <button type="submit" className="flex-1 p-4 rounded-2xl bg-blue-600 text-white font-bold">Save</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}