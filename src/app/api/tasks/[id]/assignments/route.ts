import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { createSuccessResponse, createErrorResponse, validateJsonBody, handleApiError } from '@/lib/middleware';
import { updateTaskAssignments } from '@/lib/db-queries/teams';

// PUT /api/tasks/[id]/assignments - Update task-person assignments
export const PUT = withAuth(async (request, context) => {
  try {
    const taskId = context?.params?.id;
    if (!taskId) {
      return createErrorResponse('Task ID is required', 400);
    }

    const body = await validateJsonBody(request);
    const { personIds } = body;

    if (!Array.isArray(personIds)) {
      return createErrorResponse('personIds must be an array', 400);
    }

    await updateTaskAssignments(taskId, request.user.id, personIds);

    return createSuccessResponse({ 
      message: 'Task assignments updated successfully',
      assignedPeople: personIds.length
    });

  } catch (error: any) {
    if (error.message === 'Invalid JSON body') {
      return createErrorResponse('Invalid JSON body', 400);
    }
    if (error.message === 'Task not found or access denied') {
      return createErrorResponse('Task not found or access denied', 404);
    }
    return handleApiError(error, 'Failed to update task assignments');
  }
});