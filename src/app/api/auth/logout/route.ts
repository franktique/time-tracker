import { NextResponse } from 'next/server';
import { createSuccessResponse } from '@/lib/middleware';

export async function POST() {
  const response = createSuccessResponse({
    message: 'Logout successful'
  });

  // Clear the auth token cookie
  response.cookies.set('auth-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0
  });

  return response;
}