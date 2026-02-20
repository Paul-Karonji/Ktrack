const { pool } = require('../config/database');

/**
 * Database Patch Service
 * Automatically applies schema updates that might be missing in production
 * or were introduced after initial deployment.
 */
const DatabasePatchService = {
    async applyPatches() {
        console.log('🛠️ [DatabasePatch] Checking for required schema updates...');

        try {
            // Increase file_type length in messages table
            await pool.execute(`
                ALTER TABLE messages 
                MODIFY COLUMN file_type VARCHAR(255);
            `).catch(err => {
                // Ignore if column doesn't exist or table doesn't exist (handled by main migrations)
                if (err.code !== 'ER_NO_SUCH_TABLE' && err.code !== 'ER_BAD_FIELD_ERROR') {
                    console.warn('⚠️ [DatabasePatch] messages patch warning:', err.message);
                }
            });

            // Increase file_type length in task_files table
            await pool.execute(`
                ALTER TABLE task_files 
                MODIFY COLUMN file_type VARCHAR(255);
            `).catch(err => {
                if (err.code !== 'ER_NO_SUCH_TABLE' && err.code !== 'ER_BAD_FIELD_ERROR') {
                    console.warn('⚠️ [DatabasePatch] task_files patch warning:', err.message);
                }
            });

            console.log('✅ [DatabasePatch] Schema updates checked/applied.');
        } catch (error) {
            console.error('❌ [DatabasePatch] Patching failed:', error);
            // We don't throw here to avoid crashing the server if a patch fails
        }
    }
};

module.exports = DatabasePatchService;
