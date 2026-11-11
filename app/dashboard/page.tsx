"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation"; 
import { useAuth } from "@/components/auth/AuthContext";
import LoadingShield from "@/components/ui/LoadingShield";
import { db } from "@/lib/firebase/config";
import { collection, query, where, onSnapshot, doc, deleteDoc, updateDoc, increment } from "firebase/firestore";
import { Transaction } from "@/types";
import EditRecordModal from "@/components/Transactions/EditRecordModal";
import { 
  Edit2, Trash2, ArrowUpRight, ArrowDownLeft, ArrowRightLeft, 
  Eye, EyeOff, Plus, Receipt, Search, Filter, X, Wallet, CreditCard,
  TrendingUp, TrendingDown
} from "lucide-react";

interface PaymentMethod {
  id: string;
  name: string;
  balance: number;
  type?: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter(); 
  
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [baseWallets, setBaseWallets] = useState<PaymentMethod[]>([]);
  const [creditCards, setCreditCards] = useState<any[]>([]);

  const [totalBalance, setTotalBalance] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlyExpense, setMonthlyExpense] = useState(0);

  const [selectedRecord, setSelectedRecord] = useState<Transaction | null>(null);
  const [showBalances, setShowBalances] = useState(false); 
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [filterType, setFilterType] = useState("all"); 
  const [filterAccount, setFilterAccount] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");

  const currentMonthPrefix = new Date().toISOString().slice(0, 7);

  // 1. Fetch Wallets
  useEffect(() => {
    if (!user || !user.uid) return;
    const qWallets = query(collection(db, "paymentMethods"), where("userId", "==", user.uid));
    const unsubWallets = onSnapshot(qWallets, (snapshot) => {
      const w: PaymentMethod[] = [];
      snapshot.forEach(doc => w.push({ id: doc.id, name: doc.data().name, balance: doc.data().balance || 0 }));
      setBaseWallets(w);
    });

    const qCards = query(collection(db, "creditCards"), where("userId", "==", user.uid));
    const unsubCards = onSnapshot(qCards, (snapshot) => {
      const c: any[] = [];
      snapshot.forEach(doc => c.push({ id: doc.id, ...doc.data() }));
      setCreditCards(c);
    });
    return () => { unsubWallets(); unsubCards(); };
  }, [user]);

  // 2. Fetch Txns & Calc Monthly Flow
  useEffect(() => {
    if (!user || !user.uid) {
      setLoading(false); 
      if (!user) router.push("/"); 
      return; 
    }
    const qTxn = query(collection(db, "transactions"), where("userId", "==", user.uid));
    const unsubTxn = onSnapshot(qTxn, (snapshot) => {
      const fetched: Transaction[] = [];
      let mIncome = 0; let mExpense = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        const txn = { id: doc.id, ...data } as Transaction;
        fetched.push(txn);
        const dateStr = typeof data.date === 'string' ? data.date : data.date.toDate().toISOString();
        if (dateStr.startsWith(currentMonthPrefix)) {
          if (txn.type === 'income') mIncome += Number(txn.amount);
          if (txn.type === 'expense') mExpense += Number(txn.amount);
        }
      });
      
      fetched.sort((a, b) => {
        const dA = (a.date as any)?.toDate ? (a.date as any).toDate() : new Date(a.date);
        const dB = (b.date as any)?.toDate ? (b.date as any).toDate() : new Date(b.date);
        return dB.getTime() - dA.getTime();
      });
      
      setTransactions(fetched);
      setMonthlyIncome(mIncome);
      setMonthlyExpense(mExpense);
      setLoading(false);
    });
    return () => unsubTxn();
  }, [user, router, currentMonthPrefix]);

  // 3. Calc Global Net Worth
  useEffect(() => {
    const walletsMap: Record<string, number> = {};
    baseWallets.forEach(w => walletsMap[w.name] = w.balance);

    transactions.forEach(txn => {
      const amt = Number(txn.amount);
      if (txn.type === "income" && txn.account) walletsMap[txn.account] = (walletsMap[txn.account] || 0) + amt;
      else if (txn.type === "expense" && txn.account) walletsMap[txn.account] = (walletsMap[txn.account] || 0) - amt;
      else if (txn.type === "transfer") {
        if (txn.fromAccount) walletsMap[txn.fromAccount] = (walletsMap[txn.fromAccount] || 0) - amt;
        if (txn.toAccount) walletsMap[txn.toAccount] = (walletsMap[txn.toAccount] || 0) + amt;
      }
    });

    let netWorth = 0;
    Object.keys(walletsMap).forEach(key => {
      if (!creditCards.some(cc => cc.cardName === key)) netWorth += walletsMap[key];
    });
    setTotalBalance(netWorth);
  }, [baseWallets, transactions, creditCards]);

  const modalWallets = [
    ...baseWallets.map(w => ({ id: w.id, name: w.name, isCreditCard: false })),
    ...creditCards.map(c => ({ id: c.id, name: c.cardName, isCreditCard: true }))
  ];

  const handleDeleteRecord = async (txn: Transaction) => {
    if (!window.confirm("Delete this record? Associated balances will automatically restore.")) return;
    try {
      const applyReverse = async (walletName: string, amountChange: number, isTransferToCC = false) => {
        const w = modalWallets.find(x => x.name === walletName);
        if (!w) return;
        if (w.isCreditCard) {
          let finalChange = amountChange;
          if (isTransferToCC) finalChange = -amountChange;
          await updateDoc(doc(db, "creditCards", w.id), { currentBalance: increment(finalChange) });
        }
      };

      const numAmount = Number(txn.amount);
      if (txn.type === 'expense') await applyReverse(txn.account!, -numAmount);
      else if (txn.type === 'income') await applyReverse(txn.account!, numAmount);
      else if (txn.type === 'transfer') {
        await applyReverse(txn.fromAccount!, -numAmount);
        await applyReverse(txn.toAccount!, numAmount, true);
      }
      await deleteDoc(doc(db, "transactions", txn.id!));
    } catch (error) {
      console.error("Error deleting record:", error);
      alert("Failed to delete record.");
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(txn => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesDesc = txn.description?.toLowerCase().includes(query) || false;
        const matchesCat = txn.category?.toLowerCase().includes(query) || false;
        const matchesAcc = txn.account?.toLowerCase().includes(query) || txn.fromAccount?.toLowerCase().includes(query) || txn.toAccount?.toLowerCase().includes(query) || false;
        if (!matchesDesc && !matchesCat && !matchesAcc) return false;
      }
      if (filterType !== "all" && txn.type !== filterType) return false;
      if (filterCategory !== "all" && txn.category !== filterCategory) return false;
      if (filterAccount !== "all") {
        if (txn.type === "transfer") {
          if (txn.fromAccount !== filterAccount && txn.toAccount !== filterAccount) return false;
        } else {
          if (txn.account !== filterAccount) return false;
        }
      }
      return true;
    });
  }, [transactions, searchQuery, filterType, filterCategory, filterAccount]);

  const uniqueCategories = Array.from(new Set(transactions.map(t => t.category).filter(Boolean)));
  const uniqueAccounts = Array.from(new Set(
    transactions.flatMap(t => t.type === 'transfer' ? [t.fromAccount, t.toAccount] : [t.account]).filter(Boolean)
  ));
  const hasActiveFilters = searchQuery !== "" || filterType !== "all" || filterCategory !== "all" || filterAccount !== "all";

  const clearFilters = () => {
    setSearchQuery(""); setFilterType("all"); setFilterCategory("all"); setFilterAccount("all");
  };

  if (loading) return <LoadingShield text="Loading Dashboard..." />;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans pb-28">
      <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500">
        
        {/* MINIMALIST HERO SECTION */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-2 md:pt-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Total Balance</p>
              <button 
                onClick={() => setShowBalances(!showBalances)}
                className="p-1 hover:bg-gray-200 rounded-md text-gray-400 hover:text-gray-700 transition-colors"
              >
                {showBalances ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">
              {showBalances ? `৳ ${totalBalance.toLocaleString('en-IN')}` : '৳ ••••••'}
            </h1>
          </div>

          <div className="flex items-center gap-4 bg-white px-5 py-4 rounded-2xl border border-gray-100 shadow-sm">
            <div>
              <div className="flex items-center gap-1.5 text-emerald-600 mb-0.5">
                <TrendingUp className="w-3.5 h-3.5" />
                <span className="text-[10px] font-black uppercase tracking-wider">In</span>
              </div>
              <p className="text-sm font-bold text-gray-900">{showBalances ? `৳ ${monthlyIncome.toLocaleString('en-IN')}` : '••••'}</p>
            </div>
            <div className="w-px h-8 bg-gray-100"></div>
            <div>
              <div className="flex items-center gap-1.5 text-red-600 mb-0.5">
                <TrendingDown className="w-3.5 h-3.5" />
                <span className="text-[10px] font-black uppercase tracking-wider">Out</span>
              </div>
              <p className="text-sm font-bold text-gray-900">{showBalances ? `৳ ${monthlyExpense.toLocaleString('en-IN')}` : '••••'}</p>
            </div>
          </div>
        </div>

        {/* NATIVE-STYLE HORIZONTAL SCROLL ACTIONS */}
        <div className="flex overflow-x-auto hide-scrollbar gap-4 pb-2 -mx-4 px-4 md:mx-0 md:px-0">
          {[
            { href: "/dashboard/add", icon: Plus, label: "Add Record", color: "bg-blue-600 text-white hover:bg-blue-700 border-transparent" },
            { href: "/dashboard/add?type=transfer", icon: ArrowRightLeft, label: "Transfer", color: "bg-white text-gray-700 hover:bg-gray-50 border-gray-200" },
            { href: "/dashboard/wallets", icon: Wallet, label: "Accounts", color: "bg-white text-gray-700 hover:bg-gray-50 border-gray-200" },
            { href: "/dashboard/credit-cards", icon: CreditCard, label: "Cards", color: "bg-white text-gray-700 hover:bg-gray-50 border-gray-200" }
          ].map((action, idx) => (
            <Link key={idx} href={action.href} className={`flex-shrink-0 flex items-center gap-2.5 px-6 py-3.5 rounded-2xl border font-bold shadow-sm transition-transform active:scale-95 ${action.color}`}>
              <action.icon className="w-4 h-4" />
              <span className="text-sm">{action.label}</span>
            </Link>
          ))}
        </div>

        {/* CLEAN TRANSACTIONS LEDGER */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-50 bg-white sticky top-0 z-10">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-gray-900 text-lg">Recent Activity</h3>
              <button onClick={() => setIsFilterExpanded(!isFilterExpanded)} className={`p-2 rounded-xl transition-colors ${isFilterExpanded || hasActiveFilters ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
                <Filter className="w-4 h-4" />
              </button>
            </div>

            {/* INTEGRATED FILTER BAR */}
            {isFilterExpanded && (
              <div className="mt-4 pt-4 border-t border-gray-50 space-y-4 animate-in fade-in duration-200">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                  <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-9 pr-9 py-2.5 text-sm font-medium text-gray-900 outline-none focus:border-blue-500 focus:bg-white transition-all" />
                  {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-3 top-3 text-gray-400"><X className="w-4 h-4" /></button>}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-lg px-2 py-2 text-xs font-bold text-gray-700 outline-none">
                    <option value="all">Type</option><option value="expense">Expense</option><option value="income">Income</option><option value="transfer">Transfer</option>
                  </select>
                  <select value={filterAccount} onChange={(e) => setFilterAccount(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-lg px-2 py-2 text-xs font-bold text-gray-700 outline-none">
                    <option value="all">Account</option>{uniqueAccounts.map(acc => <option key={acc as string} value={acc as string}>{acc}</option>)}
                  </select>
                  <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-lg px-2 py-2 text-xs font-bold text-gray-700 outline-none">
                    <option value="all">Category</option>{uniqueCategories.map(cat => <option key={cat as string} value={cat as string}>{cat}</option>)}
                  </select>
                </div>
                {hasActiveFilters && <button onClick={clearFilters} className="text-[10px] uppercase tracking-widest font-bold text-red-500">Clear All</button>}
              </div>
            )}
          </div>

          <div className="divide-y divide-gray-50 min-h-[400px]">
            {filteredTransactions.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <Receipt className="w-8 h-8 mx-auto mb-3 opacity-50" />
                <p className="font-medium text-sm">No activity found.</p>
              </div>
            ) : (
              filteredTransactions.map((txn) => (
                <div key={txn.id} className="p-4 sm:p-6 flex justify-between items-center hover:bg-gray-50/50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-50 border border-gray-100 shrink-0 text-gray-600">
                      {txn.type === 'income' ? <ArrowDownLeft className="w-4 h-4 text-emerald-500" /> : 
                       txn.type === 'transfer' ? <ArrowRightLeft className="w-4 h-4 text-blue-500" /> : 
                       <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">
                        {txn.category} 
                        {txn.description && <span className="text-gray-400 font-normal ml-1.5">- {txn.description}</span>}
                      </p>
                      <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                        {txn.type === 'transfer' ? `${txn.fromAccount} → ${txn.toAccount}` : txn.account} 
                        <span className="mx-1.5 opacity-50">•</span> 
                        {new Date((txn.date as any)?.toDate ? (txn.date as any).toDate() : txn.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className={`text-sm md:text-base font-bold ${txn.type === 'income' ? 'text-emerald-600' : 'text-gray-900'}`}>
                      {txn.type === 'income' ? '+' : txn.type === 'transfer' ? '' : '-'} {showBalances ? `৳ ${Number(txn.amount).toLocaleString('en-IN')}` : '••••'}
                    </p>
                    <div className="flex opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                      <button onClick={() => setSelectedRecord(txn as any)} className="p-1.5 text-gray-400 hover:text-blue-600" title="Edit"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => txn.id && handleDeleteRecord(txn)} className="p-1.5 text-gray-400 hover:text-red-600" title="Delete"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <EditRecordModal isOpen={!!selectedRecord} onClose={() => setSelectedRecord(null)} onSuccess={() => setSelectedRecord(null)} record={selectedRecord as any} wallets={modalWallets} />
      </div>
    </div>
  );
}