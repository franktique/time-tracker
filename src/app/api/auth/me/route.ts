import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { createSuccessResponse } from '@/lib/middleware';

export const GET = withAuth(async (request) => {
  return createSuccessResponse({
    user: request.user
  });
});