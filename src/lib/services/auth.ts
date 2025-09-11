import { mockUser, User } from '@/lib/mockData';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials extends LoginCredentials {
  displayName: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
}

/**
 * Mock authentication service
 * TODO: Replace with real authentication when backend is integrated
 */
export class AuthService {
  private static instance: AuthService;
  private currentUser: User | null = null;

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock validation
    if (credentials.email === 'user@example.com' && credentials.password === 'password') {
      this.currentUser = mockUser;
      localStorage.setItem('spotify_user', JSON.stringify(mockUser));
      return { success: true, user: mockUser };
    }

    return { success: false, error: 'Invalid credentials' };
  }

  async signup(credentials: SignupCredentials): Promise<AuthResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock user creation
    const newUser: User = {
      ...mockUser,
      displayName: credentials.displayName,
      email: credentials.email,
    };

    this.currentUser = newUser;
    localStorage.setItem('spotify_user', JSON.stringify(newUser));
    return { success: true, user: newUser };
  }

  async logout(): Promise<void> {
    this.currentUser = null;
    localStorage.removeItem('spotify_user');
  }

  getCurrentUser(): User | null {
    if (this.currentUser) return this.currentUser;

    // Try to restore from localStorage
    const stored = localStorage.getItem('spotify_user');
    if (stored) {
      this.currentUser = JSON.parse(stored);
      return this.currentUser;
    }

    return null;
  }

  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  }
}
