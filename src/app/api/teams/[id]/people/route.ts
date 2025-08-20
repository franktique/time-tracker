import { NextRequest } from 'next/server';
import { withCognitoAuth } from '@/lib/middleware';
import { createSuccessResponse, createErrorResponse, validateJsonBody, handleApiError } from '@/lib/middleware';
import { createPerson } from '@/lib/db-queries/teams';

// POST /api/teams/[id]/people - Add person to team
export const POST = withCognitoAuth(async (request, context) => {
  try {
    const teamId = context?.params?.id;
    if (!teamId) {
      return createErrorResponse('Team ID is required', 400);
    }

    const body = await validateJsonBody(request);
    const { name } = body;

    if (!name || !name.trim()) {
      return createErrorResponse('Person name is required', 400);
    }

    const personId = await createPerson(teamId, request.user.id, name.trim());

    return createSuccessResponse({ 
      id: personId, 
      message: 'Person added to team successfully' 
    }, 201);

  } catch (error: any) {
    if (error.message === 'Invalid JSON body') {
      return createErrorResponse('Invalid JSON body', 400);
    }
    if (error.message === 'Team not found or access denied') {
      return createErrorResponse('Team not found or access denied', 404);
    }
    return handleApiError(error, 'Failed to add person to team');
  }
});