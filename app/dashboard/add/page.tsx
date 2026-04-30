"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, addDoc, serverTimestamp, query, where, onSnapshot } from "firebase/firestore";

interface Wallet {
  id: string;
  name: string;
}

export default function AddTransactionPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Fetched Wallets
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loadingWallets, setLoadingWallets] = useState(true);

  // Form States
  const [type, setType] = useState<"expense" | "income" | "transfer">("expense");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  // Income/Expense specific
  const [category, setCategory] = useState("");
  const [account, setAccount] = useState("");

  // Transfer specific
  const [fromAccount, setFromAccount] = useState("");
  const [toAccount, setToAccount] = useState("");
  const [transferFee, setTransferFee] = useState("");

  // Categories
  const expenseCategories = ["Food & Dining", "Transportation", "Shopping", "Housing", "Bills & Utilities", "Entertainment", "Healthcare", "Personal Care", "Education", "Other"];
  const incomeCategories = ["Salary", "Business", "Freelance", "Gifts", "Investments", "Other"];

  // Fetch Wallets
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "paymentMethods"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedWallets: Wallet[] = [];
      snapshot.forEach((doc) => fetchedWallets.push({ id: doc.id, name: doc.data().name }));
      setWallets(fetchedWallets);
      
      // Auto-select first wallet if available
      if (fetchedWallets.length > 0) {
        setAccount(fetchedWallets[0].name);
        setFromAccount(fetchedWallets[0].name);
        if (fetchedWallets.length > 1) {
          setToAccount(fetchedWallets[1].name);
        }
      }
      setLoadingWallets(false);
    });
    return () => unsubscribe();
  }, [user]);

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !amount || Number(amount) <= 0) return;

    setLoading(true);

    try {
      if (type === "transfer") {
        if (fromAccount === toAccount) {
          alert("You cannot transfer money to the same account!");
          setLoading(false);
          return;
        }

        // 1. Create the Transfer Record
        await addDoc(collection(db, "transactions"), {
          userId: user.uid,
          type: "transfer",
          amount: Number(amount),
          fromAccount,
          toAccount,
          category: "Transfer",
          description: description || `Transfer to ${toAccount}`,
          date: new Date(date),
          createdAt: serverTimestamp(),
        });

        // 2. The Transfer Fee Trick (Creates a separate expense)
        if (transferFee && Number(transferFee) > 0) {
          await addDoc(collection(db, "transactions"), {
            userId: user.uid,
            type: "expense",
            amount: Number(transferFee),
            account: fromAccount, // Deduct fee from the sender wallet
            category: "Transfer Fee",
            description: `Fee for transferring to ${toAccount}`,
            date: new Date(date),
            createdAt: serverTimestamp(),
          });
        }
      } else {
        // Create Standard Income/Expense Record
        await addDoc(collection(db, "transactions"), {
          userId: user.uid,
          type,
          amount: Number(amount),
          category: category || (type === "expense" ? expenseCategories[0] : incomeCategories[0]),
          account,
          description,
          date: new Date(date),
          createdAt: serverTimestamp(),
        });
      }

      router.push("/dashboard"); // Send them back to overview
    } catch (error) {
      console.error("Error adding transaction:", error);
      alert("Failed to save transaction.");
      setLoading(false);
    }
  };

  if (!user || loadingWallets) return <div className="p-8 animate-pulse text-gray-500 font-bold">Loading Engine...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-xl mx-auto">
        
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-black text-gray-900">Add Record</h1>
          <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-900 font-bold bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
            Cancel
          </button>
        </div>

        {wallets.length === 0 ? (
          <div className="bg-red-50 border-2 border-dashed border-red-200 p-8 rounded-3xl text-center">
            <h2 className="text-red-600 font-black text-xl mb-2">No Wallets Found!</h2>
            <p className="text-red-500 mb-6 font-medium">You need to create at least one wallet before you can add a transaction.</p>
            <button onClick={() => router.push("/dashboard/settings")} className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700 shadow-sm">
              Go to Settings
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            
            {/* TABS */}
            <div className="flex border-b border-gray-100 p-2 gap-2 bg-gray-50">
              <button 
                onClick={() => setType("expense")}
                className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${type === 'expense' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Expense
              </button>
              <button 
                onClick={() => setType("income")}
                className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${type === 'income' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Income
              </button>
              <button 
                onClick={() => setType("transfer")}
                className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${type === 'transfer' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Transfer
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              
              {/* AMOUNT INPUT (MASSIVE) */}
              <div className="text-center">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Amount</label>
                <div className="flex items-center justify-center text-5xl font-black text-gray-900">
                  <span className={`mr-2 ${type === 'expense' ? 'text-red-500' : type === 'income' ? 'text-green-500' : 'text-blue-500'}`}>৳</span>
                  <input 
                    type="number" 
                    required 
                    autoFocus
                    min="1"
                    step="any"
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full max-w-[200px] bg-transparent outline-none text-center placeholder-gray-200 p-0 focus:ring-0 border-none"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* INCOME / EXPENSE FIELDS */}
              {type !== "transfer" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Wallet</label>
                      <select value={account} onChange={(e) => setAccount(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 font-bold text-gray-700 outline-none focus:border-blue-500 transition-colors">
                        {wallets.map(w => <option key={w.id} value={w.name}>{w.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Category</label>
                      <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 font-bold text-gray-700 outline-none focus:border-blue-500 transition-colors">
                        {(type === "expense" ? expenseCategories : incomeCategories).map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* TRANSFER FIELDS */}
              {type === "transfer" && (
                <div className="space-y-4 bg-blue-50/50 p-4 rounded-2xl border border-blue-50">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">From Wallet</label>
                      <select value={fromAccount} onChange={(e) => setFromAccount(e.target.value)} className="w-full bg-white border border-blue-100 rounded-2xl p-4 font-bold text-gray-700 outline-none focus:border-blue-500">
                        {wallets.map(w => <option key={w.id} value={w.name}>{w.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">To Wallet</label>
                      <select value={toAccount} onChange={(e) => setToAccount(e.target.value)} className="w-full bg-white border border-blue-100 rounded-2xl p-4 font-bold text-gray-700 outline-none focus:border-blue-500">
                        {wallets.map(w => <option key={w.id} value={w.name}>{w.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">Transfer Fee (Optional)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-4 text-gray-400 font-bold">৳</span>
                      <input 
                        type="number" 
                        min="0"
                        step="any"
                        value={transferFee} 
                        onChange={(e) => setTransferFee(e.target.value)}
                        className="w-full bg-white border border-blue-100 rounded-2xl pl-8 pr-4 py-4 font-bold text-gray-700 outline-none focus:border-blue-500"
                        placeholder="e.g., 5"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* COMMON FIELDS: DATE & DESCRIPTION */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-100 pt-6">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Date</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 font-bold text-gray-700 outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Note (Optional)</label>
                  <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 font-bold text-gray-700 outline-none focus:border-blue-500 placeholder-gray-400" placeholder="What was this for?" />
                </div>
              </div>

              {/* SUBMIT BUTTON */}
              <button 
                type="submit" 
                disabled={loading}
                className={`w-full py-4 rounded-2xl font-black text-white text-lg shadow-sm transition-all ${
                  loading ? 'bg-gray-400 cursor-not-allowed' : 
                  type === 'expense' ? 'bg-red-600 hover:bg-red-700 hover:shadow-md' : 
                  type === 'income' ? 'bg-green-600 hover:bg-green-700 hover:shadow-md' : 
                  'bg-blue-600 hover:bg-blue-700 hover:shadow-md'
                }`}
              >
                {loading ? "Saving to Vault..." : `Save ${type.charAt(0).toUpperCase() + type.slice(1)}`}
              </button>

            </form>
          </div>
        )}
      </div>
    </div>
  );
}