import { z } from 'zod';
import { insertTimetableSchema, solveRequestSchema, solveResponseSchema, insertConstraintSchema, type Timetable, type Constraint } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  timetables: {
    list: {
      method: 'GET' as const,
      path: '/api/timetables',
      responses: {
        200: z.array(z.custom<Timetable>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/timetables/:id',
      responses: {
        200: z.custom<Timetable>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/timetables',
      input: insertTimetableSchema,
      responses: {
        201: z.custom<Timetable>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/timetables/:id',
      input: insertTimetableSchema.partial(),
      responses: {
        200: z.custom<Timetable>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
  },
  constraints: {
    save: {
      method: 'POST' as const,
      path: '/api/constraints',
      input: insertConstraintSchema,
      responses: {
        201: z.custom<Constraint>(),
        400: errorSchemas.validation,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/constraints/:id',
      responses: {
        200: z.custom<Constraint>(),
        404: errorSchemas.notFound,
      },
    },
  },
  solver: {
    solve: {
      method: 'POST' as const,
      path: '/api/solve',
      input: solveRequestSchema,
      responses: {
        200: solveResponseSchema,
        400: errorSchemas.validation,
        500: errorSchemas.internal,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

// Type Helpers
export type TimetableInput = z.infer<typeof api.timetables.create.input>;
export type TimetableResponse = z.infer<typeof api.timetables.create.responses[201]>;
export type TimetableListResponse = z.infer<typeof api.timetables.list.responses[200]>;
export type SolverInput = z.infer<typeof api.solver.solve.input>;
export type SolverResponse = z.infer<typeof api.solver.solve.responses[200]>;
export type InsertConstraint = z.infer<typeof insertConstraintSchema>;
