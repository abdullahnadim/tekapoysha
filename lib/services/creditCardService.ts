import { db } from '@/lib/firebase/config';
import { collection, addDoc, getDocs, query, where, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { CreditCard } from '../../types/creditCard';

const COLLECTION_NAME = "creditCards";

// Add a new credit card
export const addCreditCard = async (cardData: Omit<CreditCard, 'id'>) => {
  const cardsRef = collection(db, COLLECTION_NAME);
  const docRef = await addDoc(cardsRef, cardData);
  return { id: docRef.id, ...cardData };
};

// Fetch all cards for the logged-in user
export const getUserCreditCards = async (userId: string) => {
  const cardsRef = collection(db, COLLECTION_NAME);
  const q = query(cardsRef, where("userId", "==", userId));
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as CreditCard[];
};

// Update card balance (when a user logs a transaction)
export const updateCardBalance = async (cardId: string, newBalance: number) => {
  const cardRef = doc(db, COLLECTION_NAME, cardId);
  await updateDoc(cardRef, { currentBalance: newBalance });
};

export const updateCreditCard = async (cardId: string, updates: Partial<CreditCard>) => {
  const cardRef = doc(db, COLLECTION_NAME, cardId);
  await updateDoc(cardRef, updates);
};

// Delete a credit card
export const deleteCreditCard = async (cardId: string) => {
  const cardRef = doc(db, COLLECTION_NAME, cardId);
  await deleteDoc(cardRef);
};