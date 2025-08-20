import { NextRequest } from 'next/server';
import { withCognitoAuth } from '@/lib/middleware';
import { createSuccessResponse, createErrorResponse, validateJsonBody, handleApiError } from '@/lib/middleware';
import { createTask } from '@/lib/db-queries/tasks';

// POST /api/tasks/[id]/subtasks - Add subtask to parent
export const POST = withCognitoAuth(async (request, context) => {
  try {
    const parentId = context?.params?.id;
    if (!parentId) {
      return createErrorResponse('Parent task ID is required', 400);
    }

    const body = await validateJsonBody(request);
    const { text, type, group, position = 0 } = body;

    if (!text || !type || !group) {
      return createErrorResponse('Missing required fields: text, type, group', 400);
    }

    const taskId = await createTask(
      request.user.id,
      parentId,
      text,
      type,
      group,
      position
    );

    return createSuccessResponse({ id: taskId, message: 'Subtask created successfully' }, 201);

  } catch (error: any) {
    if (error.message === 'Invalid JSON body') {
      return createErrorResponse('Invalid JSON body', 400);
    }
    return handleApiError(error, 'Failed to create subtask');
  }
});