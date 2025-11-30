import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 10, // 최대 연결 수
  idleTimeoutMillis: 60000, // 유휴 연결 60초 후 정리 (ETL 배치 처리용)
  connectionTimeoutMillis: 30000, // 연결 타임아웃 30초
  statement_timeout: 120000, // 쿼리 타임아웃 2분
  query_timeout: 120000, // 쿼리 타임아웃 2분
});

export const db = drizzle(pool);

// ETL 종료 시 연결 정리를 위해 pool export
export { pool };
