const crypto = require('node:crypto');

const SECRET = process.env.SESSION_SECRET || 'woashe_bloom_secret_key_2026_dalat';
const TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, storedHash) {
  try {
    const key = crypto.scryptSync(password, salt, 64);
    const keyBuf = Buffer.from(key.toString('hex'), 'hex');
    const storedBuf = Buffer.from(storedHash, 'hex');
    return keyBuf.length === storedBuf.length && crypto.timingSafeEqual(keyBuf, storedBuf);
  } catch (e) {
    return false;
  }
}

function createSession(user) {
  const payload = {
    u: user.username,
    r: user.role || 'admin',
    exp: Date.now() + TOKEN_MAX_AGE_MS
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(payloadB64).digest('base64url');
  return `${payloadB64}.${sig}`;
}

function verifySession(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', SECRET).update(payloadB64).digest('base64url');
  
  if (sig !== expectedSig) return null;

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'));
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

function parseCookies(req) {
  const list = {};
  const rc = req.headers.cookie;
  if (!rc) return list;
  rc.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    const name = parts.shift().trim();
    const val = decodeURIComponent(parts.join('='));
    list[name] = val;
  });
  return list;
}

module.exports = {
  hashPassword,
  verifyPassword,
  createSession,
  verifySession,
  parseCookies
};
