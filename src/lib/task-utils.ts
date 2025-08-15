import type { Task } from "@/types";
import { TASK_TYPES, TASK_GROUPS, GROUP_ORDER } from "@/lib/constants";

export const findTodoAndPathById = (
  nodes: Task[], 
  id: string | number, 
  path: (string | number)[] = []
): { node: Task; path: (string | number)[] } | null => {
  if (!nodes) return null;
  for (const node of nodes) {
    const currentPath = [...path, node.id];
    if (node.id === id) {
      return { node, path: currentPath };
    }
    if (node.subtasks && node.subtasks.length > 0) {
      const found = findTodoAndPathById(node.subtasks, id, currentPath);
      if (found) return found;
    }
  }
  return null;
};

export const findTodoById = (todos: Task[], id: string | number): Task | null =>
  findTodoAndPathById(todos, id)?.node ?? null;

export const updateTodoById = (
  todos: Task[], 
  id: string | number, 
  updateFn: (task: Task) => Task
): Task[] => {
  if (!todos) return [];
  return todos.map((t) => {
    if (t.id === id) {
      return updateFn(t);
    }
    const s = t.subtasks || [];
    if (s.length > 0) {
      return { ...t, subtasks: updateTodoById(s, id, updateFn) };
    }
    return t;
  });
};

export const deleteTodoById = (todos: Task[], id: string | number): Task[] => {
  if (!todos) return [];
  return todos.reduce((a: Task[], t) => {
    if (t.id === id) {
      return a;
    }
    const s = t.subtasks || [];
    if (s.length > 0) {
      a.push({ ...t, subtasks: deleteTodoById(s, id) });
    } else {
      a.push(t);
    }
    return a;
  }, []);
};

export const addSubtask = (todos: Task[], parentId: string | number, newSubtask: Task): Task[] => {
  if (!todos) return [];
  return todos.map((t) => {
    if (t.id === parentId) {
      return { ...t, subtasks: [...(t.subtasks || []), newSubtask] };
    }
    const s = t.subtasks || [];
    if (s.length > 0) {
      return { ...t, subtasks: addSubtask(s, parentId, newSubtask) };
    }
    return t;
  });
};

export const calculateAggregatedTimeSeconds = (todo: Task): number => {
  if (!todo) return 0;
  let tS = 0;
  const s = todo.subtasks || [];
  if (s.length === 0) {
    if (todo.type === TASK_TYPES.MANUAL || todo.type === TASK_TYPES.RECORD) {
      tS = Object.values(todo.dailyData || {}).reduce((sum, daily) => {
        const sec =
          todo.type === TASK_TYPES.MANUAL
            ? (daily.value || 0) * 3600
            : daily.value || 0;
        return sum + (isNaN(sec) ? 0 : sec);
      }, 0);
    }
    if (todo.type === TASK_TYPES.RECORD && todo.isTracking && todo.startTime) {
      tS += (Date.now() - todo.startTime) / 1000;
    }
  } else {
    tS = s.reduce((sum, sub) => sum + calculateAggregatedTimeSeconds(sub), 0);
  }
  return tS;
};

export const initializeTodosStructure = (todos: Task[]): Task[] => {
  if (!todos) return [];
  return todos.map((t) => ({
    id: t.id || Date.now(),
    text: t.text || "",
    completed: t.completed || false,
    type: t.type || TASK_TYPES.UNIQUE,
    group: t.group || TASK_GROUPS.OTHER,
    dailyData: t.dailyData || {},
    people: t.people || [],
    isTracking: false,
    startTime: null,
    trackingDate: null,
    subtasks: t.subtasks ? initializeTodosStructure(t.subtasks) : [],
  }));
};

export const filterTodos = (todos: Task[], hideCompleted: boolean): Task[] => {
  if (!todos) return [];
  const fCL = hideCompleted ? todos.filter((t) => !t.completed) : todos;
  return fCL.map((t) => ({
    ...t,
    subtasks: filterTodos(t.subtasks || [], hideCompleted),
  }));
};

export const sortTasks = (a: Task, b: Task): number => {
  const orderA = GROUP_ORDER[a.group] || 99;
  const orderB = GROUP_ORDER[b.group] || 99;
  return orderA - orderB;
};

export const sortTaskTree = (tasks: Task[]): Task[] => {
  if (!tasks) return [];
  const tWSC = tasks.map((t) => ({
    ...t,
    subtasks: sortTaskTree(t.subtasks || []),
  }));
  return tWSC.sort(sortTasks);
};

export const checkAndUpdateParentCompletion = (tasks: Task[], childId: string | number): Task[] => {
  const result = findTodoAndPathById(tasks, childId);
  if (!result || result.path.length <= 1) {
    return tasks;
  }
  const parentId = result.path[result.path.length - 2];
  const parentResult = findTodoAndPathById(tasks, parentId);
  if (!parentResult || !parentResult.node) {
    return tasks;
  }
  const parentNode = parentResult.node;
  const siblings = parentNode.subtasks || [];
  const leafSiblings = siblings.filter(
    (t) => !t.subtasks || t.subtasks.length === 0
  );
  let allLeafChildrenCompleted = false;
  if (leafSiblings.length > 0) {
    allLeafChildrenCompleted = leafSiblings.every((leaf) => leaf.completed);
  } else {
    allLeafChildrenCompleted = false;
  }
  let treeNeedsUpdate = false;
  let newParentStatus = parentNode.completed;
  if (allLeafChildrenCompleted && !parentNode.completed) {
    newParentStatus = true;
    treeNeedsUpdate = true;
  } else if (!allLeafChildrenCompleted && parentNode.completed) {
    newParentStatus = false;
    treeNeedsUpdate = true;
  }
  let updatedTree = tasks;
  if (treeNeedsUpdate) {
    updatedTree = updateTodoById(tasks, parentId, (node) => ({
      ...node,
      completed: newParentStatus,
      isTracking: false,
      startTime: null,
      trackingDate: null,
    }));
    updatedTree = checkAndUpdateParentCompletion(updatedTree, parentId);
  }
  return updatedTree;
};