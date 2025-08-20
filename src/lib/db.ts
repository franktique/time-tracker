import { Pool, PoolConfig } from "pg";

let pool: Pool | null = null;

const getDbConfig = (): PoolConfig => {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    return {
      connectionString: databaseUrl,
      ssl:
        process.env.DATABASE_SSL === "true"
          ? { rejectUnauthorized: false }
          : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };
  }

  return {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432"),
    database: process.env.DB_NAME || "timetracker",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "",
    ssl:
      process.env.DATABASE_SSL === "true"
        ? { rejectUnauthorized: false }
        : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };
};

export const getPool = (): Pool => {
  if (!pool) {
    pool = new Pool(getDbConfig());

    pool.on("error", (err) => {
      console.error("Unexpected error on idle client", err);
    });
  }

  return pool;
};

export const query = async (text: string, params?: any[]) => {
  const pool = getPool();
  const start = Date.now();

  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;

    if (process.env.NODE_ENV === "development") {
      console.debug("Executed query", { text, duration, rows: res.rowCount });
    }

    return res;
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  }
};

export const getClient = async () => {
  const pool = getPool();
  return await pool.connect();
};

export const closePool = async () => {
  if (pool) {
    await pool.end();
    pool = null;
  }
};
