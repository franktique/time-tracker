import { NextRequest, NextResponse } from 'next/server';
import { loginUser } from '@/lib/auth';
import { handleApiError, validateJsonBody, createSuccessResponse, createErrorResponse } from '@/lib/middleware';

export async function POST(request: NextRequest) {
  try {
    const body = await validateJsonBody(request);
    const { username, password } = body;

    if (!username || !password) {
      return createErrorResponse('Username and password are required', 400);
    }

    const result = await loginUser(username, password);
    
    if (!result) {
      return createErrorResponse('Invalid username or password', 401);
    }

    const response = createSuccessResponse({
      message: 'Login successful',
      user: result.user,
      token: result.token
    });

    // Set cookie for browser sessions
    response.cookies.set('auth-token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    return response;

  } catch (error: any) {
    if (error.message === 'Invalid JSON body') {
      return createErrorResponse('Invalid JSON body', 400);
    }
    return handleApiError(error, 'Login failed');
  }
}