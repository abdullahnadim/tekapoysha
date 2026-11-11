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
  Eye, EyeOff, Plus, ChevronUp, ChevronDown, Receipt, Search, Filter, X, CreditCard 
} from "lucide-react";

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
  
  // Base Wallets & Cards
  const [baseWallets, setBaseWallets] = useState<PaymentMethod[]>([]);
  const [creditCards, setCreditCards] = useState<any[]>([]);

  // Computed & Grouped Wallets
  const [totalBalance, setTotalBalance] = useState(0);
  const [cashWallets, setCashWallets] = useState<ComputedWallet[]>([]);
  const [bankWallets, setBankWallets] = useState<ComputedWallet[]>([]);
  const [mobileWallets, setMobileWallets] = useState<ComputedWallet[]>([]);

  // Reversal Engine & Edit State
  const [selectedRecord, setSelectedRecord] = useState<Transaction | null>(null);

  // UI States
  const [showBalances, setShowBalances] = useState(false); 
  const [isOverviewCollapsed, setIsOverviewCollapsed] = useState(false); 

  // --- NEW: SEARCH & FILTER STATES ---
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [filterType, setFilterType] = useState("all"); // 'all', 'income', 'expense', 'transfer'
  const [filterAccount, setFilterAccount] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");

  // 1. Fetch User's Asset Wallets & Credit Cards
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

    const qCards = query(collection(db, "creditCards"), where("userId", "==", user.uid));
    const unsubCards = onSnapshot(qCards, (snapshot) => {
      const c: any[] = [];
      snapshot.forEach(doc => c.push({ id: doc.id, ...doc.data() }));
      setCreditCards(c);
    });

    return () => { unsubWallets(); unsubCards(); };
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
    
    baseWallets.forEach(w => {
      walletsMap[w.name] = { ...w, currentBalance: w.balance };
    });

    const ensureWallet = (name: string) => {
      if (!name) return;
      if (!walletsMap[name]) {
        walletsMap[name] = { id: name, name, balance: 0, currentBalance: 0, isLegacy: true, type: "auto" };
      }
    };

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

    const cash: ComputedWallet[] = [];
    const bank: ComputedWallet[] = [];
    const mobile: ComputedWallet[] = [];
    let netWorth = 0;

    Object.values(walletsMap).forEach(w => {
      if (creditCards.some(cc => cc.cardName === w.name)) return;

      netWorth += w.currentBalance;
      
      const n = w.name.toLowerCase();
      const explicitType = w.type || "auto"; 

      if (explicitType === "mobile") {
        mobile.push(w);
      } else if (explicitType === "bank") {
        bank.push(w);
      } else if (explicitType === "cash") {
        cash.push(w);
      } else {
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

  }, [baseWallets, transactions, creditCards]);

  const sumWallets = (arr: ComputedWallet[]) => arr.reduce((sum, w) => sum + w.currentBalance, 0);
  // NEW: Sum Credit Cards
  const sumCreditCards = () => creditCards.reduce((sum, c) => sum + (c.currentBalance || 0), 0);

  const modalWallets = [
    ...baseWallets.map(w => ({ id: w.id, name: w.name, isCreditCard: false })),
    ...creditCards.map(c => ({ id: c.id, name: c.cardName, isCreditCard: true }))
  ];

  // Direct Row Delete with Reversal Engine
  const handleDeleteRecord = async (txn: Transaction) => {
    if (!window.confirm("Are you sure you want to delete this record? Associated balances will be restored automatically.")) return;
    
    try {
      const applyReverse = async (walletName: string, amountChange: number, isTransferToCC = false) => {
        const w = modalWallets.find(x => x.name === walletName);
        if (!w) return;
        if (w.isCreditCard) {
          let finalChange = amountChange;
          if (isTransferToCC) finalChange = -amountChange;
          await updateDoc(doc(db, "creditCards", w.id), {
            currentBalance: increment(finalChange)
          });
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

  // --- THE FILTER ENGINE (ZERO-LATENCY) ---
  const filteredTransactions = useMemo(() => {
    return transactions.filter(txn => {
      // 1. Filter by Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesDesc = txn.description?.toLowerCase().includes(query) || false;
        const matchesCat = txn.category?.toLowerCase().includes(query) || false;
        const matchesAcc = txn.account?.toLowerCase().includes(query) || txn.fromAccount?.toLowerCase().includes(query) || txn.toAccount?.toLowerCase().includes(query) || false;
        
        if (!matchesDesc && !matchesCat && !matchesAcc) return false;
      }

      // 2. Filter by Type
      if (filterType !== "all" && txn.type !== filterType) return false;

      // 3. Filter by Category
      if (filterCategory !== "all" && txn.category !== filterCategory) return false;

      // 4. Filter by Account
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

  // Extract unique categories and accounts for the dropdowns
  const uniqueCategories = Array.from(new Set(transactions.map(t => t.category).filter(Boolean)));
  const uniqueAccounts = Array.from(new Set(
    transactions.flatMap(t => t.type === 'transfer' ? [t.fromAccount, t.toAccount] : [t.account]).filter(Boolean)
  ));

  const hasActiveFilters = searchQuery !== "" || filterType !== "all" || filterCategory !== "all" || filterAccount !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setFilterType("all");
    setFilterCategory("all");
    setFilterAccount("all");
  };

  if (loading) return <LoadingShield text="Loading Dashboard..." />;

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
                {showBalances ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>

              <button 
                onClick={() => setIsOverviewCollapsed(!isOverviewCollapsed)}
                className="p-1.5 hover:bg-white rounded-full text-gray-600 transition-colors"
                title={isOverviewCollapsed ? "Expand Overview" : "Collapse Overview"}
              >
                {isOverviewCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {!isOverviewCollapsed && (
            <p className="text-gray-500 mt-1 font-medium animate-in fade-in duration-300">Manage your asset accounts and balances.</p>
          )}
        </div>

        {/* PREMIUM NET WORTH WIDGET & CARDS OVERVIEW */}
        {!isOverviewCollapsed && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 animate-in slide-in-from-top-4 fade-in duration-300">
            
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-[2rem] shadow-lg text-white border border-gray-700 flex flex-col justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Assets</p>
                <h2 className="text-3xl font-black truncate">
                  {showBalances ? `৳ ${totalBalance.toLocaleString('en-IN')}` : '৳ ••••••'}
                </h2>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-700">
                <span className="text-xs text-gray-400 font-medium">All positive accounts combined</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col justify-between">
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

            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col justify-between">
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

            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col justify-between">
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

            {/* RESTORED: CREDIT CARDS WIDGET */}
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-500"></span> Cards
                  </p>
                  <Link href="/dashboard/credit-cards" className="text-gray-400 hover:text-orange-600 transition-colors" title="Manage Credit Cards">
                    <Edit2 className="w-4 h-4" />
                  </Link>
                </div>
                <h3 className="text-2xl font-black text-orange-600 truncate">
                  {showBalances ? `৳ ${sumCreditCards().toLocaleString('en-IN')}` : '৳ ••••••'}
                </h3>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-50 flex flex-col gap-1.5">
                {creditCards.length === 0 ? <span className="text-xs text-gray-400">No active cards</span> : null}
                {creditCards.map(c => (
                  <div key={c.id} className="flex justify-between text-xs items-center">
                    <span className="text-gray-500 font-medium truncate pr-2">{c.cardName}</span>
                    <span className="text-gray-900 font-bold">{showBalances ? `৳ ${(c.currentBalance || 0).toLocaleString('en-IN')}` : '••••'}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* TRANSACTIONS LIST WITH FILTER ENGINE */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-50 bg-white sticky top-0 z-10 flex flex-col gap-4">
            
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-900 text-lg">Recent Activity</h3>
                {hasActiveFilters && (
                  <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">Filtered</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsFilterExpanded(!isFilterExpanded)} 
                  className={`p-2.5 rounded-xl transition-all ${isFilterExpanded || hasActiveFilters ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                >
                  <Filter className="w-4 h-4" />
                </button>
                {/* RESTORED: QUICK LINK TO CREDIT CARDS */}
                <Link href="/dashboard/credit-cards" className="hidden sm:flex items-center gap-2 bg-orange-50 text-orange-600 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-orange-100 hover:shadow-md transition-all shadow-sm">
                  <CreditCard className="w-4 h-4" /> Cards
                </Link>
                <Link href="/dashboard/add" className="hidden md:flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 hover:shadow-md transition-all shadow-sm">
                  <Plus className="w-4 h-4" /> Add Record
                </Link>
              </div>
            </div>

            {/* EXPANDED FILTER PANEL */}
            {isFilterExpanded && (
              <div className="animate-in slide-in-from-top-2 fade-in duration-200 bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-4">
                
                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-4 top-3.5 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Search note, category, or account..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-10 py-3 text-sm font-medium text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Dropdown Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Type</label>
                    <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold text-gray-700 outline-none focus:border-blue-500">
                      <option value="all">All Types</option>
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                      <option value="transfer">Transfer</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Account</label>
                    <select value={filterAccount} onChange={(e) => setFilterAccount(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold text-gray-700 outline-none focus:border-blue-500">
                      <option value="all">All Accounts</option>
                      {uniqueAccounts.map(acc => <option key={acc as string} value={acc as string}>{acc}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Category</label>
                    <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold text-gray-700 outline-none focus:border-blue-500">
                      <option value="all">All Categories</option>
                      {uniqueCategories.map(cat => <option key={cat as string} value={cat as string}>{cat}</option>)}
                    </select>
                  </div>
                </div>

                {/* Clear Filters Button */}
                {hasActiveFilters && (
                  <div className="flex justify-end pt-1">
                    <button onClick={clearFilters} className="text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors">
                      Reset Filters
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="divide-y divide-gray-50 h-[600px] overflow-y-auto">
            {filteredTransactions.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center h-full">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                  {hasActiveFilters ? <Search className="w-8 h-8 text-gray-300" /> : <Receipt className="w-8 h-8 text-gray-300" />}
                </div>
                <p className="text-gray-900 font-bold text-lg">
                  {hasActiveFilters ? "No matches found" : "No Recent Activity"}
                </p>
                <p className="text-gray-500 font-medium mt-1">
                  {hasActiveFilters ? "Try adjusting your search or filters." : "Your logged transactions will appear here."}
                </p>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="mt-4 px-4 py-2 bg-blue-50 text-blue-600 font-bold rounded-lg text-sm hover:bg-blue-100 transition-colors">
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              filteredTransactions.map((txn) => (
                <div key={txn.id} className="p-5 flex justify-between items-center hover:bg-gray-50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${
                      txn.type === 'income' ? 'bg-green-50 text-green-600 border border-green-100' : 
                      txn.type === 'transfer' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 
                      'bg-red-50 text-red-600 border border-red-100'
                    }`}>
                      {txn.type === 'income' ? <ArrowDownLeft className="w-5 h-5" /> : 
                       txn.type === 'transfer' ? <ArrowRightLeft className="w-5 h-5" /> : 
                       <ArrowUpRight className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-base">
                        {txn.category} 
                        {txn.description && (
                          <span className="text-gray-400 font-medium text-sm ml-1.5 hidden sm:inline">
                            - {txn.description}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 font-medium mt-0.5">
                        {txn.type === 'transfer' ? (
                          <span className="text-blue-600 font-bold">{txn.fromAccount} → {txn.toAccount}</span>
                        ) : (
                          <span className="text-gray-600 font-bold">{txn.account}</span>
                        )} 
                        <span className="mx-1.5 text-gray-300">•</span> 
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
                    <div className="flex gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setSelectedRecord(txn as any)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit Record">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => txn.id && handleDeleteRecord(txn)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete Record">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* FLOATING ACTION BUTTON (MOBILE) */}
        <Link 
          href="/dashboard/add" 
          className="md:hidden fixed bottom-24 right-4 w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-[0_8px_30px_rgba(37,99,235,0.4)] hover:bg-blue-700 active:scale-90 transition-all z-40"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <Plus className="w-6 h-6" />
        </Link>

        {/* --- THE REVERSAL ENGINE MODAL --- */}
        <EditRecordModal 
          isOpen={!!selectedRecord} 
          onClose={() => setSelectedRecord(null)}
          onSuccess={() => setSelectedRecord(null)}
          record={selectedRecord as any}
          wallets={modalWallets}
        />

      </div>
    </div>
  );
}