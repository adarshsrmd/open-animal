const { Pool, types } = require('pg');

// Return DATE columns as 'YYYY-MM-DD' strings and NUMERIC columns as numbers
types.setTypeParser(1082, (v) => v);
types.setTypeParser(1700, parseFloat);

module.exports = new Pool({ connectionString: process.env.DATABASE_URL });
