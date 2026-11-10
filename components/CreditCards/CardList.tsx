'use client';

import { useState, useEffect } from 'react';
import { Plus, CreditCard as CreditCardIcon, Loader2, CalendarClock, MoreVertical, CheckCircle2, Edit2, Trash2 } from 'lucide-react';
import { getUserCreditCards } from '@/lib/services/creditCardService';
import { useAuth } from '@/components/auth/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { CreditCard } from '../../types/creditCard';
import { EMI } from '../../types/emi';
import CreditCardItem from './CreditCardItem';
import AddCardModal from './AddCardModal';
import AddEmiModal from './AddEmiModal';
import EditEmiModal from './EditEmiModal';

export default function CardList() {
  const { user } = useAuth();
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [emis, setEmis] = useState<EMI[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isEmiModalOpen, setIsEmiModalOpen] = useState(false);
  
  // EMI Management States
  const [openEmiMenuId, setOpenEmiMenuId] = useState<string | null>(null);
  const [emiToEdit, setEmiToEdit] = useState<EMI | null>(null);

  const fetchData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const fetchedCards = await getUserCreditCards(user.uid);
      setCards(fetchedCards);

      const q = query(collection(db, "emis"), where("userId", "==", user.uid), where("status", "==", "active"));
      const snapshot = await getDocs(q);
      const fetchedEmis = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EMI));
      
      setEmis(fetchedEmis.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()));
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    } else {
      setCards([]);
      setEmis([]);
      setIsLoading(false);
    }
  }, [user]);

  // Log an Installment Payment
  const handlePayEmi = async (emi: EMI) => {
    if (!user || !emi.id) return;
    
    if (!window.confirm(`Log payment of ৳${emi.monthlyAmount.toLocaleString('en-IN')} for your ${emi.itemName} EMI?`)) return;

    try {
      const newMonthsPaid = emi.monthsPaid + 1;
      const status = newMonthsPaid >= emi.totalMonths ? 'completed' : 'active'; // TYPO FIXED HERE

      await updateDoc(doc(db, "emis", emi.id), { 
        monthsPaid: newMonthsPaid, 
        status 
      });

      await addDoc(collection(db, "transactions"), {
        userId: user.uid,
        type: "expense",
        amount: emi.monthlyAmount,
        category: "EMI Payment",
        description: `EMI: ${emi.itemName} (${newMonthsPaid}/${emi.totalMonths}) on ${emi.cardName}`,
        date: new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp(),
      });

      fetchData(); 
    } catch (error) {
      console.error("Error logging EMI payment:", error);
      alert("Failed to process the EMI payment.");
    }
  };

  // Mark EMI as Completed manually
  const handleCompleteEmi = async (emi: EMI) => {
    if (!window.confirm(`Mark ${emi.itemName} as fully completed?`)) return;
    try {
      await updateDoc(doc(db, "emis", emi.id!), { status: 'completed' });
      fetchData();
    } catch (error) {
      console.error("Error completing EMI:", error);
    }
  };

  // Delete EMI Record
  const handleDeleteEmi = async (emi: EMI) => {
    if (!window.confirm(`Delete the EMI for ${emi.itemName}? This removes the tracker, but past payment logs remain in your dashboard.`)) return;
    try {
      await deleteDoc(doc(db, "emis", emi.id!));
      fetchData();
    } catch (error) {
      console.error("Error deleting EMI:", error);
    }
  };

  return (
    <div className="w-full space-y-12">
      
      {/* --- CREDIT CARDS SECTION --- */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">My Credit Cards</h2>
            <p className="text-sm text-gray-500 mt-1">Manage your limits, balances, and credit utilization</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsEmiModalOpen(true)}
              disabled={cards.length === 0}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 font-bold rounded-xl shadow-sm hover:shadow transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CalendarClock className="w-5 h-5" />
              Log EMI
            </button>
            <button
              onClick={() => setIsCardModalOpen(true)}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95"
            >
              <Plus className="w-5 h-5" />
              Add Card
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 animate-pulse">
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex flex-col gap-3">
                <div className="w-full max-w-sm aspect-[1.58/1] bg-gray-200 rounded-2xl"></div>
                <div className="h-2 w-full max-w-sm bg-gray-200 rounded-full mt-2"></div>
              </div>
            ))}
          </div>
        ) : cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-white border-2 border-dashed border-gray-200 rounded-3xl text-center shadow-sm">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
              <CreditCardIcon className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">No cards found</h3>
            <p className="text-gray-500 font-medium mb-6 max-w-sm leading-relaxed">
              You haven't added any credit cards yet. Add your first card to start tracking your spending and utilization.
            </p>
            <button
              onClick={() => setIsCardModalOpen(true)}
              className="px-6 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold rounded-lg shadow-sm transition-colors"
            >
              Add Your First Card
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-10">
            {cards.map((card) => (
              <CreditCardItem key={card.id} card={card} onRefresh={fetchData} />
            ))}
          </div>
        )}
      </div>

      {/* --- ACTIVE EMIs SECTION --- */}
      {emis.length > 0 && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-2 mb-6">
            <CalendarClock className="w-6 h-6 text-blue-600" />
            <h3 className="text-xl font-bold text-gray-900">Active EMIs</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {emis.map((emi) => {
              const progress = (emi.monthsPaid / emi.totalMonths) * 100;
              
              return (
                <div key={emi.id} className="relative bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-5 hover:shadow-md transition-shadow">
                  
                  {/* EMI 3-Dot Options Menu */}
                  <div className="absolute top-4 right-3 z-20">
                    <button 
                      onClick={() => setOpenEmiMenuId(openEmiMenuId === emi.id ? null : emi.id!)} 
                      className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-700"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                    
                    {openEmiMenuId === emi.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setOpenEmiMenuId(null)}></div>
                        <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-xl z-20 overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95">
                          <button onClick={() => { setOpenEmiMenuId(null); setEmiToEdit(emi); }} className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                            <Edit2 className="w-4 h-4" /> Edit EMI
                          </button>
                          <button onClick={() => { setOpenEmiMenuId(null); handleCompleteEmi(emi); }} className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-green-600 hover:bg-green-50 transition-colors border-t border-gray-50">
                            <CheckCircle2 className="w-4 h-4" /> Mark Completed
                          </button>
                          <button onClick={() => { setOpenEmiMenuId(null); handleDeleteEmi(emi); }} className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors border-t border-gray-50">
                            <Trash2 className="w-4 h-4" /> Delete EMI
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex justify-between items-start pr-8">
                    <div>
                      <h4 className="font-bold text-gray-900 text-lg leading-tight">{emi.itemName}</h4>
                      <p className="text-xs text-gray-500 font-bold mt-1 uppercase tracking-wider">{emi.cardName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-blue-600">৳ {emi.monthlyAmount.toLocaleString('en-IN')}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Per Month</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold text-gray-500 mb-2">
                      <span>{emi.monthsPaid} Paid</span>
                      <span>{emi.totalMonths} Total</span>
                    </div>
                    <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-600 transition-all duration-500 ease-out" 
                        style={{ width: `${progress}%` }} 
                      />
                    </div>
                  </div>

                  <button 
                    onClick={() => handlePayEmi(emi)}
                    className="w-full py-3 bg-gray-900 hover:bg-black text-white text-sm font-bold rounded-xl transition-all active:scale-95 shadow-sm"
                  >
                    Log Installment
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- HIDDEN MODALS --- */}
      <AddCardModal isOpen={isCardModalOpen} onClose={() => setIsCardModalOpen(false)} onSuccess={fetchData} />
      <AddEmiModal isOpen={isEmiModalOpen} onClose={() => setIsEmiModalOpen(false)} onSuccess={fetchData} cards={cards} />
      {emiToEdit && (
        <EditEmiModal 
          isOpen={!!emiToEdit} 
          onClose={() => setEmiToEdit(null)} 
          onSuccess={fetchData} 
          emi={emiToEdit} 
          cards={cards} 
        />
      )}
    </div>
  );
}