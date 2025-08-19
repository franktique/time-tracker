// Client-side user sync service that makes API calls instead of direct DB access
import type { CognitoUser } from './cognito';

export interface LocalUser {
  id: string;
  username: string;
  email?: string;
  cognito_user_id?: string;
  cognito_email?: string;
  created_at: string;
  updated_at: string;
}

export interface UserSyncResult {
  user: LocalUser;
  created: boolean;
}

/**
 * Client-side function to sync Cognito user with local database via API
 */
export async function syncCognitoUserClient(cognitoUser: CognitoUser): Promise<UserSyncResult> {
  try {
    const response = await fetch('/api/auth/sync-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cognitoUserId: cognitoUser.userId,
        username: cognitoUser.username,
        email: cognitoUser.email,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to sync user');
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Client user sync error:', error);
    throw error;
  }
}