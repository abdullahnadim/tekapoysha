export interface CreditCard {
  id?: string;
  userId: string;
  cardName: string;
  network: 'Visa' | 'Mastercard' | 'Amex' | 'Discover' | 'Other';
  lastFourDigits: string;
  creditLimit: number;
  currentBalance: number;
  statementDay: number;
  dueDay: number;
  colorTheme?: string;
  createdAt?: any;
  updatedAt?: any;
}