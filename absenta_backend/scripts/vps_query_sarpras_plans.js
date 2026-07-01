const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('/var/www/licensing-server/licenses.db');
db.all("SELECT id, title, price, product_id, service_code, module_id, size_label FROM pricing_plans WHERE id LIKE '%INVENTORY%' OR id LIKE '%SARPRAS%'", (err, rows) => {
  if (err) console.error(err);
  else console.log('Sarpras Plans:', JSON.stringify(rows, null, 2));
  db.close();
});
