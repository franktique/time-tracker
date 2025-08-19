import { useState, useCallback, useEffect } from "react";
import { apiClient, ApiError } from "@/lib/api-client";
import { fetchAuthSession } from 'aws-amplify/auth';
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

  // Test if we can actually retrieve a valid access token (same as API client)
  const testTokenRetrieval = useCallback(async (): Promise<boolean> => {
    try {
      console.log('🧪 [TASK-MANAGER] Testing direct token retrieval...');
      const session = await fetchAuthSession();
      const token = session.tokens?.accessToken?.toString();
      
      if (!token) {
        console.log('🧪 [TASK-MANAGER] No access token found in direct test');
        return false;
      }

      // Verify the token is not expired (same logic as API client)
      const accessToken = session.tokens?.accessToken;
      if (accessToken && accessToken.payload.exp) {
        const expirationTime = accessToken.payload.exp * 1000; // Convert to milliseconds
        const now = Date.now();
        const bufferTime = 60000; // 1 minute buffer
        const timeUntilExpiry = expirationTime - now;
        
        if (expirationTime - bufferTime < now) {
          console.log('🧪 [TASK-MANAGER] Token found but expired in direct test');
          return false;
        }
        
        console.log(`🧪 [TASK-MANAGER] Valid token found, expires in ${Math.floor(timeUntilExpiry / 1000)}s`);
      }
      
      console.log('🧪 [TASK-MANAGER] Direct token retrieval successful');
      return true;
    } catch (error) {
      console.log('🧪 [TASK-MANAGER] Direct token retrieval failed:', {
        errorName: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }, []);

  // Initialize tasks when authentication is ready
  useEffect(() => {
    initializeTasksWhenReady();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initializeTasksWhenReady = useCallback(async () => {
    const startTime = Date.now();
    console.log('🚀 [TASK-MANAGER] Starting authentication check...', new Date().toISOString());
    
    try {
      // Wait for authentication state to be established with token availability
      let attempts = 0;
      const maxAttempts = 15; // Increased from 10 to 15 seconds for better reliability
      
      while (attempts < maxAttempts) {
        const attemptStart = Date.now();
        console.log(`🔍 [TASK-MANAGER] Auth check attempt ${attempts + 1}/${maxAttempts} at ${new Date().toISOString()}`);
        
        // Provide user feedback for longer waits
        if (attempts === 3) {
          setError('Establishing connection... This may take a moment.');
        } else if (attempts === 7) {
          setError('Still connecting... Please wait.');
        } else if (attempts === 12) {
          setError('Connection taking longer than expected...');
        }
        
        try {
          // Test direct token retrieval (same method as API client)
          const hasValidToken = await testTokenRetrieval();
          const checkDuration = Date.now() - attemptStart;
          
          console.log(`🔍 [TASK-MANAGER] Token test (attempt ${attempts + 1}):`, {
            hasValidToken,
            checkDuration: `${checkDuration}ms`
          });
          
          if (hasValidToken) {
            const totalWaitTime = Date.now() - startTime;
            console.log(`✅ [TASK-MANAGER] Valid token confirmed after ${totalWaitTime}ms, loading tasks...`);
            setError(null); // Clear any pending error messages
            await loadTasks();
            return;
          }
        } catch (error) {
          const attemptDuration = Date.now() - attemptStart;
          console.log(`❌ [TASK-MANAGER] Auth check attempt ${attempts + 1} failed after ${attemptDuration}ms:`, {
            errorName: error instanceof Error ? error.name : 'Unknown',
            errorMessage: error instanceof Error ? error.message : String(error)
          });
        }
        
        attempts++;
        const delayStart = Date.now();
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log(`⏳ [TASK-MANAGER] Waited 1000ms (actual: ${Date.now() - delayStart}ms) before retry`);
      }
      
      // If we reach here, authentication failed
      const totalWaitTime = Date.now() - startTime;
      console.log(`ℹ️ [TASK-MANAGER] No authentication found after ${totalWaitTime}ms and ${maxAttempts} attempts, user needs to log in`);
      setError('Authentication required. Please sign in to continue.');
      setIsLoading(false);
      
    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error(`❌ [TASK-MANAGER] Failed to initialize tasks after ${totalTime}ms:`, {
        errorName: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined
      });
      setError('Unable to initialize application. Please refresh the page and try again.');
      setIsLoading(false);
    }
  }, [testTokenRetrieval, loadTasks]);

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

  // Retry initialization (useful when authentication fails)
  const retryInitialization = useCallback(() => {
    console.log('🔄 [TASK-MANAGER] User requested retry of initialization');
    setError(null);
    setIsLoading(true);
    initializeTasksWhenReady();
  }, [initializeTasksWhenReady]);

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
    retryInitialization, // New retry function for failed authentication
  };
};