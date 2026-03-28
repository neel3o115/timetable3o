import { z } from "zod";

// Mock Timetable type (removed Drizzle dependency)
export interface Timetable {
  id: number;
  title: string;
  data: any;
  status: string;
  createdAt: Date | null;
}

// Mock Constraint type
export interface Constraint {
  id: number;
  data: any;
  rawConversation?: any;
  createdAt: Date | null;
}

// Mock Conversation and Message types
export interface Conversation {
  id: number;
  title: string;
  createdAt: Date;
}

export interface Message {
  id: number;
  conversationId: number;
  role: string;
  content: string;
  createdAt: Date;
}

// Timetable input schema (for validation)
export const insertTimetableSchema = z.object({
  title: z.string().default("Untitled Timetable"),
  data: z.any(),
  status: z.string().default("draft"),
});

export type InsertTimetable = z.infer<typeof insertTimetableSchema>;

// Constraint input schema
export const insertConstraintSchema = z.object({
  data: z.any(),
  rawConversation: z.any().optional(),
});

export type InsertConstraint = z.infer<typeof insertConstraintSchema>;

// Conversation input schema
export const insertConversationSchema = z.object({
  title: z.string(),
});

export type InsertConversation = z.infer<typeof insertConversationSchema>;

// Message input schema
export const insertMessageSchema = z.object({
  conversationId: z.number(),
  role: z.string(),
  content: z.string(),
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;

// API Schemas
export const solveRequestSchema = z.object({
  constraints: z.any(),
});

export const solveResponseSchema = z.object({
  status: z.enum(["POSSIBLE", "NOT_POSSIBLE"]),
  timetable: z.any().optional(),
  explanation: z.string().optional(),
});

export type SolveRequest = z.infer<typeof solveRequestSchema>;
export type SolveResponse = z.infer<typeof solveResponseSchema>;

// Sample mock data for timetables
export const MOCK_TIMETABLES: Timetable[] = [
  {
    id: 1,
    title: "Fall 2024 Schedule",
    status: "final",
    createdAt: new Date("2024-09-01"),
    data: {
      classes: [
        { subject: "Mathematics", day: "Monday", time: "08:00", teacher: "Dr. Smith", room: "Room 101", type: "Lecture" },
        { subject: "Physics", day: "Monday", time: "10:00", teacher: "Dr. Johnson", room: "Lab 201", type: "Lab" },
        { subject: "Chemistry", day: "Tuesday", time: "09:00", teacher: "Dr. Williams", room: "Lab 102", type: "Lab" },
        { subject: "English", day: "Wednesday", time: "11:00", teacher: "Ms. Davis", room: "Room 301", type: "Lecture" },
        { subject: "History", day: "Thursday", time: "14:00", teacher: "Mr. Brown", room: "Room 202", type: "Lecture" },
        { subject: "Mathematics", day: "Friday", time: "08:00", teacher: "Dr. Smith", room: "Room 101", type: "Lecture" },
      ]
    }
  },
  {
    id: 2,
    title: "Spring 2025 Draft",
    status: "draft",
    createdAt: new Date("2025-01-15"),
    data: {
      classes: [
        { subject: "Biology", day: "Monday", time: "09:00", teacher: "Dr. Green", room: "Lab 301", type: "Lab" },
        { subject: "Art", day: "Tuesday", time: "13:00", teacher: "Ms. White", room: "Studio 1", type: "Lecture" },
      ]
    }
  }
];

// Sample mock conversations
export const MOCK_CONVERSATIONS: Conversation[] = [
  { id: 1, title: "Planning for Timetable #1", createdAt: new Date("2024-09-01") }
];

// Sample mock messages  
export const MOCK_MESSAGES: Message[] = [
  { id: 1, conversationId: 1, role: "assistant", content: "Hello! I'm here to help you create your timetable. What subjects do you need to schedule?", createdAt: new Date() }
];
