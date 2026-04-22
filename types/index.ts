export interface Transaction {
  id?: string;
  userId: string;
  type: "income" | "expense";
  amount: number;
  account: "Bank" | "Cash" | "bKash";
  category: string;
  description: string;
  date: Date;
  createdAt: Date;
}