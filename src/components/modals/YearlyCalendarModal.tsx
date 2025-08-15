import { XCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { WEEK_DAYS_SHORT } from "@/lib/constants";
import { getDaysInMonth, getMonthName, formatDate, getDayOfWeekMondayFirst } from "@/lib/date-utils";
import type { Task } from "@/types";

interface YearlyCalendarModalProps {
  isOpen: boolean;
  task: Task | null;
  year: number;
  onClose: () => void;
  onYearChange: (year: number) => void;
}

export const YearlyCalendarModal: React.FC<YearlyCalendarModalProps> = ({
  isOpen,
  task,
  year,
  onClose,
  onYearChange,
}) => {
  if (!isOpen || !task) return null;

  const months = Array.from({ length: 12 }, (_, i) => i);

  const hasDataForDay = (checkDate: Date) => {
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
      <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4 pb-2 border-b">
          <h2 className="text-xl font-semibold text-gray-800 truncate pr-4">
            Vista Anual: <span className="text-indigo-600">{task.text}</span>
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onYearChange(year - 1)}
              className="p-1 text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-lg font-medium w-20 text-center">{year}</span>
            <button
              onClick={() => onYearChange(year + 1)}
              className="p-1 text-gray-600 hover:text-gray-900"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 ml-4"
          >
            <XCircle size={24} />
          </button>
        </div>
        <div className="flex-grow overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {months.map((mI) => {
              const mN = getMonthName(mI);
              const dIM = getDaysInMonth(year, mI);
              const fDOM = new Date(year, mI, 1);
              const sDOW = getDayOfWeekMondayFirst(fDOM);
              const dA = Array.from({ length: dIM }, (_, i) => i + 1);
              
              return (
                <div key={mI} className="p-2 border rounded-lg">
                  <h3 className="text-center font-semibold text-sm mb-2 capitalize">
                    {mN}
                  </h3>
                  <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-1">
                    {WEEK_DAYS_SHORT.map((d) => (
                      <div key={d}>{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: sDOW }).map((_, i) => (
                      <div key={`pad-${i}`}></div>
                    ))}
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
                          {dN}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};