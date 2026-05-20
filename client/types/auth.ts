export type User = {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  createdAt?: string;
};

export type AuthPayload = {
  user: User;
  csrfToken?: string;
};
