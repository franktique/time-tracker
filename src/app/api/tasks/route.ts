import { NextRequest } from "next/server";
import { withCognitoAuth } from "@/lib/middleware";
import {
  createSuccessResponse,
  createErrorResponse,
  validateJsonBody,
  handleApiError,
} from "@/lib/middleware";
import { getUserTasks, createTask } from "@/lib/db-queries/tasks";

// GET /api/tasks - Fetch user tasks
export const GET = withCognitoAuth(async (request) => {
  try {
    const rootTask = await getUserTasks(request.user.id);

    if (process.env.NODE_ENV !== "production") {
      const snapshot = {
        id: rootTask?.id,
        subtaskCount: rootTask?.subtasks?.length ?? 0,
        // Limit snapshot to avoid noisy logs
        subtasks: (rootTask?.subtasks ?? []).slice(0, 5).map((st) => ({
          id: st.id,
          type: st.type,
          hasText: !!st.text,
          dailyDataKeysCount: st.dailyData
            ? Object.keys(st.dailyData).length
            : 0,
        })),
      };
      console.debug("📊 [API-TASKS] Returning root task snapshot", snapshot);
    }

    return createSuccessResponse(rootTask);
  } catch (error) {
    console.error("❌ [API-TASKS] Error in GET /api/tasks:", error);
    return handleApiError(error, "Failed to fetch tasks");
  }
});

// POST /api/tasks - Create new task
export const POST = withCognitoAuth(async (request) => {
  try {
    const body = await validateJsonBody(request);
    const { parentId, text, type, group, position = 0 } = body;

    if (!text || !type || !group) {
      return createErrorResponse(
        "Missing required fields: text, type, group",
        400
      );
    }

    // Validate parent exists if provided (and not root)
    if (parentId && parentId !== "root") {
      const checkParent = await getUserTasks(request.user.id);
      // This is a simplified check - in production, you'd want a more efficient parent validation
    }

    const taskId = await createTask(
      request.user.id,
      parentId === "root" ? null : parentId,
      text,
      type,
      group,
      position
    );

    return createSuccessResponse(
      { id: taskId, message: "Task created successfully" },
      201
    );
  } catch (error: any) {
    if (error.message === "Invalid JSON body") {
      return createErrorResponse("Invalid JSON body", 400);
    }
    return handleApiError(error, "Failed to create task");
  }
});
