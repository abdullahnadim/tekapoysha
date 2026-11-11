"use client";

import { useEffect, useState } from "react";
import { Plus, Repeat, Trash2, CheckCircle2, RotateCw, Clock, AlertCircle, CalendarX2, Hourglass } from "lucide-react";
import { useAuth } from "@/components/auth/AuthContext";
import { db } from "@/lib/firebase/config";
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, addDoc, serverTimestamp, increment } from "firebase/firestore";
import LoadingShield from "@/components/ui/LoadingShield";
import AddSubscriptionModal from "@/components/Subscriptions/AddSubscriptionModal";

// Local interface merging your original type with the new optional endDate
interface Subscription {
  id?: string;
  userId: string;
  name: string;
  amount: number;
  billingCycle: 'monthly' | 'yearly';
  nextBillingDate: string;
  endDate?: string; 
  walletId: string;
  walletName: string;
  isCreditCard: boolean;
  category: string;
  status: 'active' | 'paused' | 'ended';
  createdAt?: any;
}

interface WalletOption {
  id: string;
  name: string;
  isCreditCard: boolean;
}

export default function SubscriptionsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [wallets, setWallets] = useState<WalletOption[]>([]);

  useEffect(() => {
    if (!user) return;

    // 1. Fetch Subscriptions
    const subQ = query(collection(db, "subscriptions"), where("userId", "==", user.uid));
    const unsubSubs = onSnapshot(subQ, (snapshot) => {
      const fetched = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Subscription));
      setSubscriptions(fetched.sort((a, b) => new Date(a.nextBillingDate).getTime() - new Date(b.nextBillingDate).getTime()));
      setLoading(false);
    });

    // 2. Fetch Accounts
    const qWallets = query(collection(db, "paymentMethods"), where("userId", "==", user.uid));
    const qCards = query(collection(db, "creditCards"), where("userId", "==", user.uid));
    
    const unsubWallets = onSnapshot(qWallets, (snap) => {
      const wData = snap.docs.map(d => ({ id: d.id, name: d.data().name, isCreditCard: false }));
      setWallets(prev => [...prev.filter(p => p.isCreditCard), ...wData]);
    });
    
    const unsubCards = onSnapshot(qCards, (snap) => {
      const cData = snap.docs.map(d => ({ id: d.id, name: d.data().cardName, isCreditCard: true }));
      setWallets(prev => [...prev.filter(p => !p.isCreditCard), ...cData]);
    });

    return () => { unsubSubs(); unsubWallets(); unsubCards(); };
  }, [user]);

  // Total Overhead (Excluding ended or free subs)
  const monthlyOverhead = subscriptions.reduce((sum, sub) => {
    if (sub.status !== 'active' || sub.amount === 0) return sum;
    return sum + (sub.billingCycle === 'yearly' ? sub.amount / 12 : sub.amount);
  }, 0);

  const handleLogPayment = async (sub: Subscription) => {
    if (!user || !sub.id) return;
    
    const isFree = sub.amount === 0;
    const confirmMsg = isFree 
      ? `Renew free cycle for ${sub.name}?`
      : `Log payment of ৳${sub.amount.toLocaleString('en-IN')} for ${sub.name}?`;
      
    if (!window.confirm(confirmMsg)) return;

    try {
      const currentDate = new Date(sub.nextBillingDate);
      if (sub.billingCycle === 'yearly') {
        currentDate.setFullYear(currentDate.getFullYear() + 1);
      } else {
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
      const newDateStr = currentDate.toISOString().split('T')[0];

      // Check if this renewal pushes it past the End Date
      let newStatus = sub.status;
      if (sub.endDate && new Date(newDateStr) > new Date(sub.endDate)) {
        newStatus = 'ended';
      }

      await updateDoc(doc(db, "subscriptions", sub.id), {
        nextBillingDate: newDateStr,
        status: newStatus
      });

      if (!isFree) {
        await addDoc(collection(db, "transactions"), {
          userId: user.uid,
          type: "expense",
          amount: sub.amount,
          category: sub.category,
          account: sub.walletName,
          description: `Subscription: ${sub.name}`,
          date: new Date().toISOString().split('T')[0],
          createdAt: serverTimestamp(),
        });

        if (sub.isCreditCard && sub.walletId) {
          await updateDoc(doc(db, "creditCards", sub.walletId), {
            currentBalance: increment(sub.amount)
          });
        }
      }
    } catch (error) {
      console.error("Failed to process:", error);
      alert("Failed to process payment.");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete the subscription tracker for ${name}?`)) return;
    await deleteDoc(doc(db, "subscriptions", id));
  };

  if (loading) return <LoadingShield text="Loading Urgency Engine..." />;

  // --- URGENCY ENGINE HELPERS ---
  const getUrgencyData = (nextBillingDate: string, billingCycle: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextDate = new Date(nextBillingDate);
    nextDate.setHours(0, 0, 0, 0);
    
    // Days Remaining
    const diffTime = nextDate.getTime() - today.getTime();
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Calculate Cycle Progress %
    const lastDate = new Date(nextDate);
    if (billingCycle === 'yearly') lastDate.setFullYear(lastDate.getFullYear() - 1);
    else lastDate.setMonth(lastDate.getMonth() - 1);

    const totalCycleDays = (nextDate.getTime() - lastDate.getTime()) / (1000 * 3600 * 24);
    const daysPassed = (today.getTime() - lastDate.getTime()) / (1000 * 3600 * 24);
    let progress = (daysPassed / totalCycleDays) * 100;
    progress = Math.max(0, Math.min(progress, 100)); // Clamp between 0-100%

    // Assign Urgency Tiers
    let state = 'safe';
    let colorText = 'text-emerald-600';
    let colorBg = 'bg-emerald-500';
    let colorLightBg = 'bg-emerald-50';
    let statusText = `${daysLeft} days left`;

    if (daysLeft < 0) {
      state = 'overdue';
      colorText = 'text-red-600';
      colorBg = 'bg-red-500';
      colorLightBg = 'bg-red-50';
      statusText = `Overdue by ${Math.abs(daysLeft)} days`;
    } else if (daysLeft === 0) {
      state = 'today';
      colorText = 'text-orange-600';
      colorBg = 'bg-orange-500';
      colorLightBg = 'bg-orange-50';
      statusText = 'Due Today';
    } else if (daysLeft <= 5) {
      state = 'soon';
      colorText = 'text-amber-600';
      colorBg = 'bg-amber-500';
      colorLightBg = 'bg-amber-50';
    }

    return { daysLeft, progress, state, colorText, colorBg, colorLightBg, statusText };
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans pb-24">
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
        
        {/* HEADER WIDGET */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-gray-100">
          <div>
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
              <Repeat className="w-8 h-8 text-blue-600" /> Fixed Overhead
            </h2>
            <p className="text-gray-500 mt-2 font-medium">Your Urgency Engine for recurring subscriptions, AI tools, and bills.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-100/50 w-full sm:w-auto text-center sm:text-right">
              <p className="text-[10px] font-bold text-blue-800 uppercase tracking-widest mb-1">Total Monthly Cost</p>
              <p className="text-3xl font-black text-blue-600 leading-none">৳ {monthlyOverhead.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
            </div>
            
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-4 md:py-5 bg-gray-900 hover:bg-black text-white font-bold rounded-2xl shadow-md transition-all active:scale-95 whitespace-nowrap"
            >
              <Plus className="w-5 h-5" /> Add Tracker
            </button>
          </div>
        </div>

        {/* SUBSCRIPTION GRID */}
        {subscriptions.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[2rem] border border-dashed border-gray-200">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Repeat className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No active trackers</h3>
            <p className="text-gray-500 max-w-sm mx-auto">Add your first subscription to start managing your recurring costs and billing dates.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subscriptions.map((sub) => {
              const isFree = sub.amount === 0;
              const isEnded = sub.status === 'ended';
              
              const urgency = getUrgencyData(sub.nextBillingDate, sub.billingCycle);
              const cardOpacity = isEnded ? 'opacity-60 grayscale-[50%]' : 'opacity-100';

              return (
                <div key={sub.id} className={`bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col relative group transition-all hover:shadow-md ${cardOpacity}`}>
                  
                  {/* Delete Button (Hover Reveal on Desktop, always visible on Mobile) */}
                  <button 
                    onClick={() => handleDelete(sub.id!, sub.name)}
                    className="absolute top-5 right-5 p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors md:opacity-0 md:group-hover:opacity-100"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>

                  {/* Header: Title & Status Badge */}
                  <div className="pr-12 mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-black text-xl text-gray-900 truncate">{sub.name}</h4>
                      {isEnded && <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Ended</span>}
                    </div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{sub.category}</p>
                  </div>

                  {/* Money & Account Details */}
                  <div className="flex items-end justify-between mb-6">
                    <div>
                      {isFree ? (
                        <p className="text-3xl font-black text-emerald-500">Free</p>
                      ) : (
                        <p className="text-3xl font-black text-gray-900">৳ {sub.amount.toLocaleString('en-IN')}</p>
                      )}
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                        / {sub.billingCycle === 'yearly' ? 'Year' : 'Month'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Linked Account</p>
                      <p className="text-sm font-bold text-gray-700 bg-gray-50 border border-gray-100 px-2.5 py-1.5 rounded-lg flex items-center justify-end gap-1">
                        {sub.walletName} {sub.isCreditCard ? '💳' : ''}
                      </p>
                    </div>
                  </div>

                  {/* URGENCY ENGINE TIMELINE */}
                  {!isEnded && (
                    <div className="mb-6 space-y-2">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-gray-500 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> Cycle Progress
                        </span>
                        <span className={urgency.colorText}>{urgency.statusText}</span>
                      </div>
                      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${urgency.colorBg} transition-all duration-1000 ease-out`} 
                          style={{ width: `${urgency.progress}%` }} 
                        />
                      </div>
                    </div>
                  )}

                  {/* Date Meta Data */}
                  <div className="mt-auto grid grid-cols-2 gap-2 mb-4">
                    <div className={`p-3 rounded-xl flex items-center gap-2 ${isEnded ? 'bg-gray-50' : urgency.colorLightBg}`}>
                      {urgency.state === 'overdue' ? <AlertCircle className={`w-4 h-4 ${urgency.colorText}`} /> : <RotateCw className={`w-4 h-4 ${isEnded ? 'text-gray-400' : urgency.colorText}`} />}
                      <div>
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${isEnded ? 'text-gray-400' : urgency.colorText}`}>Renews</p>
                        <p className={`text-sm font-bold ${isEnded ? 'text-gray-500' : 'text-gray-800'}`}>
                          {new Date(sub.nextBillingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    
                    {sub.endDate ? (
                      <div className="bg-red-50/50 border border-red-100/50 p-3 rounded-xl flex items-center gap-2">
                        <CalendarX2 className="w-4 h-4 text-red-500" />
                        <div>
                          <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest">Ends On</p>
                          <p className="text-sm font-bold text-red-800">
                            {new Date(sub.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 p-3 rounded-xl flex items-center justify-center opacity-50">
                        <Hourglass className="w-4 h-4 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  {!isEnded && (
                    <button 
                      onClick={() => handleLogPayment(sub)}
                      className={`w-full py-4 text-sm font-black rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 ${
                        urgency.state === 'overdue' || urgency.state === 'today'
                          ? 'bg-gray-900 text-white shadow-md hover:bg-black' // Emphasize urgent items
                          : isFree 
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' 
                            : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                      }`}
                    >
                      {isFree ? (
                        <><CheckCircle2 className="w-5 h-5" /> Confirm Free Renewal</>
                      ) : (
                        <><CheckCircle2 className="w-5 h-5" /> Log Payment</>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      <AddSubscriptionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={() => setIsModalOpen(false)}
        wallets={wallets}
      />
    </div>
  );
}