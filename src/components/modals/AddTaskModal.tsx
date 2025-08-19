import { useEffect, useRef } from "react";
import { XCircle } from "lucide-react";
import { TASK_TYPES, TASK_GROUPS } from "@/lib/constants";
import type { TaskType, TaskGroup } from "@/lib/constants";

interface AddTaskModalProps {
  isOpen: boolean;
  value: string;
  taskType: TaskType;
  group: TaskGroup;
  onValueChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTypeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onGroupChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onConfirm: () => void;
  onCancel: () => void;
  parentTaskName?: string;
  isSubtask?: boolean;
}

export const AddTaskModal: React.FC<AddTaskModalProps> = ({
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
  const iR = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (isOpen && iR.current) iR.current.focus();
  }, [isOpen]);
  
  const kP = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && value.trim()) onConfirm();
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">
            {parentTaskName
              ? `Añadir Subtarea a "${parentTaskName}"`
              : "Añadir Nueva Tarea"}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <XCircle size={20} />
          </button>
        </div>
        <input
          ref={iR}
          type="text"
          value={value}
          onChange={onValueChange}
          onKeyPress={kP}
          placeholder="Nombre de la tarea..."
          className="w-full p-3 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
        />
        <div className="mb-4">
          <label
            htmlFor="tTS"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Tipo de Tarea:
          </label>
          <select
            id="tTS"
            value={taskType}
            onChange={onTypeChange}
            className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
          >
            {Object.values(TASK_TYPES).map((t) => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-4">
          <label
            htmlFor="tGS"
            className={`block text-sm font-medium mb-1 ${
              isSubtask ? "text-gray-400" : "text-gray-700"
            }`}
          >
            Grupo:
          </label>
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
            {Object.values(TASK_GROUPS).map((g) => (
              <option key={g} value={g}>
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition duration-200"
          >
            Cancelar
          </button>
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
          </button>
        </div>
      </div>
    </div>
  );
};