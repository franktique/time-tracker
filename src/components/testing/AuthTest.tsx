"use client";

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Component to test the hybrid authentication system
 * Shows current authentication state and user information
 */
export const AuthTest: React.FC = () => {
  const { user, isAuthenticated, isLoading, signOut } = useAuth();

  if (isLoading) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
        <p className="text-yellow-800">🔄 Checking authentication state...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <p className="text-red-800">❌ Not authenticated</p>
        <p className="text-sm text-red-600 mt-2">Please sign in to access the application.</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-green-50 border border-green-200 rounded-md">
      <h3 className="text-lg font-semibold text-green-800 mb-3">✅ Authentication Status</h3>
      
      <div className="space-y-2 text-sm">
        <div>
          <span className="font-medium text-green-700">Cognito User ID:</span>
          <span className="ml-2 text-green-600">{user.id}</span>
        </div>
        
        <div>
          <span className="font-medium text-green-700">Username:</span>
          <span className="ml-2 text-green-600">{user.username}</span>
        </div>
        
        <div>
          <span className="font-medium text-green-700">Email:</span>
          <span className="ml-2 text-green-600">{user.email || 'Not provided'}</span>
        </div>
        
        {user.localUser && (
          <div className="mt-3 pt-3 border-t border-green-200">
            <h4 className="font-medium text-green-700 mb-2">Local Database User:</h4>
            <div className="pl-4 space-y-1">
              <div>
                <span className="font-medium text-green-600">Local ID:</span>
                <span className="ml-2 text-green-500 font-mono text-xs">{user.localUser.id}</span>
              </div>
              <div>
                <span className="font-medium text-green-600">Username:</span>
                <span className="ml-2 text-green-500">{user.localUser.username}</span>
              </div>
              <div>
                <span className="font-medium text-green-600">Email:</span>
                <span className="ml-2 text-green-500">{user.localUser.email}</span>
              </div>
              <div>
                <span className="font-medium text-green-600">Cognito Email:</span>
                <span className="ml-2 text-green-500">{user.localUser.cognito_email}</span>
              </div>
              <div>
                <span className="font-medium text-green-600">Created:</span>
                <span className="ml-2 text-green-500">
                  {new Date(user.localUser.created_at).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-4 pt-3 border-t border-green-200">
        <button
          onClick={signOut}
          className="bg-red-600 text-white px-4 py-2 rounded-md text-sm hover:bg-red-700 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
};