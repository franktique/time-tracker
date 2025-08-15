import type { Task, Team, User } from '@/types';
import { fetchAuthSession } from 'aws-amplify/auth';
import { cognitoAuth } from './cognito';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export class ApiError extends Error {
  status: number;
  
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// Utility function for exponential backoff retry
async function retry<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on non-auth errors or final attempt
      if (attempt === maxAttempts || (error instanceof ApiError && error.status !== 401)) {
        throw error;
      }
      
      // Exponential backoff: 1s, 2s, 4s, etc.
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(`🔄 Attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

class ApiClient {
  private baseUrl = '/api';

  // Get current access token from Cognito session
  private async getAccessToken(): Promise<string | null> {
    try {
      // First check if we have a valid session
      const hasSession = await cognitoAuth.hasValidSession();
      if (!hasSession) {
        return null;
      }

      const session = await fetchAuthSession();
      return session.tokens?.accessToken?.toString() || null;
    } catch (error) {
      console.error('Failed to get access token:', error);
      return null;
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    return retry(async () => {
      const url = `${this.baseUrl}${endpoint}`;
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      // Automatically get and add access token
      const token = await this.getAccessToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new ApiError(data.error || 'Request failed', response.status);
      }

      return data.data;
    });
  }

  // Check if user is authenticated before making requests
  private async ensureAuthenticated(): Promise<void> {
    const hasSession = await cognitoAuth.hasValidSession();
    if (!hasSession) {
      throw new ApiError('User must be authenticated to perform this action', 401);
    }
  }

  // Authentication endpoints (these don't require existing auth)
  async login(username: string, password: string): Promise<{ user: User; token: string }> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  async register(username: string, password: string, email?: string): Promise<{ user: User }> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, email }),
    });
  }

  async logout(): Promise<void> {
    await this.request('/auth/logout', { method: 'POST' });
  }

  async getCurrentUser(): Promise<{ user: User }> {
    await this.ensureAuthenticated();
    return this.request('/auth/me');
  }

  // Task endpoints (all require authentication)
  async getTasks(): Promise<Task> {
    await this.ensureAuthenticated();
    return this.request('/tasks');
  }

  async createTask(
    parentId: string | null,
    text: string,
    type: string,
    group: string,
    position?: number
  ): Promise<{ id: string }> {
    await this.ensureAuthenticated();
    return this.request('/tasks', {
      method: 'POST',
      body: JSON.stringify({ 
        parentId: parentId === 'root' ? 'root' : parentId, 
        text, 
        type, 
        group, 
        position 
      }),
    });
  }

  async updateTask(taskId: string, updates: any): Promise<void> {
    await this.ensureAuthenticated();
    await this.request(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteTask(taskId: string): Promise<void> {
    await this.ensureAuthenticated();
    await this.request(`/tasks/${taskId}`, { method: 'DELETE' });
  }

  async createSubtask(
    parentId: string,
    text: string,
    type: string,
    group: string,
    position?: number
  ): Promise<{ id: string }> {
    return this.request(`/tasks/${parentId}/subtasks`, {
      method: 'POST',
      body: JSON.stringify({ text, type, group, position }),
    });
  }

  // Time tracking endpoints
  async startTracking(taskId: string, date: string): Promise<{ startTime: number; date: string }> {
    return this.request(`/tasks/${taskId}/start-tracking`, {
      method: 'POST',
      body: JSON.stringify({ date }),
    });
  }

  async stopTracking(taskId: string, date: string): Promise<{ 
    durationSeconds: number; 
    totalTime: number; 
    date: string 
  }> {
    return this.request(`/tasks/${taskId}/stop-tracking`, {
      method: 'POST',
      body: JSON.stringify({ date }),
    });
  }

  async updateDailyData(
    taskId: string,
    date: string,
    value?: number,
    completed?: boolean
  ): Promise<void> {
    await this.request(`/tasks/${taskId}/daily-data`, {
      method: 'PUT',
      body: JSON.stringify({ date, value, completed }),
    });
  }

  async getTaskDailyData(
    taskId: string,
    startDate?: string,
    endDate?: string
  ): Promise<Record<string, { value?: number; completed?: boolean }>> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const queryString = params.toString();
    const endpoint = `/tasks/${taskId}/daily-data${queryString ? `?${queryString}` : ''}`;
    
    return this.request(endpoint);
  }

  // Team endpoints
  async getTeams(): Promise<Team[]> {
    return this.request('/teams');
  }

  async createTeam(name: string): Promise<{ id: string }> {
    return this.request('/teams', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async updateTeam(teamId: string, name: string): Promise<void> {
    await this.request(`/teams/${teamId}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    });
  }

  async deleteTeam(teamId: string): Promise<void> {
    await this.request(`/teams/${teamId}`, { method: 'DELETE' });
  }

  async addPersonToTeam(teamId: string, name: string): Promise<{ id: string }> {
    return this.request(`/teams/${teamId}/people`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async updatePerson(personId: string, name: string): Promise<void> {
    await this.request(`/people/${personId}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    });
  }

  async deletePerson(personId: string): Promise<void> {
    await this.request(`/people/${personId}`, { method: 'DELETE' });
  }

  async updateTaskAssignments(taskId: string, personIds: string[]): Promise<void> {
    await this.request(`/tasks/${taskId}/assignments`, {
      method: 'PUT',
      body: JSON.stringify({ personIds }),
    });
  }
}

export const apiClient = new ApiClient();