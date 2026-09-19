require('dotenv').config();
const db = require('../config/db');
const { ensureDailySchema } = require('../services/dailySchema');

(async () => {
    try {
        await ensureDailySchema(db);
        const [[categoryCount]] = await db.promise().query('SELECT COUNT(*) count FROM daily_categories');
        console.log(`Daily schema ready with ${categoryCount.count} categories.`);
    } catch (error) {
        console.error('Daily migration failed:', error.message);
        process.exitCode = 1;
    } finally { await db.promise().end(); }
})();
