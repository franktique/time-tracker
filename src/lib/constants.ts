export const TASK_TYPES = {
  UNIQUE: "tarea unica",
  REPETITIVE: "tarea repetitiva",
  MANUAL: "tiempo manual",
  RECORD: "grabar tiempo",
  QUANTITY: "cantidad",
} as const;

export const TASK_GROUPS = {
  URGENT: "urgent",
  ROUTINE: "routine",
  PROJECT: "project",
  OTHER: "other",
} as const;

export const GROUP_ORDER = {
  [TASK_GROUPS.URGENT]: 1,
  [TASK_GROUPS.ROUTINE]: 2,
  [TASK_GROUPS.PROJECT]: 3,
  [TASK_GROUPS.OTHER]: 4,
} as const;

export const GROUP_COLORS = {
  [TASK_GROUPS.URGENT]: {
    base: "bg-orange-100",
    hover: "bg-orange-200",
  },
  [TASK_GROUPS.ROUTINE]: { 
    base: "bg-green-100", 
    hover: "bg-green-200" 
  },
  [TASK_GROUPS.PROJECT]: { 
    base: "bg-blue-100", 
    hover: "bg-blue-200" 
  },
  [TASK_GROUPS.OTHER]: { 
    base: "bg-white", 
    hover: "bg-gray-100" 
  },
} as const;

export const WEEK_DAYS_SHORT = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"] as const;

export const VIEWS = {
  TIMESHEET: "Hoja de Tiempos",
  SEGUIMIENTO: "Seguimiento",
  EQUIPOS: "Equipos",
} as const;

export type TaskType = typeof TASK_TYPES[keyof typeof TASK_TYPES];
export type TaskGroup = typeof TASK_GROUPS[keyof typeof TASK_GROUPS];
export type View = typeof VIEWS[keyof typeof VIEWS];