"use client";

import { useEffect, useState } from "react";
import LoadingShield from "@/components/ui/LoadingShield";
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
  phone?: string;  // NEW: Added for WhatsApp
  reason?: string; // NEW: Added for context
}

export default function DebtsPage() {
  const { user } = useAuth();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [paymentDebtId, setPaymentDebtId] = useState<string | null>(null);
  
  // Form States (Updated with phone and reason)
  const [newDebt, setNewDebt] = useState({ person: "", type: "receivable", totalAmount: "", dueDate: "", phone: "", reason: "" });
  const [paymentAmount, setPaymentAmount] = useState("");
  
  const [debtAccount, setDebtAccount] = useState("Cash");
  const [paymentAccount, setPaymentAccount] = useState("Cash");
  const [syncToDashboard, setSyncToDashboard] = useState(true);

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

  // --- SAFE CALCULATIONS ---
  const totalReceivable = debts.filter(d => d.type === "receivable").reduce((sum, d) => sum + ((Number(d.totalAmount) || 0) - (Number(d.amountPaid) || 0)), 0);
  const totalPayable = debts.filter(d => d.type === "payable").reduce((sum, d) => sum + ((Number(d.totalAmount) || 0) - (Number(d.amountPaid) || 0)), 0);

  // --- WHATSAPP GENERATOR ---
  const sendWhatsApp = (debt: Debt) => {
    if (!debt.phone) return alert("Please edit this record and add a phone number first!");
    
    let cleanPhone = debt.phone.replace(/[^0-9+]/g, '');
    if (!cleanPhone.startsWith('+880') && cleanPhone.startsWith('01')) {
      cleanPhone = '+88' + cleanPhone; 
    }
    
    const remainingAmount = debt.totalAmount - debt.amountPaid;
    const reasonText = debt.reason ? ` for ${debt.reason}` : '';
    const message = `Hey ${debt.person} Chomu! ei ৳${remainingAmount.toLocaleString()} pending${reasonText}. taka ta kobe dibi?`;
    
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

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

      if (syncToDashboard) {
        await addDoc(collection(db, "transactions"), {
          userId: user.uid,
          amount: Number(newDebt.totalAmount),
          type: newDebt.type === "payable" ? "income" : "expense",
          category: newDebt.type === "payable" ? "Loan Received" : "Loan Given",
          account: debtAccount,
          date: new Date(),
          description: `Debt record: ${newDebt.person}${newDebt.reason ? ` (${newDebt.reason})` : ''}`
        });
      }

      setIsCreateOpen(false);
      setNewDebt({ person: "", type: "receivable", totalAmount: "", dueDate: "", phone: "", reason: "" });
      setSyncToDashboard(true);
    } catch (error) {
      console.error("Error creating record:", error);
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const targetDebt = debts.find(d => d.id === paymentDebtId);
    if (!targetDebt || !paymentDebtId) return;

    try {
      const debtRef = doc(db, "debts", paymentDebtId);
      const currentPaid = Number(targetDebt.amountPaid) || 0;
      await updateDoc(debtRef, { amountPaid: currentPaid + Number(paymentAmount) });

      await addDoc(collection(db, "transactions"), {
        userId: user.uid,
        amount: Number(paymentAmount),
        type: targetDebt.type === "payable" ? "expense" : "income",
        category: targetDebt.type === "payable" ? "Debt Repayment" : "Debt Collected",
        account: paymentAccount,
        date: new Date(),
        description: `Payment to/from ${targetDebt.person}`
      });

      setPaymentDebtId(null);
      setPaymentAmount("");
    } catch (error) {
      console.error("Error adding payment:", error);
    }
  };

  const handleDeleteDebt = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this record? (Note: Related transactions on the dashboard must be deleted manually)")) return;
    try {
      await deleteDoc(doc(db, "debts", id));
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  if (loading) return <LoadingShield text="Calculating Debts..." />;

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
            const isReceivable = debt.type === "receivable";
            const paid = Number(debt.amountPaid) || 0;
            const total = Number(debt.totalAmount) || 0;
            const remaining = total - paid;
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
                      {debt.reason && <p className="text-xs text-gray-500 mt-2 font-medium">Reason: {debt.reason}</p>}
                    </div>
                    <button onClick={() => handleDeleteDebt(debt.id)} className="p-2 text-gray-300 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100">
                      🗑
                    </button>
                  </div>

                  <div className="mb-2">
                    <p className="text-3xl font-black text-gray-900">৳ {paid.toLocaleString('en-IN')}</p>
                    <p className="text-sm text-gray-500 font-medium mt-1">paid of ৳ {total.toLocaleString('en-IN')}</p>
                  </div>

                  <div className="w-full bg-gray-100 rounded-full h-3 mb-2 mt-5 overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-1000 ease-out ${isReceivable ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${progress}%` }}></div>
                  </div>
                  <div className="flex justify-between text-xs font-bold mb-6">
                    <span className="text-gray-400">Due: {debt.dueDate ? new Date(debt.dueDate).toLocaleDateString('en-GB') : 'N/A'}</span>
                    <span className={isReceivable ? 'text-green-600' : 'text-red-600'}>{Math.round(progress)}% Settled</span>
                  </div>
                </div>

                {progress >= 100 && total > 0 ? (
                  <div className="w-full py-3 bg-gray-100 text-gray-500 font-bold rounded-xl text-center">Fully Settled ✓</div>
                ) : (
                  <div className="flex gap-2 mt-2">
                    {/* NEW: WhatsApp Remind Button */}
                    {isReceivable && remaining > 0 && debt.phone && (
                      <button 
                        onClick={() => sendWhatsApp(debt)}
                        className="px-4 py-3 bg-green-50 text-green-700 font-bold rounded-xl hover:bg-green-100 border border-green-200 transition-colors"
                        title="Send WhatsApp Reminder"
                      >
                        💬 Remind
                      </button>
                    )}
                    <button 
                      onClick={() => setPaymentDebtId(debt.id)} 
                      className="flex-1 py-3 border-2 border-gray-100 text-gray-700 font-bold rounded-xl hover:border-gray-900 hover:text-gray-900 transition-colors"
                    >
                      Log Partial Payment
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* --- CREATE MODAL --- */}
        {isCreateOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-6 text-gray-900">Add Debt Record</h2>
              <form onSubmit={handleCreateDebt} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Who is involved?</label>
                  <input type="text" required value={newDebt.person} onChange={e => setNewDebt({...newDebt, person: e.target.value})} className="w-full rounded-xl border bg-gray-50 px-4 py-3 outline-none" placeholder="Name" />
                </div>
                
                {/* NEW: Reason Field */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Reason (Optional)</label>
                  <input type="text" value={newDebt.reason} onChange={e => setNewDebt({...newDebt, reason: e.target.value})} className="w-full rounded-xl border bg-gray-50 px-4 py-3 outline-none" placeholder="e.g. Dinner, Rent" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Record Type</label>
                  <select value={newDebt.type} onChange={e => setNewDebt({...newDebt, type: e.target.value as any})} className="w-full rounded-xl border bg-gray-50 px-4 py-3 outline-none">
                    <option value="receivable">They owe me money (Lending / Expense)</option>
                    <option value="payable">I owe them money (Borrowing / Income)</option>
                  </select>
                </div>
                
                {/* NEW: Phone Field (Only shows if they owe you) */}
                {newDebt.type === "receivable" && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">WhatsApp Number (Optional)</label>
                    <input type="tel" value={newDebt.phone} onChange={e => setNewDebt({...newDebt, phone: e.target.value})} className="w-full rounded-xl border bg-gray-50 px-4 py-3 outline-none focus:border-green-500" placeholder="e.g. 017..." />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Total Amount</label>
                    <input type="number" required value={newDebt.totalAmount} onChange={e => setNewDebt({...newDebt, totalAmount: e.target.value})} className="w-full rounded-xl border bg-gray-50 px-4 py-3 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Select Account</label>
                    <select value={debtAccount} onChange={e => setDebtAccount(e.target.value)} className="w-full rounded-xl border bg-gray-50 px-4 py-3 outline-none">
                      <option value="Cash">Cash</option>
                      <option value="Bank">Bank</option>
                      <option value="bKash">bKash</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl mt-4 mb-4">
                  <input 
                    type="checkbox" 
                    id="syncCheck"
                    checked={syncToDashboard}
                    onChange={(e) => setSyncToDashboard(e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="syncCheck" className="text-sm font-bold text-blue-900 cursor-pointer">
                    Sync to Dashboard Balances
                    <span className="block text-xs font-medium text-blue-700 mt-0.5">Uncheck if you already spent this money previously.</span>
                  </label>
                </div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Due Date</label>
                  <input type="date" required value={newDebt.dueDate} onChange={e => setNewDebt({...newDebt, dueDate: e.target.value})} className="w-full rounded-xl border bg-gray-50 px-4 py-3 outline-none" />
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
              <form onSubmit={handleAddPayment} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Amount (৳)</label>
                  <input type="number" required value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} className="w-full rounded-xl border bg-gray-50 px-4 py-3 outline-none text-xl font-bold" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Account Used</label>
                  <select value={paymentAccount} onChange={e => setPaymentAccount(e.target.value)} className="w-full rounded-xl border bg-gray-50 px-4 py-3 outline-none">
                    <option value="Cash">Cash</option>
                    <option value="Bank">Bank</option>
                    <option value="bKash">bKash</option>
                  </select>
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