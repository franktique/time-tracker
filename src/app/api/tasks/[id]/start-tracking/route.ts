import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { createSuccessResponse, createErrorResponse, validateJsonBody, handleApiError } from '@/lib/middleware';
import { updateTask } from '@/lib/db-queries/tasks';
import { query } from '@/lib/db';

// POST /api/tasks/[id]/start-tracking - Start time tracking
export const POST = withAuth(async (request, context) => {
  try {
    const taskId = context?.params?.id;
    if (!taskId) {
      return createErrorResponse('Task ID is required', 400);
    }

    const body = await validateJsonBody(request);
    const { date } = body;

    if (!date) {
      return createErrorResponse('Date is required', 400);
    }

    // Stop any currently tracking tasks for this user first
    await query(
      `UPDATE tasks SET is_tracking = false, start_time = NULL, tracking_date = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND is_tracking = true`,
      [request.user.id]
    );

    // Start tracking this task
    const startTime = Date.now();
    const updated = await updateTask(taskId, request.user.id, {
      is_tracking: true,
      start_time: startTime,
      tracking_date: date
    });

    if (!updated) {
      return createErrorResponse('Task not found', 404);
    }

    return createSuccessResponse({ 
      message: 'Time tracking started',
      startTime,
      date
    });

  } catch (error: any) {
    if (error.message === 'Invalid JSON body') {
      return createErrorResponse('Invalid JSON body', 400);
    }
    return handleApiError(error, 'Failed to start time tracking');
  }
});