"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation"; 
import { useAuth } from "@/components/auth/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, query, where, onSnapshot, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { Transaction } from "@/types";

interface PaymentMethod {
  id: string;
  name: string;
  balance: number;
  type?: string;
}

interface ComputedWallet extends PaymentMethod {
  currentBalance: number;
  isLegacy?: boolean; 
}

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter(); 
  
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // Base Wallets from Settings
  const [baseWallets, setBaseWallets] = useState<PaymentMethod[]>([]);

  // Computed & Grouped Wallets
  const [totalBalance, setTotalBalance] = useState(0);
  const [cashWallets, setCashWallets] = useState<ComputedWallet[]>([]);
  const [bankWallets, setBankWallets] = useState<ComputedWallet[]>([]);
  const [mobileWallets, setMobileWallets] = useState<ComputedWallet[]>([]);

  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null);

  // UI States
  const [showBalances, setShowBalances] = useState(false); 
  const [isOverviewCollapsed, setIsOverviewCollapsed] = useState(false); 

  const formatDateForInput = (dateObj: any) => {
    if (!dateObj) return "";
    const d = dateObj?.toDate ? dateObj.toDate() : new Date(dateObj);
    return d.toISOString().split('T')[0];
  };

  // 1. Fetch User's Premium Wallets
  useEffect(() => {
    if (!user || !user.uid) return;
    const qWallets = query(collection(db, "paymentMethods"), where("userId", "==", user.uid));
    const unsubWallets = onSnapshot(qWallets, (snapshot) => {
      const w: PaymentMethod[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        w.push({ id: doc.id, name: data.name, balance: data.balance || 0, type: data.type || "auto" });
      });
      setBaseWallets(w);
    });
    return () => unsubWallets();
  }, [user]);

  // 2. Fetch User's Transactions
  useEffect(() => {
    if (!user || !user.uid) {
      setLoading(false); 
      if (!user) router.push("/"); 
      return; 
    }
    const qTxn = query(collection(db, "transactions"), where("userId", "==", user.uid));
    const unsubTxn = onSnapshot(qTxn, (snapshot) => {
      const fetched: Transaction[] = [];
      snapshot.forEach((doc) => fetched.push({ id: doc.id, ...doc.data() } as Transaction));
      
      fetched.sort((a, b) => {
        const dA = (a.date as any)?.toDate ? (a.date as any).toDate() : new Date(a.date);
        const dB = (b.date as any)?.toDate ? (b.date as any).toDate() : new Date(b.date);
        return dB.getTime() - dA.getTime();
      });
      
      setTransactions(fetched);
      setLoading(false);
    });
    return () => unsubTxn();
  }, [user, router]);

  // 3. The Calculation Engine & Smart Sorter
  useEffect(() => {
    const walletsMap: Record<string, ComputedWallet> = {};
    
    // Initialize map
    baseWallets.forEach(w => {
      walletsMap[w.name] = { ...w, currentBalance: w.balance };
    });

    const ensureWallet = (name: string) => {
      if (!name) return;
      if (!walletsMap[name]) {
        walletsMap[name] = { id: name, name, balance: 0, currentBalance: 0, isLegacy: true, type: "auto" };
      }
    };

    // Calculate real-time balances
    transactions.forEach(txn => {
      const amt = Number(txn.amount);
      if (txn.type === "income" && txn.account) {
        ensureWallet(txn.account);
        walletsMap[txn.account].currentBalance += amt;
      } else if (txn.type === "expense" && txn.account) {
        ensureWallet(txn.account);
        walletsMap[txn.account].currentBalance -= amt;
      } else if (txn.type === "transfer") {
        if (txn.fromAccount) {
          ensureWallet(txn.fromAccount);
          walletsMap[txn.fromAccount].currentBalance -= amt;
        }
        if (txn.toAccount) {
          ensureWallet(txn.toAccount);
          walletsMap[txn.toAccount].currentBalance += amt;
        }
      }
    });

    // Smart Sorter
    const cash: ComputedWallet[] = [];
    const bank: ComputedWallet[] = [];
    const mobile: ComputedWallet[] = [];
    let netWorth = 0;

    Object.values(walletsMap).forEach(w => {
      netWorth += w.currentBalance;
      
      const n = w.name.toLowerCase();
      const explicitType = w.type || "auto"; 

      // PRIORITY 1: Explicit Choice
      if (explicitType === "mobile") {
        mobile.push(w);
      } else if (explicitType === "bank") {
        bank.push(w);
      } else if (explicitType === "cash") {
        cash.push(w);
      } 
      // PRIORITY 2: Keyword scanning
      else {
        if (n.includes("bkash") || n.includes("nagad") || n.includes("rocket") || n.includes("upay") || n.includes("cellfin") || n.includes("tap") || n.includes("surecash")) {
          mobile.push(w);
        } else if (n.includes("bank") || n.includes("card") || n.includes("dbbl") || n.includes("city") || n.includes("brac") || n.includes("islami")) {
          bank.push(w);
        } else {
          cash.push(w);
        }
      }
    });

    setTotalBalance(netWorth);
    setCashWallets(cash);
    setBankWallets(bank);
    setMobileWallets(mobile);

  }, [baseWallets, transactions]);

  const sumWallets = (arr: ComputedWallet[]) => arr.reduce((sum, w) => sum + w.currentBalance, 0);

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

  if (loading) return <div className="p-8 animate-pulse text-gray-500 font-bold">Loading Vault...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
        
        {/* DYNAMIC HEADER */}
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight transition-all">
              {isOverviewCollapsed ? "Activity" : "Overview"}
            </h2>
            
            <div className="flex bg-gray-200 rounded-full p-1 gap-1 shadow-inner">
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
            <p className="text-gray-500 mt-1 font-medium animate-in fade-in duration-300">Manage your accounts and balances.</p>
          )}
        </div>

        {/* PREMIUM NET WORTH WIDGET */}
        {!isOverviewCollapsed && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-top-4 fade-in duration-300">
            
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-3xl shadow-lg text-white border border-gray-700 flex flex-col justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Net Worth</p>
                <h2 className="text-3xl font-black truncate">
                  {showBalances ? `৳ ${totalBalance.toLocaleString('en-IN')}` : '৳ ••••••'}
                </h2>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-700">
                <span className="text-xs text-gray-400 font-medium">All accounts combined</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Cash
                </p>
                <h3 className="text-2xl font-black text-emerald-600 truncate">
                  {showBalances ? `৳ ${sumWallets(cashWallets).toLocaleString('en-IN')}` : '৳ ••••••'}
                </h3>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-50 flex flex-col gap-1.5">
                {cashWallets.length === 0 ? <span className="text-xs text-gray-400">No cash accounts</span> : null}
                {cashWallets.map(w => (
                  <div key={w.id} className="flex justify-between text-xs items-center">
                    <span className="text-gray-500 font-medium truncate pr-2 flex items-center gap-1">
                      {w.isLegacy && <span className="text-[10px] bg-gray-100 px-1 rounded text-gray-400" title="Unregistered Account">⚠️</span>}
                      {w.name}
                    </span>
                    <span className="text-gray-900 font-bold">{showBalances ? `৳ ${w.currentBalance.toLocaleString('en-IN')}` : '••••'}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span> Bank
                </p>
                <h3 className="text-2xl font-black text-blue-600 truncate">
                  {showBalances ? `৳ ${sumWallets(bankWallets).toLocaleString('en-IN')}` : '৳ ••••••'}
                </h3>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-50 flex flex-col gap-1.5">
                {bankWallets.length === 0 ? <span className="text-xs text-gray-400">No bank accounts</span> : null}
                {bankWallets.map(w => (
                  <div key={w.id} className="flex justify-between text-xs items-center">
                    <span className="text-gray-500 font-medium truncate pr-2">{w.name}</span>
                    <span className="text-gray-900 font-bold">{showBalances ? `৳ ${w.currentBalance.toLocaleString('en-IN')}` : '••••'}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-pink-500"></span> Mobile
                </p>
                <h3 className="text-2xl font-black text-pink-600 truncate">
                  {showBalances ? `৳ ${sumWallets(mobileWallets).toLocaleString('en-IN')}` : '৳ ••••••'}
                </h3>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-50 flex flex-col gap-1.5">
                {mobileWallets.length === 0 ? <span className="text-xs text-gray-400">No mobile accounts</span> : null}
                {mobileWallets.map(w => (
                  <div key={w.id} className="flex justify-between text-xs items-center">
                    <span className="text-gray-500 font-medium truncate pr-2">{w.name}</span>
                    <span className="text-gray-900 font-bold">{showBalances ? `৳ ${w.currentBalance.toLocaleString('en-IN')}` : '••••'}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* TRANSACTIONS LIST */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-white sticky top-0 z-10">
            <h3 className="font-bold text-gray-900">Recent Activity</h3>
            <Link href="/dashboard/add" className="hidden md:flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 hover:shadow-md transition-all shadow-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              Add Record
            </Link>
          </div>

          <div className="divide-y divide-gray-50 h-[600px] overflow-y-auto">
            {transactions.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center h-full">
                <span className="text-5xl mb-4 opacity-50">💸</span>
                <p className="text-gray-900 font-bold text-lg">No transactions yet</p>
                <p className="text-gray-500 font-medium mt-1">Start tracking your wealth by adding your first record.</p>
              </div>
            ) : (
              transactions.map((txn) => (
                <div key={txn.id} className="p-5 flex justify-between items-center hover:bg-gray-50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black shadow-sm ${txn.type === 'income' ? 'bg-green-50 text-green-600 border border-green-100' : txn.type === 'transfer' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                      {txn.type === 'income' ? '↓' : txn.type === 'transfer' ? '⇄' : '↑'}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-base">{txn.category}</p>
                      <p className="text-xs text-gray-400 font-medium mt-0.5">
                        {txn.type === 'transfer' ? (
                          <span className="text-blue-500 font-bold">{txn.fromAccount} → {txn.toAccount}</span>
                        ) : (
                          <span className="text-gray-500 font-bold">{txn.account}</span>
                        )} 
                        <span className="mx-1">•</span> 
                        {new Date((txn.date as any)?.toDate ? (txn.date as any).toDate() : txn.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 md:gap-6">
                    <div className="text-right">
                      <p className={`text-lg font-black ${txn.type === 'income' ? 'text-green-600' : txn.type === 'transfer' ? 'text-blue-600' : 'text-gray-900'}`}>
                        {txn.type === 'income' ? '+' : txn.type === 'transfer' ? '' : '-'} {showBalances ? `৳ ${Number(txn.amount).toLocaleString('en-IN')}` : '••••'}
                      </p>
                    </div>
                    <div className="flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditingTxn({...txn, date: formatDateForInput(txn.date)})} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">✎</button>
                      <button onClick={() => txn.id && handleDelete(txn.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">🗑</button>
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
            <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
              <h2 className="text-2xl font-black mb-6 text-gray-900">Update Record</h2>
              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Amount</label>
                  <input type="number" value={editingTxn.amount} onChange={(e) => setEditingTxn({...editingTxn, amount: Number(e.target.value)})} className="w-full p-4 rounded-xl border border-gray-200 bg-gray-50 outline-none focus:border-blue-500 focus:bg-white transition-all font-bold" placeholder="Amount" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Description</label>
                  <input type="text" value={editingTxn.description} onChange={(e) => setEditingTxn({...editingTxn, description: e.target.value})} className="w-full p-4 rounded-xl border border-gray-200 bg-gray-50 outline-none focus:border-blue-500 focus:bg-white transition-all font-medium" placeholder="Description" />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setEditingTxn(null)} className="flex-1 py-3.5 rounded-xl bg-gray-100 font-bold text-gray-600 hover:bg-gray-200 transition-colors">Cancel</button>
                  <button type="submit" className="flex-1 py-3.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-sm transition-colors">Save Changes</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <Link 
          href="/dashboard/add" 
          className="md:hidden fixed bottom-24 right-4 w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center text-3xl pb-1 shadow-[0_8px_30px_rgba(37,99,235,0.4)] hover:bg-blue-700 active:scale-90 transition-all z-40"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          +
        </Link>

      </div>
    </div>
  );
}