"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Header } from "@/components/ui/Header";
import { Sidebar } from "@/components/ui/Sidebar";
import { TimesheetView } from "@/components/views/TimesheetView";
import { SeguimientoView } from "@/components/views/SeguimientoView";
import { AddTaskModal } from "@/components/modals/AddTaskModal";
import { YearlyCalendarModal } from "@/components/modals/YearlyCalendarModal";
import { useTimeTracker } from "@/hooks/useTimeTracker";
import { useApiTaskManagement } from "@/hooks/useApiTaskManagement";
import { useTeamManagement } from "@/hooks/useTeamManagement";
import { useAuth } from "@/contexts/AuthContext";
import { TASK_GROUPS, VIEWS } from "@/lib/constants";
import { getDaysInMonth } from "@/lib/date-utils";
import { filterTodos, sortTaskTree } from "@/lib/task-utils";
import type { Task, Team, View } from "@/types";

export const TimeTrackerApp: React.FC = () => {
  const { signOut, user } = useAuth();

  // --- State ---
  
  const [teams, setTeams] = useState<Team[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const d = localStorage.getItem("timesheet_teams");
        return d ? JSON.parse(d) : [];
      } catch (e) {
        console.error(e);
        return [];
      }
    }
    return [];
  });
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [expandedIds, setExpandedIds] = useState<Set<string | number>>(new Set(["root"]));
  const [hideCompleted, setHideCompleted] = useState(false);
  const [yearViewModalTaskId, setYearViewModalTaskId] = useState<string | number | null>(null);
  const [yearViewModalYear, setYearViewModalYear] = useState(new Date().getFullYear());
  const [hoveredTaskId, setHoveredTaskId] = useState<string | number | null>(null);
  const [userName, setUserName] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("timesheet_userName") || null;
    }
    return null;
  });
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingNameValue, setEditingNameValue] = useState("");
  const [currentView, setCurrentView] = useState<View>(VIEWS.TIMESHEET);

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

  // --- Hooks ---
  const taskManagement = useApiTaskManagement();
  const { rootTask, isLoading: tasksLoading, error: tasksError } = taskManagement;
  const timeTracker = useTimeTracker(rootTask || { 
    id: "root", 
    text: "Projectos", 
    subtasks: [], 
    type: "root" as const,
    completed: false,
    group: TASK_GROUPS.OTHER,
    dailyData: {},
    people: [],
    isTracking: false,
    startTime: null,
    trackingDate: null,
  }, () => {});
  const teamManagement = useTeamManagement(teams, setTeams);

  // Get destructured values
  const { activeTracker } = timeTracker;
  const { 
    editingTodoId, 
    editText, 
    isAddingTaskTo,
    newTaskInputValue,
    newTaskType,
    newTaskGroup 
  } = taskManagement;

  const visibleTasks = useMemo(() => {
    if (!rootTask) return [];
    const sT = sortTaskTree(rootTask.subtasks || []);
    let tasksToShow = sT;
    if (currentView === VIEWS.SEGUIMIENTO) {
      tasksToShow = sT.filter((task) => task.group === TASK_GROUPS.PROJECT);
    }
    return filterTodos(tasksToShow, hideCompleted);
  }, [rootTask, hideCompleted, currentView]);

  const parentTaskForModal = useMemo(() => {
    if (isAddingTaskTo === null || !rootTask) return null;
    if (isAddingTaskTo === "root") return rootTask;
    const find = (n: Task[], id: string | number): Task | null => {
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
    if (yearViewModalTaskId === null || !rootTask) return null;
    const find = (n: Task[], id: string | number): Task | null => {
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
    try {
      localStorage.setItem("timesheet_teams", JSON.stringify(teams));
    } catch (e) {
      console.error(e);
    }
  }, [teams]);

  useEffect(() => {
    if (userName === null) {
      const name = prompt("Por favor, ingresa tu nombre:", "Usuario");
      const finalName = name?.trim() || "Usuario";
      setUserName(finalName);
      localStorage.setItem("timesheet_userName", finalName);
    } else {
      localStorage.setItem("timesheet_userName", userName);
    }
  }, [userName]);

  // --- Navigation Handlers ---
  const goToPreviousMonth = () =>
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
    );
  
  const goToNextMonth = () =>
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
    );
    
  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  const handleToggleHideCompleted = (e: React.ChangeEvent<HTMLInputElement>) => 
    setHideCompleted(e.target.checked);

  // --- Year View Handlers ---
  const handleRequestYearView = (taskId: string | number) => {
    setYearViewModalTaskId(taskId);
    setYearViewModalYear(new Date().getFullYear());
  };

  const handleCloseYearView = () => {
    setYearViewModalTaskId(null);
  };

  const handleChangeYearViewYear = (newYear: number) => {
    setYearViewModalYear(newYear);
  };

  // --- Logout Handler ---
  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // --- UI State Handlers ---
  const handleCellMouseEnter = (taskId: string | number) => {
    setHoveredTaskId(taskId);
  };

  const handleCellMouseLeave = () => {
    setHoveredTaskId(null);
  };

  const handleNameClick = () => {
    setEditingNameValue(userName || "");
    setIsEditingName(true);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingNameValue(e.target.value);
  };

  const handleNameSave = () => {
    const newName = editingNameValue.trim();
    if (newName && newName !== userName) {
      setUserName(newName);
    }
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleNameSave();
    } else if (e.key === "Escape") {
      setIsEditingName(false);
    }
  };

  // --- Expand/Collapse Handler ---
  const expandCollapseHandler = useMemo(
    () => ({
      toggle: (id: string | number) => {
        setExpandedIds((p) => {
          const n = new Set(p);
          if (n.has(id)) n.delete(id);
          else n.add(id);
          return n;
        });
      },
      isExpanded: (id: string | number) => expandedIds.has(id),
    }),
    [expandedIds]
  );

  // --- Memoized handlers objects ---
  const gridHandlers = useMemo(
    () => ({
      onUpdateDailyData: taskManagement.handleUpdateDailyData,
      onStartTracking: timeTracker.handleStartTracking,
      onStopTracking: timeTracker.handleStopTracking,
      onToggleOverallComplete: taskManagement.handleToggleOverallComplete,
      onCellMouseEnter: handleCellMouseEnter,
      onCellMouseLeave: handleCellMouseLeave,
    }),
    [
      taskManagement.handleUpdateDailyData,
      timeTracker.handleStartTracking,
      timeTracker.handleStopTracking,
      taskManagement.handleToggleOverallComplete,
    ]
  );

  const taskListHandlers = useMemo(
    () => ({
      onToggleOverallComplete: taskManagement.handleToggleOverallComplete,
      onDelete: taskManagement.handleDelete,
      onRequestAddSubtask: taskManagement.handleRequestAddTask,
      onDoubleClick: taskManagement.handleDoubleClick,
      onEditChange: taskManagement.handleEditChange,
      onEditSave: taskManagement.handleEditSave,
      onEditKeyDown: taskManagement.handleEditKeyDown,
      onEditBlur: taskManagement.handleEditBlur,
      onRequestYearView: handleRequestYearView,
    }),
    [
      taskManagement.handleToggleOverallComplete,
      taskManagement.handleDelete,
      taskManagement.handleRequestAddTask,
      taskManagement.handleDoubleClick,
      taskManagement.handleEditChange,
      taskManagement.handleEditSave,
      taskManagement.handleEditKeyDown,
      taskManagement.handleEditBlur,
    ]
  );

  const teamViewHandlers = useMemo(
    () => ({
      onAddTeam: teamManagement.handleAddTeam,
      onAddPerson: teamManagement.handleAddPerson,
      onDeleteTeam: teamManagement.handleDeleteTeam,
      onDeletePerson: teamManagement.handleDeletePerson,
    }),
    [
      teamManagement.handleAddTeam, 
      teamManagement.handleAddPerson, 
      teamManagement.handleDeleteTeam, 
      teamManagement.handleDeletePerson
    ]
  );

  // --- Render ---
  
  // Show loading state
  if (tasksLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando tareas...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (tasksError) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {tasksError}</p>
          <button 
            onClick={() => taskManagement.refreshTasks()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Ensure rootTask is available before rendering main UI
  if (!rootTask) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Inicializando aplicación...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col font-sans bg-gray-100">
      <Header
        userName={user?.username || userName}
        isEditingName={isEditingName}
        editingNameValue={editingNameValue}
        currentView={currentView}
        monthIndex={monthIndex}
        year={year}
        hideCompleted={hideCompleted}
        onNameClick={handleNameClick}
        onNameChange={handleNameChange}
        onNameSave={handleNameSave}
        onNameKeyDown={handleNameKeyDown}
        onViewChange={setCurrentView}
        onGoToToday={goToToday}
        onPreviousMonth={goToPreviousMonth}
        onNextMonth={goToNextMonth}
        onToggleHideCompleted={handleToggleHideCompleted}
        onLogout={handleLogout}
      />

      <div className="flex flex-grow overflow-hidden">
        <Sidebar
          currentView={currentView}
          visibleTasks={visibleTasks}
          teams={teams}
          activeTracker={activeTracker}
          editingTodoId={editingTodoId}
          editText={editText}
          taskListHandlers={taskListHandlers}
          teamViewHandlers={teamViewHandlers}
          expandCollapseHandler={expandCollapseHandler}
          hideCompleted={hideCompleted}
          hoveredTaskId={hoveredTaskId}
          rootTaskSubtasksLength={rootTask.subtasks?.length || 0}
          onRequestAddTask={taskManagement.handleRequestAddTask}
          onRequestYearView={handleRequestYearView}
        />

        {currentView === VIEWS.TIMESHEET && (
          <TimesheetView
            visibleTasks={visibleTasks}
            monthDays={monthDays}
            activeTracker={activeTracker}
            handlers={gridHandlers}
            expandCollapseHandler={expandCollapseHandler}
            hideCompleted={hideCompleted}
          />
        )}

        {currentView === VIEWS.SEGUIMIENTO && <SeguimientoView />}

        {currentView === VIEWS.EQUIPOS && (
          <main className="flex-grow bg-gray-50 p-4 overflow-y-auto">
            <div className="bg-white p-4 rounded shadow">
              <p className="text-gray-500">
                Administre equipos y personas en el panel izquierdo.
              </p>
            </div>
          </main>
        )}
      </div>

      {/* Modals */}
      <AddTaskModal
        isOpen={isAddingTaskTo !== null}
        parentTaskName={parentTaskForModal?.text || ""}
        value={newTaskInputValue}
        taskType={newTaskType}
        group={newTaskGroup}
        onValueChange={taskManagement.handleNewTaskValueChange}
        onTypeChange={taskManagement.handleNewTaskTypeChange}
        onGroupChange={taskManagement.handleNewTaskGroupChange}
        onConfirm={taskManagement.handleConfirmAddTask}
        onCancel={taskManagement.handleCancelAddTask}
        isSubtask={isAddingTaskTo !== null && isAddingTaskTo !== "root"}
      />

      <YearlyCalendarModal
        isOpen={yearViewModalTaskId !== null}
        task={taskForYearlyView}
        year={yearViewModalYear}
        onClose={handleCloseYearView}
        onYearChange={handleChangeYearViewYear}
      />
    </div>
  );
};