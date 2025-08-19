export const config = {
  database: {
    url: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    name: process.env.DB_NAME || 'timetracker',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'fallback-secret-key-for-development',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  app: {
    url: process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_URL || 'http://localhost:3000',
    nodeEnv: process.env.NODE_ENV || 'development',
  },
};

export const isDevelopment = config.app.nodeEnv === 'development';
export const isProduction = config.app.nodeEnv === 'production';