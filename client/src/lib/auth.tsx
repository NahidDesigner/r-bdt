import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import type { User, Tenant, Plan, StoreSettings } from "@shared/schema";

interface AuthUser extends User {
  tenant?: Tenant & { plan?: Plan; storeSettings?: StoreSettings };
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, storeName: string, storeSlug: string) => Promise<void>;
  logout: () => Promise<void>;
  refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || "Login failed");
    }
    
    // Wait a bit for session to be saved, then retry fetchUser if needed
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Try to fetch user, with retry logic
    let attempts = 0;
    const maxAttempts = 3;
    while (attempts < maxAttempts) {
      try {
        const userRes = await fetch("/api/auth/me", { credentials: "include" });
        if (userRes.ok) {
          const data = await userRes.json();
          setUser(data.user);
          return;
        }
        if (attempts < maxAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        attempts++;
      } catch (error) {
        if (attempts < maxAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        attempts++;
      }
    }
    
    // Final attempt
    await fetchUser();
  };

  const register = async (email: string, password: string, storeName: string, storeSlug: string) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, storeName, storeSlug }),
      credentials: "include",
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || "Registration failed");
    }
    
    // Wait a bit for session to be saved, then retry fetchUser if needed
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Try to fetch user, with retry logic
    let attempts = 0;
    const maxAttempts = 3;
    while (attempts < maxAttempts) {
      try {
        const userRes = await fetch("/api/auth/me", { credentials: "include" });
        if (userRes.ok) {
          const data = await userRes.json();
          setUser(data.user);
          return;
        }
        if (attempts < maxAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        attempts++;
      } catch (error) {
        if (attempts < maxAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        attempts++;
      }
    }
    
    // Final attempt
    await fetchUser();
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, refetch: fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
