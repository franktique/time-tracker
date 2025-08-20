import type { Task, Team } from "@/types";
import { apiClient } from "./api-client";

export interface LocalStorageData {
  rootTask?: Task;
  teams?: Team[];
  userName?: string;
}

export const exportLocalStorageData = (): LocalStorageData | null => {
  if (typeof window === "undefined") return null;

  try {
    const data: LocalStorageData = {};

    // Export root task
    const rootTaskData = localStorage.getItem("timesheet_rootTask");
    if (rootTaskData) {
      data.rootTask = JSON.parse(rootTaskData);
    }

    // Export teams
    const teamsData = localStorage.getItem("timesheet_teams");
    if (teamsData) {
      data.teams = JSON.parse(teamsData);
    }

    // Export username
    const userName = localStorage.getItem("timesheet_userName");
    if (userName) {
      data.userName = userName;
    }

    return data;
  } catch (error) {
    console.error("Failed to export localStorage data:", error);
    return null;
  }
};

export const downloadLocalStorageBackup = () => {
  const data = exportLocalStorageData();
  if (!data) {
    alert("No se encontraron datos para exportar");
    return;
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `timetracker-backup-${
    new Date().toISOString().split("T")[0]
  }.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const migrateTaskRecursively = async (
  task: Task,
  parentId: string | null = null
): Promise<void> => {
  // Skip root task - it's created automatically
  if (task.type === "root") {
    // Migrate subtasks of root
    for (const subtask of task.subtasks || []) {
      await migrateTaskRecursively(subtask, null);
    }
    return;
  }

  // Create the task
  let taskId: string;
  if (parentId) {
    const response = await apiClient.createSubtask(
      parentId,
      task.text,
      task.type,
      task.group
    );
    taskId = response.id;
  } else {
    const response = await apiClient.createTask(
      null,
      task.text,
      task.type,
      task.group
    );
    taskId = response.id;
  }

  // Update task properties if needed
  const updates: any = {};
  if (task.completed) updates.completed = true;

  if (Object.keys(updates).length > 0) {
    await apiClient.updateTask(taskId, updates);
  }

  // Migrate daily data
  for (const [date, dailyData] of Object.entries(task.dailyData || {})) {
    if (dailyData.value !== undefined || dailyData.completed !== undefined) {
      await apiClient.updateDailyData(
        taskId,
        date,
        dailyData.value,
        dailyData.completed
      );
    }
  }

  // Migrate subtasks
  for (const subtask of task.subtasks || []) {
    await migrateTaskRecursively(subtask, taskId);
  }
};

const migrateTeams = async (teams: Team[]): Promise<void> => {
  for (const team of teams) {
    const teamResponse = await apiClient.createTeam(team.name);

    // Add people to team
    for (const person of team.people || []) {
      await apiClient.addPersonToTeam(teamResponse.id, person.name);
    }
  }
};

export const migrateLocalStorageData = async (
  data: LocalStorageData
): Promise<void> => {
  try {
    // Migrate teams first (so people exist for task assignments)
    if (data.teams && data.teams.length > 0) {
      console.info("Migrating teams...");
      await migrateTeams(data.teams);
    }

    // Migrate tasks
    if (data.rootTask) {
      console.info("Migrating tasks...");
      await migrateTaskRecursively(data.rootTask);
    }

    console.info("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
};

export const clearLocalStorageData = (): void => {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem("timesheet_rootTask");
    localStorage.removeItem("timesheet_teams");
    localStorage.removeItem("timesheet_userName");
    console.info("LocalStorage data cleared");
  } catch (error) {
    console.error("Failed to clear localStorage data:", error);
  }
};
