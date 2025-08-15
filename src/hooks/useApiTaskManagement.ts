import { useState, useCallback, useEffect } from "react";
import { apiClient, ApiError } from "@/lib/api-client";
import { cognitoAuth } from "@/lib/cognito";
import { TASK_TYPES, TASK_GROUPS } from "@/lib/constants";
import type { Task } from "@/types";
import type { TaskType, TaskGroup } from "@/lib/constants";

export const useApiTaskManagement = () => {
  const [rootTask, setRootTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Task editing state
  const [editingTodoId, setEditingTodoId] = useState<string | number | null>(null);
  const [editText, setEditText] = useState("");
  const [isAddingTaskTo, setIsAddingTaskTo] = useState<string | number | "root" | null>(null);
  const [newTaskInputValue, setNewTaskInputValue] = useState("");
  const [newTaskType, setNewTaskType] = useState<TaskType>(TASK_TYPES.UNIQUE);
  const [newTaskGroup, setNewTaskGroup] = useState<TaskGroup>(TASK_GROUPS.OTHER);

  // Load tasks from API
  const loadTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const tasks = await apiClient.getTasks();
      
      // Ensure we have a valid task structure
      if (tasks && typeof tasks === 'object') {
        setRootTask(tasks);
      } else {
        // Create empty root task if API returns null/undefined
        setRootTask({
          id: "root",
          text: "Projectos",
          subtasks: [],
          type: "root" as const,
          completed: false,
          group: "other" as const,
          dailyData: {},
          people: [],
          isTracking: false,
          startTime: null,
          trackingDate: null,
        });
      }
    } catch (error) {
      console.error('Failed to load tasks:', error);
      setError(error instanceof ApiError ? error.message : 'Failed to load tasks');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize tasks when authentication is ready
  useEffect(() => {
    initializeTasksWhenReady();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initializeTasksWhenReady = async () => {
    try {
      // Wait for authentication state to be established
      let attempts = 0;
      const maxAttempts = 10; // Maximum wait time: 10 seconds
      
      while (attempts < maxAttempts) {
        try {
          const hasSession = await cognitoAuth.hasValidSession();
          if (hasSession) {
            console.log('✅ Authentication ready, loading tasks...');
            await loadTasks();
            return;
          }
        } catch {
          console.log('🔄 Checking auth state...');
        }
        
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // If we reach here, user is likely not authenticated
      console.log('ℹ️ No authentication found, user needs to log in');
      setIsLoading(false);
      
    } catch (error) {
      console.error('Failed to initialize tasks:', error);
      setError('Failed to initialize application');
      setIsLoading(false);
    }
  };

  // Helper function to find task by ID in the tree
  const findTaskById = useCallback((tasks: Task[], id: string | number): Task | null => {
    for (const task of tasks) {
      if (task.id === id) return task;
      const found = findTaskById(task.subtasks, id);
      if (found) return found;
    }
    return null;
  }, []);

  // Add task
  const handleRequestAddTask = useCallback(
    (parentId: string | number | "root") => {
      if (parentId !== "root" && rootTask) {
        const parent = findTaskById(rootTask.subtasks, parentId);
        if (parent?.completed) return;
        setNewTaskGroup(parent?.group || TASK_GROUPS.OTHER);
      } else {
        setNewTaskGroup(TASK_GROUPS.OTHER);
      }
      
      setIsAddingTaskTo(parentId);
      setNewTaskInputValue("");
      setNewTaskType(TASK_TYPES.UNIQUE);
    },
    [rootTask, findTaskById]
  );

  const handleConfirmAddTask = useCallback(async () => {
    if (!newTaskInputValue.trim() || isAddingTaskTo === null) return;

    try {
      if (isAddingTaskTo === "root") {
        await apiClient.createTask(null, newTaskInputValue.trim(), newTaskType, newTaskGroup);
      } else {
        await apiClient.createSubtask(
          isAddingTaskTo as string,
          newTaskInputValue.trim(),
          newTaskType,
          newTaskGroup
        );
      }
      
      // Reload tasks after adding
      await loadTasks();
      setIsAddingTaskTo(null);
      setNewTaskInputValue("");
    } catch (error) {
      console.error('Failed to add task:', error);
      setError(error instanceof ApiError ? error.message : 'Failed to add task');
    }
  }, [newTaskInputValue, newTaskType, newTaskGroup, isAddingTaskTo, loadTasks]);

  // Edit task
  const handleDoubleClick = useCallback((task: Task) => {
    if (task.completed) return;
    setEditingTodoId(task.id);
    setEditText(task.text);
  }, []);

  const handleEditSave = useCallback(
    async (id: string | number) => {
      const text = editText.trim();
      if (!text) return;

      try {
        await apiClient.updateTask(id as string, { text });
        await loadTasks();
        setEditingTodoId(null);
        setEditText("");
      } catch (error) {
        console.error('Failed to update task:', error);
        setError(error instanceof ApiError ? error.message : 'Failed to update task');
      }
    },
    [editText, loadTasks]
  );

  // Delete task
  const handleDelete = useCallback(
    async (id: string | number) => {
      try {
        await apiClient.deleteTask(id as string);
        await loadTasks();
      } catch (error) {
        console.error('Failed to delete task:', error);
        setError(error instanceof ApiError ? error.message : 'Failed to delete task');
      }
    },
    [loadTasks]
  );

  // Toggle task completion
  const handleToggleOverallComplete = useCallback(
    async (id: string | number, shouldBeComplete: boolean) => {
      try {
        await apiClient.updateTask(id as string, { 
          completed: shouldBeComplete,
          is_tracking: false,
          start_time: null,
          tracking_date: null
        });
        await loadTasks();
      } catch (error) {
        console.error('Failed to toggle task completion:', error);
        setError(error instanceof ApiError ? error.message : 'Failed to toggle task completion');
      }
    },
    [loadTasks]
  );

  // Update daily data
  const handleUpdateDailyData = useCallback(
    async (taskId: string | number, dateStr: string, dataUpdate: Record<string, unknown>) => {
      try {
        await apiClient.updateDailyData(
          taskId as string,
          dateStr,
          dataUpdate.value as number | undefined,
          dataUpdate.completed as boolean | undefined
        );
        await loadTasks();
      } catch (error) {
        console.error('Failed to update daily data:', error);
        setError(error instanceof ApiError ? error.message : 'Failed to update daily data');
      }
    },
    [loadTasks]
  );

  return {
    rootTask,
    isLoading,
    error,
    editingTodoId,
    editText,
    setEditText,
    isAddingTaskTo,
    newTaskInputValue,
    setNewTaskInputValue,
    newTaskType,
    setNewTaskType,
    newTaskGroup,
    setNewTaskGroup,
    handleRequestAddTask,
    handleConfirmAddTask,
    handleCancelAddTask: () => setIsAddingTaskTo(null),
    handleDoubleClick,
    handleEditSave,
    handleEditKeyDown: (e: React.KeyboardEvent, id: string | number) => {
      if (e.key === "Enter") handleEditSave(id);
      else if (e.key === "Escape") {
        setEditingTodoId(null);
        setEditText("");
      }
    },
    handleEditBlur: (id: string | number) => {
      setTimeout(() => {
        if (editingTodoId === id) handleEditSave(id);
      }, 150);
    },
    handleEditChange: (e: React.ChangeEvent<HTMLInputElement>) => setEditText(e.target.value),
    handleNewTaskValueChange: (e: React.ChangeEvent<HTMLInputElement>) => setNewTaskInputValue(e.target.value),
    handleNewTaskTypeChange: (e: React.ChangeEvent<HTMLSelectElement>) => setNewTaskType(e.target.value as TaskType),
    handleNewTaskGroupChange: (e: React.ChangeEvent<HTMLSelectElement>) => setNewTaskGroup(e.target.value as TaskGroup),
    handleDelete,
    handleToggleOverallComplete,
    handleUpdateDailyData,
    refreshTasks: loadTasks,
  };
};