import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { createSuccessResponse, createErrorResponse, validateJsonBody, handleApiError } from '@/lib/middleware';
import { updateTask, deleteTask } from '@/lib/db-queries/tasks';

// PUT /api/tasks/[id] - Update task
export const PUT = withAuth(async (request, context) => {
  try {
    const taskId = context?.params?.id;
    if (!taskId) {
      return createErrorResponse('Task ID is required', 400);
    }

    const body = await validateJsonBody(request);
    const updates: any = {};

    // Only include allowed fields in updates
    const allowedFields = ['text', 'type', 'task_group', 'completed', 'is_tracking', 'start_time', 'tracking_date', 'position', 'parent_id'];
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return createErrorResponse('No valid fields to update', 400);
    }

    const updated = await updateTask(taskId, request.user.id, updates);
    
    if (!updated) {
      return createErrorResponse('Task not found or no changes made', 404);
    }

    return createSuccessResponse({ message: 'Task updated successfully' });

  } catch (error: any) {
    if (error.message === 'Invalid JSON body') {
      return createErrorResponse('Invalid JSON body', 400);
    }
    return handleApiError(error, 'Failed to update task');
  }
});

// DELETE /api/tasks/[id] - Delete task
export const DELETE = withAuth(async (request, context) => {
  try {
    const taskId = context?.params?.id;
    if (!taskId) {
      return createErrorResponse('Task ID is required', 400);
    }

    const deleted = await deleteTask(taskId, request.user.id);
    
    if (!deleted) {
      return createErrorResponse('Task not found', 404);
    }

    return createSuccessResponse({ message: 'Task deleted successfully' });

  } catch (error) {
    return handleApiError(error, 'Failed to delete task');
  }
});