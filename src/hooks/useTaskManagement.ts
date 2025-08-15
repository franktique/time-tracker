import { useState, useCallback } from "react";
import { 
  updateTodoById, 
  deleteTodoById, 
  addSubtask, 
  checkAndUpdateParentCompletion,
  findTodoById 
} from "@/lib/task-utils";
import { TASK_TYPES, TASK_GROUPS } from "@/lib/constants";
import type { Task, ActiveTracker } from "@/types";
import type { TaskType, TaskGroup } from "@/lib/constants";

export const useTaskManagement = (
  rootTask: Task,
  setRootTask: (task: Task) => void,
  activeTracker: ActiveTracker | null,
  setActiveTracker: (tracker: ActiveTracker | null) => void,
  expandedIds: Set<string | number>,
  setExpandedIds: (ids: Set<string | number>) => void
) => {
  const [editingTodoId, setEditingTodoId] = useState<string | number | null>(null);
  const [editText, setEditText] = useState("");
  const [isAddingTaskTo, setIsAddingTaskTo] = useState<string | number | "root" | null>(null);
  const [newTaskInputValue, setNewTaskInputValue] = useState("");
  const [newTaskType, setNewTaskType] = useState<TaskType>(TASK_TYPES.UNIQUE);
  const [newTaskGroup, setNewTaskGroup] = useState<TaskGroup>(TASK_GROUPS.OTHER);
  
  const handleRequestAddTask = useCallback(
    (parentId: string | number | "root") => {
      const p = parentId === "root" ? rootTask : findTodoById(rootTask.subtasks, parentId);
      if (p?.completed && parentId !== "root") return;
      const iG = parentId !== "root" && p?.group ? p.group : TASK_GROUPS.OTHER;
      setIsAddingTaskTo(parentId);
      setNewTaskInputValue("");
      setNewTaskType(TASK_TYPES.UNIQUE);
      setNewTaskGroup(iG);
    },
    [rootTask]
  );
  
  const handleConfirmAddTask = useCallback(() => {
    if (!newTaskInputValue.trim() || isAddingTaskTo === null) return;
    const nT: Task = {
      id: Date.now(),
      text: newTaskInputValue.trim(),
      type: newTaskType,
      group: newTaskGroup,
      completed: false,
      dailyData: {},
      subtasks: [],
      isTracking: false,
      startTime: null,
      trackingDate: null,
      people: [],
    };
    
    if (isAddingTaskTo === "root") {
      setRootTask({ ...rootTask, subtasks: [...(rootTask.subtasks || []), nT] });
    } else {
      setRootTask({ ...rootTask, subtasks: addSubtask(rootTask.subtasks, isAddingTaskTo, nT) });
      setExpandedIds(new Set(expandedIds).add(isAddingTaskTo));
    }
    setIsAddingTaskTo(null);
    setNewTaskInputValue("");
  }, [newTaskInputValue, newTaskType, newTaskGroup, isAddingTaskTo, rootTask, setRootTask, expandedIds, setExpandedIds]);
  
  const handleDoubleClick = useCallback(
    (task: Task) => {
      if (task.completed || activeTracker) return;
      setEditingTodoId(task.id);
      setEditText(task.text);
    },
    [activeTracker]
  );
  
  const handleEditSave = useCallback(
    (id: string | number) => {
      const t = editText.trim();
      setRootTask({
        ...rootTask,
        subtasks: updateTodoById(rootTask.subtasks, id, (td) => ({
          ...td,
          text: t || td.text,
        })),
      });
      setEditingTodoId(null);
      setEditText("");
    },
    [editText, rootTask, setRootTask]
  );
  
  const handleDelete = useCallback(
    (id: string | number) => {
      if (activeTracker?.taskId === id) {
        setActiveTracker(null);
      }
      if (editingTodoId === id) {
        setEditingTodoId(null);
        setEditText("");
      }
      setRootTask({
        ...rootTask,
        subtasks: deleteTodoById(rootTask.subtasks, id),
      });
      const newExpandedIds = new Set(expandedIds);
      newExpandedIds.delete(id);
      setExpandedIds(newExpandedIds);
    },
    [activeTracker, editingTodoId, rootTask, setRootTask, expandedIds, setExpandedIds, setActiveTracker]
  );
  
  const handleToggleOverallComplete = useCallback(
    (id: string | number, shouldBeComplete: boolean) => {
      if (shouldBeComplete && activeTracker?.taskId === id) {
        console.warn("Cannot complete task while tracking");
        return;
      }
      let updatedTree = rootTask.subtasks || [];
      updatedTree = updateTodoById(updatedTree, id, (td) => ({
        ...td,
        completed: shouldBeComplete,
        isTracking: false,
        startTime: null,
        trackingDate: null,
      }));
      updatedTree = checkAndUpdateParentCompletion(updatedTree, id);
      setRootTask({ ...rootTask, subtasks: updatedTree });
      if (shouldBeComplete && activeTracker?.taskId === id) {
        setActiveTracker(null);
      }
    },
    [activeTracker, rootTask, setRootTask, setActiveTracker]
  );
  
  const handleUpdateDailyData = useCallback((taskId: string | number, dateStr: string, dataUpdate: Record<string, unknown>) => {
    setRootTask({
      ...rootTask,
      subtasks: updateTodoById(rootTask.subtasks, taskId, (t) => ({
        ...t,
        dailyData: {
          ...t.dailyData,
          [dateStr]: { ...(t.dailyData?.[dateStr] || {}), ...dataUpdate },
        },
      })),
    });
  }, [rootTask, setRootTask]);
  
  return {
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
  };
};