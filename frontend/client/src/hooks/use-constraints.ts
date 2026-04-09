import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type Constraint, type InsertConstraint } from "@shared/schema";

// In-memory store for mock constraints
let mockConstraints: Constraint[] = [];
let nextConstraintId = 1;

// TODO: connect to real backend later
export function useSaveConstraint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertConstraint): Promise<Constraint> => {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const newConstraint: Constraint = {
        id: nextConstraintId++,
        data: data.data,
        rawConversation: data.rawConversation,
        createdAt: new Date(),
      };
      
      mockConstraints.push(newConstraint);
      return newConstraint;
    },
  });
}

// TODO: connect to real backend later
export function useConstraint(id: number) {
  return useQuery({
    queryKey: ["constraint", id],
    queryFn: async (): Promise<Constraint> => {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const constraint = mockConstraints.find(c => c.id === id);
      if (!constraint) {
        throw new Error("Constraint not found");
      }
      return constraint;
    },
  });
}
