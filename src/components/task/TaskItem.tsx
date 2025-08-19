import { useMemo } from "react";
import {
  ChevronDown,
  ChevronRight,
  Check,
  X,
  PlusCircle,
  Trash2,
  CalendarDays,
  UserPlus,
} from "lucide-react";
import { TASK_TYPES, TASK_GROUPS, GROUP_COLORS, VIEWS } from "@/lib/constants";
import { calculateAggregatedTimeSeconds } from "@/lib/task-utils";
import { formatTime, formatHours } from "@/lib/time-utils";
import type { Task, ActiveTracker, View } from "@/types";

interface TaskListHandlers {
  onToggleOverallComplete: (taskId: string | number, shouldBeComplete: boolean) => void;
  onDelete: (taskId: string | number) => void;
  onRequestAddSubtask: (taskId: string | number) => void;
  onDoubleClick: (task: Task) => void;
  onEditChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onEditSave: (taskId: string | number) => void;
  onEditKeyDown: (e: React.KeyboardEvent, taskId: string | number) => void;
  onEditBlur: (taskId: string | number) => void;
  onRequestYearView: (taskId: string | number) => void;
}

interface ExpandCollapseHandler {
  toggle: (id: string | number) => void;
  isExpanded: (id: string | number) => boolean;
}

interface TaskItemProps {
  task: Task;
  level: number;
  activeTracker: ActiveTracker | null;
  editingTodoId: string | number | null;
  editText: string;
  handlers: TaskListHandlers;
  isExpanded: boolean;
  onToggleExpand: ExpandCollapseHandler;
  hideCompleted: boolean;
  onRequestYearView: (taskId: string | number) => void;
  hoveredTaskId: string | number | null;
  currentView: View;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  level,
  activeTracker,
  editingTodoId,
  editText,
  handlers,
  isExpanded,
  onToggleExpand,
  hideCompleted,
  onRequestYearView,
  hoveredTaskId,
  currentView,
}) => {
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
  const baseBgColor = groupColorInfo.base;
  let finalBgColor: string = baseBgColor;
  
  if (iOC) {
    finalBgColor = "bg-gray-100 opacity-60";
  } else if (isHovered && !isEditingThis) {
    finalBgColor = groupColorInfo.hover;
  }
  
  const isProjectTask = task.group === TASK_GROUPS.PROJECT;
  
  return (
    <div className={`ml-${level * 4} group border-b border-gray-200`}>
      <div
        className={`flex items-center justify-between h-10 overflow-hidden ${finalBgColor} ${
          isEditingThis ? "shadow-md ring-1 ring-blue-300" : ""
        }`}
      >
        <div className="flex-grow mr-3 min-w-0 flex items-center pl-2">
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
          )}
          {((!hVS && hS) || !hS) && (
            <span className="w-[28px] mr-1 flex-shrink-0"></span>
          )}
          <div className="flex-grow mr-2">
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
            )}
          </div>
          {displayValue && (
            <span className="text-xs text-gray-500 mr-2 flex-shrink-0">
              {displayValue}
            </span>
          )}
        </div>
        {!isEditingThis && (
          <div className="flex items-center space-x-1 flex-shrink-0 pr-2">
            {currentView === VIEWS.SEGUIMIENTO && isProjectTask && (
              <button
                onClick={() => alert("Funcionalidad asignar persona pendiente")}
                className="p-1 text-purple-500 hover:text-purple-700 transition duration-200"
                aria-label="Asignar persona"
                title="Asignar persona"
              >
                <UserPlus size={14} />
              </button>
            )}
            {currentView === VIEWS.TIMESHEET && (
              <button
                onClick={() => onRequestYearView(task.id)}
                className="p-1 text-indigo-500 hover:text-indigo-700 transition duration-200"
                aria-label="Vista anual"
                title="Vista anual"
              >
                <CalendarDays size={14} />
              </button>
            )}
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
                  {task.completed ? <X size={14} /> : <Check size={14} />}
                </button>
              )}
            {currentView === VIEWS.TIMESHEET && (
              <button
                onClick={() => onRequestAddSubtask(task.id)}
                className="p-1 text-blue-500 hover:text-blue-600 transition duration-200"
                aria-label="Añadir subtarea"
                title="Añadir subtarea"
                disabled={activeTracker !== null || task.completed}
              >
                <PlusCircle size={14} />
              </button>
            )}
            <button
              onClick={() => onDelete(task.id)}
              className="p-1 text-red-500 hover:text-red-600 transition duration-200"
              aria-label="Eliminar tarea"
              title="Eliminar tarea"
              disabled={activeTracker !== null}
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>
      {hVS && isExpanded && (
        <div className="pl-0">
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
          ))}
        </div>
      )}
    </div>
  );
};