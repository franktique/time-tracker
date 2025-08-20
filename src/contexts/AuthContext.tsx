"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { Hub } from "aws-amplify/utils";
import { fetchAuthSession } from "aws-amplify/auth";
import {
  cognitoAuth,
  validateEmailDomain,
  type SignUpResult,
} from "@/lib/cognito";
import { syncCognitoUserClient, type LocalUser } from "@/lib/client-user-sync";

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
  signUp: (
    username: string,
    password: string,
    email: string
  ) => Promise<SignUpResult>;
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
      console.error("Initial auth state check failed:", error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Poll for token availability after Hub signedIn event
  const waitForTokenAvailability = async (): Promise<boolean> => {
    const maxAttempts = 8; // Try for up to 8 seconds
    const baseDelay = 500;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.debug(
          `🔍 [AUTH-CONTEXT] Token availability check ${attempt}/${maxAttempts}`
        );
        const session = await fetchAuthSession();
        const token = session.tokens?.accessToken?.toString();

        if (token) {
          // Verify token is not expired
          const accessToken = session.tokens?.accessToken;
          if (accessToken && accessToken.payload.exp) {
            const expirationTime = accessToken.payload.exp * 1000;
            const now = Date.now();
            const bufferTime = 60000; // 1 minute buffer

            if (expirationTime - bufferTime > now) {
              console.info(
                `✅ [AUTH-CONTEXT] Valid token found on attempt ${attempt}`
              );
              return true;
            }
          } else {
            console.info(
              `✅ [AUTH-CONTEXT] Token found (no expiration check) on attempt ${attempt}`
            );
            return true;
          }
        }

        console.debug(
          `⏳ [AUTH-CONTEXT] No valid token yet (attempt ${attempt}), waiting...`
        );
        const delay = baseDelay + attempt * 250; // Increasing delay: 500ms, 750ms, 1000ms, etc.
        await new Promise((resolve) => setTimeout(resolve, delay));
      } catch (error) {
        console.error(
          `❌ [AUTH-CONTEXT] Token check failed (attempt ${attempt}):`,
          {
            errorName: error instanceof Error ? error.name : "Unknown",
            errorMessage:
              error instanceof Error ? error.message : String(error),
          }
        );

        if (attempt < maxAttempts) {
          const delay = baseDelay + attempt * 250;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    console.warn(
      "❌ [AUTH-CONTEXT] Failed to get valid token after all attempts"
    );
    return false;
  };

  const handleSignedIn = async () => {
    try {
      console.info(
        "🎯 [AUTH-CONTEXT] Processing signedIn event, waiting for token availability..."
      );

      // Wait for tokens to actually be available
      const tokensAvailable = await waitForTokenAvailability();

      if (!tokensAvailable) {
        console.error(
          "❌ [AUTH-CONTEXT] Tokens not available after sign-in, cannot proceed"
        );
        setUser(null);
        setIsLoading(false);
        return;
      }

      console.info(
        "🔄 [AUTH-CONTEXT] Tokens confirmed available, getting user info..."
      );
      const cognitoUser = await cognitoAuth.getCurrentUser();
      if (cognitoUser) {
        console.info("✅ [AUTH-CONTEXT] User info retrieved, syncing...");
        await handleUserSync(cognitoUser);
      }
    } catch (error) {
      console.error(
        "❌ [AUTH-CONTEXT] Failed to handle signed in event:",
        error
      );
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserSync = async (cognitoUser: {
    userId: string;
    username: string;
    email?: string;
  }) => {
    try {
      const syncResult = await syncCognitoUserClient(cognitoUser);

      setUser({
        id: cognitoUser.userId,
        username: syncResult.user.username, // Use local user's username (which is the email)
        email: cognitoUser.email || syncResult.user.email,
        localUser: syncResult.user,
      });

      if (syncResult.created) {
        console.info("✅ New user created in local database");
      }
    } catch (error) {
      console.error("User sync failed:", error);
      throw error;
    }
  };

  useEffect(() => {
    // Set up Hub listener for authentication events
    const hubListener = ({
      payload,
    }: {
      payload: { event: string; data?: unknown };
    }) => {
      switch (payload.event) {
        case "signedIn":
          console.info("🎉 User signed in via Hub event");
          handleSignedIn();
          break;
        case "signedOut":
          console.info("👋 User signed out via Hub event");
          setUser(null);
          setIsLoading(false);
          break;
        case "tokenRefresh":
          console.info("🔄 Token refreshed via Hub event");
          // User is still authenticated, no action needed
          break;
        case "tokenRefresh_failure":
          console.warn("❌ Token refresh failed via Hub event");
          setUser(null);
          setIsLoading(false);
          break;
      }
    };

    const unsubscribe = Hub.listen("auth", hubListener);

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

  const signUp = async (
    username: string,
    password: string,
    email: string
  ): Promise<SignUpResult> => {
    try {
      // Validate email domain if restriction is enabled
      if (!validateEmailDomain(email)) {
        throw new Error("Email domain not allowed");
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
      console.error("Sign out error:", error);
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
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
