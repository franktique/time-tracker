"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Hub } from 'aws-amplify/utils';
import { cognitoAuth, validateEmailDomain, type SignUpResult } from '@/lib/cognito';
import { syncCognitoUserClient, type LocalUser } from '@/lib/client-user-sync';

interface User {
  id: string;
  username: string;
  email?: string;
  localUser?: LocalUser; // Reference to the local database user record
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signUp: (username: string, password: string, email: string) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  confirmSignUp: (username: string, code: string) => Promise<void>;
  resendConfirmationCode: (username: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkInitialAuthState = async () => {
    try {
      // Check if we have a valid session before trying to get user details
      const hasSession = await cognitoAuth.hasValidSession();
      if (hasSession) {
        const cognitoUser = await cognitoAuth.getCurrentUser();
        if (cognitoUser) {
          await handleUserSync(cognitoUser);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Initial auth state check failed:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignedIn = async () => {
    try {
      const cognitoUser = await cognitoAuth.getCurrentUser();
      if (cognitoUser) {
        await handleUserSync(cognitoUser);
      }
    } catch (error) {
      console.error('Failed to handle signed in event:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserSync = async (cognitoUser: { userId: string; username: string; email?: string }) => {
    try {
      const syncResult = await syncCognitoUserClient(cognitoUser);
      
      setUser({
        id: cognitoUser.userId,
        username: cognitoUser.username,
        email: cognitoUser.email,
        localUser: syncResult.user,
      });
      
      if (syncResult.created) {
        console.log('✅ New user created in local database');
      }
    } catch (error) {
      console.error('User sync failed:', error);
      throw error;
    }
  };

  useEffect(() => {
    // Set up Hub listener for authentication events
    const hubListener = ({ payload }: { payload: { event: string; data?: unknown } }) => {
      switch (payload.event) {
        case 'signedIn':
          console.log('🎉 User signed in via Hub event');
          handleSignedIn();
          break;
        case 'signedOut':
          console.log('👋 User signed out via Hub event');
          setUser(null);
          setIsLoading(false);
          break;
        case 'tokenRefresh':
          console.log('🔄 Token refreshed via Hub event');
          // User is still authenticated, no action needed
          break;
        case 'tokenRefresh_failure':
          console.log('❌ Token refresh failed via Hub event');
          setUser(null);
          setIsLoading(false);
          break;
      }
    };

    const unsubscribe = Hub.listen('auth', hubListener);

    // Initial auth state check on mount (safely)
    checkInitialAuthState();

    // Cleanup Hub listener on unmount
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = async (username: string, password: string) => {
    try {
      setIsLoading(true);
      await cognitoAuth.signIn(username, password);
      // Hub listener will automatically handle the signedIn event
      // No need to manually set user state here
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const signUp = async (username: string, password: string, email: string): Promise<SignUpResult> => {
    try {
      // Validate email domain if restriction is enabled
      if (!validateEmailDomain(email)) {
        throw new Error('Email domain not allowed');
      }
      
      return await cognitoAuth.signUp(username, password, email);
    } catch (error) {
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await cognitoAuth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Sign out error:', error);
      // Even if logout fails on server, clear local state
      setUser(null);
    }
  };

  const confirmSignUp = async (username: string, code: string) => {
    try {
      await cognitoAuth.confirmSignUp(username, code);
    } catch (error) {
      throw error;
    }
  };

  const resendConfirmationCode = async (username: string) => {
    try {
      await cognitoAuth.resendConfirmationCode(username);
    } catch (error) {
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut,
    confirmSignUp,
    resendConfirmationCode,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};