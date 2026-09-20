'use client';

import { useState } from 'react';
import { CreditCard as CardType } from '../../types/creditCard';
import { Wifi, MoreVertical, Edit2, Trash2, CheckCircle2 } from 'lucide-react';
import { deleteCreditCard } from '@/lib/services/creditCardService';
import EditCardModal from './EditCardModal';
import PayBillModal from './PayBillModal';

interface CreditCardItemProps {
  card: CardType;
  onRefresh: () => void;
}

export default function CreditCardItem({ card, onRefresh }: CreditCardItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPayBillOpen, setIsPayBillOpen] = useState(false);

  const utilization = Math.min((card.currentBalance / card.creditLimit) * 100, 100);
  const isHighUtilization = utilization > 80;
  const isPaidOff = card.currentBalance <= 0;

  // Updated to support custom color themes with a fallback
  const getCardStyle = (card: CardType) => {
    if (card.colorTheme) return card.colorTheme;
    
    switch (card.network.toLowerCase()) {
      case 'visa': return 'from-blue-900 to-blue-600';
      case 'mastercard': return 'from-gray-900 to-gray-700';
      case 'amex': return 'from-emerald-900 to-emerald-600';
      case 'discover': return 'from-orange-700 to-orange-500';
      default: return 'from-slate-800 to-slate-600';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', minimumFractionDigits: 0 }).format(amount);
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${card.cardName}? Transactions made with this card will remain on your dashboard.`)) return;
    try {
      await deleteCreditCard(card.id!);
      onRefresh();
    } catch (err) {
      console.error("Failed to delete card:", err);
    }
  };

  return (
    <div className="flex flex-col gap-4 relative bg-white p-2 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      
      {/* THE PHYSICAL CARD */}
      <div className={`relative w-full aspect-[1.58/1] rounded-3xl p-4 sm:p-5 text-white shadow-lg bg-gradient-to-br overflow-hidden ${getCardStyle(card)}`}>
        <div className="absolute top-0 left-0 w-full h-full bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>

        {/* 3-Dot Options Menu */}
        <div className="absolute top-3 right-2 z-20">
          <button onClick={() => setShowMenu(!showMenu)} className="p-1.5 hover:bg-white/20 rounded-full transition-colors text-white">
            <MoreVertical className="w-5 h-5" />
          </button>
          
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)}></div>
              <div className="absolute right-0 mt-2 w-36 bg-white rounded-xl shadow-xl z-20 overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95">
                <button onClick={() => { setShowMenu(false); setIsEditOpen(true); }} className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  <Edit2 className="w-4 h-4" /> Edit Card
                </button>
                <button onClick={() => { setShowMenu(false); handleDelete(); }} className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors border-t border-gray-50">
                  <Trash2 className="w-4 h-4" /> Delete Card
                </button>
              </div>
            </>
          )}
        </div>

        <div className="relative z-10 flex flex-col justify-between h-full">
          <div className="flex justify-between items-start pr-6">
            <h3 className="font-semibold tracking-wide text-white/90 drop-shadow-sm truncate">{card.cardName}</h3>
            <span className="font-bold text-xl italic tracking-wider drop-shadow-md">{card.network}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-9 h-6 bg-gradient-to-br from-yellow-200 to-yellow-500 rounded flex items-center justify-center opacity-90 shadow-inner">
              <div className="w-5 h-3 border border-yellow-700/30 rounded-sm"></div>
            </div>
            <Wifi className="w-5 h-5 text-white/60 rotate-90" />
          </div>
          <div className="mt-auto">
            <p className="font-mono text-base tracking-[0.2em] text-white/80 mb-1">•••• •••• •••• {card.lastFourDigits}</p>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[10px] text-white/60 uppercase tracking-wider mb-0.5">Current Balance</p>
                <p className="text-xl sm:text-2xl font-bold drop-shadow-sm leading-none">{formatCurrency(card.currentBalance)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-white/60 uppercase tracking-wider mb-0.5">Limit</p>
                <p className="text-sm font-medium leading-none">{formatCurrency(card.creditLimit)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* LOWER CONTROLS (Utilization & Pay Action) */}
      <div className="px-2 pb-2">
        <div className="flex justify-between items-end mb-3">
          <div className="flex-1 pr-4">
            <div className="flex justify-between text-xs font-bold text-gray-500 mb-1.5">
              <span>Used</span>
              <span className={isHighUtilization ? 'text-red-500' : 'text-blue-600'}>{utilization.toFixed(1)}%</span>
            </div>
            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full transition-all duration-500 ease-out rounded-full ${isHighUtilization ? 'bg-red-500' : 'bg-blue-600'}`} style={{ width: `${utilization}%` }} />
            </div>
          </div>
          
          <button 
            onClick={() => setIsPayBillOpen(true)}
            disabled={isPaidOff}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all ${
              isPaidOff 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
              : 'bg-gray-900 text-white hover:bg-black hover:shadow-md active:scale-95'
            }`}
          >
            {isPaidOff ? <CheckCircle2 className="w-4 h-4" /> : null}
            {isPaidOff ? 'Paid Off' : 'Pay Bill'}
          </button>
        </div>
      </div>

      <EditCardModal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} onSuccess={onRefresh} card={card} />
      <PayBillModal isOpen={isPayBillOpen} onClose={() => setIsPayBillOpen(false)} onSuccess={onRefresh} card={card} />
    </div>
  );
}