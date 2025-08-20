import { NextRequest } from "next/server";
import { withCognitoAuth } from "@/lib/middleware";
import {
  createSuccessResponse,
  createErrorResponse,
  validateJsonBody,
  handleApiError,
} from "@/lib/middleware";
import { updateDailyData, getTaskDailyData } from "@/lib/db-queries/tasks";

type DynamicRouteContext = {
  params: {
    id: string;
  };
};

// GET /api/tasks/[id]/daily-data - Get task's daily data for date range
export const GET = withCognitoAuth(async (request, context) => {
  try {
    // Type assertion since we know this is a dynamic route with [id] parameter
    const { params } = context as DynamicRouteContext;
    const taskId = params.id;

    if (!taskId) {
      return createErrorResponse("Task ID is required", 400);
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const dailyData = await getTaskDailyData(
      taskId,
      request.user.id,
      startDate || undefined,
      endDate || undefined
    );

    // Transform to match frontend format
    const formattedData: Record<string, any> = {};
    dailyData.forEach((dd) => {
      formattedData[dd.date] = {
        value: dd.value,
        completed: dd.completed,
      };
    });

    return createSuccessResponse(formattedData);
  } catch (error: any) {
    if (error.message === "Task not found or access denied") {
      return createErrorResponse("Task not found or access denied", 404);
    }
    return handleApiError(error, "Failed to fetch daily data");
  }
});

// PUT /api/tasks/[id]/daily-data - Update daily data (manual time/quantity)
export const PUT = withCognitoAuth(async (request, context) => {
  try {
    // Type assertion since we know this is a dynamic route with [id] parameter
    const { params } = context as DynamicRouteContext;
    const taskId = params.id;

    if (!taskId) {
      return createErrorResponse("Task ID is required", 400);
    }

    const body = await validateJsonBody(request);
    const { date, value, completed } = body;

    if (!date) {
      return createErrorResponse("Date is required", 400);
    }

    await updateDailyData(taskId, request.user.id, date, value, completed);

    return createSuccessResponse({
      message: "Daily data updated successfully",
      date,
      value,
      completed,
    });
  } catch (error: any) {
    if (error.message === "Invalid JSON body") {
      return createErrorResponse("Invalid JSON body", 400);
    }
    if (error.message === "Task not found or access denied") {
      return createErrorResponse("Task not found or access denied", 404);
    }
    return handleApiError(error, "Failed to update daily data");
  }
});
