export interface EMI {
  id?: string;
  userId: string;
  cardId: string;
  cardName: string; 
  itemName: string;
  totalAmount: number;
  monthlyAmount: number;
  totalMonths: number;
  monthsPaid: number;
  startDate: string;
  status: 'active' | 'completed';
  createdAt?: any;
}