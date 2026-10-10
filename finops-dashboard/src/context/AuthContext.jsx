import { createContext, useContext, useState } from 'react';










export const AuthContext = createContext(null);

/**
 * JWT is stored in React state (memory), NOT localStorage.
 * Design decision: localStorage persists across tabs and is readable by XSS;
 * in-memory state is lost on refresh (acceptable for a demo) but is safer.
 * In production you'd use httpOnly cookies.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const login = (userData) => setUser(userData);
  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      isAuthenticated: user !== null
    }}>
      {children}
    </AuthContext.Provider>);

}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}