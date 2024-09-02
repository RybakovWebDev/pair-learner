"use client";
import { createContext, useState, useEffect, useContext, ReactNode } from "react";
import { User } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";

interface UserContextType {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
}

const defaultValue: UserContextType = {
  user: null,
  loading: true,
  setUser: () => {},
};

const UserContext = createContext<UserContextType>(defaultValue);

export function UserProvider({ children, initialUser }: { children: ReactNode; initialUser: User | null }) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const fetchSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };

    if (initialUser) {
      setLoading(false);
    } else {
      fetchSession();
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [initialUser]);

  return <UserContext.Provider value={{ user, loading, setUser }}>{children}</UserContext.Provider>;
}

export function useUserContext() {
  return useContext(UserContext);
}
