export interface Transaction {
  id?: string;
  userId: string;
  amount: number | string;
  date: any; 
  description?: string;
  
  // Update these to make them optional (?) since a transfer doesn't use them
  account?: string;
  category?: string;
  
  // Add our new fields!
  type: "income" | "expense" | "transfer";
  fromAccount?: string;
  toAccount?: string;
}