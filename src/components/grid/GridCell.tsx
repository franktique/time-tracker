import { useState, useEffect } from "react";
import { Check, X, Play, Square } from "lucide-react";
import { TASK_TYPES } from "@/lib/constants";
import { formatDate } from "@/lib/date-utils";
import { formatTime } from "@/lib/time-utils";
import type { Task, ActiveTracker } from "@/types";

interface GridHandlers {
  onUpdateDailyData: (taskId: string | number, dateStr: string, dataUpdate: Record<string, unknown>) => void;
  onStartTracking: (taskId: string | number, dateStr: string) => void;
  onStopTracking: (taskId: string | number, dateStr: string) => void;
  onToggleOverallComplete: (taskId: string | number, shouldBeComplete: boolean) => void;
  onCellMouseEnter: (taskId: string | number) => void;
  onCellMouseLeave: () => void;
}

interface GridCellProps {
  task: Task;
  date: Date;
  activeTracker: ActiveTracker | null;
  handlers: GridHandlers;
}

export const GridCell: React.FC<GridCellProps> = ({ task, date, activeTracker, handlers }) => {
  const yyyymmdd = formatDate(date, "YYYY-MM-DD");
  const iCTT = activeTracker?.taskId === task.id && activeTracker?.date === yyyymmdd;
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
  }, [yyyymmdd, task.type, task.dailyData]);
  
  const hMIC = (e: React.ChangeEvent<HTMLInputElement>) => {
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
              <Square size={14} />
            </button>
          );
        } else if (iH && !task.completed) {
          return (
            <button
              onClick={() => handlers.onStartTracking(task.id, yyyymmdd)}
              className="w-full h-full flex items-center justify-center bg-gray-500 hover:bg-gray-600 text-white rounded relative group"
              title={tT}
            >
              <Play size={14} />
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
      {rCC()}
    </div>
  );
};