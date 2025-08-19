# Time Tracker App: Login Process and Task Retrieval Flow

## Complete Authentication and Data Loading Flow

```mermaid
flowchart TD
    A[App Starts - page.tsx] --> B{Check isAuthenticated from AuthContext}
    
    B -->|Not Authenticated| C[Show AuthPage]
    B -->|Authenticated| D[Show TimeTrackerApp]
    
    %% Authentication Flow
    C --> E[User enters credentials in LoginForm]
    E --> F[AuthContext.signIn calls cognitoAuth.signIn]
    F --> G[AWS Cognito Authentication]
    G -->|Success| H[Cognito Hub Event: 'signedIn']
    G -->|Failure| I[Show Error Message]
    
    %% Post-Authentication Flow
    H --> J[AuthContext.handleSignedIn]
    J --> K[Get Cognito User Details]
    K --> L[Call syncCognitoUserClient]
    L --> M[POST /api/auth/sync-user]
    M --> N[Create/Update User in Database]
    N --> O[Set AuthContext.user state]
    O --> P[isAuthenticated becomes true]
    P --> D
    
    %% Task Loading Flow
    D --> Q[TimeTrackerApp renders]
    Q --> R[useApiTaskManagement hook initialized]
    R --> S[initializeTasksWhenReady function]
    S --> T{Check for valid Cognito session}
    T -->|No Session| U[Wait 1 second, retry up to 10 times]
    U --> T
    T -->|Valid Session| V[Call loadTasks function]
    V --> W[apiClient.getTasks]
    W --> X[GET /api/tasks with JWT token]
    X --> Y[Database returns user's tasks]
    Y --> Z[Set rootTask state]
    Z --> AA[TimeTrackerApp displays tasks]
    
    %% Error Handling
    T -->|Max retries reached| BB[Show 'No authentication' message]
    X -->|API Error| CC[Show error state with retry button]
    
    %% Session Management
    subgraph SessionMgmt[Session Management]
        DD[Cognito Hub Listeners]
        DD --> EE[tokenRefresh: Silent renewal]
        DD --> FF[tokenRefresh_failure: Clear user state]
        DD --> GG[signedOut: Clear user state]
    end
    
    %% Data Storage
    subgraph Storage[Data Storage]
        HH[AWS Cognito]
        HH --> II[JWT Tokens & User Session]
        
        JJ[Database via API]
        JJ --> KK[Tasks & Daily Data]
        JJ --> LL[User Records]
        
        MM[localStorage]
        MM --> NN[Teams Data - legacy]
        MM --> OO[userName - legacy]
    end
    
    %% Key Components
    subgraph Components[Key Components]
        PP[AuthContext - Authentication state]
        QQ[useApiTaskManagement - Task operations]
        RR[apiClient - Authenticated API requests]
        SS[cognitoAuth - AWS Cognito wrapper]
    end
    
    %% API Request Flow
    subgraph APIFlow[Authenticated API Request Flow]
        TT[Any API Request] --> UU[apiClient.request]
        UU --> VV[Get Cognito access token]
        VV --> WW[Add Authorization: Bearer token]
        WW --> XX[Make HTTP request]
        XX -->|401 Error| YY[Retry with new token]
        XX -->|Success| ZZ[Return data]
    end
    
    style A fill:#e1f5fe
    style D fill:#e8f5e8
    style C fill:#fff3e0
    style AA fill:#e8f5e8
    style BB fill:#ffebee
    style CC fill:#ffebee
```

## Detailed Step-by-Step Flow

### 1. Application Initialization
- **Entry Point**: `src/app/page.tsx`
- **Check**: `useAuth().isAuthenticated`
- **Routes**: AuthPage (login) or TimeTrackerApp (main app)

### 2. Authentication Process

#### Login Sequence:
1. User enters credentials in `LoginForm`
2. `AuthContext.signIn()` → `cognitoAuth.signIn()`
3. AWS Cognito validates credentials
4. **Success**: Hub event 'signedIn' fired
5. `handleSignedIn()` → get user details
6. `syncCognitoUserClient()` → POST `/api/auth/sync-user`
7. User created/updated in database
8. `AuthContext.user` state set
9. `isAuthenticated` becomes `true`

#### Session Management:
- **Hub Listeners**: Monitor auth state changes
- **Token Refresh**: Automatic JWT renewal
- **Session Validation**: `cognitoAuth.hasValidSession()`

### 3. Task Loading Process

#### Initialization Sequence:
1. `TimeTrackerApp` component mounts
2. `useApiTaskManagement` hook initializes
3. `initializeTasksWhenReady()` waits for auth
4. Polls for valid Cognito session (max 10 attempts)
5. **Once authenticated**: `loadTasks()` called
6. `apiClient.getTasks()` → GET `/api/tasks`
7. JWT token automatically added to request
8. Database returns user's task tree
9. `rootTask` state updated
10. UI displays tasks

#### Error Handling:
- **Loading State**: Shows spinner while loading
- **Auth Timeout**: Max 10 seconds wait for auth
- **API Errors**: Retry button and error messages
- **Session Expiry**: Automatic token refresh

### 4. Data Storage Architecture

#### AWS Cognito:
- User authentication and session management
- JWT tokens for API authorization
- User pool with email/username login

#### Database (via API):
- User records synced from Cognito
- Task hierarchy and daily data
- Time tracking information

#### localStorage (Legacy):
- Teams data (still used)
- userName setting (fallback)
- Originally stored all data, now mostly migrated to API

### 5. Key Technical Details

#### Authentication Flow:
- Uses AWS Amplify Auth library
- Hub event system for state changes
- Exponential backoff retry logic
- Graceful session validation

#### API Communication:
- JWT tokens in Authorization header
- Automatic token refresh
- Request retry on auth failures
- Type-safe API client

#### State Management:
- React Context for auth state
- Custom hooks for task management
- Loading and error states
- SSR-safe localStorage access

## Component Relationships

```mermaid
graph LR
    A[page.tsx] --> B[AuthContext]
    B --> C[AuthPage]
    B --> D[TimeTrackerApp]
    D --> E[useApiTaskManagement]
    E --> F[apiClient]
    F --> G[cognitoAuth]
    B --> G
    E --> H[Database API]
```

This architecture provides a robust, scalable authentication and data loading system with proper error handling, retry logic, and session management.