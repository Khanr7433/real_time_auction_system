export interface User {
  id: string;
  email: string;
  displayName: string;
  role: 'user' | 'admin';
  avatar?: string;
  contactInfo?: string;
  isSuspended?: boolean;
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  message?: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, displayName: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUser: (updatedData: Partial<User>) => void;
}
