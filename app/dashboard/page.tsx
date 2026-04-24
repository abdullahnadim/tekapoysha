"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation"; 
import { useAuth } from "@/components/auth/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, query, where, onSnapshot, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { Transaction } from "@/types";

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter(); 
  
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balances, setBalances] = useState({
    Bank: 0, Cash: 0, bKash: 0, Metro: 0, Savings: 0
  });

  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null);

  // --- UI STATES ---
  const [showBalances, setShowBalances] = useState(false); 
  const [isOverviewCollapsed, setIsOverviewCollapsed] = useState(false); 

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
    if (!user || !user.uid) {
      setLoading(false); 
      if (!user) router.push("/"); 
      return; 
    }

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
  }, [user, router]); 

  // --- UI RENDERING ---
  if (loading) return <div className="p-8 animate-pulse text-gray-500">Loading Teka Poysha...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* DYNAMIC HEADER */}
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight transition-all">
              {isOverviewCollapsed ? "Activity" : "Overview"}
            </h2>
            
            <div className="flex bg-gray-200 rounded-full p-1 gap-1">
              {/* PRIVACY TOGGLE BUTTON */}
              <button 
                onClick={() => setShowBalances(!showBalances)}
                className="p-1.5 hover:bg-white rounded-full text-gray-600 transition-colors"
                title={showBalances ? "Hide Balances" : "Show Balances"}
              >
                {showBalances ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.978 9.978 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                )}
              </button>

              {/* COLLAPSE TOGGLE BUTTON */}
              <button 
                onClick={() => setIsOverviewCollapsed(!isOverviewCollapsed)}
                className="p-1.5 hover:bg-white rounded-full text-gray-600 transition-colors"
                title={isOverviewCollapsed ? "Expand Overview" : "Collapse Overview"}
              >
                {isOverviewCollapsed ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          {!isOverviewCollapsed && (
            <p className="text-gray-500 mt-1 animate-in fade-in duration-300">Manage your accounts and balances.</p>
          )}
        </div>

        {/* BALANCES SECTION (Collapsible) */}
        {!isOverviewCollapsed && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top-4 fade-in duration-300">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Bank</h3>
              <p className="text-3xl font-black text-gray-900">
                {showBalances ? `৳ ${balances.Bank.toLocaleString('en-IN')}` : '৳ ••••••'}
              </p>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Cash</h3>
              <p className="text-3xl font-black text-gray-900">
                {showBalances ? `৳ ${balances.Cash.toLocaleString('en-IN')}` : '৳ ••••••'}
              </p>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">bKash</h3>
              <p className="text-3xl font-black text-gray-900">
                {showBalances ? `৳ ${balances.bKash.toLocaleString('en-IN')}` : '৳ ••••••'}
              </p>
            </div>
          </div>
        )}

        {/* TRANSACTIONS LIST */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-gray-900">Recent Activity</h3>
            <Link href="/dashboard/add" className="hidden md:block bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-sm">+ Add New</Link>
          </div>

          <div className="divide-y divide-gray-50 h-[600px] overflow-y-auto">
            {transactions.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <span className="text-4xl mb-3">👻</span>
                <p className="text-gray-500 font-medium">No transactions found.</p>
              </div>
            ) : (
              transactions.map((txn) => (
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
                  <button type="button" onClick={() => setEditingTxn(null)} className="flex-1 p-4 rounded-2xl bg-gray-100 font-bold text-gray-700 hover:bg-gray-200 transition-colors">Cancel</button>
                  <button type="submit" className="flex-1 p-4 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors">Save</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MOBILE FLOATING ACTION BUTTON */}
        <Link 
          href="/dashboard/add" 
          className="md:hidden fixed bottom-24 right-4 w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center text-3xl pb-1 shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all z-40"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          +
        </Link>

      </div>
    </div>
  );
}