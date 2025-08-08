"use client";
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  Plus,
  Trash2,
  Check,
  X,
  Play,
  Square,
  PlusCircle,
  ChevronDown,
  ChevronRight,
  XCircle,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  Calendar,
  CalendarDays,
  Edit2,
  Users,
  ListChecks,
  UserPlus,
  Building,
} from "lucide-react";

// --- Constants ---
const TASK_TYPES = {
  /* ... */ UNIQUE: "tarea unica",
  REPETITIVE: "tarea repetitiva",
  MANUAL: "tiempo manual",
  RECORD: "grabar tiempo",
  QUANTITY: "cantidad",
};
const TASK_GROUPS = {
  URGENT: "urgent",
  ROUTINE: "routine",
  PROJECT: "project",
  OTHER: "other",
};
const GROUP_ORDER = {
  [TASK_GROUPS.URGENT]: 1,
  [TASK_GROUPS.ROUTINE]: 2,
  [TASK_GROUPS.PROJECT]: 3,
  [TASK_GROUPS.OTHER]: 4,
};
const GROUP_COLORS = {
  /* ... */ [TASK_GROUPS.URGENT]: {
    base: "bg-orange-100",
    hover: "bg-orange-200",
  },
  [TASK_GROUPS.ROUTINE]: { base: "bg-green-100", hover: "bg-green-200" },
  [TASK_GROUPS.PROJECT]: { base: "bg-blue-100", hover: "bg-blue-200" },
  [TASK_GROUPS.OTHER]: { base: "bg-white", hover: "bg-gray-100" },
};
const WEEK_DAYS_SHORT = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];
const VIEWS = {
  TIMESHEET: "Hoja de Tiempos",
  SEGUIMIENTO: "Seguimiento",
  EQUIPOS: "Equipos",
}; // Added EQUIPOS

// --- Date Helper Functions ---
const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getMonthName = (monthIndex, locale = "es-ES") => {
  /* ... */ const d = new Date();
  d.setMonth(monthIndex);
  return d.toLocaleString(locale, { month: "long" });
};
const formatDate = (date, format = "YYYY-MM-DD") => {
  /* ... */ const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  if (format === "YYYY-MM-DD") return `${y}-${m}-${d}`;
  return date.toLocaleDateString("es-ES");
};
const getDayOfWeekMondayFirst = (date) => {
  /* ... */ const day = date.getDay();
  return day === 0 ? 6 : day - 1;
};

// --- Core Helper Functions ---
const formatTime = (totalSeconds) => {
  /* ... */ if (totalSeconds < 0 || !totalSeconds) totalSeconds = 0;
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(
    s
  ).padStart(2, "0")}`;
};
const formatHours = (totalSeconds) => {
  /* ... */ if (totalSeconds < 0 || !totalSeconds) return "0.0";
  const h = totalSeconds / 3600;
  return h.toFixed(1);
};
const findTodoAndPathById = (nodes, id, path = []) => {
  /* ... */ if (!nodes) return null;
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
const findTodoById = (todos, id) => findTodoAndPathById(todos, id)?.node;
const updateTodoById = (todos, id, updateFn) => {
  /* ... */ if (!todos) return [];
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
const deleteTodoById = (todos, id) => {
  /* ... */ if (!todos) return [];
  return todos.reduce((a, t) => {
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
const addSubtask = (todos, parentId, newSubtask) => {
  /* ... */ if (!todos) return [];
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
const calculateAggregatedTimeSeconds = (todo) => {
  /* ... */ if (!todo) return 0;
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
const initializeTodosStructure = (todos) => {
  /* ... */ if (!todos) return [];
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
const filterTodos = (todos, hideCompleted) => {
  /* ... */ if (!todos) return [];
  const fCL = hideCompleted ? todos.filter((t) => !t.completed) : todos;
  return fCL.map((t) => ({
    ...t,
    subtasks: filterTodos(t.subtasks || [], hideCompleted),
  }));
};
const sortTasks = (a, b) => {
  /* ... */ const orderA = GROUP_ORDER[a.group] || 99;
  const orderB = GROUP_ORDER[b.group] || 99;
  return orderA - orderB;
};
const sortTaskTree = (tasks) => {
  /* ... */ if (!tasks) return [];
  const tWSC = tasks.map((t) => ({
    ...t,
    subtasks: sortTaskTree(t.subtasks || []),
  }));
  return tWSC.sort(sortTasks);
};
const checkAndUpdateParentCompletion = (tasks, childId) => {
  /* ... */ const result = findTodoAndPathById(tasks, childId);
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
const getInitials = (name) => {
  /* ... */ if (!name || typeof name !== "string") return "?";
  const parts = name
    .trim()
    .split(" ")
    .filter((part) => part.length > 0);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + (parts[parts.length - 1][0] || "")).toUpperCase();
};

// --- AddTaskModal Component ---
const AddTaskModal = ({
  isOpen,
  value,
  taskType,
  group,
  onValueChange,
  onTypeChange,
  onGroupChange,
  onConfirm,
  onCancel,
  parentTaskName,
  isSubtask,
}) => {
  /* ... (no changes) ... */
  const iR = useRef(null);
  useEffect(() => {
    if (isOpen && iR.current) iR.current.focus();
  }, [isOpen]);
  const kP = (e) => {
    if (e.key === "Enter" && value.trim()) onConfirm();
  };
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      {" "}
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        {" "}
        <div className="flex justify-between items-center mb-4">
          {" "}
          <h2 className="text-xl font-semibold text-gray-800">
            {parentTaskName
              ? `Añadir Subtarea a "${parentTaskName}"`
              : "Añadir Nueva Tarea"}
          </h2>{" "}
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <XCircle size={20} />
          </button>{" "}
        </div>{" "}
        <input
          ref={iR}
          type="text"
          value={value}
          onChange={onValueChange}
          onKeyPress={kP}
          placeholder="Nombre de la tarea..."
          className="w-full p-3 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
        />{" "}
        <div className="mb-4">
          {" "}
          <label
            htmlFor="tTS"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Tipo de Tarea:
          </label>{" "}
          <select
            id="tTS"
            value={taskType}
            onChange={onTypeChange}
            className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
          >
            {" "}
            {Object.values(TASK_TYPES).map((t) => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}{" "}
          </select>{" "}
        </div>{" "}
        <div className="mb-4">
          {" "}
          <label
            htmlFor="tGS"
            className={`block text-sm font-medium mb-1 ${
              isSubtask ? "text-gray-400" : "text-gray-700"
            }`}
          >
            Grupo:
          </label>{" "}
          <select
            id="tGS"
            value={group}
            onChange={onGroupChange}
            className={`w-full p-3 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 ${
              isSubtask
                ? "border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed"
                : "border-gray-300"
            }`}
            disabled={isSubtask}
          >
            {" "}
            {Object.values(TASK_GROUPS).map((g) => (
              <option key={g} value={g}>
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </option>
            ))}{" "}
          </select>{" "}
        </div>{" "}
        <div className="flex justify-end gap-3">
          {" "}
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition duration-200"
          >
            Cancelar
          </button>{" "}
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-white rounded-lg transition duration-200 ${
              !value.trim()
                ? "bg-blue-300 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600"
            }`}
            disabled={!value.trim()}
          >
            Aceptar
          </button>{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
};

// --- Grid Cell Component (Accepts handlers object) ---
const GridCell = ({ task, date, activeTracker, handlers }) => {
  /* ... (no changes) ... */
  const yyyymmdd = formatDate(date, "YYYY-MM-DD");
  const iCTT =
    activeTracker?.taskId === task.id && activeTracker?.date === yyyymmdd;
  const [iH, sIH] = useState(false);
  const [mIV, sMIV] = useState(() => {
    if (task.type === TASK_TYPES.MANUAL || task.type === TASK_TYPES.QUANTITY) {
      const dD = task.dailyData?.[yyyymmdd] || {};
      return dD.value !== undefined ? String(dD.value) : "";
    }
    return "";
  });
  const isParent = task.subtasks && task.subtasks.length > 0;
  useEffect(() => {
    const cDD = task.dailyData?.[yyyymmdd] || {};
    if (task.type === TASK_TYPES.MANUAL || task.type === TASK_TYPES.QUANTITY) {
      sMIV(cDD.value !== undefined ? String(cDD.value) : "");
    } else {
      sMIV("");
    }
  }, [yyyymmdd, task.type]);
  const hMIC = (e) => {
    const v = e.target.value;
    if (task.type === TASK_TYPES.MANUAL) {
      if (/^\d*\.?\d*$/.test(v)) sMIV(v);
    } else if (task.type === TASK_TYPES.QUANTITY) {
      if (/^\d*$/.test(v)) sMIV(v);
    }
  };
  const hMIB = () => {
    const cDD = task.dailyData?.[yyyymmdd] || {};
    let fV;
    let cSV = cDD.value;
    if (task.type === TASK_TYPES.MANUAL) {
      const h = parseFloat(mIV) || 0;
      fV = h;
      sMIV(h > 0 ? h.toFixed(1) : "");
      if (cSV === undefined) cSV = 0;
    } else {
      const q = parseInt(mIV, 10) || 0;
      fV = q;
      sMIV(q > 0 ? String(q) : "");
      if (cSV === undefined) cSV = 0;
    }
    if (fV !== cSV) {
      handlers.onUpdateDailyData(task.id, yyyymmdd, { value: fV });
    }
  };
  const hUC = () => {
    const cDD = task.dailyData?.[yyyymmdd] || {};
    const wBC = !cDD.completed;
    handlers.onUpdateDailyData(task.id, yyyymmdd, { completed: wBC });
    handlers.onToggleOverallComplete(task.id, wBC);
  };
  const hRT = () => {
    const cDD = task.dailyData?.[yyyymmdd] || {};
    handlers.onUpdateDailyData(task.id, yyyymmdd, {
      completed: !cDD.completed,
    });
  };
  const rCC = () => {
    const dailyData = task.dailyData?.[yyyymmdd] || {};
    const canInteractGenerally = !isParent && !task.completed;
    const canUncheckUnique =
      !isParent && task.type === TASK_TYPES.UNIQUE && dailyData.completed;
    if (isParent) return null;
    switch (task.type) {
      case TASK_TYPES.UNIQUE:
        if (dailyData.completed)
          return (
            <button
              onClick={hUC}
              className="w-full h-full flex items-center justify-center bg-yellow-400 text-white rounded"
            >
              <X size={14} />
            </button>
          );
        if (iH && canInteractGenerally)
          return (
            <button
              onClick={hUC}
              className="w-full h-full flex items-center justify-center bg-green-500 text-white rounded"
            >
              <Check size={14} />
            </button>
          );
        return null;
      case TASK_TYPES.REPETITIVE:
        if (dailyData.completed)
          return (
            <button
              onClick={hRT}
              disabled={task.completed}
              className={`w-full h-full flex items-center justify-center rounded ${
                task.completed
                  ? "bg-green-200 text-white cursor-not-allowed"
                  : "bg-green-500 text-white"
              }`}
            >
              <Check size={14} />
            </button>
          );
        if (iH && !task.completed)
          return (
            <button
              onClick={hRT}
              className="w-full h-full flex items-center justify-center bg-gray-300 text-gray-600 rounded"
            >
              <Check size={14} />
            </button>
          );
        return null;
      case TASK_TYPES.MANUAL:
        return (
          <input
            type="text"
            inputMode="decimal"
            value={mIV}
            onChange={hMIC}
            onBlur={hMIB}
            placeholder="0.0"
            className={`w-full h-full text-center border-none focus:outline-none focus:ring-1 focus:ring-blue-400 rounded bg-transparent text-xs p-0 ${
              task.completed ? "text-gray-400 cursor-not-allowed" : ""
            }`}
            disabled={task.completed}
          />
        );
      case TASK_TYPES.QUANTITY:
        return (
          <input
            type="number"
            step="1"
            value={mIV}
            onChange={hMIC}
            onBlur={hMIB}
            placeholder="0"
            className={`w-full h-full text-center border-none focus:outline-none focus:ring-1 focus:ring-blue-400 rounded bg-transparent text-xs p-0 ${
              task.completed ? "text-gray-400 cursor-not-allowed" : ""
            }`}
            disabled={task.completed}
          />
        );
      case TASK_TYPES.RECORD:
        const rS = dailyData.value || 0;
        const tT = `Grabado: ${formatTime(rS)}`;
        if (iCTT) {
          return (
            <button
              onClick={() => handlers.onStopTracking(task.id, yyyymmdd)}
              className="w-full h-full flex items-center justify-center bg-red-500 text-white rounded animate-pulse"
              title={`Detener grabación (Total: ${formatTime(rS)})`}
            >
              {" "}
              <Square size={14} />{" "}
            </button>
          );
        } else if (iH && !task.completed) {
          return (
            <button
              onClick={() => handlers.onStartTracking(task.id, yyyymmdd)}
              className="w-full h-full flex items-center justify-center bg-gray-500 hover:bg-gray-600 text-white rounded relative group"
              title={tT}
            >
              {" "}
              <Play size={14} />{" "}
            </button>
          );
        } else if (rS > 0) {
          return (
            <span className="text-gray-700 text-center block p-1 text-xs">
              {formatTime(rS)}
            </span>
          );
        } else {
          return null;
        }
      default:
        return null;
    }
  };
  const handleMouseEnter = () => {
    sIH(true);
    if (!isParent) handlers.onCellMouseEnter(task.id);
  };
  const handleMouseLeave = () => {
    sIH(false);
    if (!isParent) handlers.onCellMouseLeave();
  };
  return (
    <div
      className={`h-10 border-r border-gray-200 flex items-center justify-center text-xs relative ${
        isParent ? "cursor-not-allowed bg-gray-50" : ""
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {" "}
      {rCC()}{" "}
    </div>
  );
};

// --- TaskItem Component (Using handlers object) ---
const TaskItem = ({
  task,
  level,
  activeTracker,
  editingTodoId,
  editText,
  handlers, // Now expects a handlers object
  isExpanded,
  onToggleExpand, // onToggleExpand is the handler object from App
  hideCompleted,
  onRequestYearView,
  hoveredTaskId,
  currentView, // *** NEW PROP: Needed to show correct buttons ***
}) => {
  /* ... (no changes) ... */
  const aTS = useMemo(() => calculateAggregatedTimeSeconds(task), [task]);
  const hS = task.subtasks && task.subtasks.length > 0;
  const vS = useMemo(() => {
    if (!hS) return [];
    return task.subtasks.filter((st) => !hideCompleted || !st.completed);
  }, [task.subtasks, hS, hideCompleted]);
  const hVS = vS.length > 0;
  const iOC = task.completed;
  const {
    onToggleOverallComplete,
    onDelete,
    onRequestAddSubtask,
    onDoubleClick,
    onEditChange,
    onEditSave,
    onEditKeyDown,
    onEditBlur,
  } = handlers;
  const displayValue = useMemo(() => {
    if (task.type === TASK_TYPES.RECORD) {
      return formatTime(aTS);
    }
    if (task.type === TASK_TYPES.MANUAL || hS) {
      const h = formatHours(aTS);
      if (parseFloat(h) > 0 || hS) {
        return `${h}h`;
      }
    }
    return null;
  }, [task.type, aTS, hS]);
  const isHovered = hoveredTaskId === task.id;
  const isEditingThis = editingTodoId === task.id;
  const groupColorInfo =
    GROUP_COLORS[task.group] || GROUP_COLORS[TASK_GROUPS.OTHER];
  let baseBgColor = groupColorInfo.base;
  let finalBgColor = baseBgColor;
  if (iOC) {
    finalBgColor = "bg-gray-100 opacity-60";
  } else if (isHovered && !isEditingThis) {
    finalBgColor = groupColorInfo.hover;
  }
  const isProjectTask = task.group === TASK_GROUPS.PROJECT;
  return (
    <div className={`ml-${level * 4} group border-b border-gray-200`}>
      {" "}
      <div
        className={`flex items-center justify-between h-10 overflow-hidden ${finalBgColor} ${
          isEditingThis ? "shadow-md ring-1 ring-blue-300" : ""
        }`}
      >
        {" "}
        <div className="flex-grow mr-3 min-w-0 flex items-center pl-2">
          {" "}
          {hVS && (
            <button
              onClick={() => onToggleExpand.toggle(task.id)}
              className="mr-1 p-1 text-gray-500 hover:text-gray-800 flex-shrink-0"
            >
              {isExpanded ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
            </button>
          )}{" "}
          {((!hVS && hS) || !hS) && (
            <span className="w-[28px] mr-1 flex-shrink-0"></span>
          )}{" "}
          <div className="flex-grow mr-2">
            {" "}
            {isEditingThis ? (
              <input
                type="text"
                value={editText}
                onChange={onEditChange}
                onKeyDown={(e) => onEditKeyDown(e, task.id)}
                onBlur={() => onEditBlur(task.id)}
                className="w-full p-1 border border-blue-300 rounded-md focus:outline-none text-sm bg-white"
                autoFocus
              />
            ) : (
              <span
                onDoubleClick={() => onDoubleClick(task)}
                className={`block break-words text-sm ${
                  !iOC ? "cursor-pointer" : "cursor-default"
                } ${iOC ? "line-through text-gray-500" : "text-gray-800"}`}
                title={iOC ? "Tarea completada" : "Doble clic para editar"}
              >
                {task.text}
              </span>
            )}{" "}
          </div>{" "}
          {displayValue && (
            <span className="text-xs text-gray-500 mr-2 flex-shrink-0">
              {displayValue}
            </span>
          )}{" "}
        </div>{" "}
        {!isEditingThis && (
          <div className="flex items-center space-x-1 flex-shrink-0 pr-2">
            {" "}
            {currentView === VIEWS.SEGUIMIENTO && isProjectTask && (
              <button
                onClick={() => alert("Funcionalidad asignar persona pendiente")}
                className="p-1 text-purple-500 hover:text-purple-700 transition duration-200"
                aria-label="Asignar persona"
                title="Asignar persona"
              >
                {" "}
                <UserPlus size={14} />{" "}
              </button>
            )}{" "}
            {currentView === VIEWS.TIMESHEET && (
              <button
                onClick={() => onRequestYearView(task.id)}
                className="p-1 text-indigo-500 hover:text-indigo-700 transition duration-200"
                aria-label="Vista anual"
                title="Vista anual"
              >
                {" "}
                <CalendarDays size={14} />{" "}
              </button>
            )}{" "}
            {currentView === VIEWS.TIMESHEET &&
              (task.type === TASK_TYPES.REPETITIVE ||
                task.type === TASK_TYPES.MANUAL ||
                task.type === TASK_TYPES.RECORD ||
                task.type === TASK_TYPES.QUANTITY) && (
                <button
                  onClick={() =>
                    onToggleOverallComplete(task.id, !task.completed)
                  }
                  className={`p-1 rounded transition duration-200 ${
                    task.completed
                      ? "text-yellow-500 hover:text-yellow-600"
                      : "text-green-500 hover:text-green-600"
                  }`}
                  title={
                    task.completed
                      ? "Marcar como incompleta"
                      : "Marcar como completada"
                  }
                  disabled={activeTracker !== null}
                >
                  {" "}
                  {task.completed ? <X size={14} /> : <Check size={14} />}{" "}
                </button>
              )}{" "}
            {currentView === VIEWS.TIMESHEET && (
              <button
                onClick={() => onRequestAddSubtask(task.id)}
                className="p-1 text-blue-500 hover:text-blue-600 transition duration-200"
                aria-label="Añadir subtarea"
                title="Añadir subtarea"
                disabled={activeTracker !== null || task.completed}
              >
                {" "}
                <PlusCircle size={14} />{" "}
              </button>
            )}{" "}
            <button
              onClick={() => onDelete(task.id)}
              className="p-1 text-red-500 hover:text-red-600 transition duration-200"
              aria-label="Eliminar tarea"
              title="Eliminar tarea"
              disabled={activeTracker !== null}
            >
              {" "}
              <Trash2 size={14} />{" "}
            </button>{" "}
          </div>
        )}{" "}
      </div>{" "}
      {hVS && isExpanded && (
        <div className="pl-0">
          {" "}
          {vS.map((sub) => (
            <TaskItem
              key={sub.id}
              task={sub}
              level={level + 1}
              activeTracker={activeTracker}
              editingTodoId={editingTodoId}
              editText={editText}
              handlers={handlers}
              isExpanded={onToggleExpand.isExpanded(sub.id)}
              onToggleExpand={onToggleExpand}
              hideCompleted={hideCompleted}
              onRequestYearView={onRequestYearView}
              hoveredTaskId={hoveredTaskId}
              currentView={currentView}
            />
          ))}{" "}
        </div>
      )}{" "}
    </div>
  );
};

// --- GridRow Component (Accepts handlers object) ---
const GridRow = ({
  task,
  level,
  monthDays,
  activeTracker,
  handlers,
  isExpanded,
  expandCollapseHandler,
  hideCompleted,
}) => {
  /* ... (no changes) ... */
  const hS = task.subtasks && task.subtasks.length > 0;
  const vS = useMemo(() => {
    if (!hS) return [];
    return (task.subtasks || []).filter(
      (st) => !hideCompleted || !st.completed
    );
  }, [task.subtasks, hS, hideCompleted]);
  const hVS = vS.length > 0;
  const sS = hVS && isExpanded;
  return (
    <>
      {" "}
      <div className="flex border-b border-gray-200">
        {" "}
        {monthDays.map((day) => (
          <div key={formatDate(day)} className="flex-shrink-0 w-[60px]">
            {" "}
            <GridCell
              task={task}
              date={day}
              activeTracker={activeTracker}
              handlers={handlers}
            />{" "}
          </div>
        ))}{" "}
      </div>{" "}
      {sS && (
        <div className={`ml-${level * 0} pl-0`}>
          {" "}
          {vS.map((sub) => (
            <GridRow
              key={sub.id}
              task={sub}
              level={level + 1}
              monthDays={monthDays}
              activeTracker={activeTracker}
              handlers={handlers}
              isExpanded={expandCollapseHandler.isExpanded(sub.id)}
              expandCollapseHandler={expandCollapseHandler}
              hideCompleted={hideCompleted}
            />
          ))}{" "}
        </div>
      )}{" "}
    </>
  );
};

// --- YearlyCalendarModal Component ---
const YearlyCalendarModal = ({ isOpen, task, year, onClose, onYearChange }) => {
  /* ... (no changes) ... */
  if (!isOpen || !task) return null;
  const months = Array.from({ length: 12 }, (_, i) => i);
  const hasDataForDay = (checkDate) => {
    const dS = formatDate(checkDate, "YYYY-MM-DD");
    const dD = task.dailyData?.[dS];
    if (!dD) return false;
    return (
      dD.completed === true ||
      (dD.value !== undefined && dD.value !== 0 && !isNaN(dD.value))
    );
  };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      {" "}
      <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 w-full max-w-4xl max-h-[90vh] flex flex-col">
        {" "}
        <div className="flex justify-between items-center mb-4 pb-2 border-b">
          {" "}
          <h2 className="text-xl font-semibold text-gray-800 truncate pr-4">
            {" "}
            Vista Anual: <span className="text-indigo-600">
              {task.text}
            </span>{" "}
          </h2>{" "}
          <div className="flex items-center space-x-2">
            {" "}
            <button
              onClick={() => onYearChange(year - 1)}
              className="p-1 text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft size={20} />
            </button>{" "}
            <span className="text-lg font-medium w-20 text-center">{year}</span>{" "}
            <button
              onClick={() => onYearChange(year + 1)}
              className="p-1 text-gray-600 hover:text-gray-900"
            >
              <ChevronRightIcon size={20} />
            </button>{" "}
          </div>{" "}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 ml-4"
          >
            {" "}
            <XCircle size={24} />{" "}
          </button>{" "}
        </div>{" "}
        <div className="flex-grow overflow-y-auto">
          {" "}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {" "}
            {months.map((mI) => {
              const mN = getMonthName(mI);
              const dIM = getDaysInMonth(year, mI);
              const fDOM = new Date(year, mI, 1);
              const sDOW = getDayOfWeekMondayFirst(fDOM);
              const dA = Array.from({ length: dIM }, (_, i) => i + 1);
              return (
                <div key={mI} className="p-2 border rounded-lg">
                  {" "}
                  <h3 className="text-center font-semibold text-sm mb-2 capitalize">
                    {mN}
                  </h3>{" "}
                  <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-1">
                    {" "}
                    {WEEK_DAYS_SHORT.map((d) => (
                      <div key={d}>{d}</div>
                    ))}{" "}
                  </div>{" "}
                  <div className="grid grid-cols-7 gap-1">
                    {" "}
                    {Array.from({ length: sDOW }).map((_, i) => (
                      <div key={`pad-${i}`}></div>
                    ))}{" "}
                    {dA.map((dN) => {
                      const cD = new Date(year, mI, dN);
                      const hD = hasDataForDay(cD);
                      return (
                        <div
                          key={dN}
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs border ${
                            hD
                              ? "bg-green-100 border-green-300 text-green-800 font-medium"
                              : "border-gray-200 text-gray-600"
                          }`}
                          title={formatDate(cD)}
                        >
                          {" "}
                          {dN}{" "}
                        </div>
                      );
                    })}{" "}
                  </div>{" "}
                </div>
              );
            })}{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
};

// --- Components for Teams View ---
const AddTeamModal = ({ isOpen, value, onChange, onConfirm, onCancel }) => {
  /* ... (no changes) ... */
  const inputRef = useRef(null);
  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && value.trim()) onConfirm();
  };
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      {" "}
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
        {" "}
        <div className="flex justify-between items-center mb-4">
          {" "}
          <h2 className="text-xl font-semibold text-gray-800">
            Nuevo Equipo
          </h2>{" "}
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <XCircle size={20} />
          </button>{" "}
        </div>{" "}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={onChange}
          onKeyPress={handleKeyPress}
          placeholder="Nombre del equipo..."
          className="w-full p-3 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />{" "}
        <div className="flex justify-end gap-3">
          {" "}
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Cancelar
          </button>{" "}
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-white rounded-lg ${
              !value.trim()
                ? "bg-blue-300 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600"
            }`}
            disabled={!value.trim()}
          >
            Crear Equipo
          </button>{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
};
const AddPersonModal = ({
  isOpen,
  teamName,
  value,
  onChange,
  onConfirm,
  onCancel,
}) => {
  /* ... (no changes) ... */
  const inputRef = useRef(null);
  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && value.trim()) onConfirm();
  };
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      {" "}
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
        {" "}
        <div className="flex justify-between items-center mb-4">
          {" "}
          <h2 className="text-xl font-semibold text-gray-800">
            Añadir Persona a "{teamName}"
          </h2>{" "}
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <XCircle size={20} />
          </button>{" "}
        </div>{" "}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={onChange}
          onKeyPress={handleKeyPress}
          placeholder="Nombre de la persona..."
          className="w-full p-3 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />{" "}
        <div className="flex justify-end gap-3">
          {" "}
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Cancelar
          </button>{" "}
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-white rounded-lg ${
              !value.trim()
                ? "bg-blue-300 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600"
            }`}
            disabled={!value.trim()}
          >
            Añadir Persona
          </button>{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
};
const EquiposView = ({
  teams,
  onAddTeam,
  onAddPerson,
  onDeleteTeam,
  onDeletePerson,
}) => {
  /* ... (no changes) ... */
  const [isAddingTeam, setIsAddingTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [addingPersonToTeam, setAddingPersonToTeam] = useState(null);
  const [newPersonName, setNewPersonName] = useState("");
  const handleConfirmAddTeam = () => {
    if (newTeamName.trim()) {
      onAddTeam(newTeamName.trim());
      setNewTeamName("");
      setIsAddingTeam(false);
    }
  };
  const handleConfirmAddPerson = () => {
    if (newPersonName.trim() && addingPersonToTeam) {
      onAddPerson(addingPersonToTeam.teamId, newPersonName.trim());
      setNewPersonName("");
      setAddingPersonToTeam(null);
    }
  };
  return (
    <div className="p-4 space-y-4">
      {" "}
      <button
        onClick={() => setIsAddingTeam(true)}
        className="mb-4 inline-flex items-center px-3 py-2 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600"
      >
        {" "}
        <PlusCircle size={16} className="mr-1" /> Añadir Equipo{" "}
      </button>{" "}
      {teams.length === 0 && (
        <p className="text-gray-500">No hay equipos creados.</p>
      )}{" "}
      {teams.map((team) => (
        <div
          key={team.id}
          className="bg-white p-3 rounded-lg shadow border border-gray-200"
        >
          {" "}
          <div className="flex justify-between items-center mb-2">
            {" "}
            <h3 className="font-semibold text-gray-800 flex items-center">
              {" "}
              <Building size={16} className="mr-2 text-gray-500" /> {team.name}{" "}
            </h3>{" "}
            <div>
              {" "}
              <button
                onClick={() =>
                  setAddingPersonToTeam({
                    teamId: team.id,
                    teamName: team.name,
                  })
                }
                className="p-1 text-green-600 hover:text-green-800 mr-1"
                title="Añadir Persona"
              >
                {" "}
                <UserPlus size={16} />{" "}
              </button>{" "}
              <button
                onClick={() => onDeleteTeam(team.id)}
                className="p-1 text-red-500 hover:text-red-700"
                title="Eliminar Equipo"
              >
                {" "}
                <Trash2 size={16} />{" "}
              </button>{" "}
            </div>{" "}
          </div>{" "}
          <ul className="ml-4 space-y-1">
            {" "}
            {(team.people || []).length === 0 && (
              <li className="text-xs text-gray-400 italic">
                No hay personas en este equipo.
              </li>
            )}{" "}
            {(team.people || []).map((person) => (
              <li
                key={person.id}
                className="text-sm text-gray-700 flex justify-between items-center group"
              >
                {" "}
                <span>{person.name}</span>{" "}
                <button
                  onClick={() => onDeletePerson(team.id, person.id)}
                  className="p-0.5 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Eliminar Persona"
                >
                  {" "}
                  <X size={12} />{" "}
                </button>{" "}
              </li>
            ))}{" "}
          </ul>{" "}
        </div>
      ))}{" "}
      <AddTeamModal
        isOpen={isAddingTeam}
        value={newTeamName}
        onChange={(e) => setNewTeamName(e.target.value)}
        onConfirm={handleConfirmAddTeam}
        onCancel={() => setIsAddingTeam(false)}
      />{" "}
      <AddPersonModal
        isOpen={addingPersonToTeam !== null}
        teamName={addingPersonToTeam?.teamName || ""}
        value={newPersonName}
        onChange={(e) => setNewPersonName(e.target.value)}
        onConfirm={handleConfirmAddPerson}
        onCancel={() => setAddingPersonToTeam(null)}
      />{" "}
    </div>
  );
};

export default function Home() {
  // --- State ---
  const [rootTask, setRootTask] = useState(() => {
    /* ... */ try {
      const d = localStorage.getItem("timesheet_rootTask");
      if (d) {
        const p = JSON.parse(d);
        return { ...p, subtasks: initializeTodosStructure(p.subtasks || []) };
      }
    } catch (e) {
      console.error(e);
    }
    return { id: "root", text: "Projectos", subtasks: [], type: null };
  });
  const [teams, setTeams] = useState(() => {
    /* ... */ try {
      const d = localStorage.getItem("timesheet_teams");
      return d ? JSON.parse(d) : [];
    } catch (e) {
      console.error(e);
      return [];
    }
  });
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [editingTodoId, setEditingTodoId] = useState(null);
  const [editText, setEditText] = useState("");
  const [activeTracker, setActiveTracker] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [expandedIds, setExpandedIds] = useState(new Set(["root"]));
  const [isAddingTaskTo, setIsAddingTaskTo] = useState(null);
  const [newTaskInputValue, setNewTaskInputValue] = useState("");
  const [newTaskType, setNewTaskType] = useState(TASK_TYPES.UNIQUE);
  const [newTaskGroup, setNewTaskGroup] = useState(TASK_GROUPS.OTHER);
  const [hideCompleted, setHideCompleted] = useState(false);
  const timeGridRef = useRef(null);
  const [yearViewModalTaskId, setYearViewModalTaskId] = useState(null);
  const [yearViewModalYear, setYearViewModalYear] = useState(
    new Date().getFullYear()
  );
  const [hoveredTaskId, setHoveredTaskId] = useState(null);
  const [userName, setUserName] = useState(
    () => localStorage.getItem("timesheet_userName") || null
  );
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingNameValue, setEditingNameValue] = useState("");
  const [currentView, setCurrentView] = useState(VIEWS.TIMESHEET);

  // --- Derived State & Memos ---
  const year = currentMonth.getFullYear();
  const monthIndex = currentMonth.getMonth();
  const daysInCurrentMonth = getDaysInMonth(year, monthIndex);
  const monthDays = useMemo(
    () =>
      Array.from(
        { length: daysInCurrentMonth },
        (_, i) => new Date(year, monthIndex, i + 1)
      ),
    [year, monthIndex, daysInCurrentMonth]
  );
  const visibleTasks = useMemo(() => {
    const sT = sortTaskTree(rootTask.subtasks || []);
    let tasksToShow = sT;
    if (currentView === VIEWS.SEGUIMIENTO) {
      tasksToShow = sT.filter((task) => task.group === TASK_GROUPS.PROJECT);
    }
    return filterTodos(tasksToShow, hideCompleted);
  }, [rootTask.subtasks, hideCompleted, currentView]);
  const parentTaskForModal = useMemo(() => {
    /* ... */ if (isAddingTaskTo === null) return null;
    if (isAddingTaskTo === "root") return rootTask;
    const find = (n, id) => {
      if (!n) return null;
      for (const o of n) {
        if (o.id === id) return o;
        const f = find(o.subtasks, id);
        if (f) return f;
      }
      return null;
    };
    return find(rootTask.subtasks, isAddingTaskTo);
  }, [isAddingTaskTo, rootTask]);
  const taskForYearlyView = useMemo(() => {
    /* ... */ if (yearViewModalTaskId === null) return null;
    const find = (n, id) => {
      if (!n) return null;
      for (const o of n) {
        if (o.id === id) return o;
        const f = find(o.subtasks, id);
        if (f) return f;
      }
      return null;
    };
    return find(rootTask.subtasks, yearViewModalTaskId);
  }, [yearViewModalTaskId, rootTask]);

  // --- Effects ---
  useEffect(() => {
    /* localStorage for tasks */ try {
      localStorage.setItem("timesheet_rootTask", JSON.stringify(rootTask));
    } catch (e) {
      console.error(e);
    }
  }, [rootTask]);
  useEffect(() => {
    /* localStorage for teams */ try {
      localStorage.setItem("timesheet_teams", JSON.stringify(teams));
    } catch (e) {
      console.error(e);
    }
  }, [teams]);
  useEffect(() => {
    /* timer */ let i = null;
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
  useEffect(() => {
    /* User Name */ if (userName === null) {
      const name = prompt("Por favor, ingresa tu nombre:", "Usuario");
      const finalName = name?.trim() || "Usuario";
      setUserName(finalName);
      localStorage.setItem("timesheet_userName", finalName);
    } else {
      localStorage.setItem("timesheet_userName", userName);
    }
  }, [userName]);

  // --- Handlers ---
  const goToPreviousMonth = () =>
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
    );
  const goToNextMonth = () =>
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
    );
  const goToToday = () => {
    /* ... */ setCurrentMonth(new Date());
    const t = new Date().getDate() - 1;
    const w = 60;
    if (timeGridRef.current) {
      timeGridRef.current.scrollLeft =
        t * w - timeGridRef.current.offsetWidth / 2 + w / 2;
    }
  };
  const handleRequestAddTask = useCallback(
    (parentId) => {
      /* ... */ const p =
        parentId === "root"
          ? rootTask
          : findTodoById(rootTask.subtasks, parentId);
      if (p?.completed && parentId !== "root") return;
      const iG = parentId !== "root" && p?.group ? p.group : TASK_GROUPS.OTHER;
      setIsAddingTaskTo(parentId);
      setNewTaskInputValue("");
      setNewTaskType(TASK_TYPES.UNIQUE);
      setNewTaskGroup(iG);
    },
    [rootTask]
  );
  const handleNewTaskValueChange = (e) => setNewTaskInputValue(e.target.value);
  const handleNewTaskTypeChange = (e) => setNewTaskType(e.target.value);
  const handleNewTaskGroupChange = (e) => setNewTaskGroup(e.target.value);
  const handleConfirmAddTask = useCallback(() => {
    /* ... */ if (!newTaskInputValue.trim() || isAddingTaskTo === null) return;
    const nT = {
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
    setRootTask((pR) => {
      if (isAddingTaskTo === "root") {
        return { ...pR, subtasks: [...(pR.subtasks || []), nT] };
      } else {
        return { ...pR, subtasks: addSubtask(pR.subtasks, isAddingTaskTo, nT) };
      }
    });
    if (isAddingTaskTo !== "root") {
      setExpandedIds((p) => new Set(p).add(isAddingTaskTo));
    }
    setIsAddingTaskTo(null);
    setNewTaskInputValue("");
  }, [newTaskInputValue, newTaskType, newTaskGroup, isAddingTaskTo]);
  const handleCancelAddTask = () => setIsAddingTaskTo(null);
  const handleDoubleClick = useCallback(
    (task) => {
      /* ... */ if (task.completed || activeTracker) return;
      setEditingTodoId(task.id);
      setEditText(task.text);
    },
    [activeTracker]
  );
  const handleEditChange = (e) => setEditText(e.target.value);
  const handleEditSave = useCallback(
    (id) => {
      /* ... */ const t = editText.trim();
      setRootTask((pR) => ({
        ...pR,
        subtasks: updateTodoById(pR.subtasks, id, (td) => ({
          ...td,
          text: t || td.text,
        })),
      }));
      setEditingTodoId(null);
      setEditText("");
    },
    [editText]
  );
  const handleEditKeyDown = useCallback(
    (e, id) => {
      /* ... */ if (e.key === "Enter") handleEditSave(id);
      else if (e.key === "Escape") {
        setEditingTodoId(null);
        setEditText("");
      }
    },
    [handleEditSave]
  );
  const handleEditBlur = useCallback(
    (id) => {
      /* ... */ setTimeout(() => {
        if (editingTodoId === id) handleEditSave(id);
      }, 150);
    },
    [editingTodoId, handleEditSave]
  );
  const handleDelete = useCallback(
    (id) => {
      /* ... */ if (activeTracker?.taskId === id) {
        setActiveTracker(null);
      }
      if (editingTodoId === id) {
        setEditingTodoId(null);
        setEditText("");
      }
      setRootTask((pR) => ({
        ...pR,
        subtasks: deleteTodoById(pR.subtasks, id),
      }));
      setExpandedIds((p) => {
        const n = new Set(p);
        n.delete(id);
        return n;
      });
    },
    [activeTracker, editingTodoId]
  );
  const handleToggleOverallComplete = useCallback(
    (id, shouldBeComplete) => {
      /* ... */ if (shouldBeComplete && activeTracker?.taskId === id) {
        console.warn("...");
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
      setRootTask((prevRoot) => ({ ...prevRoot, subtasks: updatedTree }));
      if (shouldBeComplete && activeTracker?.taskId === id) {
        setActiveTracker(null);
      }
    },
    [activeTracker, rootTask.subtasks]
  );
  const handleUpdateDailyData = useCallback((taskId, dateStr, dataUpdate) => {
    /* ... */ setRootTask((pR) => ({
      ...pR,
      subtasks: updateTodoById(pR.subtasks, taskId, (t) => ({
        ...t,
        dailyData: {
          ...t.dailyData,
          [dateStr]: { ...(t.dailyData?.[dateStr] || {}), ...dataUpdate },
        },
      })),
    }));
  }, []);
  const handleStartTracking = useCallback(
    (taskId, dateStr) => {
      /* ... */ if (activeTracker) {
        console.log("...");
        handleStopTracking(activeTracker.taskId, activeTracker.date);
      }
      const n = Date.now();
      setRootTask((pR) => ({
        ...pR,
        subtasks: updateTodoById(pR.subtasks, taskId, (td) => ({
          ...td,
          isTracking: true,
          startTime: n,
          trackingDate: dateStr,
        })),
      }));
      setActiveTracker({ taskId, date: dateStr, startTime: n });
      setElapsedTime(0);
      if (editingTodoId === taskId) {
        setEditingTodoId(null);
        setEditText("");
      }
    },
    [activeTracker, editingTodoId]
  );
  const handleStopTracking = useCallback(
    (taskId, dateStr) => {
      /* ... */ if (
        !activeTracker ||
        activeTracker.taskId !== taskId ||
        activeTracker.date !== dateStr
      ) {
        return;
      }
      const n = Date.now();
      const sT = activeTracker.startTime;
      const dS = (n - sT) / 1000;
      setRootTask((pR) => ({
        ...pR,
        subtasks: updateTodoById(pR.subtasks, taskId, (t) => {
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
    [activeTracker]
  );
  const expandCollapseHandler = useMemo(
    () => ({
      /* ... */ toggle: (id) => {
        setExpandedIds((p) => {
          const n = new Set(p);
          if (n.has(id)) n.delete(id);
          else n.add(id);
          return n;
        });
      },
      isExpanded: (id) => expandedIds.has(id),
    }),
    [expandedIds]
  );
  const handleToggleHideCompleted = (e) => setHideCompleted(e.target.checked);
  const handleRequestYearView = useCallback((taskId) => {
    setYearViewModalTaskId(taskId);
    setYearViewModalYear(new Date().getFullYear());
  }, []);
  const handleCloseYearView = useCallback(() => {
    setYearViewModalTaskId(null);
  }, []);
  const handleChangeYearViewYear = useCallback((newYear) => {
    setYearViewModalYear(newYear);
  }, []);
  const handleCellMouseEnter = useCallback((taskId) => {
    setHoveredTaskId(taskId);
  }, []);
  const handleCellMouseLeave = useCallback(() => {
    setHoveredTaskId(null);
  }, []);
  const handleNameClick = () => {
    setEditingNameValue(userName || "");
    setIsEditingName(true);
  };
  const handleNameChange = (e) => {
    setEditingNameValue(e.target.value);
  };
  const handleNameSave = () => {
    const newName = editingNameValue.trim();
    if (newName && newName !== userName) {
      setUserName(newName);
    }
    setIsEditingName(false);
  };
  const handleNameKeyDown = (e) => {
    if (e.key === "Enter") {
      handleNameSave();
    } else if (e.key === "Escape") {
      setIsEditingName(false);
    }
  };
  // *** NEW Handlers for Teams/People ***
  const handleAddTeam = useCallback((teamName) => {
    /* ... */ const newTeam = { id: Date.now(), name: teamName, people: [] };
    setTeams((prevTeams) => [...prevTeams, newTeam]);
  }, []);
  const handleAddPerson = useCallback((teamId, personName) => {
    /* ... */ const newPerson = { id: Date.now(), name: personName };
    setTeams((prevTeams) =>
      prevTeams.map((team) => {
        if (team.id === teamId) {
          return { ...team, people: [...(team.people || []), newPerson] };
        }
        return team;
      })
    );
    console.log("Updated teams after add person:", teams); /* DEBUG LOG */
  }, []); // Removed teams from dependency array
  const handleDeleteTeam = useCallback((teamId) => {
    /* ... */ if (
      window.confirm(
        "¿Seguro que quieres eliminar este equipo y todas sus personas?"
      )
    ) {
      setTeams((prevTeams) => prevTeams.filter((team) => team.id !== teamId));
    }
  }, []);
  const handleDeletePerson = useCallback((teamId, personId) => {
    /* ... */ if (
      window.confirm("¿Seguro que quieres eliminar esta persona?")
    ) {
      setTeams((prevTeams) =>
        prevTeams.map((team) => {
          if (team.id === teamId) {
            return {
              ...team,
              people: (team.people || []).filter((p) => p.id !== personId),
            };
          }
          return team;
        })
      );
    }
  }, []);

  // *** Memoized handlers objects ***
  const gridHandlers = useMemo(
    () => ({
      onUpdateDailyData: handleUpdateDailyData,
      onStartTracking: handleStartTracking,
      onStopTracking: handleStopTracking,
      onToggleOverallComplete: handleToggleOverallComplete,
      onCellMouseEnter: handleCellMouseEnter,
      onCellMouseLeave: handleCellMouseLeave,
    }),
    [
      handleUpdateDailyData,
      handleStartTracking,
      handleStopTracking,
      handleToggleOverallComplete,
      handleCellMouseEnter,
      handleCellMouseLeave,
    ]
  );
  const taskListHandlers = useMemo(
    () => ({
      onToggleOverallComplete: handleToggleOverallComplete,
      onDelete: handleDelete,
      onRequestAddSubtask: handleRequestAddTask,
      onDoubleClick: handleDoubleClick,
      onEditChange: handleEditChange,
      onEditSave: handleEditSave,
      onEditKeyDown: handleEditKeyDown,
      onEditBlur: handleEditBlur,
      onRequestYearView: handleRequestYearView,
    }),
    [
      handleToggleOverallComplete,
      handleDelete,
      handleRequestAddTask,
      handleDoubleClick,
      handleEditChange,
      handleEditSave,
      handleEditKeyDown,
      handleEditBlur,
      handleRequestYearView,
    ]
  );
  const teamViewHandlers = useMemo(
    () => ({
      onAddTeam: handleAddTeam,
      onAddPerson: handleAddPerson,
      onDeleteTeam: handleDeleteTeam,
      onDeletePerson: handleDeletePerson,
    }),
    [handleAddTeam, handleAddPerson, handleDeleteTeam, handleDeletePerson]
  );

  // --- Render ---
  return (
    <div className="h-screen flex flex-col font-sans bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-md p-3 flex items-center justify-between flex-shrink-0">
        {/* User Name / Edit Input */}
        <div className="flex items-center">
          {" "}
          <img
            src={`https://placehold.co/32x32/7c3aed/white?text=${getInitials(
              userName
            )}`}
            alt="Avatar"
            className="w-8 h-8 rounded-full mr-3"
          />{" "}
          {isEditingName ? (
            <input
              type="text"
              value={editingNameValue}
              onChange={handleNameChange}
              onBlur={handleNameSave}
              onKeyDown={handleNameKeyDown}
              className="font-semibold text-gray-700 px-1 py-0 border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
          ) : (
            <span
              onClick={handleNameClick}
              className="font-semibold text-gray-700 cursor-pointer hover:text-blue-600"
              title="Clic para editar nombre"
            >
              {" "}
              {userName || "Usuario"}{" "}
            </span>
          )}{" "}
        </div>
        {/* Center Nav & View Toggle */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center border border-gray-300 rounded-md p-0.5">
            {" "}
            <button
              onClick={() => setCurrentView(VIEWS.TIMESHEET)}
              className={`px-3 py-1 rounded-md text-xs font-medium ${
                currentView === VIEWS.TIMESHEET
                  ? "bg-indigo-100 text-indigo-700"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {" "}
              {VIEWS.TIMESHEET}{" "}
            </button>{" "}
            <button
              onClick={() => setCurrentView(VIEWS.SEGUIMIENTO)}
              className={`px-3 py-1 rounded-md text-xs font-medium ${
                currentView === VIEWS.SEGUIMIENTO
                  ? "bg-indigo-100 text-indigo-700"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {" "}
              {VIEWS.SEGUIMIENTO}{" "}
            </button>{" "}
            <button
              onClick={() => setCurrentView(VIEWS.EQUIPOS)}
              className={`px-3 py-1 rounded-md text-xs font-medium ${
                currentView === VIEWS.EQUIPOS
                  ? "bg-indigo-100 text-indigo-700"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {" "}
              {VIEWS.EQUIPOS}{" "}
            </button>{" "}
          </div>
          {currentView === VIEWS.TIMESHEET && (
            <>
              {" "}
              <button
                onClick={goToToday}
                className="text-sm px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 flex items-center"
              >
                {" "}
                <Calendar size={14} className="mr-1" /> Hoy{" "}
              </button>{" "}
              <button
                onClick={goToPreviousMonth}
                className="p-1 text-gray-600 hover:text-gray-900"
              >
                <ChevronLeft size={20} />
              </button>{" "}
              <span className="text-sm font-medium w-28 text-center capitalize">
                {getMonthName(monthIndex)} {year}
              </span>{" "}
              <button
                onClick={goToNextMonth}
                className="p-1 text-gray-600 hover:text-gray-900"
              >
                <ChevronRightIcon size={20} />
              </button>{" "}
            </>
          )}
          <label
            htmlFor="hideCompletedCheckbox"
            className="flex items-center cursor-pointer text-xs text-gray-600 select-none ml-4"
            title="Ocultar tareas completadas"
          >
            {" "}
            <input
              type="checkbox"
              id="hideCompletedCheckbox"
              checked={hideCompleted}
              onChange={handleToggleHideCompleted}
              className="mr-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />{" "}
            {hideCompleted ? <EyeOff size={16} /> : <Eye size={16} />}{" "}
          </label>
        </div>
        {/* Right Icons */}
        <div className="flex items-center space-x-3"> {/* Placeholder */} </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-grow overflow-hidden">
        {/* Left Panel: Task List or Teams List */}
        <aside className="w-3/4 lg:w-3/5 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
          <div className="h-10 px-3 border-b border-gray-200 flex-shrink-0 flex justify-between items-center">
            <h2 className="font-semibold text-gray-700">
              {" "}
              {currentView === VIEWS.TIMESHEET && "Actividades"}{" "}
              {currentView === VIEWS.SEGUIMIENTO && "Proyectos"}{" "}
              {currentView === VIEWS.EQUIPOS && "Equipos y Personas"}{" "}
            </h2>
            {currentView === VIEWS.TIMESHEET && (
              <button
                onClick={() => handleRequestAddTask("root")}
                className="p-1 text-blue-500 hover:text-blue-700"
                title="Añadir Tarea Principal"
                disabled={
                  editingTodoId !== null ||
                  activeTracker !== null ||
                  isAddingTaskTo !== null
                }
              >
                {" "}
                <PlusCircle size={18} />{" "}
              </button>
            )}
            {/* Button to add team is now inside EquiposView */}
          </div>
          <div className="flex-grow overflow-y-auto overflow-x-hidden p-2 space-y-0">
            {currentView !== VIEWS.EQUIPOS &&
              visibleTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  level={0}
                  activeTracker={activeTracker}
                  editingTodoId={editingTodoId}
                  editText={editText}
                  handlers={taskListHandlers}
                  isExpanded={expandCollapseHandler.isExpanded(task.id)}
                  onToggleExpand={expandCollapseHandler}
                  hideCompleted={hideCompleted}
                  onRequestYearView={handleRequestYearView}
                  hoveredTaskId={hoveredTaskId}
                  currentView={currentView}
                />
              ))}
            {currentView === VIEWS.EQUIPOS && (
              <EquiposView
                teams={teams}
                onAddTeam={teamViewHandlers.onAddTeam}
                onAddPerson={teamViewHandlers.onAddPerson}
                onDeleteTeam={teamViewHandlers.onDeleteTeam}
                onDeletePerson={teamViewHandlers.onDeletePerson}
              />
            )}
            {currentView !== VIEWS.EQUIPOS &&
              visibleTasks.length === 0 &&
              rootTask.subtasks?.length > 0 && (
                <p className="text-center text-gray-500 text-sm py-4">
                  {" "}
                  {currentView === VIEWS.SEGUIMIENTO
                    ? "No hay proyectos visibles."
                    : "Tareas completadas ocultas."}{" "}
                </p>
              )}
            {currentView !== VIEWS.EQUIPOS &&
              visibleTasks.length === 0 &&
              rootTask.subtasks?.length === 0 && (
                <p className="text-center text-gray-500 text-sm py-4">
                  No hay tareas.
                </p>
              )}
          </div>
        </aside>

        {/* Right Panel: Conditional Rendering based on View */}
        {currentView === VIEWS.TIMESHEET && (
          <main
            ref={timeGridRef}
            className="flex-grow bg-white overflow-x-auto overflow-y-hidden"
          >
            {" "}
            <div className="inline-block min-w-full align-middle">
              {" "}
              <div className="flex sticky top-0 bg-gray-100 z-10 border-b border-gray-300">
                {" "}
                {monthDays.map((day) => {
                  const d = day.getDate();
                  const w = day
                    .toLocaleDateString("es-ES", { weekday: "short" })
                    .substring(0, 2);
                  const iT =
                    formatDate(day, "YYYY-MM-DD") ===
                    formatDate(new Date(), "YYYY-MM-DD");
                  return (
                    <div
                      key={d}
                      className={`flex-shrink-0 w-[60px] h-10 border-r border-gray-200 text-center py-1 ${
                        iT ? "bg-blue-100" : ""
                      }`}
                    >
                      {" "}
                      <div className="text-[10px] text-gray-500 uppercase">
                        {w}
                      </div>{" "}
                      <div
                        className={`text-sm font-medium ${
                          iT ? "text-blue-700 font-bold" : "text-gray-700"
                        }`}
                      >
                        {String(d).padStart(2, "0")}
                      </div>{" "}
                    </div>
                  );
                })}{" "}
              </div>{" "}
              <div>
                {" "}
                {visibleTasks.map((task) => (
                  <GridRow
                    key={task.id}
                    task={task}
                    level={0}
                    monthDays={monthDays}
                    activeTracker={activeTracker}
                    handlers={gridHandlers}
                    expandCollapseHandler={expandCollapseHandler}
                    hideCompleted={hideCompleted}
                    isExpanded={expandCollapseHandler.isExpanded(task.id)}
                  />
                ))}{" "}
                {visibleTasks.length === 0 && (
                  <div className="flex items-center justify-center h-20 text-gray-400 text-sm">
                    {" "}
                    (No hay tareas visibles){" "}
                  </div>
                )}{" "}
              </div>{" "}
            </div>{" "}
          </main>
        )}
        {currentView === VIEWS.SEGUIMIENTO && (
          <main className="flex-grow bg-gray-50 p-4 overflow-y-auto">
            {" "}
            <h3 className="text-lg font-semibold mb-4 text-gray-700">
              Detalles de Seguimiento
            </h3>{" "}
            <div className="bg-white p-4 rounded shadow">
              {" "}
              <p className="text-gray-500">
                Seleccione un proyecto y persona de la izquierda para ver o
                añadir compromisos (funcionalidad pendiente).
              </p>{" "}
            </div>{" "}
          </main>
        )}
        {currentView === VIEWS.EQUIPOS && (
          <main className="flex-grow bg-gray-50 p-4 overflow-y-auto">
            {" "}
            <div className="bg-white p-4 rounded shadow">
              {" "}
              <p className="text-gray-500">
                Administre equipos y personas en el panel izquierdo.
              </p>{" "}
            </div>{" "}
          </main>
        )}
      </div>

      {/* Modals */}
      <AddTaskModal
        isOpen={isAddingTaskTo !== null}
        parentId={isAddingTaskTo}
        parentTaskName={parentTaskForModal?.text || ""}
        value={newTaskInputValue}
        taskType={newTaskType}
        group={newTaskGroup}
        onValueChange={handleNewTaskValueChange}
        onTypeChange={handleNewTaskTypeChange}
        onGroupChange={handleNewTaskGroupChange}
        onConfirm={handleConfirmAddTask}
        onCancel={handleCancelAddTask}
        isSubtask={isAddingTaskTo !== null && isAddingTaskTo !== "root"}
      />
      <YearlyCalendarModal
        isOpen={yearViewModalTaskId !== null}
        task={taskForYearlyView}
        year={yearViewModalYear}
        onClose={handleCloseYearView}
        onYearChange={handleChangeYearViewYear}
      />
      {/* Team/Person Modals are now rendered inside EquiposView */}
    </div>
  );
}
