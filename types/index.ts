export interface Transaction {
  id?: string;
  userId: string;
  type: "income" | "expense";
  amount: number;
  account: "Bank" | "Cash" | "bKash" | "Metro" | "Savings"; // Added your other accounts here too!
  category: string;
  description: string;
  date: any; // Using any here allows us to handle the Firebase Timestamp object
  createdAt: any;
}