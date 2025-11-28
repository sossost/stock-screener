import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 10, // 최대 연결 수
  idleTimeoutMillis: 30000, // 유휴 연결 30초 후 정리
  connectionTimeoutMillis: 30000, // 연결 타임아웃 30초
});

export const db = drizzle(pool);

// ETL 종료 시 연결 정리를 위해 pool export
export { pool };
