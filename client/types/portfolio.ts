export type Portfolio = {
  _id: string;
  userId: string;
  name: string;
  description?: string;
  baseCurrency: "USD" | "INR";
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
};
