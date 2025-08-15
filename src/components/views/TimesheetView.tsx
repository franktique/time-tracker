import { useMemo } from "react";
import { GridRow } from "@/components/grid/GridRow";
import { formatDate } from "@/lib/date-utils";
import type { Task, ActiveTracker } from "@/types";

interface GridHandlers {
  onUpdateDailyData: (taskId: string | number, dateStr: string, dataUpdate: Record<string, unknown>) => void;
  onStartTracking: (taskId: string | number, dateStr: string) => void;
  onStopTracking: (taskId: string | number, dateStr: string) => void;
  onToggleOverallComplete: (taskId: string | number, shouldBeComplete: boolean) => void;
  onCellMouseEnter: (taskId: string | number) => void;
  onCellMouseLeave: () => void;
}

interface ExpandCollapseHandler {
  toggle: (id: string | number) => void;
  isExpanded: (id: string | number) => boolean;
}

interface TimesheetViewProps {
  visibleTasks: Task[];
  monthDays: Date[];
  activeTracker: ActiveTracker | null;
  handlers: GridHandlers;
  expandCollapseHandler: ExpandCollapseHandler;
  hideCompleted: boolean;
}

export const TimesheetView: React.FC<TimesheetViewProps> = ({
  visibleTasks,
  monthDays,
  activeTracker,
  handlers,
  expandCollapseHandler,
  hideCompleted,
}) => {
  
  const headerRow = useMemo(() => {
    return monthDays.map((day) => {
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
          <div className="text-[10px] text-gray-500 uppercase">{w}</div>
          <div
            className={`text-sm font-medium ${
              iT ? "text-blue-700 font-bold" : "text-gray-700"
            }`}
          >
            {String(d).padStart(2, "0")}
          </div>
        </div>
      );
    });
  }, [monthDays]);
  
  return (
    <main
      className="flex-grow bg-white overflow-x-auto overflow-y-hidden"
    >
      <div className="inline-block min-w-full align-middle">
        <div className="flex sticky top-0 bg-gray-100 z-10 border-b border-gray-300">
          {headerRow}
        </div>
        <div>
          {visibleTasks.map((task) => (
            <GridRow
              key={task.id}
              task={task}
              level={0}
              monthDays={monthDays}
              activeTracker={activeTracker}
              handlers={handlers}
              expandCollapseHandler={expandCollapseHandler}
              hideCompleted={hideCompleted}
              isExpanded={expandCollapseHandler.isExpanded(task.id)}
            />
          ))}
          {visibleTasks.length === 0 && (
            <div className="flex items-center justify-center h-20 text-gray-400 text-sm">
              (No hay tareas visibles)
            </div>
          )}
        </div>
      </div>
    </main>
  );
};