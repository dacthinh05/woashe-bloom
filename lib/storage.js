const fs = require('node:fs');
const path = require('node:path');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function readJson(file, defaultVal = []) {
  const p = path.join(DATA_DIR, file);
  if (!fs.existsSync(p)) return defaultVal;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch (err) {
    console.error(`Error reading ${file}:`, err);
    return defaultVal;
  }
}

function writeJson(file, data) {
  const p = path.join(DATA_DIR, file);
  const tmp = p + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmp, p);
}

module.exports = {
  getProducts: () => readJson('products.json', []),
  saveProducts: (data) => writeJson('products.json', data),
  getOrders: () => readJson('orders.json', []),
  saveOrders: (data) => writeJson('orders.json', data),
  getUsers: () => readJson('users.json', []),
  saveUsers: (data) => writeJson('users.json', data)
};
