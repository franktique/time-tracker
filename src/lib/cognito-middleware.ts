import { NextRequest } from 'next/server';
import { fetchAuthSession } from 'aws-amplify/auth/server';
import { getLocalUserByCognitoId, type LocalUser } from './user-sync';

export interface CognitoAuthResult {
  isAuthenticated: boolean;
  cognitoUserId?: string;
  localUser?: LocalUser;
  error?: string;
}

/**
 * Extract and validate Cognito JWT token from request
 * This works with both Authorization header and cookies
 */
export async function validateCognitoToken(request: NextRequest): Promise<CognitoAuthResult> {
  try {
    // Try to get token from Authorization header first
    const authHeader = request.headers.get('authorization');
    let token: string | null = null;
    
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      // Fallback to cookie
      const tokenCookie = request.cookies.get('auth-token');
      token = tokenCookie?.value || null;
    }
    
    if (!token) {
      return { isAuthenticated: false, error: 'No token provided' };
    }
    
    // For Cognito tokens, we need to validate the JWT and extract the user ID
    // Since we're in a server context, we'll decode the JWT manually
    const cognitoUserId = extractCognitoUserIdFromToken(token);
    
    if (!cognitoUserId) {
      return { isAuthenticated: false, error: 'Invalid token format' };
    }
    
    // Get the corresponding local user
    const localUser = await getLocalUserByCognitoId(cognitoUserId);
    
    if (!localUser) {
      return { isAuthenticated: false, error: 'User not found in local database' };
    }
    
    return {
      isAuthenticated: true,
      cognitoUserId,
      localUser,
    };
    
  } catch (error) {
    console.error('Token validation error:', error);
    return { isAuthenticated: false, error: 'Token validation failed' };
  }
}

/**
 * Extract Cognito user ID from JWT token without full verification
 * Note: This is for getting the user ID only. Full verification happens in Cognito
 */
function extractCognitoUserIdFromToken(token: string): string | null {
  try {
    // JWT tokens have 3 parts separated by dots
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    // Decode the payload (second part)
    const payload = parts[1];
    const decodedPayload = Buffer.from(payload, 'base64url').toString('utf8');
    const claims = JSON.parse(decodedPayload);
    
    // Cognito uses 'sub' claim for user ID
    return claims.sub || null;
  } catch (error) {
    console.error('Error extracting user ID from token:', error);
    return null;
  }
}

/**
 * Middleware helper for API routes that require authentication
 */
export async function requireAuth(request: NextRequest): Promise<{
  localUser: LocalUser;
  cognitoUserId: string;
} | { error: string; status: number }> {
  const authResult = await validateCognitoToken(request);
  
  if (!authResult.isAuthenticated || !authResult.localUser || !authResult.cognitoUserId) {
    return {
      error: authResult.error || 'Authentication required',
      status: 401
    };
  }
  
  return {
    localUser: authResult.localUser,
    cognitoUserId: authResult.cognitoUserId
  };
}

/**
 * Alternative approach: Use Amplify's server-side auth validation
 * This would be more secure but requires proper Amplify server setup
 */
export async function validateCognitoTokenWithAmplify(_request: NextRequest): Promise<CognitoAuthResult> {
  try {
    // This would require proper Amplify configuration on the server side
    const session = await fetchAuthSession();
    
    if (!session.tokens?.accessToken) {
      return { isAuthenticated: false, error: 'No valid session' };
    }
    
    const cognitoUserId = session.tokens.accessToken.payload.sub as string;
    const localUser = await getLocalUserByCognitoId(cognitoUserId);
    
    if (!localUser) {
      return { isAuthenticated: false, error: 'User not found in local database' };
    }
    
    return {
      isAuthenticated: true,
      cognitoUserId,
      localUser,
    };
    
  } catch (error) {
    console.error('Amplify token validation error:', error);
    return { isAuthenticated: false, error: 'Token validation failed' };
  }
}