// apps/server/migrate.mjs (本地迁移工具)

import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import 'dotenv/config';

console.log('🔵 [MIGRATE] Starting local database migration script...');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('🔴 [MIGRATE] Error: DATABASE_URL environment variable is not found. Please ensure it is set in the .env file in your project root.');
  process.exit(1);
}

console.log('✅ [MIGRATE] DATABASE_URL found.');
console.log('🟡 [MIGRATE] Attempting to connect to the remote database...');

let migrationClient;
try {
  // 创建一个专门用于迁移的 SQL 客户端
  migrationClient = postgres(connectionString, { max: 1 });
  const db = drizzle(migrationClient);

  console.log('✅ [MIGRATE] Database connection successful.');
  
  // 关键：指定 drizzle 文件夹相对于当前脚本的位置
  // 因为脚本在 apps/server/ 下，而 drizzle 文件夹在根目录
  const migrationsFolder = '../../drizzle';
  console.log(`🟡 [MIGRATE] Applying migrations from "${migrationsFolder}" folder...`);

  // 运行迁移
  await migrate(db, { migrationsFolder: migrationsFolder });

  console.log('✅ [MIGRATE] Migrations applied successfully! Your remote database schema is up to date.');

} catch (error) {
  console.error('🔴 [MIGRATE] An error occurred during the migration process:');
  console.error(error);
  process.exit(1);
} finally {
  if (migrationClient) {
    // 确保在完成时关闭连接
    await migrationClient.end();
    console.log('🔵 [MIGRATE] Database connection closed. Script finished.');
  }
  process.exit(0);
}
