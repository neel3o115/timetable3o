# Timetable3o

## Overview

Timetable3o is a frontend-only timetable scheduling application with a chat interface and visual drag-and-drop editor. Users can describe their scheduling requirements through natural language conversation (currently mocked), and view/edit timetables in a visual grid interface.

**Status**: Frontend-only project. Backend API calls have been replaced with mock data. Ready for connecting to a real backend later.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

- **Feb 2026**: Converted to frontend-only project
  - Removed all backend dependencies (Express, Drizzle, PostgreSQL, Python solver)
  - Replaced API calls with mock data in all hooks
  - Added TODO comments marking where to connect real backend later
  - Preserved all UI, styling, layout, and visual behavior exactly

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for client state
- **UI Components**: shadcn/ui with Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens
- **Drag & Drop**: @dnd-kit for timetable grid interactions
- **Animations**: Framer Motion for transitions
- **Build Tool**: Vite

### Mock Data Layer
All API calls have been replaced with in-memory mock data:
- **use-timetables.ts**: Mock CRUD operations for timetables
- **use-chat.ts**: Simulated chat with streaming responses
- **use-constraints.ts**: Mock constraint storage
- **use-solver.ts**: Mock timetable solver that generates sample schedules

### Key Data Models
- **Timetable**: Schedule data with title, status (draft/final), and class information
- **Conversation**: Chat sessions for AI interactions
- **Message**: Individual chat messages
- **Constraint**: Scheduling constraints extracted from chat

### Project Structure
```
client/           # React frontend
  src/
    components/   # UI components including ChatInterface, TimetableGrid
    hooks/        # Custom React hooks with mock data
    pages/        # Route pages (Home, Dashboard, Editor)
    lib/          # Utilities and query client
shared/           # Shared types and schemas (no Drizzle dependency)
  schema.ts       # Type definitions and mock data
  routes.ts       # API route contracts (for future backend)
```

### Pages
- **Home** (`/`): Landing page with hero section
- **Dashboard** (`/dashboard`): List of timetables with create functionality
- **Editor** (`/editor/:id`): Split view with chat interface and timetable grid

## External Dependencies

### NPM Packages
- `@tanstack/react-query` - Client state management
- `@dnd-kit/*` - Drag and drop functionality
- `framer-motion` - Animations
- `react-markdown` - Render markdown content
- `date-fns` - Date manipulation
- `wouter` - Lightweight routing
- `zod` - Schema validation

## Development

### Running the App
```bash
cd Time-Table
npm run dev
```

The app runs on port 5000 with Vite dev server.

### Building for Production
```bash
cd Time-Table
npm run build
```

Output goes to `dist/public`.

## TODO: Backend Integration

When connecting to a real backend, update these files:
- `client/src/hooks/use-timetables.ts` - Replace mock with API calls
- `client/src/hooks/use-chat.ts` - Connect to real chat API with SSE streaming
- `client/src/hooks/use-constraints.ts` - Connect to constraints API
- `client/src/hooks/use-solver.ts` - Connect to solver API

Each file contains `// TODO: connect to real backend later` comments.
