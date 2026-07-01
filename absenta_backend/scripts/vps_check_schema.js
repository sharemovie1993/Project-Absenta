const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('/var/www/licensing-server/licenses.db');
db.all("PRAGMA table_info(pricing_plans)", (err, rows) => {
  if (err) console.error(err);
  else console.log('Schema:', JSON.stringify(rows, null, 2));
  db.close();
});
