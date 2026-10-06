// Управление администраторами:
//   node users.js add ЛОГИН
//   node users.js list
//   node users.js remove ЛОГИН
const fs = require('fs'), path = require('path'), crypto = require('crypto'), readline = require('readline');

const FILE = path.join(__dirname, 'data', 'users.json');
const load = () => { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return {}; } };
const save = u => {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(u, null, 2) + '\n');
};

function promptPassword(cb) {
  if (!process.stdin.isTTY) return cb(process.argv[4] || '');
  process.stdout.write('Пароль (минимум 10 символов): ');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  const stdin = process.stdin;
  const wasRaw = stdin.isRaw;
  if (stdin.setRawMode) stdin.setRawMode(true);
  let pw = '';
  const onData = c => {
    const ch = c.toString('utf8');
    if (ch === '\r' || ch === '\n' || ch === '\u0004') {
      stdin.removeListener('data', onData);
      if (stdin.setRawMode) stdin.setRawMode(wasRaw);
      rl.close();
      process.stdout.write('\n');
      cb(pw);
    } else if (ch === '\u0003') {
      process.exit(130);
    } else if (ch === '\u007f' || ch === '\b') {
      if (pw.length) pw = pw.slice(0, -1);
    } else {
      pw += ch;
    }
  };
  stdin.on('data', onData);
}

const cmd = process.argv[2];
const login = process.argv[3];
const users = load();

if (cmd === 'list') {
  const names = Object.keys(users);
  console.log(names.length ? names.join('\n') : '(нет администраторов)');
} else if (cmd === 'remove') {
  if (!login) { console.error('Укажите логин'); process.exit(1); }
  if (!users[login]) { console.error('Не найден: ' + login); process.exit(1); }
  delete users[login]; save(users);
  console.log('Удалён: ' + login);
} else if (cmd === 'add') {
  if (!login) { console.error('Укажите логин'); process.exit(1); }
  promptPassword(pw => {
    if (pw.length < 10) { console.error('Пароль минимум 10 символов'); process.exit(1); }
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(pw, salt, 64).toString('hex');
    users[login] = { salt, hash };
    save(users);
    console.log('Готово: ' + login);
  });
} else {
  console.log('Использование:\n  node users.js add ЛОГИН\n  node users.js list\n  node users.js remove ЛОГИН');
}