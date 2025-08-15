import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, User } from './auth';
import { requireAuth as requireCognitoAuth } from './cognito-middleware';
import { LocalUser } from './user-sync';

export interface AuthenticatedRequest extends NextRequest {
  user: User;
}

export interface CognitoAuthenticatedRequest extends NextRequest {
  user: LocalUser;
  cognitoUserId: string;
}

export type ApiHandler<T = any> = (
  request: AuthenticatedRequest,
  context?: { params: any }
) => Promise<NextResponse<T>>;

export type CognitoApiHandler<T = any> = (
  request: CognitoAuthenticatedRequest,
  context?: { params: any }
) => Promise<NextResponse<T>>;

export const withAuth = (handler: ApiHandler) => {
  return async (request: NextRequest, context?: { params: any }) => {
    try {
      const user = await authenticateRequest(request);
      
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      // Add user to request object
      const authenticatedRequest = request as AuthenticatedRequest;
      authenticatedRequest.user = user;

      return handler(authenticatedRequest, context);
    } catch (error) {
      console.error('Authentication error:', error);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }
  };
};

// New Cognito-based authentication middleware
export const withCognitoAuth = (handler: CognitoApiHandler) => {
  return async (request: NextRequest, context?: { params: any }) => {
    try {
      const authResult = await requireCognitoAuth(request);
      
      if ('error' in authResult) {
        return NextResponse.json(
          { error: authResult.error },
          { status: authResult.status }
        );
      }
      
      // Add user and Cognito user ID to request object
      const authenticatedRequest = request as CognitoAuthenticatedRequest;
      authenticatedRequest.user = authResult.localUser;
      authenticatedRequest.cognitoUserId = authResult.cognitoUserId;
      
      return handler(authenticatedRequest, context);
    } catch (error) {
      console.error('Cognito authentication error:', error);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }
  };
};

export const handleApiError = (error: any, defaultMessage = 'Internal server error') => {
  console.error('API Error:', error);
  
  if (error.code === '23505') { // PostgreSQL unique violation
    return NextResponse.json(
      { error: 'Resource already exists' },
      { status: 409 }
    );
  }
  
  if (error.code === '23503') { // PostgreSQL foreign key violation
    return NextResponse.json(
      { error: 'Referenced resource not found' },
      { status: 400 }
    );
  }
  
  return NextResponse.json(
    { error: defaultMessage },
    { status: 500 }
  );
};

export const validateJsonBody = async (request: NextRequest) => {
  try {
    return await request.json();
  } catch (error) {
    throw new Error('Invalid JSON body');
  }
};

export const createSuccessResponse = <T>(data: T, status = 200) => {
  return NextResponse.json({ success: true, data }, { status });
};

export const createErrorResponse = (message: string, status = 400) => {
  return NextResponse.json({ success: false, error: message }, { status });
};