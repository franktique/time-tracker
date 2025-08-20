import { useState, useEffect, useCallback } from "react";
import { updateTodoById } from "@/lib/task-utils";
import type { Task, ActiveTracker } from "@/types";

export const useTimeTracker = (
  rootTask: Task,
  setRootTask: (task: Task | ((prev: Task) => Task)) => void
) => {
  const [activeTracker, setActiveTracker] = useState<ActiveTracker | null>(
    null
  );
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    let i: NodeJS.Timeout | null = null;
    if (activeTracker) {
      i = setInterval(() => {
        const n = Date.now();
        setElapsedTime((n - activeTracker.startTime) / 1000);
      }, 1000);
    } else {
      setElapsedTime(0);
    }
    return () => {
      if (i) clearInterval(i);
    };
  }, [activeTracker]);

  const handleStartTracking = useCallback(
    (taskId: string | number, dateStr: string) => {
      if (activeTracker) {
        console.info("Stopping current tracker...");
        // Inline stop tracking to avoid circular dependency
        const n = Date.now();
        const sT = activeTracker.startTime;
        const dS = (n - sT) / 1000;
        setRootTask((prevTask) => ({
          ...prevTask,
          subtasks: updateTodoById(
            prevTask.subtasks,
            activeTracker.taskId,
            (t) => {
              const eDS = t.dailyData?.[activeTracker.date]?.value || 0;
              return {
                ...t,
                isTracking: false,
                startTime: null,
                trackingDate: null,
                dailyData: {
                  ...t.dailyData,
                  [activeTracker.date]: {
                    ...(t.dailyData?.[activeTracker.date] || {}),
                    value: eDS + dS,
                  },
                },
              };
            }
          ),
        }));
      }
      const n = Date.now();
      setRootTask((prevTask) => ({
        ...prevTask,
        subtasks: updateTodoById(prevTask.subtasks, taskId, (td) => ({
          ...td,
          isTracking: true,
          startTime: n,
          trackingDate: dateStr,
        })),
      }));
      setActiveTracker({ taskId, date: dateStr, startTime: n });
      setElapsedTime(0);
    },
    [activeTracker, setRootTask]
  );

  const handleStopTracking = useCallback(
    (taskId: string | number, dateStr: string) => {
      if (
        !activeTracker ||
        activeTracker.taskId !== taskId ||
        activeTracker.date !== dateStr
      ) {
        return;
      }
      const n = Date.now();
      const sT = activeTracker.startTime;
      const dS = (n - sT) / 1000;
      setRootTask((prevTask) => ({
        ...prevTask,
        subtasks: updateTodoById(prevTask.subtasks, taskId, (t) => {
          const eDS = t.dailyData?.[dateStr]?.value || 0;
          return {
            ...t,
            isTracking: false,
            startTime: null,
            trackingDate: null,
            dailyData: {
              ...t.dailyData,
              [dateStr]: { ...(t.dailyData?.[dateStr] || {}), value: eDS + dS },
            },
          };
        }),
      }));
      setActiveTracker(null);
      setElapsedTime(0);
    },
    [activeTracker, setRootTask]
  );

  return {
    activeTracker,
    elapsedTime,
    handleStartTracking,
    handleStopTracking,
    setActiveTracker,
  };
};
