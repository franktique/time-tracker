import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { createSuccessResponse, createErrorResponse, validateJsonBody, handleApiError } from '@/lib/middleware';
import { updateTeam, deleteTeam } from '@/lib/db-queries/teams';

// PUT /api/teams/[id] - Update team
export const PUT = withAuth(async (request, context) => {
  try {
    const teamId = context?.params?.id;
    if (!teamId) {
      return createErrorResponse('Team ID is required', 400);
    }

    const body = await validateJsonBody(request);
    const { name } = body;

    if (!name || !name.trim()) {
      return createErrorResponse('Team name is required', 400);
    }

    const updated = await updateTeam(teamId, request.user.id, name.trim());
    
    if (!updated) {
      return createErrorResponse('Team not found', 404);
    }

    return createSuccessResponse({ message: 'Team updated successfully' });

  } catch (error: any) {
    if (error.message === 'Invalid JSON body') {
      return createErrorResponse('Invalid JSON body', 400);
    }
    return handleApiError(error, 'Failed to update team');
  }
});

// DELETE /api/teams/[id] - Delete team
export const DELETE = withAuth(async (request, context) => {
  try {
    const teamId = context?.params?.id;
    if (!teamId) {
      return createErrorResponse('Team ID is required', 400);
    }

    const deleted = await deleteTeam(teamId, request.user.id);
    
    if (!deleted) {
      return createErrorResponse('Team not found', 404);
    }

    return createSuccessResponse({ message: 'Team deleted successfully' });

  } catch (error) {
    return handleApiError(error, 'Failed to delete team');
  }
});