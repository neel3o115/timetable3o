import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

interface SolverInput {
  draft_id: string;
}

interface SolveResponse {
  status: "POSSIBLE" | "NOT_POSSIBLE" | "ERROR" | "DEPRECATED";
  timetable?: any[];
  grid?: any;
  reasons?: string[];
  time?: { days: string[]; slots: string[] };
  message?: string;
  metadata?: Record<string, any>;
}

export function useSolveTimetable() {
  return useMutation<SolveResponse, Error, SolverInput>({
    mutationFn: async (input: SolverInput): Promise<SolveResponse> => {
      return apiFetch(`/draft/${input.draft_id}/solve`, {
        method: "POST"
      });
    }
  });
}

interface NegotiateResponse {
  status: "ERROR";
  explanation?: string;
}

export function useNegotiate() {
  return useMutation<NegotiateResponse, Error, void>({
    mutationFn: async () => {
      return {
        status: "ERROR",
        explanation: "Negotiation is no longer available in the manual draft workflow."
      };
    }
  });
}
