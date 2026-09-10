import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { api } from "@/lib/api";

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

export function AppProvider({ children }) {
  const [agents, setAgents] = useState([]);
  const [currentAgent, setCurrentAgent] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadAgents = useCallback(async () => {
    const { data } = await api.getAgents();
    setAgents(data);
    setCurrentAgent((prev) => {
      if (prev) return data.find((a) => a.id === prev.id) || prev;
      return data.find((a) => a.team === "customer_support") || data[0] || null;
    });
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  const changePresence = async (presence) => {
    if (!currentAgent) return;
    const { data } = await api.setPresence(currentAgent.id, presence);
    setCurrentAgent(data);
    setAgents((prev) => prev.map((a) => (a.id === data.id ? data : a)));
  };

  const value = useMemo(
    () => ({ agents, currentAgent, setCurrentAgent, loading, loadAgents, changePresence }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [agents, currentAgent, loading, loadAgents]
  );

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}
