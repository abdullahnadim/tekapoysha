"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";

interface Debt {
  id: string;
  person: string;
  type: "payable" | "receivable";
  totalAmount: number;
  amountPaid: number;
  dueDate: string;
}

export default function DebtsPage() {
  const { user } = useAuth();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [paymentDebtId, setPaymentDebtId] = useState<string | null>(null);
  
  // Form States
  const [newDebt, setNewDebt] = useState({ person: "", type: "receivable", totalAmount: "", dueDate: "" });
  const [paymentAmount, setPaymentAmount] = useState("");

  // --- REAL-TIME FIREBASE CONNECTION ---
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "debts"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedDebts: Debt[] = [];
      snapshot.forEach((doc) => fetchedDebts.push({ id: doc.id, ...doc.data() } as Debt));
      setDebts(fetchedDebts);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  // --- SAFE CALCULATIONS (Protects against old database records) ---
  const totalReceivable = debts.filter(d => d.type === "receivable").reduce((sum, d) => sum + ((Number(d.totalAmount) || 0) - (Number(d.amountPaid) || 0)), 0);
  const totalPayable = debts.filter(d => d.type === "payable").reduce((sum, d) => sum + ((Number(d.totalAmount) || 0) - (Number(d.amountPaid) || 0)), 0);

  // --- HANDLERS ---
  const handleCreateDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await addDoc(collection(db, "debts"), {
        ...newDebt,
        totalAmount: Number(newDebt.totalAmount),
        amountPaid: 0,
        userId: user.uid,
      });
      setIsCreateOpen(false);
      setNewDebt({ person: "", type: "receivable", totalAmount: "", dueDate: "" });
    } catch (error) {
      console.error("Error creating record:", error);
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetDebt = debts.find(d => d.id === paymentDebtId);
    if (!targetDebt || !paymentDebtId) return;

    try {
      const debtRef = doc(db, "debts", paymentDebtId);
      const currentPaid = Number(targetDebt.amountPaid) || 0;
      await updateDoc(debtRef, {
        amountPaid: currentPaid + Number(paymentAmount)
      });
      setPaymentDebtId(null);
      setPaymentAmount("");
    } catch (error) {
      console.error("Error adding payment:", error);
    }
  };

  const handleDeleteDebt = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    try {
      await deleteDoc(doc(db, "debts", id));
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  if (loading) return <div className="p-8 animate-pulse text-gray-500">Loading ledger...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex justify-between items-center bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-3xl font-black text-gray-900">Debt Control</h1>
            <p className="text-gray-500 mt-1 font-medium">Track partial payments and clear your ledgers.</p>
          </div>
          <button onClick={() => setIsCreateOpen(true)} className="px-6 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-colors shadow-sm">
            + Add Record
          </button>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-green-50/50 p-6 rounded-3xl border border-green-100">
            <h3 className="text-sm font-bold text-green-800 mb-1">People Owe You (Receivable)</h3>
            <p className="text-3xl font-black text-green-600">৳ {totalReceivable.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-red-50/50 p-6 rounded-3xl border border-red-100">
            <h3 className="text-sm font-bold text-red-800 mb-1">You Owe (Payable)</h3>
            <p className="text-3xl font-black text-red-600">৳ {totalPayable.toLocaleString('en-IN')}</p>
          </div>
        </div>

        {/* DEBT GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {debts.map((debt) => {
            // SAFE FALLBACKS FOR OLD DATA
            const isReceivable = debt.type === "receivable";
            const paid = Number(debt.amountPaid) || 0;
            const total = Number(debt.totalAmount) || 0;
            const progress = total > 0 ? Math.min((paid / total) * 100, 100) : 0;

            return (
              <div key={debt.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between group hover:shadow-md transition-all">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{debt.person}</h2>
                      <span className={`inline-block mt-1 text-xs font-bold px-3 py-1 rounded-full ${isReceivable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {isReceivable ? 'THEY OWE YOU' : 'YOU OWE THEM'}
                      </span>
                    </div>
                    <button onClick={() => handleDeleteDebt(debt.id)} className="p-2 text-gray-300 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100">
                      🗑
                    </button>
                  </div>

                  <div className="mb-2">
                    <p className="text-3xl font-black text-gray-900">৳ {paid.toLocaleString('en-IN')}</p>
                    <p className="text-sm text-gray-500 font-medium mt-1">paid of ৳ {total.toLocaleString('en-IN')}</p>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-100 rounded-full h-3 mb-2 mt-5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${isReceivable ? 'bg-green-500' : 'bg-red-500'}`} 
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs font-bold mb-6">
                    <span className="text-gray-400">Due: {debt.dueDate ? new Date(debt.dueDate).toLocaleDateString('en-GB') : 'N/A'}</span>
                    <span className={isReceivable ? 'text-green-600' : 'text-red-600'}>{Math.round(progress)}% Settled</span>
                  </div>
                </div>

                {progress >= 100 && total > 0 ? (
                  <div className="w-full py-3 bg-gray-100 text-gray-500 font-bold rounded-xl text-center">
                    Fully Settled ✓
                  </div>
                ) : (
                  <button 
                    onClick={() => setPaymentDebtId(debt.id)}
                    className="w-full py-3 border-2 border-gray-100 text-gray-700 font-bold rounded-xl hover:border-gray-900 hover:text-gray-900 transition-colors"
                  >
                    Log Partial Payment
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* --- CREATE MODAL --- */}
        {isCreateOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
              <h2 className="text-2xl font-bold mb-6 text-gray-900">Add Debt Record</h2>
              <form onSubmit={handleCreateDebt} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Who is involved?</label>
                  <input type="text" required value={newDebt.person} onChange={e => setNewDebt({...newDebt, person: e.target.value})} className="w-full rounded-xl border bg-gray-50 px-4 py-3 outline-none" placeholder="Name" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Record Type</label>
                  <select value={newDebt.type} onChange={e => setNewDebt({...newDebt, type: e.target.value as any})} className="w-full rounded-xl border bg-gray-50 px-4 py-3 outline-none">
                    <option value="receivable">They owe me money (Receivable)</option>
                    <option value="payable">I owe them money (Payable)</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Total Amount</label>
                    <input type="number" required value={newDebt.totalAmount} onChange={e => setNewDebt({...newDebt, totalAmount: e.target.value})} className="w-full rounded-xl border bg-gray-50 px-4 py-3 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Due Date</label>
                    <input type="date" required value={newDebt.dueDate} onChange={e => setNewDebt({...newDebt, dueDate: e.target.value})} className="w-full rounded-xl border bg-gray-50 px-4 py-3 outline-none" />
                  </div>
                </div>
                <div className="flex gap-4 mt-6">
                  <button type="button" onClick={() => setIsCreateOpen(false)} className="flex-1 py-3 bg-gray-100 font-bold rounded-xl">Cancel</button>
                  <button type="submit" className="flex-1 py-3 bg-gray-900 text-white font-bold rounded-xl">Create</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* --- ADD PAYMENT MODAL --- */}
        {paymentDebtId && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl">
              <h2 className="text-2xl font-bold mb-6 text-gray-900">Log Payment</h2>
              <p className="text-sm text-gray-500 mb-4">How much was paid back?</p>
              <form onSubmit={handleAddPayment} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Amount (৳)</label>
                  <input type="number" required value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} className="w-full rounded-xl border bg-gray-50 px-4 py-3 outline-none text-xl font-bold" placeholder="0" />
                </div>
                <div className="flex gap-4 mt-6">
                  <button type="button" onClick={() => setPaymentDebtId(null)} className="flex-1 py-3 bg-gray-100 font-bold rounded-xl">Cancel</button>
                  <button type="submit" className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl">Save Payment</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}