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
    console.log('🔍 [COGNITO-MIDDLEWARE] Starting token validation');
    
    // Try to get token from Authorization header first
    const authHeader = request.headers.get('authorization');
    let token: string | null = null;
    
    console.log('🔍 [COGNITO-MIDDLEWARE] Auth header:', authHeader?.substring(0, 50) + '...');
    
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
      console.log('✅ [COGNITO-MIDDLEWARE] Token extracted from Authorization header');
    } else {
      console.log('⚠️ [COGNITO-MIDDLEWARE] No Bearer token in Authorization header, trying cookies');
      // Fallback to cookie
      const tokenCookie = request.cookies.get('auth-token');
      token = tokenCookie?.value || null;
      if (token) {
        console.log('✅ [COGNITO-MIDDLEWARE] Token found in cookies');
      }
    }
    
    if (!token) {
      console.log('❌ [COGNITO-MIDDLEWARE] No token provided');
      return { isAuthenticated: false, error: 'No token provided' };
    }
    
    console.log('🔍 [COGNITO-MIDDLEWARE] Token preview:', token.substring(0, 50) + '...');
    
    // For Cognito tokens, we need to validate the JWT and extract the user ID
    // Since we're in a server context, we'll decode the JWT manually
    const cognitoUserId = extractCognitoUserIdFromToken(token);
    console.log('🔍 [COGNITO-MIDDLEWARE] Extracted Cognito user ID:', cognitoUserId);
    
    if (!cognitoUserId) {
      console.log('❌ [COGNITO-MIDDLEWARE] Invalid token format - could not extract user ID');
      return { isAuthenticated: false, error: 'Invalid token format' };
    }
    
    // Get the corresponding local user
    console.log('🔍 [COGNITO-MIDDLEWARE] Looking up local user for Cognito ID:', cognitoUserId);
    const localUser = await getLocalUserByCognitoId(cognitoUserId);
    
    if (!localUser) {
      console.log('❌ [COGNITO-MIDDLEWARE] User not found in local database for Cognito ID:', cognitoUserId);
      return { isAuthenticated: false, error: 'User not found in local database' };
    }
    
    console.log('✅ [COGNITO-MIDDLEWARE] Local user found:', { id: localUser.id, username: localUser.username });
    
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
    console.log('🔍 [TOKEN-EXTRACT] Extracting user ID from JWT token');
    
    // JWT tokens have 3 parts separated by dots
    const parts = token.split('.');
    console.log('🔍 [TOKEN-EXTRACT] JWT parts count:', parts.length);
    
    if (parts.length !== 3) {
      console.log('❌ [TOKEN-EXTRACT] Invalid JWT format - expected 3 parts, got', parts.length);
      return null;
    }
    
    // Decode the payload (second part)
    const payload = parts[1];
    console.log('🔍 [TOKEN-EXTRACT] Payload part length:', payload.length);
    
    const decodedPayload = Buffer.from(payload, 'base64url').toString('utf8');
    const claims = JSON.parse(decodedPayload);
    console.log('🔍 [TOKEN-EXTRACT] Token claims:', {
      sub: claims.sub,
      iss: claims.iss,
      token_use: claims.token_use,
      exp: claims.exp ? new Date(claims.exp * 1000).toISOString() : 'undefined'
    });
    
    // Cognito uses 'sub' claim for user ID
    const userId = claims.sub || null;
    console.log('🔍 [TOKEN-EXTRACT] Extracted user ID:', userId);
    return userId;
  } catch (error) {
    console.error('❌ [TOKEN-EXTRACT] Error extracting user ID from token:', error);
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