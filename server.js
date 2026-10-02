const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const storage = require('./lib/storage');
const auth = require('./lib/auth');

const PORT = parseInt(process.env.PORT, 10) || 9090;
const HOST = process.env.HOST || '0.0.0.0';
const ROOT = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8'
};

function sendJson(res, statusCode, data, headers = {}) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    ...headers
  });
  res.end(body);
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 10 * 1024 * 1024) { // 10MB limit
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
  const pathname = decodeURIComponent(parsedUrl.pathname);
  const cookies = auth.parseCookies(req);
  const sessionUser = auth.verifySession(cookies['admin_session']);

  // --- API ROUTES ---
  if (pathname.startsWith('/api/')) {
    try {
      // 1. Auth routes
      if (pathname === '/api/auth/login' && req.method === 'POST') {
        const { username, password } = await parseJsonBody(req);
        if (!username || !password) {
          return sendJson(res, 400, { ok: false, error: 'Vui lòng nhập tài khoản và mật khẩu' });
        }
        const users = storage.getUsers();
        const user = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
        if (!user || !auth.verifyPassword(password, user.salt, user.hash)) {
          return sendJson(res, 401, { ok: false, error: 'Tên đăng nhập hoặc mật khẩu không đúng' });
        }

        const sessionToken = auth.createSession(user);
        const cookieHeader = `admin_session=${sessionToken}; Path=/; HttpOnly; Max-Age=${7 * 86400}; SameSite=Lax`;
        return sendJson(res, 200, { ok: true, user: { username: user.username, name: user.name } }, {
          'Set-Cookie': cookieHeader
        });
      }

      if (pathname === '/api/auth/logout' && req.method === 'POST') {
        const cookieHeader = `admin_session=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax`;
        return sendJson(res, 200, { ok: true }, { 'Set-Cookie': cookieHeader });
      }

      if (pathname === '/api/auth/me' && req.method === 'GET') {
        if (!sessionUser) {
          return sendJson(res, 200, { ok: true, authenticated: false });
        }
        const users = storage.getUsers();
        const user = users.find(u => u.username === sessionUser.u);
        return sendJson(res, 200, {
          ok: true,
          authenticated: true,
          user: { username: sessionUser.u, name: user?.name || sessionUser.u, role: sessionUser.r }
        });
      }

      if (pathname === '/api/auth/change-password' && req.method === 'POST') {
        if (!sessionUser) return sendJson(res, 401, { ok: false, error: 'Chưa đăng nhập' });
        const { currentPassword, newPassword } = await parseJsonBody(req);
        if (!newPassword || newPassword.length < 6) {
          return sendJson(res, 400, { ok: false, error: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
        }
        const users = storage.getUsers();
        const userIdx = users.findIndex(u => u.username === sessionUser.u);
        if (userIdx === -1) return sendJson(res, 404, { ok: false, error: 'Không tìm thấy tài khoản' });
        const user = users[userIdx];
        if (!auth.verifyPassword(currentPassword, user.salt, user.hash)) {
          return sendJson(res, 400, { ok: false, error: 'Mật khẩu hiện tại không đúng' });
        }

        const newHashData = auth.hashPassword(newPassword);
        user.salt = newHashData.salt;
        user.hash = newHashData.hash;
        user.updatedAt = new Date().toISOString();
        users[userIdx] = user;
        storage.saveUsers(users);

        return sendJson(res, 200, { ok: true, message: 'Đổi mật khẩu thành công' });
      }

      // 2. Products routes
      if (pathname === '/api/products' && req.method === 'GET') {
        const all = parsedUrl.searchParams.get('all') === '1';
        let products = storage.getProducts();
        if (!all) {
          products = products.filter(p => p.active !== false);
        }
        return sendJson(res, 200, { ok: true, products });
      }

      if (pathname === '/api/products' && req.method === 'POST') {
        if (!sessionUser) return sendJson(res, 401, { ok: false, error: 'Yêu cầu đăng nhập quản trị viên' });
        const data = await parseJsonBody(req);
        if (!data.name || !data.slug || !data.price || !Array.isArray(data.price)) {
          return sendJson(res, 400, { ok: false, error: 'Thiếu thông tin bắt buộc: tên, slug, giá 3 size' });
        }
        const products = storage.getProducts();
        if (products.some(p => p.slug === data.slug)) {
          return sendJson(res, 400, { ok: false, error: 'Mã slug này đã tồn tại' });
        }

        const newProduct = {
          slug: data.slug.trim().toLowerCase(),
          name: data.name.trim(),
          img: data.img || 'bq-1',
          occ: Array.isArray(data.occ) ? data.occ : ['sinh-nhat'],
          tone: data.tone || 'Hồng',
          price: data.price.map(p => parseInt(p, 10) || 0),
          desc: data.desc || '',
          flowers: data.flowers || '',
          badge: data.badge || '',
          active: data.active !== false,
          createdAt: new Date().toISOString()
        };

        products.unshift(newProduct);
        storage.saveProducts(products);
        return sendJson(res, 201, { ok: true, product: newProduct });
      }

      if (pathname.startsWith('/api/products/') && req.method === 'PUT') {
        if (!sessionUser) return sendJson(res, 401, { ok: false, error: 'Yêu cầu đăng nhập quản trị viên' });
        const targetSlug = pathname.replace('/api/products/', '').trim();
        const data = await parseJsonBody(req);
        const products = storage.getProducts();
        const idx = products.findIndex(p => p.slug === targetSlug);
        if (idx === -1) return sendJson(res, 404, { ok: false, error: 'Không tìm thấy sản phẩm' });

        const current = products[idx];
        products[idx] = {
          ...current,
          name: data.name !== undefined ? data.name.trim() : current.name,
          img: data.img !== undefined ? data.img : current.img,
          occ: Array.isArray(data.occ) ? data.occ : current.occ,
          tone: data.tone !== undefined ? data.tone : current.tone,
          price: Array.isArray(data.price) ? data.price.map(p => parseInt(p, 10)) : current.price,
          desc: data.desc !== undefined ? data.desc : current.desc,
          flowers: data.flowers !== undefined ? data.flowers : current.flowers,
          badge: data.badge !== undefined ? data.badge : current.badge,
          active: data.active !== undefined ? Boolean(data.active) : current.active,
          updatedAt: new Date().toISOString()
        };
        storage.saveProducts(products);
        return sendJson(res, 200, { ok: true, product: products[idx] });
      }

      if (pathname.startsWith('/api/products/') && req.method === 'DELETE') {
        if (!sessionUser) return sendJson(res, 401, { ok: false, error: 'Yêu cầu đăng nhập quản trị viên' });
        const targetSlug = pathname.replace('/api/products/', '').trim();
        const products = storage.getProducts();
        const filtered = products.filter(p => p.slug !== targetSlug);
        if (filtered.length === products.length) {
          return sendJson(res, 404, { ok: false, error: 'Không tìm thấy sản phẩm' });
        }
        storage.saveProducts(filtered);
        return sendJson(res, 200, { ok: true, message: 'Đã xoá sản phẩm' });
      }

      // 3. Image Upload (base64)
      if (pathname === '/api/upload' && req.method === 'POST') {
        if (!sessionUser) return sendJson(res, 401, { ok: false, error: 'Yêu cầu đăng nhập quản trị viên' });
        const { filename, base64 } = await parseJsonBody(req);
        if (!filename || !base64) {
          return sendJson(res, 400, { ok: false, error: 'Thiếu file ảnh hoặc tên file' });
        }
        const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(cleanBase64, 'base64');
        const ext = path.extname(filename).toLowerCase() || '.webp';
        const baseName = path.basename(filename, ext).replace(/[^a-zA-Z0-9_-]/g, '-');
        const saveName = `${baseName}-${Date.now()}${ext}`;
        const savePath = path.join(ROOT, 'assets', 'img', saveName);

        fs.writeFileSync(savePath, buffer);
        return sendJson(res, 200, { ok: true, filename: saveName, url: `assets/img/${saveName}` });
      }

      // 4. Orders routes
      if (pathname === '/api/orders' && req.method === 'POST') {
        const data = await parseJsonBody(req);
        if (!data.customer || !data.customer.ten || !data.customer.sdt || !data.items || !data.items.length) {
          return sendJson(res, 400, { ok: false, error: 'Vui lòng điền đủ tên, số điện thoại và chọn hoa' });
        }

        const now = new Date();
        const yy = String(now.getFullYear()).slice(-2);
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const randomHex = Math.floor(100 + Math.random() * 900);
        const orderId = `WB-${yy}${mm}${dd}-${randomHex}`;

        const newOrder = {
          id: orderId,
          createdAt: now.toISOString(),
          customer: {
            ten: data.customer.ten.trim(),
            sdt: data.customer.sdt.trim(),
            dc: (data.customer.dc || '').trim(),
            kv: data.customer.kv || 'Nội thành'
          },
          delivery: {
            date: data.delivery?.date || '',
            slot: data.delivery?.slot || '',
            note: (data.delivery?.note || '').trim()
          },
          items: data.items.map(it => ({
            slug: it.slug || '',
            name: it.name || '',
            size: it.size ?? 1,
            sizeName: it.size === 0 ? 'S' : it.size === 2 ? 'L' : 'M',
            price: it.price || 0,
            addons: it.addons || [],
            q: it.q || 1,
            desc: it.desc || ''
          })),
          ship: parseInt(data.ship, 10) || 0,
          total: parseInt(data.total, 10) || 0,
          status: 'new' // new, confirmed, shipping, completed, cancelled
        };

        const orders = storage.getOrders();
        orders.unshift(newOrder);
        storage.saveOrders(orders);

        return sendJson(res, 201, { ok: true, orderId: orderId, order: newOrder });
      }

      if (pathname === '/api/orders' && req.method === 'GET') {
        if (!sessionUser) return sendJson(res, 401, { ok: false, error: 'Yêu cầu đăng nhập quản trị viên' });
        const orders = storage.getOrders();
        return sendJson(res, 200, { ok: true, orders });
      }

      if (pathname.startsWith('/api/orders/') && req.method === 'PUT') {
        if (!sessionUser) return sendJson(res, 401, { ok: false, error: 'Yêu cầu đăng nhập quản trị viên' });
        const orderId = pathname.replace('/api/orders/', '').trim();
        const { status } = await parseJsonBody(req);
        const validStatuses = ['new', 'confirmed', 'shipping', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
          return sendJson(res, 400, { ok: false, error: 'Trạng thái không hợp lệ' });
        }
        const orders = storage.getOrders();
        const idx = orders.findIndex(o => o.id === orderId);
        if (idx === -1) return sendJson(res, 404, { ok: false, error: 'Không tìm thấy đơn hàng' });

        orders[idx].status = status;
        orders[idx].updatedAt = new Date().toISOString();
        storage.saveOrders(orders);
        return sendJson(res, 200, { ok: true, order: orders[idx] });
      }

      if (pathname.startsWith('/api/orders/') && req.method === 'DELETE') {
        if (!sessionUser) return sendJson(res, 401, { ok: false, error: 'Yêu cầu đăng nhập quản trị viên' });
        const orderId = pathname.replace('/api/orders/', '').trim();
        const orders = storage.getOrders();
        const filtered = orders.filter(o => o.id !== orderId);
        if (filtered.length === orders.length) return sendJson(res, 404, { ok: false, error: 'Không tìm thấy đơn hàng' });
        storage.saveOrders(filtered);
        return sendJson(res, 200, { ok: true, message: 'Đã xoá đơn hàng' });
      }

      return sendJson(res, 404, { ok: false, error: 'API endpoint not found' });
    } catch (err) {
      console.error('API Error:', err);
      return sendJson(res, 500, { ok: false, error: err.message || 'Internal Server Error' });
    }
  }

  // --- ADMIN ROUTE PROTECTION & REDIRECTS ---
  if (pathname === '/admin' || pathname === '/admin/') {
    if (!sessionUser) {
      res.writeHead(302, { Location: '/admin/login.html' });
      res.end();
      return;
    }
    res.writeHead(302, { Location: '/admin/index.html' });
    res.end();
    return;
  }

  if (pathname === '/admin/index.html') {
    if (!sessionUser) {
      res.writeHead(302, { Location: '/admin/login.html' });
      res.end();
      return;
    }
  }

  if (pathname === '/admin/login.html' && sessionUser) {
    res.writeHead(302, { Location: '/admin/index.html' });
    res.end();
    return;
  }

  // --- STATIC FILE SERVING ---
  let reqPath = pathname;
  if (reqPath === '/' || reqPath.endsWith('/')) {
    reqPath = path.join(reqPath, 'index.html');
  }
  if (reqPath === '/favicon.ico') {
    reqPath = '/favicon.svg';
  }

  let filePath = path.join(ROOT, reqPath);

  fs.stat(filePath, (err, stats) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    if (stats.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const cacheControl = 'no-cache, no-store, must-revalidate';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': cacheControl
    });

    const stream = fs.createReadStream(filePath);
    stream.on('error', () => {
      if (!res.headersSent) res.writeHead(500);
      res.end();
    });
    stream.pipe(res);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Hoa server running at http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/`);
});

process.on('SIGTERM', () => {
  server.close(() => {
    process.exit(0);
  });
});
process.on('SIGINT', () => {
  server.close(() => {
    process.exit(0);
  });
});
