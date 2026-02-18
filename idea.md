# Timetable3o — AI-Assisted Timetable Generation Platform 

## Overview

Timetable3o is a personal project idea for a web-based system that generates academic timetables from user-provided constraints. The core concept is to combine a conversational interface for collecting requirements with a constraint solver that attempts to construct a valid schedule.

The project explores how timetable generation can be treated as a constraint satisfaction problem and how users can iteratively refine inputs when conflicts arise.

---

## Core Idea

A user visits the platform and chooses to create a timetable. The interface presents two main sections:

* A chat-style panel where the user describes scheduling requirements
* A timetable view where the generated schedule is displayed

The chat component is intended to extract structured constraints such as subjects, available time slots, faculty availability, room limits, or other restrictions.

---

## Timetable Generation

The extracted constraints are passed to a backend solver (e.g., using constraint programming tools such as OR-Tools). The solver attempts to produce a timetable that satisfies all constraints.

Two outcomes are possible:

* A valid timetable is generated
* No feasible timetable exists for the given constraints

If generation fails, the system returns information about conflicts so the user can adjust requirements and try again.

---

## Visualization

When a valid solution is found, the timetable is displayed in a calendar-like grid with sessions represented as time-slot blocks.

Future enhancements may allow manual adjustments (e.g., drag-and-drop), followed by validation to ensure constraints are not violated.

---

## Export and Sharing

Users who sign in (e.g., via Google authentication) may export generated timetables to services such as Google Calendar or Google Sheets. The platform may also allow sharing timetables through public links so that non-registered users can view them.

---

## Scope of Exploration

The project focuses on:

* Constraint collection
* Automated timetable generation
* Conflict reporting
* Visual schedule representation
* Basic export and sharing features

Additional features may be explored later depending on time and feasibility.
