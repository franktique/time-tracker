import type { TaskType, TaskGroup, View } from "@/lib/constants";

export type { View };

export interface DailyData {
  value?: number;
  completed?: boolean;
}

export interface Task {
  id: string | number;
  text: string;
  completed: boolean;
  type: TaskType | "root";
  group: TaskGroup;
  dailyData: Record<string, DailyData>;
  people: Person[];
  isTracking: boolean;
  startTime: number | null;
  trackingDate: string | null;
  subtasks: Task[];
}

export interface Person {
  id: string | number;
  name: string;
}

export interface Team {
  id: string | number;
  name: string;
  people: Person[];
}

export interface ActiveTracker {
  taskId: string | number;
  date: string;
  startTime: number;
}