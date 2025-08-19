"use client";

import React, { useState, useMemo } from "react";
import { Header } from "@/components/ui/Header";
import { Sidebar } from "@/components/ui/Sidebar";
import { TimesheetView } from "@/components/views/TimesheetView";
import { SeguimientoView } from "@/components/views/SeguimientoView";
import { EquiposView } from "@/components/views/EquiposView";
import { AddTaskModal } from "@/components/modals/AddTaskModal";
import { YearlyCalendarModal } from "@/components/modals/YearlyCalendarModal";
import { useApiTaskManagement } from "@/hooks/useApiTaskManagement";
import { useApiTimeTracker } from "@/hooks/useApiTimeTracker";
import { useApiTeamManagement } from "@/hooks/useApiTeamManagement";
import { useAuth } from "@/contexts/AuthContext";
import { TASK_GROUPS, VIEWS } from "@/lib/constants";
import { getDaysInMonth } from "@/lib/date-utils";
import { filterTodos, sortTaskTree } from "@/lib/task-utils";
import type { Task, View } from "@/types";

export const TimeTrackerApp: React.FC = () => {
  const { user } = useAuth();

  // --- API Hooks ---
  const taskManagement = useApiTaskManagement();
  const timeTracker = useApiTimeTracker(taskManagement.refreshTasks);
  const teamManagement = useApiTeamManagement();

  // --- State ---
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [expandedIds, setExpandedIds] = useState<Set<string | number>>(new Set(["root"]));
  const [hideCompleted, setHideCompleted] = useState(false);
  const [yearViewModalTaskId, setYearViewModalTaskId] = useState<string | number | null>(null);
  const [yearViewModalYear, setYearViewModalYear] = useState(new Date().getFullYear());
  const [hoveredTaskId, setHoveredTaskId] = useState<string | number | null>(null);
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

  const visibleTasks = useMemo(() => {
    if (!taskManagement.rootTask) return [];
    
    const sortedTasks = sortTaskTree(taskManagement.rootTask.subtasks || []);
    let tasksToShow = sortedTasks;
    if (currentView === VIEWS.SEGUIMIENTO) {
      tasksToShow = sortedTasks.filter((task) => task.group === TASK_GROUPS.PROJECT);
    }
    return filterTodos(tasksToShow, hideCompleted);
  }, [taskManagement.rootTask, hideCompleted, currentView]);

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

  const parentTaskForModal = useMemo(() => {
    if (isAddingTaskTo === null || !taskManagement.rootTask) return null;
    if (isAddingTaskTo === "root") return taskManagement.rootTask;
    
    const findTask = (tasks: Task[], id: string | number): Task | null => {
      for (const task of tasks) {
        if (task.id === id) return task;
        const found = findTask(task.subtasks, id);
        if (found) return found;
      }
      return null;
    };
    return findTask(taskManagement.rootTask.subtasks, isAddingTaskTo);
  }, [isAddingTaskTo, taskManagement.rootTask]);

  const taskForYearlyView = useMemo(() => {
    if (yearViewModalTaskId === null || !taskManagement.rootTask) return null;
    
    const findTask = (tasks: Task[], id: string | number): Task | null => {
      for (const task of tasks) {
        if (task.id === id) return task;
        const found = findTask(task.subtasks, id);
        if (found) return found;
      }
      return null;
    };
    return findTask(taskManagement.rootTask.subtasks, yearViewModalTaskId);
  }, [yearViewModalTaskId, taskManagement.rootTask]);

  // Loading state
  if (taskManagement.isLoading || teamManagement.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (taskManagement.error || timeTracker.error || teamManagement.error) {
    const errorMessage = taskManagement.error || timeTracker.error || teamManagement.error;
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="text-red-600 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error</h3>
          <p className="text-gray-600 mb-4">{errorMessage}</p>
          <button
            onClick={() => {
              taskManagement.refreshTasks();
              teamManagement.refreshTeams();
              timeTracker.clearError();
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!taskManagement.rootTask) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">No se encontraron datos</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex">
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        userName={user?.username || "Usuario"}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          currentMonth={currentMonth}
          onMonthChange={setCurrentMonth}
          hideCompleted={hideCompleted}
          onToggleCompleted={setHideCompleted}
          currentView={currentView}
          onRequestAddTask={() => taskManagement.handleRequestAddTask("root")}
          expandedIds={expandedIds}
          onToggleExpanded={(id) => {
            const newSet = new Set(expandedIds);
            if (newSet.has(id)) {
              newSet.delete(id);
            } else {
              newSet.add(id);
            }
            setExpandedIds(newSet);
          }}
          rootTask={taskManagement.rootTask}
        />

        <div className="flex-1 overflow-hidden">
          {currentView === VIEWS.TIMESHEET && (
            <TimesheetView
              tasks={visibleTasks}
              monthDays={monthDays}
              expandedIds={expandedIds}
              onToggleExpanded={(id) => {
                const newSet = new Set(expandedIds);
                if (newSet.has(id)) {
                  newSet.delete(id);
                } else {
                  newSet.add(id);
                }
                setExpandedIds(newSet);
              }}
              editingTodoId={editingTodoId}
              editText={editText}
              onEditChange={taskManagement.handleEditChange}
              onEditSave={taskManagement.handleEditSave}
              onEditKeyDown={taskManagement.handleEditKeyDown}
              onEditBlur={taskManagement.handleEditBlur}
              onDoubleClick={taskManagement.handleDoubleClick}
              onDelete={taskManagement.handleDelete}
              onToggleComplete={taskManagement.handleToggleOverallComplete}
              onUpdateDailyData={taskManagement.handleUpdateDailyData}
              onRequestAddTask={taskManagement.handleRequestAddTask}
              activeTracker={activeTracker}
              onStartTracking={timeTracker.handleStartTracking}
              onStopTracking={timeTracker.handleStopTracking}
              elapsedTime={timeTracker.elapsedTime}
              onShowYearView={setYearViewModalTaskId}
              yearViewYear={yearViewModalYear}
              onYearViewYearChange={setYearViewModalYear}
              hoveredTaskId={hoveredTaskId}
              onTaskHover={setHoveredTaskId}
              teams={teamManagement.teams}
            />
          )}

          {currentView === VIEWS.SEGUIMIENTO && (
            <SeguimientoView
              tasks={visibleTasks}
              monthDays={monthDays}
              expandedIds={expandedIds}
              onToggleExpanded={(id) => {
                const newSet = new Set(expandedIds);
                if (newSet.has(id)) {
                  newSet.delete(id);
                } else {
                  newSet.add(id);
                }
                setExpandedIds(newSet);
              }}
              editingTodoId={editingTodoId}
              editText={editText}
              onEditChange={taskManagement.handleEditChange}
              onEditSave={taskManagement.handleEditSave}
              onEditKeyDown={taskManagement.handleEditKeyDown}
              onEditBlur={taskManagement.handleEditBlur}
              onDoubleClick={taskManagement.handleDoubleClick}
              onDelete={taskManagement.handleDelete}
              onToggleComplete={taskManagement.handleToggleOverallComplete}
              onUpdateDailyData={taskManagement.handleUpdateDailyData}
              onRequestAddTask={taskManagement.handleRequestAddTask}
              activeTracker={activeTracker}
              onStartTracking={timeTracker.handleStartTracking}
              onStopTracking={timeTracker.handleStopTracking}
              elapsedTime={timeTracker.elapsedTime}
              onShowYearView={setYearViewModalTaskId}
              yearViewYear={yearViewModalYear}
              onYearViewYearChange={setYearViewModalYear}
              hoveredTaskId={hoveredTaskId}
              onTaskHover={setHoveredTaskId}
              teams={teamManagement.teams}
            />
          )}

          {currentView === VIEWS.EQUIPOS && (
            <EquiposView
              teams={teamManagement.teams}
              onAddTeam={teamManagement.handleAddTeam}
              onAddPerson={teamManagement.handleAddPerson}
              onDeleteTeam={teamManagement.handleDeleteTeam}
              onDeletePerson={teamManagement.handleDeletePerson}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      {isAddingTaskTo !== null && parentTaskForModal && (
        <AddTaskModal
          parentTask={parentTaskForModal}
          inputValue={newTaskInputValue}
          onInputChange={taskManagement.handleNewTaskValueChange}
          taskType={newTaskType}
          onTaskTypeChange={taskManagement.handleNewTaskTypeChange}
          taskGroup={newTaskGroup}
          onTaskGroupChange={taskManagement.handleNewTaskGroupChange}
          onConfirm={taskManagement.handleConfirmAddTask}
          onCancel={taskManagement.handleCancelAddTask}
          teams={teamManagement.teams}
        />
      )}

      {taskForYearlyView && (
        <YearlyCalendarModal
          task={taskForYearlyView}
          year={yearViewModalYear}
          onClose={() => setYearViewModalTaskId(null)}
          onYearChange={setYearViewModalYear}
        />
      )}
    </div>
  );
};