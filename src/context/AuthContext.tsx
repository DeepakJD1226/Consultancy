import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type AuthProfileInput = {
  fullName: string;
  phone: string;
};

type AuthContextType = {
  user: User | null;
  role: string | null;
  loading: boolean;
  signUp: (email: string, password: string, profile: AuthProfileInput) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const ADMIN_EMAIL = 'deepakj.23aid@kongu.edu';

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function fetchUserRole(userId: string, email?: string | null): Promise<string> {
  if (email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    return 'admin';
  }

  try {
    const { data, error } = await supabase
      .from('customers')
      .select('role')
      .eq('id', userId)
      .maybeSingle();
    if (!error) return data?.role ?? 'customer';
  } catch {
    // Ignore and try users fallback.
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .maybeSingle();
    if (!error) return data?.role ?? 'customer';
  } catch {
    // Fall through.
  }

  return 'customer';
}

function normalizeProfile(user: User, profile?: Partial<AuthProfileInput>) {
  const metadata = user.user_metadata ?? {};
  const fullName = (profile?.fullName ?? metadata.full_name ?? metadata.name ?? user.email?.split('@')[0] ?? 'Customer').toString().trim();
  const phone = (profile?.phone ?? metadata.phone ?? '').toString().trim();

  return {
    fullName: fullName || 'Customer',
    phone,
    email: user.email ?? '',
  };
}

function missingColumnFromErrorMessage(message: string | undefined): string | null {
  if (!message) return null;
  const match = message.match(/Could not find the '([^']+)' column/i);
  return match?.[1] ?? null;
}

async function resilientUpsert(table: string, payload: Record<string, unknown>) {
  const candidate = { ...payload };

  for (let i = 0; i < Object.keys(payload).length; i += 1) {
    const { error } = await supabase.from(table).upsert(candidate, { onConflict: 'id' });

    if (!error) return;

    const missingColumn = missingColumnFromErrorMessage(error.message);
    if (
      error.code === 'PGRST204' &&
      missingColumn &&
      Object.prototype.hasOwnProperty.call(candidate, missingColumn)
    ) {
      delete candidate[missingColumn];
      continue;
    }

    throw error;
  }
}

async function upsertUserProfile(user: User, profile?: Partial<AuthProfileInput>) {
  const normalized = normalizeProfile(user, profile);
  const role = normalized.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'customer';

  const customerPayload: Record<string, unknown> = {
    id: user.id,
    email: normalized.email,
    business_name: normalized.fullName,
    contact_person: normalized.fullName,
    phone: normalized.phone,
    address: 'Not provided',
    city: '',
    role,
  };

  try {
    await resilientUpsert('customers', customerPayload);
    return;
  } catch {
    // Fallback to users table if this workspace uses it for profile storage.
  }

  const usersPayload: Record<string, unknown> = {
    id: user.id,
    email: normalized.email,
    name: normalized.fullName,
    phone: normalized.phone,
    role,
  };

  await resilientUpsert('users', usersPayload);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        const {
          data: { session },
        } = await withTimeout(supabase.auth.getSession(), 8000, 'Auth session fetch');

        if (session?.user) {
          if (!isMounted) return;
          setUser(session.user);
          await withTimeout(upsertUserProfile(session.user), 8000, 'Profile sync');
          const r = await fetchUserRole(session.user.id, session.user.email);
          if (!isMounted) return;
          setRole(r);
        } else {
          if (!isMounted) return;
          setUser(null);
          setRole(null);
        }
      } catch {
        if (!isMounted) return;
        setUser(null);
        setRole(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        if (session?.user) {
          if (!isMounted) return;
          setUser(session.user);
          await withTimeout(upsertUserProfile(session.user), 8000, 'Profile sync');
          const r = await fetchUserRole(session.user.id, session.user.email);
          if (!isMounted) return;
          setRole(r);
        } else {
          if (!isMounted) return;
          setUser(null);
          setRole(null);
        }
      } catch {
        if (!isMounted) return;
        setRole('customer');
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, profile: AuthProfileInput) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: profile.fullName,
          phone: profile.phone,
        },
      },
    });
    if (error) throw error;

    if (data.user) {
      await upsertUserProfile(data.user, profile);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    if (data.user) {
      await upsertUserProfile(data.user);
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
