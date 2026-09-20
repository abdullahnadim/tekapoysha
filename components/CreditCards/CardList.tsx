'use client';

import { useState, useEffect } from 'react';
import { Plus, CreditCard as CreditCardIcon, Loader2 } from 'lucide-react';
import { getUserCreditCards } from '@/lib/services/creditCardService';
import { useAuth } from '@/components/auth/AuthContext';
import { CreditCard } from '../../types/creditCard';
import CreditCardItem from './CreditCardItem';
import AddCardModal from './AddCardModal';

export default function CardList() {
  const { user } = useAuth();
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch cards from Firestore
  const fetchCards = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const fetchedCards = await getUserCreditCards(user.uid);
      setCards(fetchedCards);
    } catch (error) {
      console.error("Error fetching cards:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Run the fetch when the component mounts or the user changes
  useEffect(() => {
    if (user) {
      fetchCards();
    } else {
      setCards([]);
      setIsLoading(false);
    }
  }, [user]);

  return (
    <div className="w-full">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">My Credit Cards</h2>
          <p className="text-sm text-gray-500 mt-1">Manage your limits, balances, and credit utilization</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Add New Card
        </button>
      </div>

      {/* State 1: Loading Skeleton */}
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
        
      /* State 2: Empty Dashboard */
        <div className="flex flex-col items-center justify-center p-12 bg-white border-2 border-dashed border-gray-200 rounded-3xl text-center shadow-sm">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
            <CreditCardIcon className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">No cards found</h3>
          <p className="text-gray-500 mb-6 max-w-sm leading-relaxed">
            You haven't added any credit cards yet. Add your first card to start tracking your spending and utilization.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-lg shadow-sm transition-colors"
          >
            Add Your First Card
          </button>
        </div>
      ) : (
        
      /* State 3: Populated Grid */
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-10">
          {cards.map((card) => (
            <CreditCardItem key={card.id} card={card} onRefresh={fetchCards} />
          ))}
        </div>
      )}

      {/* Hidden Modal Overlay */}
      <AddCardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchCards} // Re-fetches the database automatically after saving
      />
    </div>
  );
}