# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15 time tracking application built with React 19, TypeScript, and Tailwind CSS. The application is a comprehensive task and time management tool with multiple views and features.

## Development Commands

- `npm run dev` - Start development server with Turbopack (runs on http://localhost:3000)
- `npm run build` - Build the application for production
- `npm start` - Start the production server
- `npm run lint` - Run ESLint to check code quality

## Architecture & Key Features

### Application Structure
- **Component-Based Architecture**: Well-organized component structure with proper separation of concerns
- **Client-Side Only**: Uses "use client" directive, no server-side rendering for the main application logic  
- **Local Storage**: All data persistence is handled through localStorage (tasks, teams, user settings)
- **TypeScript**: Fully typed with proper interfaces and type definitions

### Core Functionality

**Three Main Views:**
1. **Hoja de Tiempos (Timesheet)**: Calendar grid view for time tracking
2. **Seguimiento (Tracking)**: Project tracking view (filtered to project tasks only)
3. **Equipos (Teams)**: Team and person management

**Task Management:**
- Hierarchical tasks with subtasks
- Four task types: `tarea unica`, `tarea repetitiva`, `tiempo manual`, `grabar tiempo`, `cantidad`
- Four task groups: `urgent`, `routine`, `project`, `other` (with visual color coding)
- Task completion with parent-child completion logic
- Daily data tracking per task

**Time Tracking:**
- Real-time time recording with start/stop functionality
- Manual time entry (hours)
- Quantity tracking
- Monthly calendar view with daily data
- Yearly overview modal for individual tasks

### Technical Implementation

**Component Structure:**
```
src/
├── components/
│   ├── ui/           # Reusable UI components (Header, Sidebar)
│   ├── modals/       # Modal components (AddTask, YearlyCalendar, etc.)
│   ├── views/        # Main view components (Timesheet, Teams, etc.)
│   ├── task/         # Task-related components (TaskItem)
│   └── grid/         # Grid components (GridCell, GridRow)
├── hooks/            # Custom React hooks
├── lib/              # Utility functions and constants
├── types/            # TypeScript type definitions
└── app/              # Next.js app directory
```

**State Management:**
- Custom hooks for different concerns (useTimeTracker, useTaskManagement, useTeamManagement)
- Complex nested task structures with recursive operations
- Memoized handlers to prevent unnecessary re-renders
- SSR-safe localStorage handling

**Key Data Structures:**
- `rootTask`: Main container with hierarchical subtasks
- `teams`: Array of team objects with people
- Task objects contain: id, text, type, group, completed status, dailyData, subtasks, people assignments

**Utility Libraries:**
- `lib/constants.ts`: All application constants and types
- `lib/date-utils.ts`: Date manipulation utilities (Spanish locale)
- `lib/task-utils.ts`: Task tree operations (find, update, delete by ID)
- `lib/time-utils.ts`: Time formatting functions
- `lib/user-utils.ts`: User-related utilities

## Development Guidelines

### Adding New Features
- Create components in the appropriate directory (`ui/`, `modals/`, `views/`, etc.)
- Follow the existing pattern of memoized handlers for performance
- Use the existing utility functions from the `lib/` directory
- Maintain the Spanish UI language throughout
- Consider the three-view architecture when adding functionality
- Add proper TypeScript types in the `types/` directory

### Code Organization
- Components are organized by function and reusability
- Custom hooks handle complex state logic
- Utility functions are separated into focused modules
- All constants and types are centralized
- Follow the existing pattern for prop interfaces and component structure

### Data Persistence
- All data is stored in localStorage with keys: `timesheet_rootTask`, `timesheet_teams`, `timesheet_userName`
- State is automatically synced to localStorage via useEffect hooks
- Handle localStorage errors gracefully with try/catch blocks

## UI/UX Notes

- Uses Lucide React icons extensively
- Tailwind CSS for styling with custom group color schemes
- Responsive design considerations for different screen sizes
- Spanish language interface with specific terminology
- User avatar generation using placehold.co with user initials