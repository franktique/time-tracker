import { NextRequest, NextResponse } from 'next/server';
import { createUser } from '@/lib/auth';
import { handleApiError, validateJsonBody, createSuccessResponse, createErrorResponse } from '@/lib/middleware';

export async function POST(request: NextRequest) {
  try {
    const body = await validateJsonBody(request);
    const { username, password, email } = body;

    if (!username || !password) {
      return createErrorResponse('Username and password are required', 400);
    }

    if (password.length < 6) {
      return createErrorResponse('Password must be at least 6 characters long', 400);
    }

    if (username.length < 3) {
      return createErrorResponse('Username must be at least 3 characters long', 400);
    }

    const user = await createUser(username, password, email);
    
    return createSuccessResponse({
      message: 'User created successfully',
      user: { id: user.id, username: user.username, email: user.email }
    }, 201);

  } catch (error: any) {
    if (error.code === '23505' && error.constraint?.includes('username')) {
      return createErrorResponse('Username already exists', 409);
    }
    if (error.code === '23505' && error.constraint?.includes('email')) {
      return createErrorResponse('Email already exists', 409);
    }
    if (error.message === 'Invalid JSON body') {
      return createErrorResponse('Invalid JSON body', 400);
    }
    return handleApiError(error, 'Failed to create user');
  }
}