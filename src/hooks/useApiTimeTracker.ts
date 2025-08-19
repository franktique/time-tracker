import { useState, useEffect, useCallback } from "react";
import { apiClient, ApiError } from "@/lib/api-client";
import type { Task, ActiveTracker } from "@/types";

export const useApiTimeTracker = (refreshTasks: () => Promise<void>) => {
  const [activeTracker, setActiveTracker] = useState<ActiveTracker | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (activeTracker) {
      interval = setInterval(() => {
        const now = Date.now();
        setElapsedTime((now - activeTracker.startTime) / 1000);
      }, 1000);
    } else {
      setElapsedTime(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTracker]);
  
  const handleStartTracking = useCallback(
    async (taskId: string | number, dateStr: string) => {
      try {
        setError(null);
        
        // Stop any current tracking first
        if (activeTracker) {
          await apiClient.stopTracking(activeTracker.taskId as string, activeTracker.date);
        }

        // Start new tracking
        const response = await apiClient.startTracking(taskId as string, dateStr);
        
        setActiveTracker({ 
          taskId, 
          date: dateStr, 
          startTime: response.startTime 
        });
        setElapsedTime(0);
        
        // Refresh tasks to get updated state
        await refreshTasks();
      } catch (error) {
        console.error('Failed to start tracking:', error);
        setError(error instanceof ApiError ? error.message : 'Failed to start time tracking');
      }
    },
    [activeTracker, refreshTasks]
  );
  
  const handleStopTracking = useCallback(
    async (taskId: string | number, dateStr: string) => {
      if (
        !activeTracker ||
        activeTracker.taskId !== taskId ||
        activeTracker.date !== dateStr
      ) {
        return;
      }

      try {
        setError(null);
        
        await apiClient.stopTracking(taskId as string, dateStr);
        
        setActiveTracker(null);
        setElapsedTime(0);
        
        // Refresh tasks to get updated daily data
        await refreshTasks();
      } catch (error) {
        console.error('Failed to stop tracking:', error);
        setError(error instanceof ApiError ? error.message : 'Failed to stop time tracking');
      }
    },
    [activeTracker, refreshTasks]
  );
  
  return {
    activeTracker,
    elapsedTime,
    error,
    handleStartTracking,
    handleStopTracking,
    setActiveTracker,
    clearError: () => setError(null),
  };
};