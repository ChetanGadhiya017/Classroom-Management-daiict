import { createContext, useContext } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const qc = useQueryClient();
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api("/auth/session").then((r) => r.user),
    staleTime: Infinity,
  });
  const onAuth = (r) => {
    qc.clear();
    qc.setQueryData(["me"], r.user);
  };
  const login = useMutation({ mutationFn: (b) => api("/auth/login", { method: "POST", body: b }), onSuccess: onAuth });
  const register = useMutation({ mutationFn: (b) => api("/auth/register", { method: "POST", body: b }), onSuccess: onAuth });
  const logout = async () => {
    await api("/auth/logout", { method: "POST" }).catch(() => {});
    qc.clear();
    qc.setQueryData(["me"], null);
  };
  return (
    <AuthContext.Provider value={{ user: me.data, loading: me.isLoading, login, register, logout }}>{children}</AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
