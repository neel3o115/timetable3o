## Packages
framer-motion | For smooth page transitions and micro-interactions
@dnd-kit/core | Core drag and drop functionality for the timetable grid
@dnd-kit/sortable | Sortable presets for dnd-kit
@dnd-kit/utilities | Utilities for dnd-kit
date-fns | Robust date manipulation for scheduling
react-markdown | To render AI chat responses beautifully
clsx | Class name utility (often needed with tailwind-merge)
tailwind-merge | Class name merging (often needed)

## Notes
- The chat integration uses SSE (Server-Sent Events) at `/api/conversations/:id/messages`.
- Timetable data is stored as JSONB. The frontend needs to serialize/deserialize this structure.
- The solver endpoint expects a specific constraint format.
