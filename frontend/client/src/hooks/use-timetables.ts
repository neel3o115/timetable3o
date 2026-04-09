import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export type Timetable = {
  _id?: string;
  id: string;
  title?: string;
  name: string;
  constraints?: any;
  grid?: any;
  timetable?: any[];
  status?: string;
  kind?: "draft" | "published" | "saved";
  href?: string;
  explanation?: string[];
  createdAt?: string;
  updatedAt?: string;
};

export function useTimetables(enabled: boolean = true) {
  return useQuery({
    queryKey: ["timetables"],
    enabled,
    queryFn: async (): Promise<Timetable[]> => {
      const data = await apiFetch<{ timetables: Timetable[] }>("/timetables");
      return data.timetables;
    },
  });
}

export function useTimetable(id: string | undefined) {
  return useQuery({
    queryKey: ["timetable", id],
    enabled: !!id && id !== "new",
    queryFn: async (): Promise<Timetable | null> => {
      if (!id || id === "new") return null;
      const data = await apiFetch<{ timetable: Timetable }>(`/timetables/${id}`);
      return data.timetable || null;
    },
  });
}

export function useCreateTimetable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { title?: string }): Promise<Timetable> => {
      const res = await apiFetch<{ timetable: Timetable }>("/timetables", {
        method: "POST",
        body: JSON.stringify(data)
      });
      return res.timetable;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timetables"] });
    },
  });
}

export function useUpdateTimetable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Timetable>): Promise<Timetable> => {
      const res = await apiFetch<{ timetable: Timetable }>(`/timetables/${id}`, {
        method: "PATCH",
        body: JSON.stringify(updates)
      });
      return res.timetable;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["timetables"] });
      queryClient.invalidateQueries({ queryKey: ["timetable", variables.id] });
    },
  });
}

export function useDeleteTimetable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiFetch(`/timetables/${id}`, { method: "DELETE" });
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timetables"] });
    }
  });
}
