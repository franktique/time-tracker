import { useMemo } from "react";
import { GridCell } from "./GridCell";
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

interface GridRowProps {
  task: Task;
  level: number;
  monthDays: Date[];
  activeTracker: ActiveTracker | null;
  handlers: GridHandlers;
  isExpanded: boolean;
  expandCollapseHandler: ExpandCollapseHandler;
  hideCompleted: boolean;
}

export const GridRow: React.FC<GridRowProps> = ({
  task,
  level,
  monthDays,
  activeTracker,
  handlers,
  isExpanded,
  expandCollapseHandler,
  hideCompleted,
}) => {
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
      <div className="flex border-b border-gray-200">
        {monthDays.map((day) => (
          <div key={formatDate(day)} className="flex-shrink-0 w-[60px]">
            <GridCell
              task={task}
              date={day}
              activeTracker={activeTracker}
              handlers={handlers}
            />
          </div>
        ))}
      </div>
      {sS && (
        <div className={`ml-${level * 0} pl-0`}>
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
          ))}
        </div>
      )}
    </>
  );
};