import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCompany } from "@/hooks/use-company";
import { fleetQuery, type FleetData } from "@/lib/fleet";

const EMPTY: FleetData = { drivers: [], vehicles: [], documents: [] };

export function useFleet() {
  const { company } = useCompany();
  const query = useQuery({
    ...fleetQuery(company?.id ?? "none"),
    enabled: Boolean(company),
  });
  return {
    company,
    data: query.data ?? EMPTY,
    isLoading: !company || query.isLoading,
    error: query.error,
  };
}

export function useInvalidateFleet() {
  const qc = useQueryClient();
  const { company } = useCompany();
  return () => qc.invalidateQueries({ queryKey: ["fleet", company?.id] });
}
