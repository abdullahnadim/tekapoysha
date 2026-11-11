export interface Budget {
  id?: string;
  userId: string;
  category: string;
  monthlyLimit: number;
  createdAt?: any;
}