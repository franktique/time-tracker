// API-specific types
export interface ApiErrorResponse {
  status?: number;
  message?: string;
  code?: string;
}

export interface UpdateTaskRequest {
  text?: string;
  type?: string;
  task_group?: string;
  completed?: boolean;
  is_tracking?: boolean;
  start_time?: number | null;
  tracking_date?: string | null;
  position?: number;
  parent_id?: string | null;
}

export interface DailyDataUpdate {
  value?: number;
  completed?: boolean;
}

export interface DatabaseQueryParams {
  text: string;
  params?: unknown[];
}