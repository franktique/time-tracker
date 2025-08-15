import { v4 as uuidv4 } from 'uuid';
import { query } from '../db';
import type { Task as TaskType } from '@/types';

export interface DbTask {
  id: string;
  user_id: string;
  parent_id: string | null;
  text: string;
  type: string;
  task_group: string;
  completed: boolean;
  is_tracking: boolean;
  start_time: number | null;
  tracking_date: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface DbDailyData {
  id: string;
  task_id: string;
  date: string;
  value: number | null;
  completed: boolean | null;
}

export interface DbPerson {
  id: string;
  name: string;
  team_id: string;
}

export const buildTaskTree = (tasks: DbTask[], dailyData: DbDailyData[], people: DbPerson[], parentId: string | null = null): TaskType[] => {
  const children = tasks.filter(task => task.parent_id === parentId);
  
  return children
    .sort((a, b) => a.position - b.position)
    .map(task => {
      const taskDailyData: Record<string, any> = {};
      dailyData
        .filter(dd => dd.task_id === task.id)
        .forEach(dd => {
          taskDailyData[dd.date] = {
            value: dd.value,
            completed: dd.completed
          };
        });

      const taskPeople = people.filter(p => 
        dailyData.some(dd => dd.task_id === task.id)
      );

      return {
        id: task.id,
        text: task.text,
        type: task.type as any,
        group: task.task_group as any,
        completed: task.completed,
        isTracking: task.is_tracking,
        startTime: task.start_time,
        trackingDate: task.tracking_date,
        dailyData: taskDailyData,
        people: taskPeople.map(p => ({ id: p.id, name: p.name })),
        subtasks: buildTaskTree(tasks, dailyData, people, task.id)
      };
    });
};

export const getUserTasks = async (userId: string): Promise<TaskType> => {
  // Get all tasks for user
  const tasksResult = await query(
    `SELECT * FROM tasks WHERE user_id = $1 ORDER BY position`,
    [userId]
  );

  // Get all daily data for user's tasks
  const dailyDataResult = await query(
    `SELECT dd.* FROM daily_data dd 
     JOIN tasks t ON dd.task_id = t.id 
     WHERE t.user_id = $1`,
    [userId]
  );

  // Get all people assigned to user's tasks
  const peopleResult = await query(
    `SELECT DISTINCT p.id, p.name, p.team_id 
     FROM people p 
     JOIN task_people tp ON p.id = tp.person_id 
     JOIN tasks t ON tp.task_id = t.id 
     WHERE t.user_id = $1`,
    [userId]
  );

  const tasks = tasksResult.rows as DbTask[];
  const dailyData = dailyDataResult.rows as DbDailyData[];
  const people = peopleResult.rows as DbPerson[];

  // Find root task
  const rootTask = tasks.find(t => t.type === 'root');
  if (!rootTask) {
    // Create root task if it doesn't exist
    const rootId = uuidv4();
    await query(
      `INSERT INTO tasks (id, user_id, text, type, task_group, position) 
       VALUES ($1, $2, 'Projectos', 'root', 'other', 0)`,
      [rootId, userId]
    );
    
    return {
      id: rootId,
      text: 'Projectos',
      type: 'root' as any,
      group: 'other' as any,
      completed: false,
      isTracking: false,
      startTime: null,
      trackingDate: null,
      dailyData: {},
      people: [],
      subtasks: buildTaskTree(tasks, dailyData, people, rootId)
    };
  }

  return {
    id: rootTask.id,
    text: rootTask.text,
    type: rootTask.type as any,
    group: rootTask.task_group as any,
    completed: rootTask.completed,
    isTracking: rootTask.is_tracking,
    startTime: rootTask.start_time,
    trackingDate: rootTask.tracking_date,
    dailyData: {},
    people: [],
    subtasks: buildTaskTree(tasks, dailyData, people, rootTask.id)
  };
};

export const createTask = async (
  userId: string,
  parentId: string | null,
  text: string,
  type: string,
  taskGroup: string,
  position: number = 0
): Promise<string> => {
  const taskId = uuidv4();
  
  await query(
    `INSERT INTO tasks (id, user_id, parent_id, text, type, task_group, position) 
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [taskId, userId, parentId, text, type, taskGroup, position]
  );
  
  return taskId;
};

export const updateTask = async (
  taskId: string,
  userId: string,
  updates: Partial<{
    text: string;
    type: string;
    task_group: string;
    completed: boolean;
    is_tracking: boolean;
    start_time: number | null;
    tracking_date: string | null;
    position: number;
    parent_id: string | null;
  }>
): Promise<boolean> => {
  const fields = Object.keys(updates);
  const values = Object.values(updates);
  
  if (fields.length === 0) return false;
  
  const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
  values.push(taskId, userId);
  
  const result = await query(
    `UPDATE tasks SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
     WHERE id = $${values.length - 1} AND user_id = $${values.length}`,
    values
  );
  
  return result.rowCount > 0;
};

export const deleteTask = async (taskId: string, userId: string): Promise<boolean> => {
  // This will cascade delete subtasks and related data due to foreign key constraints
  const result = await query(
    'DELETE FROM tasks WHERE id = $1 AND user_id = $2',
    [taskId, userId]
  );
  
  return result.rowCount > 0;
};

export const updateDailyData = async (
  taskId: string,
  userId: string,
  date: string,
  value?: number,
  completed?: boolean
): Promise<void> => {
  // Verify the task belongs to the user
  const taskCheck = await query(
    'SELECT id FROM tasks WHERE id = $1 AND user_id = $2',
    [taskId, userId]
  );
  
  if (taskCheck.rows.length === 0) {
    throw new Error('Task not found or access denied');
  }

  await query(
    `INSERT INTO daily_data (id, task_id, date, value, completed) 
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (task_id, date) 
     DO UPDATE SET value = EXCLUDED.value, completed = EXCLUDED.completed, updated_at = CURRENT_TIMESTAMP`,
    [uuidv4(), taskId, date, value, completed]
  );
};

export const getTaskDailyData = async (
  taskId: string,
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<DbDailyData[]> => {
  let whereClause = 'dd.task_id = $1 AND t.user_id = $2';
  const params = [taskId, userId];

  if (startDate) {
    whereClause += ` AND dd.date >= $${params.length + 1}`;
    params.push(startDate);
  }

  if (endDate) {
    whereClause += ` AND dd.date <= $${params.length + 1}`;
    params.push(endDate);
  }

  const result = await query(
    `SELECT dd.* FROM daily_data dd 
     JOIN tasks t ON dd.task_id = t.id 
     WHERE ${whereClause} 
     ORDER BY dd.date`,
    params
  );

  return result.rows as DbDailyData[];
};