import { supabase } from '../supabaseClient';
import { AuthError, Session, User } from '@supabase/supabase-js';

export interface SignUpData {
  email: string;
  password: string;
  displayName: string;
  dateOfBirth?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  session?: Session;
  error?: string;
}

export class AuthService {
  private static instance: AuthService;

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Sign up a new user with Supabase
   */
  async signup(data: SignUpData): Promise<AuthResult> {
    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            display_name: data.displayName,
            date_of_birth: data.dateOfBirth,
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!authData.user) {
        return { success: false, error: 'Signup failed' };
      }

      return {
        success: true,
        user: authData.user,
        session: authData.session || undefined,
      };
    } catch (error: any) {
      return { success: false, error: error.message || 'Signup failed' };
    }
  }

  /**
   * Log in an existing user
   */
  async login(data: LoginData): Promise<AuthResult> {
    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!authData.user) {
        return { success: false, error: 'Login failed' };
      }

      return {
        success: true,
        user: authData.user,
        session: authData.session || undefined,
      };
    } catch (error: any) {
      return { success: false, error: error.message || 'Login failed' };
    }
  }

  /**
   * Log out the current user
   */
  async logout(): Promise<void> {
    try {
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Clear all local storage data
      if (typeof window !== 'undefined') {
        // Clear auth-related data
        localStorage.removeItem('detected_mood');
        localStorage.removeItem('auto_mood_last_detection');
        localStorage.removeItem('detected_mood_history');
        
        // Clear cached music data
        const moods = ['happy', 'sad', 'angry', 'calm', 'energetic', 'neutral', 'fear', 'surprise', 'disgust'];
        moods.forEach(mood => {
          localStorage.removeItem(`cached_recommendations_${mood}`);
        });
        localStorage.removeItem('cached_trending');
        localStorage.removeItem('cached_recent');
        
        // Clear session storage
        sessionStorage.clear();
        
        console.log('✅ Logout complete - all data cleared');
      }
    } catch (error) {
      console.error('❌ Logout error:', error);
      throw error;
    }
  }

  /**
   * Get the current user
   */
  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }

  /**
   * Get the current session
   */
  async getSession(): Promise<Session | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const session = await this.getSession();
    return !!session;
  }

  /**
   * Get user profile including metadata
   */
  async getUserProfile(): Promise<any> {
    const user = await this.getCurrentUser();
    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      displayName: user.user_metadata?.display_name,
      dateOfBirth: user.user_metadata?.date_of_birth,
      created_at: user.created_at,
    };
  }

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(callback: (user: User | null) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user || null);
    });
  }
}