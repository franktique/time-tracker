# PostgreSQL Migration Guide

This guide explains how to migrate the Time Tracker application from localStorage to PostgreSQL database storage.

## Overview

The migration process involves:
1. Setting up PostgreSQL database
2. Configuring environment variables
3. Running database migrations
4. Switching to the new API-based components
5. Migrating existing localStorage data

## Prerequisites

- PostgreSQL installed and running
- Node.js and npm installed
- Existing Time Tracker application with localStorage data (optional)

## Step 1: Database Setup

### Install PostgreSQL
```bash
# macOS (using Homebrew)
brew install postgresql
brew services start postgresql

# Ubuntu
sudo apt update
sudo apt install postgresql postgresql-contrib

# Create database
createdb timetracker
```

### Create Database User (Optional)
```sql
-- Connect to PostgreSQL
psql -U postgres

-- Create user and database
CREATE USER timetracker_user WITH PASSWORD 'your_password';
CREATE DATABASE timetracker OWNER timetracker_user;
GRANT ALL PRIVILEGES ON DATABASE timetracker TO timetracker_user;
```

## Step 2: Environment Configuration

### Copy environment template
```bash
cp .env.example .env.local
```

### Configure database connection in `.env.local`
```env
# Option 1: Database URL (recommended)
DATABASE_URL=postgresql://timetracker_user:your_password@localhost:5432/timetracker

# Option 2: Individual settings
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=timetracker
# DB_USER=timetracker_user
# DB_PASSWORD=your_password

# Security settings
JWT_SECRET=your-very-secure-secret-key-change-this-in-production
NEXTAUTH_SECRET=your-nextauth-secret-key-change-this-too
```

## Step 3: Run Database Migrations

```bash
# Install dependencies (if not already done)
npm install

# Run database migrations
npm run db:migrate
```

This will:
- Create all necessary tables
- Set up indexes for performance
- Configure triggers for automatic timestamps

## Step 4: Switch to API-Based Components

### Update main page component
Replace the import in `src/app/page.tsx`:

```typescript
// Before (localStorage version)
import { TimeTrackerApp } from "@/components/TimeTrackerApp";

// After (API version)  
import { TimeTrackerApp } from "@/components/TimeTrackerApp.new";
```

Or rename the files:
```bash
mv src/components/TimeTrackerApp.tsx src/components/TimeTrackerApp.old.tsx
mv src/components/TimeTrackerApp.new.tsx src/components/TimeTrackerApp.tsx
```

## Step 5: Start Development Server

```bash
npm run dev
```

The application will now:
- Use the new authentication system
- Store all data in PostgreSQL
- Provide API endpoints for all operations

## Step 6: Migrate Existing Data (Optional)

If you have existing data in localStorage:

1. **Create a user account** - Register with your preferred username/password
2. **Login to the application**
3. **Use the migration tool** - A migration tool will appear in the bottom-right corner if localStorage data is detected
4. **Export backup** (recommended) - Create a backup of your local data first
5. **Run migration** - Click "Migrate to database" to transfer your data
6. **Verify data** - Check that all your tasks and teams are properly migrated
7. **Clear local data** - Once verified, you can clear the localStorage data

### Manual Migration (Alternative)

If the automatic migration doesn't work:

```typescript
import { exportLocalStorageData, migrateLocalStorageData } from '@/lib/data-migration';

// Export data
const data = exportLocalStorageData();
console.log('Exported data:', data);

// Migrate to API (after logging in)
await migrateLocalStorageData(data);
```

## Architecture Changes

### Before (localStorage)
- Data stored in browser localStorage
- Three keys: `timesheet_rootTask`, `timesheet_teams`, `timesheet_userName`
- Client-side only data persistence
- No user authentication
- Single user per browser

### After (PostgreSQL)
- Data stored in PostgreSQL database
- Multi-user support with authentication
- Server-side API with proper validation
- RESTful API endpoints
- Scalable architecture

### API Endpoints

**Authentication:**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

**Tasks:**
- `GET /api/tasks` - Get user's task tree
- `POST /api/tasks` - Create task
- `PUT /api/tasks/[id]` - Update task
- `DELETE /api/tasks/[id]` - Delete task
- `POST /api/tasks/[id]/subtasks` - Add subtask

**Time Tracking:**
- `POST /api/tasks/[id]/start-tracking` - Start time tracking
- `POST /api/tasks/[id]/stop-tracking` - Stop time tracking
- `PUT /api/tasks/[id]/daily-data` - Update daily data

**Teams:**
- `GET /api/teams` - Get user's teams
- `POST /api/teams` - Create team
- `PUT /api/teams/[id]` - Update team
- `DELETE /api/teams/[id]` - Delete team
- `POST /api/teams/[id]/people` - Add person to team

## Database Schema

### Tables Created
- `users` - User accounts
- `tasks` - Hierarchical task structure
- `daily_data` - Time/quantity tracking per day
- `teams` - User teams
- `people` - Team members
- `task_people` - Task-person assignments

### Key Features
- UUID primary keys for better security
- Foreign key constraints for data integrity
- Automatic timestamp tracking
- Cascading deletes for cleanup
- Optimized indexes for performance

## Configuration Options

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | - |
| `DB_HOST` | Database host | localhost |
| `DB_PORT` | Database port | 5432 |
| `DB_NAME` | Database name | timetracker |
| `DB_USER` | Database user | postgres |
| `DB_PASSWORD` | Database password | - |
| `DATABASE_SSL` | Enable SSL for database | false |
| `JWT_SECRET` | Secret for JWT tokens | - |
| `JWT_EXPIRES_IN` | Token expiration | 7d |
| `NODE_ENV` | Environment | development |

### Production Considerations

For production deployment:

1. **Use strong secrets** - Generate cryptographically secure JWT secrets
2. **Enable SSL** - Set `DATABASE_SSL=true` for production databases
3. **Database hosting** - Consider services like PostgreSQL on Heroku, AWS RDS, or DigitalOcean
4. **Environment security** - Never commit secrets to version control
5. **Database backups** - Set up regular automated backups
6. **Monitoring** - Monitor database performance and API responses

## Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL is running
pg_isready

# Check database exists
psql -U postgres -l

# Test connection
psql postgresql://username:password@localhost:5432/timetracker
```

### Migration Errors
- Ensure database is running and accessible
- Check environment variables are correct
- Verify database permissions
- Check logs for specific error messages

### API Authentication Issues
- Clear browser localStorage and cookies
- Verify JWT_SECRET is set
- Check API routes are accessible
- Ensure user is properly logged in

### Data Migration Issues
- Create backup before migration
- Check browser console for error messages
- Verify API is working before migration
- Try manual migration if automatic fails

## Rollback Plan

If you need to rollback to localStorage:

1. **Keep backup files** - Don't delete the old component files
2. **Rename components back**:
   ```bash
   mv src/components/TimeTrackerApp.tsx src/components/TimeTrackerApp.new.tsx
   mv src/components/TimeTrackerApp.old.tsx src/components/TimeTrackerApp.tsx
   ```
3. **Restore localStorage data** from backup if needed
4. **Update imports** in `src/app/page.tsx`

## Support

If you encounter issues during migration:

1. Check this guide for common solutions
2. Review error messages in browser console and server logs
3. Verify database connection and configuration
4. Create an issue in the project repository with details

## Next Steps

After successful migration:

1. **Test all functionality** - Tasks, time tracking, teams
2. **Import data** using the migration tool
3. **Remove old localStorage data** once verified
4. **Set up backups** for your database
5. **Consider deployment** to production environment

The migration provides a robust, scalable foundation for the Time Tracker application with proper user management and data persistence.