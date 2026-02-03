#!/usr/bin/env tsx
/**
 * Script para inicializar o banco de dados e popular com seeds
 * Uso: npm run db:seed
 */

import 'dotenv/config';
import { getPool } from '../../infra/db/pool.js';
import { schemaFromClientKey } from '../../infra/db/tenant.js';
import { ProjectsRepository } from './repository.js';

const CLIENT_KEY = process.env.DEFAULT_CLIENT_KEY || 'site_provenis_vendas';

async function initDatabase() {
  const pool = getPool();
  const client = await pool.connect();
  const repository = new ProjectsRepository(pool);

  try {
    console.log(`🔧 Initializing database for client: ${CLIENT_KEY}`);

    const tenantSchema = schemaFromClientKey(CLIENT_KEY);

    // Ensure schema exists
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${tenantSchema}`);
    console.log(`✅ Schema ${tenantSchema} created/verified`);

    // Create/verify tables, indexes, triggers
    await repository.initSchema(CLIENT_KEY);
    console.log('✅ Schema tables created');

    // Ensure current connection is pointing to tenant schema for verification queries
    await client.query(`SET search_path TO "${tenantSchema}", public`);

    // Verify data
    const categoriesResult = await client.query('SELECT COUNT(*) FROM categories');
    const projectsResult = await client.query('SELECT COUNT(*) FROM projects');
    
    console.log(`\n📊 Database stats:`);
    console.log(`  Categories: ${categoriesResult.rows[0].count}`);
    console.log(`  Projects: ${projectsResult.rows[0].count}`);

    console.log('\n🎉 Database initialized successfully!');
    console.log(`\n💡 Test the API:`);
    console.log(`   curl -H "X-Client-Key: ${CLIENT_KEY}" http://localhost:3000/api/projects/categories`);
    console.log(`   curl -H "X-Client-Key: ${CLIENT_KEY}" http://localhost:3000/api/projects`);

    console.log(`\nℹ️  Templates SQL removidos (opção B). Crie/edite projetos diretamente no banco.`);

  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

initDatabase().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
