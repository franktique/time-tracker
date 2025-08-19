import React from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  LogOut,
} from "lucide-react";
import { VIEWS } from "@/lib/constants";
import { getMonthName } from "@/lib/date-utils";
import { getInitials } from "@/lib/user-utils";
import type { View } from "@/lib/constants";

interface HeaderProps {
  userName: string | null;
  isEditingName: boolean;
  editingNameValue: string;
  currentView: View;
  monthIndex: number;
  year: number;
  hideCompleted: boolean;
  onNameClick: () => void;
  onNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onNameSave: () => void;
  onNameKeyDown: (e: React.KeyboardEvent) => void;
  onViewChange: (view: View) => void;
  onGoToToday: () => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onToggleHideCompleted: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  userName,
  isEditingName,
  editingNameValue,
  currentView,
  monthIndex,
  year,
  hideCompleted,
  onNameClick,
  onNameChange,
  onNameSave,
  onNameKeyDown,
  onViewChange,
  onGoToToday,
  onPreviousMonth,
  onNextMonth,
  onToggleHideCompleted,
  onLogout,
}) => {
  return (
    <header className="bg-white shadow-md p-3 flex items-center justify-between flex-shrink-0">
      {/* User Name / Edit Input */}
      <div className="flex items-center">
        <img
          src={`https://placehold.co/32x32/7c3aed/white?text=${getInitials(
            userName
          )}`}
          alt="Avatar"
          className="w-8 h-8 rounded-full mr-3"
        />
        {isEditingName ? (
          <input
            type="text"
            value={editingNameValue}
            onChange={onNameChange}
            onBlur={onNameSave}
            onKeyDown={onNameKeyDown}
            className="font-semibold text-gray-700 px-1 py-0 border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            autoFocus
          />
        ) : (
          <span
            onClick={onNameClick}
            className="font-semibold text-gray-700 cursor-pointer hover:text-blue-600"
            title="Clic para editar nombre"
          >
            {userName || "Usuario"}
          </span>
        )}
      </div>
      
      {/* Center Nav & View Toggle */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center border border-gray-300 rounded-md p-0.5">
          <button
            onClick={() => onViewChange(VIEWS.TIMESHEET)}
            className={`px-3 py-1 rounded-md text-xs font-medium ${
              currentView === VIEWS.TIMESHEET
                ? "bg-indigo-100 text-indigo-700"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {VIEWS.TIMESHEET}
          </button>
          <button
            onClick={() => onViewChange(VIEWS.SEGUIMIENTO)}
            className={`px-3 py-1 rounded-md text-xs font-medium ${
              currentView === VIEWS.SEGUIMIENTO
                ? "bg-indigo-100 text-indigo-700"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {VIEWS.SEGUIMIENTO}
          </button>
          <button
            onClick={() => onViewChange(VIEWS.EQUIPOS)}
            className={`px-3 py-1 rounded-md text-xs font-medium ${
              currentView === VIEWS.EQUIPOS
                ? "bg-indigo-100 text-indigo-700"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {VIEWS.EQUIPOS}
          </button>
        </div>
        
        {currentView === VIEWS.TIMESHEET && (
          <>
            <button
              onClick={onGoToToday}
              className="text-sm px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 flex items-center"
            >
              <Calendar size={14} className="mr-1" /> Hoy
            </button>
            <button
              onClick={onPreviousMonth}
              className="p-1 text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-sm font-medium w-28 text-center capitalize">
              {getMonthName(monthIndex)} {year}
            </span>
            <button
              onClick={onNextMonth}
              className="p-1 text-gray-600 hover:text-gray-900"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}
        
        <label
          htmlFor="hideCompletedCheckbox"
          className="flex items-center cursor-pointer text-xs text-gray-600 select-none ml-4"
          title="Ocultar tareas completadas"
        >
          <input
            type="checkbox"
            id="hideCompletedCheckbox"
            checked={hideCompleted}
            onChange={onToggleHideCompleted}
            className="mr-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          {hideCompleted ? <EyeOff size={16} /> : <Eye size={16} />}
        </label>
      </div>
      
      {/* Right Icons */}
      <div className="flex items-center space-x-3">
        {onLogout && (
          <button
            onClick={onLogout}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            title="Cerrar sesión"
          >
            <LogOut size={16} />
          </button>
        )}
      </div>
    </header>
  );
};