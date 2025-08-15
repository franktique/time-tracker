import { NextRequest } from 'next/server';
import { createSuccessResponse, createErrorResponse, handleApiError, validateJsonBody } from '@/lib/middleware';
import { syncCognitoUser } from '@/lib/user-sync';
import type { CognitoUser } from '@/lib/cognito';

/**
 * POST /api/auth/sync-user
 * Sync a Cognito user with the local database
 * This endpoint is called after successful Cognito authentication
 */
export async function POST(request: NextRequest) {
  try {
    const body = await validateJsonBody(request);
    const { cognitoUserId, username, email } = body;

    if (!cognitoUserId || !email) {
      return createErrorResponse('Missing required fields: cognitoUserId, email', 400);
    }

    // Create CognitoUser object from request data
    const cognitoUser: CognitoUser = {
      userId: cognitoUserId,
      username: username || email,
      email,
    };

    // Sync with local database
    const syncResult = await syncCognitoUser(cognitoUser);

    return createSuccessResponse({
      user: syncResult.user,
      created: syncResult.created,
      message: syncResult.created ? 'User created successfully' : 'User found and updated',
    });

  } catch (error) {
    console.error('User sync error:', error);
    return handleApiError(error, 'Failed to sync user');
  }
}