import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { createSuccessResponse, createErrorResponse, validateJsonBody, handleApiError } from '@/lib/middleware';
import { updateTask, updateDailyData } from '@/lib/db-queries/tasks';
import { query } from '@/lib/db';

// POST /api/tasks/[id]/stop-tracking - Stop time tracking
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

    // Get current tracking info
    const trackingResult = await query(
      `SELECT start_time, tracking_date FROM tasks 
       WHERE id = $1 AND user_id = $2 AND is_tracking = true`,
      [taskId, request.user.id]
    );

    if (trackingResult.rows.length === 0) {
      return createErrorResponse('Task is not currently being tracked', 400);
    }

    const { start_time, tracking_date } = trackingResult.rows[0];
    
    if (tracking_date !== date) {
      return createErrorResponse('Date mismatch with tracking session', 400);
    }

    // Calculate duration in seconds
    const endTime = Date.now();
    const durationSeconds = (endTime - start_time) / 1000;

    // Get existing daily data value
    const existingDataResult = await query(
      `SELECT value FROM daily_data WHERE task_id = $1 AND date = $2`,
      [taskId, date]
    );

    const existingValue = existingDataResult.rows[0]?.value || 0;
    const newValue = existingValue + durationSeconds;

    // Update daily data
    await updateDailyData(taskId, request.user.id, date, newValue);

    // Stop tracking
    const updated = await updateTask(taskId, request.user.id, {
      is_tracking: false,
      start_time: null,
      tracking_date: null
    });

    if (!updated) {
      return createErrorResponse('Task not found', 404);
    }

    return createSuccessResponse({
      message: 'Time tracking stopped',
      durationSeconds,
      totalTime: newValue,
      date
    });

  } catch (error: any) {
    if (error.message === 'Invalid JSON body') {
      return createErrorResponse('Invalid JSON body', 400);
    }
    return handleApiError(error, 'Failed to stop time tracking');
  }
});