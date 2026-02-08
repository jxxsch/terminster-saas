'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  supabase,
  Customer,
  SignUpData,
  signUp as supabaseSignUp,
  signIn as supabaseSignIn,
  signOut as supabaseSignOut,
  getCurrentUser,
  getCustomerByAuthId,
} from '@/lib/supabase';

interface AuthContextType {
  customer: Customer | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signUp: (data: SignUpData) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshCustomer: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initial session check
  useEffect(() => {
    const initAuth = async () => {
      try {
        const currentCustomer = await getCurrentUser();
        setCustomer(currentCustomer);
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user) {
        const customerData = await getCustomerByAuthId(session.user.id);
        setCustomer(customerData);
      } else if (event === 'SIGNED_OUT') {
        setCustomer(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (data: SignUpData): Promise<{ error: string | null }> => {
    const result = await supabaseSignUp(data);
    if (result.user) {
      setCustomer(result.user);
    }
    return { error: result.error };
  };

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    const result = await supabaseSignIn(email, password);
    if (result.user) {
      setCustomer(result.user);
    }
    return { error: result.error };
  };

  const signOut = async () => {
    await supabaseSignOut();
    setCustomer(null);
  };

  const refreshCustomer = async () => {
    const currentCustomer = await getCurrentUser();
    setCustomer(currentCustomer);
  };

  return (
    <AuthContext.Provider
      value={{
        customer,
        isLoading,
        isAuthenticated: !!customer,
        signUp,
        signIn,
        signOut,
        refreshCustomer,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
