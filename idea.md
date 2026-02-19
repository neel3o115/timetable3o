# Timetable3o

## Project Title
Timetable3o - Constraint-Based Academic Timetable Generator

## Problem Statement
Creating academic timetables manually is difficult, repetitive, and error-prone. Administrators must balance sections, subjects, teachers, rooms, and time slots while avoiding conflicts such as double-booked teachers, invalid room usage, or overloaded sections. As the number of sections and constraints grows, manual scheduling becomes slow and unreliable.

## Solution Overview
Timetable3o solves this problem with a hybrid workflow:
- users first define timetable data in a structured draft
- the system validates constraints before scheduling
- a CP-SAT based solver generates a valid timetable automatically
- users can then refine the timetable through the manual builder in the frontend

This combines deterministic optimization with practical manual control.

## Scope
The system supports:
- multi-section scheduling
- teacher assignment and teacher conflict avoidance
- room assignment and room-type constraints
- time-slot based timetable generation
- manual override and interactive timetable editing
- publishing timetables via shareable links
- planned export integration for Google Sheets and Google Calendar

## Key Features
- Draft-based workflow for structured timetable creation
- Constraint validation before solve
- CP-SAT solver using Google OR-Tools
- Manual timetable builder for editing and placement
- Shareable published timetable links
- Clean backend architecture using OOP and separation of concerns

## Tech Stack
### Frontend
- React
- TypeScript
- Tailwind CSS
- Vite

### Backend
- Node.js
- Express
- MongoDB with Mongoose
- OOP backend architecture: Route -> Controller -> Service -> Repository -> Model

### Solver
- Python
- Google OR-Tools CP-SAT

## Architecture Note
The backend has been refactored into a clean OOP structure with:
- Controllers for HTTP request/response handling
- Services for business logic
- Repositories for database access
- Models for MongoDB persistence
- SolverService for solver execution
- Validator classes for draft validation

This structure improves maintainability, testability, and separation of concerns while preserving existing APIs and behavior.
