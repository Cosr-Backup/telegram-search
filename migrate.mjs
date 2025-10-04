import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import 'dotenv/config';

console.log('Starting database migration...');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('🔴 DATABASE_URL environment variable is not set.');
  process.exit(1);
}

console.log('Database URL found. Connecting to database...');

try {
  // 创建一个用于迁移的特殊 SQL 客户端
  const migrationClient = postgres(connectionString, { max: 1 });
  const db = drizzle(migrationClient);

  console.log('Connection successful. Running migrations...');

  // 运行迁移
  await migrate(db, { migrationsFolder: 'drizzle' });

  console.log('✅ Migrations applied successfully.');
  
  // 确保在完成时关闭连接
  await migrationClient.end();
  
  console.log('Migration process finished.');
  process.exit(0);
} catch (error) {
  console.error('🔴 An error occurred during migration:');
  console.error(error);
  process.exit(1);
}
