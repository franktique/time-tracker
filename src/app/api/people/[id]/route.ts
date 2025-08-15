import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { createSuccessResponse, createErrorResponse, validateJsonBody, handleApiError } from '@/lib/middleware';
import { updatePerson, deletePerson } from '@/lib/db-queries/teams';

// PUT /api/people/[id] - Update person
export const PUT = withAuth(async (request, context) => {
  try {
    const personId = context?.params?.id;
    if (!personId) {
      return createErrorResponse('Person ID is required', 400);
    }

    const body = await validateJsonBody(request);
    const { name } = body;

    if (!name || !name.trim()) {
      return createErrorResponse('Person name is required', 400);
    }

    const updated = await updatePerson(personId, request.user.id, name.trim());
    
    if (!updated) {
      return createErrorResponse('Person not found', 404);
    }

    return createSuccessResponse({ message: 'Person updated successfully' });

  } catch (error: any) {
    if (error.message === 'Invalid JSON body') {
      return createErrorResponse('Invalid JSON body', 400);
    }
    return handleApiError(error, 'Failed to update person');
  }
});

// DELETE /api/people/[id] - Delete person
export const DELETE = withAuth(async (request, context) => {
  try {
    const personId = context?.params?.id;
    if (!personId) {
      return createErrorResponse('Person ID is required', 400);
    }

    const deleted = await deletePerson(personId, request.user.id);
    
    if (!deleted) {
      return createErrorResponse('Person not found', 404);
    }

    return createSuccessResponse({ message: 'Person deleted successfully' });

  } catch (error) {
    return handleApiError(error, 'Failed to delete person');
  }
});