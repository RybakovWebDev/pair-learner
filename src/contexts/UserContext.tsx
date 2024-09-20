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
    let isMounted = true;
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const syncSessionWithServer = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (isMounted) {
        if (session?.user && initialUser) {
          if (session.user.email !== initialUser.email) {
            setUser(initialUser);
          }
        } else if (!session?.user && initialUser) {
          setUser(initialUser);
        } else if (session?.user && !initialUser) {
          setUser(session.user);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    };

    syncSessionWithServer();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (isMounted) {
        if (session?.user) {
          if (initialUser && session.user.email !== initialUser.email) {
          } else {
            setUser(session.user);
          }
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [initialUser]);

  const contextValue = {
    user,
    loading,
    setUser,
  };

  return <UserContext.Provider value={contextValue}>{children}</UserContext.Provider>;
}

export function useUserContext() {
  return useContext(UserContext);
}
