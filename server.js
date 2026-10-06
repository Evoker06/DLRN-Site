// Сайт DLRN + защищённая админка. Без внешних зависимостей (Node.js >= 18).
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');

const PORT = process.env.PORT || 80, PUB = path.join(__dirname, 'public'), DATA = path.join(__dirname, 'data');
// Все данные (контент, пользователи, бэкапы) лежат только в ./data
const CONTENT = path.join(DATA, 'content.json');
const USERS = path.join(DATA, 'users.json');
const BK = path.join(DATA, 'backups');
const UP = path.join(PUB, 'uploads');
const VIDEO_EXT = new Set(['.mp4', '.webm']);
const UP_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.pdf', '.zip', '.7z', '.rar', '.txt', '.docx', '.xlsx', '.pptx', '.mp3', ...VIDEO_EXT]);
const MAX_FILE = 25 * 1024 * 1024, MAX_VIDEO = 200 * 1024 * 1024; // 25 МБ / 200 МБ для видео
const SECURE = process.env.SECURE === '1';
const PROXY = process.env.TRUST_PROXY === '1';

const sessions = new Map();
const fails = new Map();

const MIME = {
  '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8',
  '.png':'image/png', '.svg':'image/svg+xml', '.ico':'image/x-icon',
  '.webp':'image/webp', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.gif':'image/gif',
  '.woff':'font/woff', '.woff2':'font/woff2', '.ttf':'font/ttf',
  '.pdf':'application/pdf', '.zip':'application/zip', '.txt':'text/plain; charset=utf-8',
  '.mp3':'audio/mpeg', '.mp4':'video/mp4', '.webm':'video/webm'
};
const HIDDEN_FILES = new Set(['server.js','users.js','package.json','package-lock.json',
  'users.json','content.json','readme.md','.env','.gitignore']);
const HIDDEN_DIRS = new Set(['backups','data','node_modules','.git','.vscode','.idea']);

const rj = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
const hash = (pw, salt) => crypto.scryptSync(pw, salt, 64);
const send = (res, code, obj, h = {}) => {
  res.writeHead(code, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', ...h });
  res.end(JSON.stringify(obj));
};
const ipOf = req => PROXY
  ? (String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress)
  : req.socket.remoteAddress;
const cookie = req => Object.fromEntries(
  String(req.headers.cookie || '').split(';').map(s => s.trim().split('=')).filter(a => a[0])
);
function session(req) {
  const t = cookie(req).sid;
  const s = t && sessions.get(t);
  if (!s || s.exp < Date.now()) { if (t) sessions.delete(t); return null; }
  return s;
}
function body(req) {
  return new Promise((ok, no) => {
    let n = 0; const b = [];
    req.on('data', c => { n += c.length; if (n > 300000) { no(new Error('big')); req.destroy(); } else b.push(c); });
    req.on('end', () => { try { ok(JSON.parse(Buffer.concat(b).toString() || '{}')); } catch (e) { no(e); } });
  });
}

// Потоковая запись загружаемого файла на диск (видео может быть большим)
function saveUpload(req, file, max) {
  return new Promise((ok, no) => {
    let n = 0, over = false;
    const ws = fs.createWriteStream(file);
    req.on('data', c => { if (over) return; n += c.length; if (n > max) { over = true; req.unpipe(ws); ws.destroy(); } });
    req.pipe(ws);
    ws.on('finish', () => ok(n));
    ws.on('close', () => { if (over) fs.unlink(file, () => {}); });
    req.on('end', () => { if (over) no(new Error('big')); });
    ws.on('error', no); req.on('error', no);
  });
}

// ===== Дополнительное содержимое, раскладка страницы, собственные разделы =====
const NATIVE = ['hero', 'stats', 'project', 'features', 'join', 'rules', 'faq'];
const COLOR_KEYS = [...NATIVE, 'footer'];
const plain = o => o && typeof o === 'object' && !Array.isArray(o);

// Шаблон структуры: по нему можно вернуть элементы в пустой список (например, после удаления всех правил)
const SCHEMA = {
  site: { title: '', ip: '' },
  hero: { eyebrow: '', title1: '', title2: '', text: '', headPhrase: '' },
  about: { title1: '', title2: '', paragraphs: [''], gallery: { interval: '', visible: '', fit: '', captions: '', items: [{ url: '', caption: '' }] } },
  socials: [{ name: '', desc: '', url: '' }],
  features: { title: '', items: [{ icon: '', title: '', text: '' }] },
  join: { title: '', text: '', notice: { title: '', text: '', buttonLabel: '', buttonUrl: '' } },
  rules: {
    title: '',
    discord: { title: '', items: [{ title: '', text: '', inline: false }] },
    minecraft: {
      title: '', basic: [''],
      mods: { title: '', text: '', listLabel: '', list: [{ name: '', note: '' }] },
      bugs: { title: '', text: '', buttonLabel: '', buttonUrl: '' },
      chat: { title: '', text: '' },
      farms: { title: '', items: [''] }
    },
    warning: [''],
    groups: [{ title: '', items: [{ title: '', text: '', inline: false }] }]
  },
  faq: { title: '', items: [{ q: '', a: '', buttons: [{ label: '', url: '' }] }] },
  footer: { text: '', copyright: '', right: '' }
};
// Подписи и кнопки интерфейса, которые раньше были зашиты в index.html
const DEFAULT_UI = {
  navHome: 'Главная', navProject: 'О проекте', navFeatures: 'Возможности', navRules: 'Правила', navFaq: 'FAQ',
  headerPlay: 'Играть',
  heroPlay: 'Начать играть', heroMore: 'Узнать больше', heroIpLabel: 'IP сервера', heroOnline: 'игроков онлайн',
  statOnline: 'Игроков онлайн', statUptimeValue: '24/7', statUptime: 'Доступность',
  statVersion: 'Версия Minecraft', statMoreValue: '∞', statMore: 'Возможностей',
  labelProject: '01 / О ПРОЕКТЕ', labelFeatures: '02 / ВОЗМОЖНОСТИ', labelJoin: '03 / ПРИСОЕДИНИТЬСЯ',
  labelRules: '04 / ПРАВИЛА', labelFaq: '05 / FAQ',
  joinIpLabel: 'IP СЕРВЕРА', joinCopy: 'Скопировать IP',
  footerRules: 'Правила', footerFaq: 'FAQ', footerPlay: 'Играть',
  msgCopied: 'IP скопирован!', msgCopiedShort: 'Скопировано!'
};
// Плашка в блоке «Присоединиться»: вход на сервер по проходке на Boosty (правится в админке; пустые поля — плашка скрыта)
const DEFAULT_NOTICE = {
  title: 'Вход по проходке',
  text: 'Чтобы зайти на сервер, нужно оплатить проходку на Boosty. После оплаты скопируйте IP и заходите в игру.',
  buttonLabel: 'Оплатить проходку',
  buttonUrl: 'https://boosty.to/dlrn'
};
// Лента фотографий под блоком «О проекте» (about.gallery): пустая, пока админ не загрузит фото
const DEFAULT_GALLERY = { interval: '4', visible: 'auto', fit: 'cover', captions: 'show', items: [] };
const clone = o => JSON.parse(JSON.stringify(o));
// Пустые массивы в эталоне заменяются образцом из SCHEMA
function fillRef(ref, sch) {
  if (Array.isArray(ref) && Array.isArray(sch)) {
    if (!ref.length) ref.push(...clone(sch));
    else ref.forEach(x => fillRef(x, sch[0]));
  } else if (plain(ref) && plain(sch)) Object.keys(ref).forEach(k => fillRef(ref[k], sch[k]));
}
// Эталон для проверки и для кнопки «+ Добавить» в админке
const refFor = c => { const r = withBlocks(clone(c)); fillRef(r, SCHEMA); return withBlocks(r); };

// Добавляет недостающие поля в старый content.json (blocks, bg, layout, sections, ui, groups)
function withBlocks(c) {
  const add = o => { if (plain(o) && !Array.isArray(o.blocks)) o.blocks = []; };
  const addBg = o => { add(o); if (plain(o) && typeof o.bg !== 'string') o.bg = ''; };
  ['hero', 'about', 'features', 'join', 'rules', 'faq', 'footer'].forEach(k => add(c[k]));
  [c.rules?.discord, c.rules?.minecraft].forEach(o => { addBg(o); if (plain(o) && typeof o.hidden !== 'boolean') o.hidden = false; });
  if (plain(c.rules) && !Array.isArray(c.rules.groups)) c.rules.groups = [];
  (c.rules?.groups || []).forEach(addBg);
  c.ui = plain(c.ui) ? c.ui : {};
  Object.keys(DEFAULT_UI).forEach(k => { if (typeof c.ui[k] !== 'string') c.ui[k] = DEFAULT_UI[k]; });
  (c.features?.items || []).forEach(addBg);
  (c.faq?.items || []).forEach(addBg);
  if (plain(c.about)) {
    const g = plain(c.about.gallery) ? c.about.gallery : (c.about.gallery = {});
    Object.keys(DEFAULT_GALLERY).forEach(k => { if (g[k] === undefined || (k === 'items' && !Array.isArray(g[k]))) g[k] = clone(DEFAULT_GALLERY[k]); });
  }
  if (plain(c.join)) {
    const n = plain(c.join.notice) ? c.join.notice : (c.join.notice = {});
    Object.keys(DEFAULT_NOTICE).forEach(k => { if (typeof n[k] !== 'string') n[k] = DEFAULT_NOTICE[k]; });
  }
  const secs = c.sections = Array.isArray(c.sections) ? c.sections : [];
  const L = plain(c.layout) ? c.layout : (c.layout = {});
  const ids = [...NATIVE, ...secs.map(x => x && x.id).filter(x => typeof x === 'string')];
  L.order = [...new Set([...(Array.isArray(L.order) ? L.order : []).filter(x => ids.includes(x)), ...ids])];
  L.hidden = (Array.isArray(L.hidden) ? L.hidden : []).filter(x => ids.includes(x));
  if (!plain(L.colors)) L.colors = {};
  COLOR_KEYS.forEach(k => { if (typeof L.colors[k] !== 'string') L.colors[k] = ''; });
  return c;
}

const S = (x, n = 5000) => typeof x === 'string' && x.length < n;
const SA = (x, max = 100, n = 2000) => Array.isArray(x) && x.length <= max && x.every(y => S(y, n));
const colorOk = c => c === '' || (typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c));
const urlOk = u => S(u, 2000) && (u === '' || /^https?:\/\//i.test(u) || /^\/uploads\/[\w.\-]+$/.test(u));
const BLOCKS = {
  heading:   { level: v => Number.isInteger(v) && v >= 1 && v <= 6, text: S },
  paragraph: { text: S },
  quote:     { text: S, author: S },
  callout:   { variant: v => ['info', 'success', 'warning', 'danger'].includes(v), title: S, text: S },
  ul:        { items: x => SA(x) },
  ol:        { items: x => SA(x) },
  table:     { header: x => SA(x, 12, 500), rows: x => Array.isArray(x) && x.length <= 100 && x.every(r => SA(r, 12, 500)) },
  image:     { url: urlOk, alt: S },
  file:      { label: S, url: urlOk },
  link:      { label: S, url: urlOk },
  video:     { url: urlOk, title: S },
  // текст с файлом/видео/изображением рядом
  split:     { title: S, text: S, url: urlOk, caption: S,
               kind: v => ['auto', 'image', 'video', 'file'].includes(v),
               side: v => ['left', 'right'].includes(v),
               ratio: v => ['33', '40', '50', '60'].includes(v),
               valign: v => ['top', 'center'].includes(v) }
};
// Необязательные поля оформления и размещения
const COMMON = {
  bg: colorOk,
  pos: v => ['top', 'bottom'].includes(v),
  align: v => ['', 'left', 'center', 'right'].includes(v),
  width: v => ['', '100', '75', '50', '33'].includes(v)
};
const TEXTSTYLE = {
  font: v => ['', 'serif', 'mono'].includes(v),
  size: v => v === '' || (typeof v === 'string' && /^\d{2}$/.test(v) && +v >= 10 && +v <= 96),
  color: colorOk
};
// Необязательные поля блока «витрина» (старые блоки без них остаются верными)
const EXTRA = {
  split: {
    layout: v => ['split', 'showcase'].includes(v),
    look: v => ['accent', 'minimal'].includes(v),
    subtitle: S,
    icon: v => v === '' || (S(v, 2000) && (v.length <= 8 || urlOk(v))),
    accent: colorOk,
    points: x => Array.isArray(x) && x.length <= 12 && x.every(o => plain(o) && Object.keys(o).length === 2 && S(o.icon, 20) && S(o.text, 500))
  }
};
const STYLED = new Set(['heading', 'paragraph', 'quote', 'callout', 'ul', 'ol', 'table', 'split']);
function validBlocks(a) {
  if (!Array.isArray(a) || a.length > 100) return false;
  return a.every(b => {
    if (!plain(b) || !Object.hasOwn(BLOCKS, b.type)) return false;
    const spec = BLOCKS[b.type], opt = { ...COMMON, ...(STYLED.has(b.type) ? TEXTSTYLE : {}), ...(EXTRA[b.type] || {}) };
    if (!Object.keys(b).every(k => k === 'type' || Object.hasOwn(spec, k) || Object.hasOwn(opt, k))) return false;
    if (!Object.keys(spec).every(k => k in b && spec[k](b[k]))) return false;
    return Object.keys(opt).every(k => !(k in b) || opt[k](b[k]));
  });
}
const IDS = x => Array.isArray(x) && x.length <= 40 && x.every(y => typeof y === 'string' && /^[a-z0-9]{2,16}$/.test(y));
function validLayoutShape(l) {
  if (!plain(l)) return false;
  const k = Object.keys(l);
  if (k.length !== 3 || !['order', 'hidden', 'colors'].every(x => k.includes(x))) return false;
  if (!IDS(l.order) || !IDS(l.hidden) || !plain(l.colors)) return false;
  return Object.keys(l.colors).every(x => COLOR_KEYS.includes(x) && colorOk(l.colors[x]));
}
function validSections(a) {
  if (!Array.isArray(a) || a.length > 20) return false;
  const seen = new Set();
  return a.every(s => {
    if (!plain(s)) return false;
    const k = Object.keys(s);
    if (k.length !== 5 || !['id', 'title', 'nav', 'bg', 'blocks'].every(x => k.includes(x))) return false;
    if (typeof s.id !== 'string' || !/^c[a-z0-9]{3,12}$/.test(s.id) || seen.has(s.id)) return false;
    seen.add(s.id);
    return S(s.title, 200) && typeof s.nav === 'boolean' && colorOk(s.bg) && validBlocks(s.blocks);
  });
}
// Перекрёстная проверка: порядок содержит ровно все разделы, скрытые — только существующие
function validLayout(b) {
  const L = b.layout, ids = [...NATIVE, ...b.sections.map(s => s.id)];
  return L.order.length === ids.length && new Set(L.order).size === ids.length &&
    L.order.every(x => ids.includes(x)) && L.hidden.every(x => ids.includes(x));
}
// Лента фотографий: слайды (до 40), скорость, сколько видно сразу, как вписывать фото и подписи
function validGallery(g) {
  if (!plain(g)) return false;
  const k = Object.keys(g);
  if (k.length !== 5 || !['interval', 'visible', 'fit', 'captions', 'items'].every(x => k.includes(x))) return false;
  if (!['2', '3', '4', '5', '7', '10', '15'].includes(g.interval) || !['auto', '1', '2', '3', '4'].includes(g.visible)) return false;
  if (!['cover', 'contain'].includes(g.fit) || !['show', 'hide'].includes(g.captions)) return false;
  return Array.isArray(g.items) && g.items.length <= 40 &&
    g.items.every(i => plain(i) && Object.keys(i).length === 2 && S(i.url, 2000) && urlOk(i.url) && i.url !== '' && S(i.caption, 300));
}
const SPECIAL = { gallery: validGallery, blocks: validBlocks, sections: validSections, layout: validLayoutShape, bg: colorOk };

// Валидация структуры. Ссылки: только http(s) или пусто.
function valid(v, ref, depth = 0) {
  if (depth > 7) return false;
  if (typeof ref === 'string')  return typeof v === 'string' && v.length < 5000;
  if (typeof ref === 'boolean') return typeof v === 'boolean';
  if (Array.isArray(ref)) {
    if (!Array.isArray(v) || v.length > 200) return false;
    if (!ref.length) {
      return v.every(x =>
        (typeof x === 'string' && x.length < 2000) ||
        (x && typeof x === 'object' && !Array.isArray(x) &&
          Object.entries(x).every(([k, y]) =>
            typeof y === 'string' && y.length < 2000 &&
            (!/url$/i.test(k) || !y || /^https?:\/\//i.test(y)))));
    }
    return v.every(x => valid(x, ref[0], depth + 1));
  }
  if (ref && typeof ref === 'object') {
    const k = Object.keys(ref);
    if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
    if (Object.keys(v).length !== k.length) return false;
    return k.every(key => key in v && (Object.hasOwn(SPECIAL, key) ? SPECIAL[key](v[key]) : valid(v[key], ref[key], depth + 1)) &&
      (!/url$/i.test(key) || !v[key] || /^https?:\/\//i.test(v[key])));
  }
  return false;
}

async function api(req, res, url) {
  const m = req.method;
  if (m !== 'GET') {
    const o = req.headers.origin;
    let bad = req.headers['x-requested-with'] !== 'fetch';
    try { if (o && new URL(o).host !== req.headers.host) bad = true; } catch { bad = true; }
    if (bad) return send(res, 403, { error: 'forbidden' });
  }

  if (url === '/api/content' && m === 'GET') {
    if (!fs.existsSync(CONTENT)) return send(res, 500, { error: 'content.json не найден в папке data' });
    return send(res, 200, withBlocks(rj(CONTENT, {})));
  }

  if (url === '/api/login' && m === 'POST') {
    const ip = ipOf(req);
    const f = fails.get(ip) || { n: 0, t: Date.now() };
    if (Date.now() - f.t > 9e5) { f.n = 0; f.t = Date.now(); }
    if (f.n >= 5) return send(res, 429, { error: 'Слишком много попыток. Подождите 15 минут.' });

    let b; try { b = await body(req); } catch { return send(res, 400, { error: 'bad' }); }
    const users = rj(USERS, {});
    const name = String(b.username);
    const u = Object.prototype.hasOwnProperty.call(users, name) ? users[name] : null;
    const salt = u?.salt || '00';
    const calc = hash(String(b.password || ''), salt);
    const stored = u ? Buffer.from(u.hash, 'hex') : Buffer.alloc(64);
    const ok = u && calc.length === stored.length && crypto.timingSafeEqual(calc, stored);
    if (!ok) { f.n++; fails.set(ip, f); return send(res, 401, { error: 'Неверный логин или пароль' }); }
    fails.delete(ip);
    const sid = crypto.randomBytes(32).toString('hex');
    sessions.set(sid, { user: name, exp: Date.now() + 432e5 });
    return send(res, 200, { user: name }, {
      'Set-Cookie': `sid=${sid}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${SECURE ? '; Secure' : ''}`
    });
  }

  const s = session(req);
  if (url === '/api/me') return s ? send(res, 200, { user: s.user }) : send(res, 401, { error: 'auth' });
  if (!s) return send(res, 401, { error: 'auth' });

  if (url === '/api/logout' && m === 'POST') {
    sessions.delete(cookie(req).sid);
    return send(res, 200, { ok: 1 }, { 'Set-Cookie': 'sid=; HttpOnly; Path=/; Max-Age=0' });
  }

  if (url === '/api/schema' && m === 'GET') return send(res, 200, refFor(rj(CONTENT, {})));

  if (url === '/api/backups' && m === 'GET') {
    let files = []; try { files = fs.readdirSync(BK); } catch {}
    const list = files.map(f => /^content-(\d+)\.json$/.exec(f)).filter(Boolean)
      .map(x => ({ name: x[0], t: +x[1], size: fs.statSync(path.join(BK, x[0])).size })).sort((a, b) => b.t - a.t);
    return send(res, 200, list);
  }
  const bm = /^\/api\/backups\/(content-\d+\.json)$/.exec(url);
  if (bm && m === 'GET') {
    const f = path.join(BK, bm[1]);
    if (!fs.existsSync(f)) return send(res, 404, { error: 'not found' });
    return send(res, 200, withBlocks(rj(f, {})));
  }

  if (url === '/api/upload' && m === 'POST') {
    let name = ''; try { name = decodeURIComponent(String(req.headers['x-filename'] || '')); } catch {}
    const ext = path.extname(name).toLowerCase();
    if (!UP_EXT.has(ext)) { req.resume(); return send(res, 400, { error: 'Тип файла не поддерживается (изображения, pdf, zip, 7z, rar, txt, docx, xlsx, pptx, mp3, mp4, webm)' }); }
    const max = VIDEO_EXT.has(ext) ? MAX_VIDEO : MAX_FILE, tooBig = { error: 'Файл больше ' + max / 1048576 + ' МБ' };
    if (+req.headers['content-length'] > max) { req.resume(); return send(res, 413, tooBig); }
    const base = path.basename(name, ext).replace(/[^\w\-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'file';
    const fn = crypto.randomBytes(4).toString('hex') + '-' + base + ext, file = path.join(UP, fn);
    fs.mkdirSync(UP, { recursive: true });
    let n;
    try { n = await saveUpload(req, file, max); }
    catch (e) { fs.unlink(file, () => {}); return e.message === 'big' ? send(res, 413, tooBig) : send(res, 500, { error: 'Не удалось сохранить файл' }); }
    if (!n) { fs.unlink(file, () => {}); return send(res, 400, { error: 'Пустой файл' }); }
    return send(res, 200, { url: '/uploads/' + fn });
  }

  if (url === '/api/content' && m === 'PUT') {
    let b; try { b = await body(req); } catch { return send(res, 400, { error: 'Некорректные данные' }); }
    const cur = refFor(rj(CONTENT, {}));
    if (!(valid(b, cur) && validLayout(b))) return send(res, 400, { error: 'Данные не прошли проверку (проверьте ссылки — они должны начинаться с https:// — и цвета)' });

    fs.mkdirSync(BK, { recursive: true });
    if (fs.existsSync(CONTENT)) fs.copyFileSync(CONTENT, path.join(BK, `content-${Date.now()}.json`));
    try {
      const all = fs.readdirSync(BK).sort();
      all.slice(0, Math.max(0, all.length - 30)).forEach(x => fs.unlinkSync(path.join(BK, x)));
    } catch {}

    fs.writeFileSync(CONTENT + '.tmp', JSON.stringify(b, null, 2));
    fs.renameSync(CONTENT + '.tmp', CONTENT);
    return send(res, 200, { ok: 1 });
  }

  return send(res, 404, { error: 'not found' });
}

http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; " +
    "font-src https://fonts.gstatic.com; connect-src 'self' https://api.mcsrvstat.us; " +
    "img-src 'self' data: https:; media-src 'self' https:; frame-src 'self' https://www.youtube-nocookie.com https://player.vimeo.com; frame-ancestors 'self'; base-uri 'none'; form-action 'self'");

  let url = '/';
  try {
    url = decodeURIComponent(req.url.split('?')[0]);
    if (url.startsWith('/api/')) return await api(req, res, url);

    const f = url === '/' ? 'index.html' : url === '/admin' ? 'admin.html' : url.slice(1);
    const p = path.resolve(PUB, f);
    const rel = path.relative(PUB, p).toLowerCase();
    const top = rel.split(path.sep)[0];

    if (!p.startsWith(PUB + path.sep) || HIDDEN_FILES.has(rel) || HIDDEN_DIRS.has(top)) {
      res.writeHead(404); return res.end('404');
    }
    if (!fs.existsSync(p) || !fs.statSync(p).isFile()) { res.writeHead(404); return res.end('404'); }

    const size = fs.statSync(p).size;
    const hdr = { 'Content-Type': MIME[path.extname(p).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'Accept-Ranges': 'bytes' };
    const rg = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    if (rg && (rg[1] || rg[2])) {
      let a = rg[1] ? +rg[1] : Math.max(0, size - +rg[2]), z = rg[1] && rg[2] ? +rg[2] : size - 1;
      z = Math.min(z, size - 1);
      if (a > z || a >= size) { res.writeHead(416, { 'Content-Range': 'bytes */' + size }); return res.end(); }
      res.writeHead(206, { ...hdr, 'Content-Range': `bytes ${a}-${z}/${size}`, 'Content-Length': z - a + 1 });
      return fs.createReadStream(p, { start: a, end: z }).pipe(res);
    }
    res.writeHead(200, { ...hdr, 'Content-Length': size });
    fs.createReadStream(p).pipe(res);
  } catch (e) {
    console.error('ERR:', url, e);
    if (!res.headersSent) res.writeHead(500);
    res.end('error');
  }
}).listen(PORT, () => {
  fs.mkdirSync(DATA, { recursive: true });
  fs.mkdirSync(BK, { recursive: true });
  console.log('DLRN:    http://localhost:' + PORT);
  console.log('Админка: http://localhost:' + PORT + '/admin');
  console.log('Пользователи: ' + USERS);
  if (!fs.existsSync(USERS)) console.log('⚠ users.json не найден — создайте админа: node users.js add ЛОГИН');
  else console.log('✓ Пользователи найдены (' + Object.keys(rj(USERS, {})).length + ')');
});
