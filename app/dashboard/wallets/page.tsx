"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc } from "firebase/firestore";
import LoadingShield from "@/components/ui/LoadingShield";
import { Transaction } from "@/types";
import { 
  Wallet, Landmark, Smartphone, Plus, Trash2, 
  AlertCircle, X, Loader2, CreditCard, ChevronRight
} from "lucide-react";
import Link from "next/link";

interface PaymentMethod {
  id: string;
  name: string;
  balance: number;
  type?: string;
}

interface ComputedWallet extends PaymentMethod {
  currentBalance: number;
}

export default function WalletsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  
  const [baseWallets, setBaseWallets] = useState<PaymentMethod[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [creditCards, setCreditCards] = useState<any[]>([]);

  const [cashWallets, setCashWallets] = useState<ComputedWallet[]>([]);
  const [bankWallets, setBankWallets] = useState<ComputedWallet[]>([]);
  const [mobileWallets, setMobileWallets] = useState<ComputedWallet[]>([]);
  const [totalAssets, setTotalAssets] = useState(0);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newWallet, setNewWallet] = useState({ name: '', type: 'auto', balance: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    const qWallets = query(collection(db, "paymentMethods"), where("userId", "==", user.uid));
    const unsubWallets = onSnapshot(qWallets, (snapshot) => {
      const w: PaymentMethod[] = [];
      snapshot.forEach(d => w.push({ id: d.id, name: d.data().name, balance: d.data().balance || 0, type: d.data().type || "auto" }));
      setBaseWallets(w);
    });

    const qCards = query(collection(db, "creditCards"), where("userId", "==", user.uid));
    const unsubCards = onSnapshot(qCards, (snapshot) => {
      const c: any[] = [];
      snapshot.forEach(d => c.push({ id: d.id, ...d.data() }));
      setCreditCards(c);
    });

    const qTxn = query(collection(db, "transactions"), where("userId", "==", user.uid));
    const unsubTxn = onSnapshot(qTxn, (snapshot) => {
      const t: Transaction[] = [];
      snapshot.forEach(d => t.push({ id: d.id, ...d.data() } as Transaction));
      setTransactions(t);
      setLoading(false);
    });

    return () => { unsubWallets(); unsubCards(); unsubTxn(); };
  }, [user]);

  useEffect(() => {
    const walletsMap: Record<string, ComputedWallet> = {};
    baseWallets.forEach(w => { walletsMap[w.name] = { ...w, currentBalance: w.balance }; });

    transactions.forEach(txn => {
      const amt = Number(txn.amount);
      if (txn.account && !walletsMap[txn.account]) return; 
      
      if (txn.type === "income" && txn.account) walletsMap[txn.account].currentBalance += amt;
      else if (txn.type === "expense" && txn.account) walletsMap[txn.account].currentBalance -= amt;
      else if (txn.type === "transfer") {
        if (txn.fromAccount && walletsMap[txn.fromAccount]) walletsMap[txn.fromAccount].currentBalance -= amt;
        if (txn.toAccount && walletsMap[txn.toAccount]) walletsMap[txn.toAccount].currentBalance += amt;
      }
    });

    const cash: ComputedWallet[] = [];
    const bank: ComputedWallet[] = [];
    const mobile: ComputedWallet[] = [];
    let netWorth = 0;

    Object.values(walletsMap).forEach(w => {
      if (creditCards.some(cc => cc.cardName === w.name)) return; 
      netWorth += w.currentBalance;
      const n = w.name.toLowerCase();
      const explicitType = w.type || "auto"; 

      if (explicitType === "mobile") mobile.push(w);
      else if (explicitType === "bank") bank.push(w);
      else if (explicitType === "cash") cash.push(w);
      else {
        if (n.includes("bkash") || n.includes("nagad") || n.includes("rocket") || n.includes("upay")) mobile.push(w);
        else if (n.includes("bank") || n.includes("card") || n.includes("city") || n.includes("brac")) bank.push(w);
        else cash.push(w);
      }
    });

    setTotalAssets(netWorth);
    setCashWallets(cash);
    setBankWallets(bank);
    setMobileWallets(mobile);
  }, [baseWallets, transactions, creditCards]);

  const handleAddWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (baseWallets.some(w => w.name.toLowerCase() === newWallet.name.toLowerCase())) {
      setError("Account name already exists."); return;
    }
    setIsSubmitting(true); setError('');
    try {
      await addDoc(collection(db, "paymentMethods"), {
        userId: user.uid, name: newWallet.name.trim(), type: newWallet.type, balance: Number(newWallet.balance) || 0, createdAt: new Date().toISOString()
      });
      setIsAddModalOpen(false); setNewWallet({ name: '', type: 'auto', balance: '' });
    } catch (err) { setError("Failed to add account."); } 
    finally { setIsSubmitting(false); }
  };

  const handleDeleteWallet = async (id: string, name: string, currentBalance: number) => {
    if (currentBalance !== 0) { alert(`Balance must be exactly ৳0 before deletion.`); return; }
    if (!window.confirm(`Permanently remove ${name}?`)) return;
    try { await deleteDoc(doc(db, "paymentMethods", id)); } catch (err) { alert("Failed to delete."); }
  };

  if (loading) return <LoadingShield text="Loading Accounts..." />;

  // Clean, Minimalist Card Renderer
  const WalletGroup = ({ title, icon: Icon, wallets }: { title: string, icon: any, wallets: ComputedWallet[] }) => {
    if (wallets.length === 0) return null;
    return (
      <div className="mb-8">
        <h3 className="font-bold text-gray-900 text-sm mb-4 px-1">{title}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {wallets.map(w => (
            <div key={w.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between group transition-shadow hover:shadow-md">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-500">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{w.name}</p>
                  <p className="text-xs text-gray-500 font-medium">৳ {w.currentBalance.toLocaleString('en-IN')}</p>
                </div>
              </div>
              <button 
                onClick={() => handleDeleteWallet(w.id, w.name, w.currentBalance)}
                className="p-2 text-gray-300 hover:text-red-500 rounded-full transition-colors md:opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans pb-28">
      <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 pt-2">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">Accounts</h1>
            <p className="text-sm font-medium text-gray-500 mt-1">Total Assets: ৳ {totalAssets.toLocaleString('en-IN')}</p>
          </div>
          <button onClick={() => setIsAddModalOpen(true)} className="flex items-center justify-center gap-2 px-5 py-3 bg-gray-900 hover:bg-black text-white font-bold rounded-xl shadow-sm transition-all active:scale-95 w-full sm:w-auto">
            <Plus className="w-4 h-4" /> Add Account
          </button>
        </div>

        {/* CREDIT CARDS LINK */}
        <Link href="/dashboard/credit-cards" className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between mb-8 group">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center text-gray-600">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Credit Cards</h3>
              <p className="text-xs text-gray-500 font-medium">Manage limits and utilization</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-900 transition-colors" />
        </Link>

        {/* WALLETS */}
        {baseWallets.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-200">
            <Wallet className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <h3 className="font-bold text-gray-900 text-sm">No accounts found</h3>
            <p className="text-xs text-gray-500 mt-1">Add a bank or wallet to get started.</p>
          </div>
        ) : (
          <div>
            <WalletGroup title="Bank Accounts" icon={Landmark} wallets={bankWallets} />
            <WalletGroup title="Mobile Finance" icon={Smartphone} wallets={mobileWallets} />
            <WalletGroup title="Cash" icon={Wallet} wallets={cashWallets} />
          </div>
        )}

        {/* ADD MODAL */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center p-5 border-b border-gray-50">
                <h2 className="text-lg font-bold text-gray-900">Add Account</h2>
                <button onClick={() => setIsAddModalOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleAddWallet} className="p-5 space-y-4">
                {error && <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl">{error}</div>}
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Name</label>
                  <input required type="text" value={newWallet.name} onChange={(e) => setNewWallet({...newWallet, name: e.target.value})} className="w-full px-3 py-2.5 border border-gray-200 bg-gray-50 rounded-xl text-sm font-bold text-gray-900 outline-none focus:border-blue-500 focus:bg-white transition-all" placeholder="e.g., City Bank" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Balance</label>
                    <input required type="number" step="any" value={newWallet.balance} onChange={(e) => setNewWallet({...newWallet, balance: e.target.value})} className="w-full px-3 py-2.5 border border-gray-200 bg-gray-50 rounded-xl text-sm font-bold text-gray-900 outline-none focus:border-blue-500 focus:bg-white transition-all" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Type</label>
                    <select value={newWallet.type} onChange={(e) => setNewWallet({...newWallet, type: e.target.value})} className="w-full px-3 py-2.5 border border-gray-200 bg-gray-50 rounded-xl text-sm font-bold text-gray-900 outline-none focus:border-blue-500 focus:bg-white transition-all">
                      <option value="auto">Auto</option><option value="bank">Bank</option><option value="mobile">Mobile</option><option value="cash">Cash</option>
                    </select>
                  </div>
                </div>
                <div className="pt-2 flex gap-2">
                  <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-3 bg-gray-100 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-xl">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-gray-900 text-white text-sm font-bold rounded-xl flex justify-center">{isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}