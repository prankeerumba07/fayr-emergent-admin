import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = checking, false = unauthenticated, object = authenticated

  useEffect(() => {
    const t = localStorage.getItem("fayr_token");
    if (!t) { setUser(false); return; }
    api.authMe()
      .then(({ data }) => setUser(data))
      .catch(() => { localStorage.removeItem("fayr_token"); setUser(false); });
  }, []);

  const login = async (email, password) => {
    const { data } = await api.login(email, password);
    localStorage.setItem("fayr_token", data.access_token);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try { await api.authLogout(); } catch (e) { /* ignore */ }
    localStorage.removeItem("fayr_token");
    setUser(false);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
