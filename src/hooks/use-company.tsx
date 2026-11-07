import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { companiesQuery, type Company } from "@/lib/fleet";

type CompanyContextValue = {
  companies: Company[];
  company: Company | null;
  isLoading: boolean;
  setCompanyId: (id: string) => void;
};

const CompanyContext = createContext<CompanyContextValue | null>(null);
const STORAGE_KEY = "fleetguard.activeCompany";

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { data: companies = [], isLoading } = useQuery(companiesQuery());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedId(window.localStorage.getItem(STORAGE_KEY));
  }, []);

  const company = useMemo(
    () => companies.find((c) => c.id === selectedId) ?? companies[0] ?? null,
    [companies, selectedId],
  );

  const value = useMemo<CompanyContextValue>(
    () => ({
      companies,
      company,
      isLoading,
      setCompanyId: (id) => {
        window.localStorage.setItem(STORAGE_KEY, id);
        setSelectedId(id);
      },
    }),
    [companies, company, isLoading],
  );

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
}

export function useCompany() {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error("useCompany must be used inside CompanyProvider");
  return ctx;
}
