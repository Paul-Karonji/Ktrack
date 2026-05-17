require('dotenv').config({ path: '../.env' });
const { pool } = require('../config/database');

async function addIndexes() {
  try {
    console.log('Adding database indexes...');

    const queries = [
      'CREATE INDEX idx_tasks_assigned_tutor ON tasks (assigned_tutor_id)',
      'CREATE INDEX idx_tasks_client_id ON tasks (client_id)',
      'CREATE INDEX idx_task_files_task_id ON task_files (task_id)'
    ];

    for (const query of queries) {
      try {
        await pool.execute(query);
        console.log(`Executed: ${query}`);
      } catch (err) {
        // Ignore duplicate index errors
        if (err.code === 'ER_DUP_KEYNAME') {
          console.log(`Index already exists for: ${query}`);
        } else {
          console.error(`Error executing ${query}:`, err.message);
        }
      }
    }

    console.log('Indexes added successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    process.exit(0);
  }
}

addIndexes();
