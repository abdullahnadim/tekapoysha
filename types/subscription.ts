export interface Subscription {
  id?: string;
  userId: string;
  name: string;
  amount: number;
  billingCycle: 'monthly' | 'yearly';
  nextBillingDate: string;
  walletId: string;
  walletName: string;
  isCreditCard: boolean;
  category: string;
  status: 'active' | 'paused';
  createdAt?: any;
}