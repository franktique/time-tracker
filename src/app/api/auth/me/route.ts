import { NextRequest } from 'next/server';
import { withCognitoAuth } from '@/lib/middleware';
import { createSuccessResponse } from '@/lib/middleware';

export const GET = withCognitoAuth(async (request) => {
  return createSuccessResponse({
    user: request.user
  });
});