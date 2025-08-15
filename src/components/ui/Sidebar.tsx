import { PlusCircle } from "lucide-react";
import { TaskItem } from "@/components/task/TaskItem";
import { EquiposView } from "@/components/views/EquiposView";
import { VIEWS } from "@/lib/constants";
import type { Task, ActiveTracker, Team, View } from "@/types";

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

interface TeamViewHandlers {
  onAddTeam: (teamName: string) => void;
  onAddPerson: (teamId: string | number, personName: string) => void;
  onDeleteTeam: (teamId: string | number) => void;
  onDeletePerson: (teamId: string | number, personId: string | number) => void;
}

interface ExpandCollapseHandler {
  toggle: (id: string | number) => void;
  isExpanded: (id: string | number) => boolean;
}

interface SidebarProps {
  currentView: View;
  visibleTasks: Task[];
  teams: Team[];
  activeTracker: ActiveTracker | null;
  editingTodoId: string | number | null;
  editText: string;
  taskListHandlers: TaskListHandlers;
  teamViewHandlers: TeamViewHandlers;
  expandCollapseHandler: ExpandCollapseHandler;
  hideCompleted: boolean;
  hoveredTaskId: string | number | null;
  rootTaskSubtasksLength: number;
  onRequestAddTask: (parentId: string | number | "root") => void;
  onRequestYearView: (taskId: string | number) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  visibleTasks,
  teams,
  activeTracker,
  editingTodoId,
  editText,
  taskListHandlers,
  teamViewHandlers,
  expandCollapseHandler,
  hideCompleted,
  hoveredTaskId,
  rootTaskSubtasksLength,
  onRequestAddTask,
  onRequestYearView,
}) => {
  const getTitle = () => {
    if (currentView === VIEWS.TIMESHEET) return "Actividades";
    if (currentView === VIEWS.SEGUIMIENTO) return "Proyectos";
    if (currentView === VIEWS.EQUIPOS) return "Equipos y Personas";
    return "";
  };
  
  return (
    <aside className="w-3/4 lg:w-3/5 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
      <div className="h-10 px-3 border-b border-gray-200 flex-shrink-0 flex justify-between items-center">
        <h2 className="font-semibold text-gray-700">{getTitle()}</h2>
        {currentView === VIEWS.TIMESHEET && (
          <button
            onClick={() => onRequestAddTask("root")}
            className="p-1 text-blue-500 hover:text-blue-700"
            title="Añadir Tarea Principal"
            disabled={
              editingTodoId !== null ||
              activeTracker !== null
            }
          >
            <PlusCircle size={18} />
          </button>
        )}
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
              onRequestYearView={onRequestYearView}
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
          rootTaskSubtasksLength > 0 && (
            <p className="text-center text-gray-500 text-sm py-4">
              {currentView === VIEWS.SEGUIMIENTO
                ? "No hay proyectos visibles."
                : "Tareas completadas ocultas."}
            </p>
          )}
        
        {currentView !== VIEWS.EQUIPOS &&
          visibleTasks.length === 0 &&
          rootTaskSubtasksLength === 0 && (
            <p className="text-center text-gray-500 text-sm py-4">
              No hay tareas.
            </p>
          )}
      </div>
    </aside>
  );
};