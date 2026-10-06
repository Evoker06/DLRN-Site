const $ = s => document.querySelector(s);
const L = {site:"Сайт",title:"Заголовок",ip:"IP сервера",hero:"Главный экран",eyebrow:"Надпись над заголовком",title1:"Заголовок, строка 1",title2:"Заголовок, строка 2",text:"Текст",headPhrase:"Фраза, которую печатает голова",
  about:"О проекте",paragraphs:"Абзацы",socials:"Соцсети",name:"Название",desc:"Описание",url:"Ссылка (https://…)",features:"Возможности",items:"Элементы",icon:"Иконка",
  join:"Блок «Присоединиться»",rules:"Правила",discord:"Правила Discord",inline:"Текст в той же строке",minecraft:"Правила Minecraft",basic:"Основные правила",
  mods:"Запрещённые модификации",listLabel:"Подпись раскрывающегося списка",list:"Список модов",note:"Пояснение",bugs:"Баги и недоработки",buttonLabel:"Текст кнопки",buttonUrl:"Ссылка кнопки",
  chat:"Чат сервера",farms:"Запрещённые фермы",warning:"Предупреждение (строки)",faq:"FAQ",q:"Вопрос",a:"Ответ ({ip} и {version} подставляются сами)",buttons:"Кнопки",label:"Текст кнопки",
  footer:"Подвал",copyright:"Копирайт",right:"Справа",
  hidden:"Скрыть на сайте",groups:"Дополнительные контейнеры правил",
  ui:"Тексты интерфейса (меню, кнопки, подписи)",
  navHome:"Меню: «Главная»",navProject:"Меню: «О проекте»",navFeatures:"Меню: «Возможности»",navRules:"Меню: «Правила»",navFaq:"Меню: «FAQ»",
  headerPlay:"Кнопка в шапке",heroPlay:"Главная кнопка на первом экране",heroMore:"Вторая кнопка на первом экране",
  heroIpLabel:"Подпись «IP сервера» на первом экране",heroOnline:"Подпись «игроков онлайн»",
  statOnline:"Статистика 1: подпись (число — онлайн, подставляется само)",statUptimeValue:"Статистика 2: значение",statUptime:"Статистика 2: подпись",
  statVersion:"Статистика 3: подпись (число — версия, подставляется само)",statMoreValue:"Статистика 4: значение",statMore:"Статистика 4: подпись",
  labelProject:"Надпись раздела «О проекте»",labelFeatures:"Надпись раздела «Возможности»",labelJoin:"Надпись раздела «Присоединиться»",labelRules:"Надпись раздела «Правила»",labelFaq:"Надпись раздела «FAQ»",
  notice:"Плашка «Вход по проходке» (пустые поля — плашка скрыта)",  joinIpLabel:"Подпись IP в блоке «Присоединиться»",joinCopy:"Кнопка «Скопировать IP»",footerRules:"Подвал: ссылка «Правила»",footerFaq:"Подвал: ссылка «FAQ»",footerPlay:"Подвал: ссылка «Играть»",
  msgCopied:"Всплывающее сообщение после копирования",msgCopiedShort:"Сообщение у кнопки после копирования"};
const TPL = {buttons:{label:"", url:"https://"}};
const lab = k => L[k] || k;

let data, ORIGINAL, BACKUP = null, BK_LIST = null;
const api = (m, u, b) => fetch(u, {method:m, headers:{"Content-Type":"application/json","X-Requested-With":"fetch"}, body:b && JSON.stringify(b)});
const blank = v => Array.isArray(v) ? []
  : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, blank(x)]))
  : typeof v === "boolean" ? false : "";
const mk = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };

function input(obj, k) {
  const v = obj[k];
  if (typeof v === "boolean") { const i = mk("input"); i.type = "checkbox"; i.checked = v; i.onchange = () => obj[k] = i.checked; return i; }
  const str = typeof v === "string" ? v : String(v ?? "");
  const multi = str.length > 70 || str.includes("\n");
  const i = mk(multi ? "textarea" : "input");
  i.value = str; i.oninput = () => obj[k] = i.value; return i;
}

const getPath = (o, p) => p.split(".").reduce((a, k) => a?.[k], o);
// Кнопка «Взять из копии»: подставляет этот контейнер из загруженной резервной копии
function restoreBtn(obj, k, p) {
  if (!BACKUP || !p) return null;
  const src = getPath(BACKUP, p);
  if (src === undefined) return null;
  const b = mk("button", "mini", "↺ Взять из копии"); b.type = "button";
  b.onclick = () => { if (confirm("Заменить этот контейнер версией из резервной копии?")) { obj[k] = JSON.parse(JSON.stringify(src)); draw(); } };
  return b;
}

function build(parent, obj, refObj, path) {
  Object.keys(obj).forEach(k => {
    if (obj === data && (k === "layout" || k === "sections")) return;
    if (k === "blocks") { parent.append(blocksEditor(obj, k)); return; }
    if (k === "gallery") { parent.append(galleryEditor(obj, k)); return; }
    if (k === "bg") { parent.append(fld("Цвет контейнера", colorField(obj, k))); return; }
    const v = obj[k];
    const ref = refObj ? refObj[k] : undefined;
    const p = path == null ? null : (path ? path + "." + k : k);
    if (Array.isArray(v)) parent.append(list(obj, k, ref, p));
    else if (v && typeof v === "object") {
      const f = mk("fieldset"); f.append(mk("legend", "", lab(k)));
      build(f, v, ref, p);
      const rb = restoreBtn(obj, k, p);
      if (rb) { const t = mk("div", "tools"); t.append(rb); f.append(t); }
      parent.append(f);
    } else {
      const w = mk("div"); w.append(mk("label", "", lab(k))); w.append(input(obj, k)); parent.append(w);
    }
  });
}

function list(obj, k, refArr, p) {
  const arr = obj[k], f = mk("fieldset");
  f.append(mk("legend", "", lab(k)));
  arr.forEach((it, i) => {
    const prim = typeof it === "string";
    const box = prim ? mk("div", "row") : mk("fieldset");
    if (prim) box.append(input(arr, i));
    else build(box, it, refArr && (refArr[i] ?? refArr[0]), null);
    const tools = mk("div", prim ? "" : "tools");
    [["↑", () => i > 0 && ([arr[i-1], arr[i]] = [arr[i], arr[i-1]])],
     ["↓", () => i < arr.length-1 && ([arr[i+1], arr[i]] = [arr[i], arr[i+1]])],
     ["✕", () => arr.splice(i, 1)]]
      .forEach(([t, fn]) => {
        const b = mk("button", "mini", t);
        b.type = "button";
        b.onclick = () => { fn(); draw(); };
        tools.append(b);
      });
    box.append(tools); f.append(box);
  });
  const add = mk("button", "mini", "+ Добавить");
  add.type = "button";
  add.onclick = () => {
    // образец берётся из шаблона сервера, поэтому «+ Добавить» работает и в полностью пустом списке
    const sample = refArr && refArr.find(x => x !== undefined);
    arr.push(sample !== undefined ? blank(sample) : (TPL[k] ? {...TPL[k]} : ""));
    draw();
  };
  f.append(add);
  const rb = restoreBtn(obj, k, p);
  if (rb) f.append(" ", rb);
  return f;
}

/* ===== Редактор дополнительного содержимого (блоков) ===== */
const BTYPES = {heading:"Заголовок (H1–H6)",paragraph:"Абзац",quote:"Цитата",callout:"Врезка / плашка",ul:"Маркированный список",ol:"Нумерованный список",table:"Таблица",image:"Изображение",file:"Файл для скачивания",link:"Ссылка-кнопка",video:"Видео (файл или ссылка)",split:"Текст + файл рядом / витрина",showcase:"Витрина: акцентная полоса",showmin:"Витрина: минимальная рамка (как ChestShop)"};
const STYLED = new Set(["heading","paragraph","quote","callout","ul","ol","table","split"]);
const BNEW = {
  heading:()=>({type:"heading",level:2,text:"",font:"",size:""}),
  paragraph:()=>({type:"paragraph",text:"",font:"",size:""}),
  quote:()=>({type:"quote",text:"",author:"",font:"",size:""}),
  callout:()=>({type:"callout",variant:"info",title:"",text:"",font:"",size:""}),
  ul:()=>({type:"ul",items:[""],font:"",size:""}),
  ol:()=>({type:"ol",items:[""],font:"",size:""}),
  table:()=>({type:"table",header:["",""],rows:[["",""]],font:"",size:""}),
  image:()=>({type:"image",url:"",alt:""}),
  file:()=>({type:"file",label:"",url:""}),
  link:()=>({type:"link",label:"",url:"https://"}),
  video:()=>({type:"video",url:"",title:""}),
  split:()=>({type:"split",layout:"split",title:"",text:"",url:"",kind:"auto",side:"right",ratio:"40",valign:"top",caption:"",font:"",size:""}),
  showmin:()=>({type:"split",layout:"showcase",look:"minimal",icon:"@cube",title:"ChestShop",subtitle:"Экономика",text:"Создавайте магазины прямо в игре.\nПокупайте и продавайте ресурсы без лишних действий.",url:"",kind:"auto",side:"right",ratio:"33",valign:"center",caption:"",accent:"#9fb3c8",
    points:[{icon:"@ring",text:"Удобное меню"},{icon:"@ring",text:"Настройка цен"},{icon:"@ring",text:"Работает на всех версиях"}],font:"",size:""}),
  showcase:()=>({type:"split",layout:"showcase",look:"accent",icon:"⬢",title:"Название",subtitle:"Подзаголовок",text:"",url:"",kind:"auto",side:"right",ratio:"40",valign:"center",caption:"",accent:"#8b5cf6",
    points:[{icon:"☰",text:"Первое преимущество"},{icon:"⚙",text:"Второе преимущество"},{icon:"🛡",text:"Третье преимущество"}],font:"",size:""})
};
// общие поля оформления и размещения у каждого блока
Object.keys(BNEW).forEach(t => {
  const mkBlock = BNEW[t];
  BNEW[t] = () => ({...mkBlock(), pos:"bottom", align:"", width:"", bg:"", ...(STYLED.has(t) ? {color:""} : {})});
});

const fld = (label, node) => { const w = mk("div"); w.append(mk("label", "", label), node); return w; };
const txt = (b, k, multi, ph) => { const i = mk(multi ? "textarea" : "input"); i.value = b[k] ?? ""; if (ph) i.placeholder = ph; i.oninput = () => b[k] = i.value; return i; };
const sel = (b, k, opts, num) => {
  const s = mk("select");
  opts.forEach(([v, t]) => { const o = mk("option", "", t); o.value = v; s.append(o); });
  s.value = String(b[k] ?? opts[0][0]); s.onchange = () => b[k] = num ? Number(s.value) : s.value; return s;
};

async function upload(file) {
  const r = await fetch("/api/upload", {method:"POST",
    headers:{"X-Requested-With":"fetch","X-Filename":encodeURIComponent(file.name),"Content-Type":"application/octet-stream"}, body:file});
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) throw new Error("Сессия истекла, войдите заново");
  if (!r.ok) throw new Error(j.error || "Ошибка загрузки");
  return j.url;
}
function picker(accept, cb) {
  const f = mk("input"); f.type = "file"; if (accept) f.accept = accept;
  f.onchange = async () => {
    const file = f.files[0]; if (!file) return;
    const m = $("#msg"); m.style.color = ""; m.textContent = "Загрузка файла… (видео может грузиться долго, не закрывайте страницу)";
    try { cb(await upload(file), file); m.textContent = "Файл загружен ✓ (не забудьте «Сохранить»)"; m.style.color = "#6ee7a0"; }
    catch (e) { m.textContent = e.message; m.style.color = "#ff5a64"; }
  };
  f.click();
}
function urlField(b, k, accept) {
  const row = mk("div", "row"), i = txt(b, k, false, "https://… или загрузите файл");
  const up = mk("button", "mini", "⬆ Загрузить"); up.type = "button";
  up.onclick = () => picker(accept, (u, f) => {
    b[k] = u; if ("label" in b && !b.label) b.label = f.name; if ("alt" in b && !b.alt) b.alt = f.name; if ("title" in b && !b.title && b.type !== "split") b.title = f.name; draw();
  });
  row.append(i, up); return row;
}
function rich(b, k, ph) {
  const w = mk("div"), ta = txt(b, k, true, ph || "Текст"), bar = mk("div", "fmt");
  const wrap = (l, r, def) => {
    const s = ta.selectionStart, e = ta.selectionEnd;
    ta.setRangeText(l + (ta.value.slice(s, e) || def) + r, s, e, "select");
    ta.dispatchEvent(new Event("input")); ta.focus();
  };
  const btn = (t, title, fn) => { const x = mk("button", "mini", t); x.type = "button"; x.title = title; x.onclick = fn; bar.append(x); return x; };
  btn("Ж", "Жирный", () => wrap("**", "**", "текст")).style.fontWeight = "800";
  btn("К", "Курсив", () => wrap("*", "*", "текст")).style.fontStyle = "italic";
  btn("🔗 Ссылка", "Вставить ссылку", () => { const u = prompt("Адрес ссылки (https://…)", "https://"); if (u) wrap("[", "](" + u.replace(/\s/g, "") + ")", "текст ссылки"); });
  btn("⬆ Файл", "Загрузить файл и вставить ссылку на него", () => picker("", (u, f) => wrap("[", "](" + u + ")", f.name)));
  w.append(bar, ta); return w;
}
function listForm(box, b) {
  const t = mk("textarea"); t.value = b.items.join("\n"); t.oninput = () => b.items = t.value.split("\n");
  box.append(fld("Каждый пункт — с новой строки (можно **жирный**, *курсив*, [ссылка](https://…))", t));
}
const linkForm = (box, b) => box.append(fld("Название", txt(b, "label")), fld("Ссылка или файл", urlField(b, "url", "")));

const ICONS = {"cube":["M12 2.8l8 4.4v9.6l-8 4.4-8-4.4V7.2z","M4 7.2l8 4.4 8-4.4","M12 11.6v9.6"],"shield":["M12 3l7.5 3v5.5c0 4.6-3.1 8-7.5 9.5-4.4-1.5-7.5-4.9-7.5-9.5V6z","M9 12l2.3 2.3 4.2-4.3"],"ring":["M3 12a9 9 0 1 0 18 0 9 9 0 1 0-18 0","M8 12.3l2.7 2.7L16 9.6"],"check":["M5 12.5l4.5 4.5L19 7.5"],"coin":["M3 12a9 9 0 1 0 18 0 9 9 0 1 0-18 0","M14.5 9.2c-.5-.8-1.4-1.2-2.5-1.2-1.4 0-2.5.7-2.5 1.9s1 1.6 2.5 2 2.5.8 2.5 2-1.1 1.9-2.5 1.9c-1.1 0-2-.4-2.5-1.2","M12 6.3V8M12 16v1.7"],"menu":["M4 6.5h16","M4 12h16","M4 17.5h16"],"sliders":["M4 7h9","M17 7h3","M4 17h3","M11 17h9","M13 4.8v4.4","M7 14.8v4.4"],"bolt":["M13 2.5L5 13.2h6l-1 8.3 8-10.7h-6z"],"star":["M12 3.5l2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6-4.4-4.2 6-.8z"],"heart":["M12 20s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 7.6 4.2 4.2 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"],"globe":["M3 12a9 9 0 1 0 18 0 9 9 0 1 0-18 0","M3 12h18","M12 3c2.6 2.7 3.9 5.7 3.9 9s-1.3 6.3-3.9 9c-2.6-2.7-3.9-5.7-3.9-9S9.4 5.7 12 3z"],"users":["M9 11a3.2 3.2 0 1 0 0-6.4A3.2 3.2 0 0 0 9 11z","M3 19.5c0-3.2 2.7-5.5 6-5.5s6 2.3 6 5.5","M16.5 5a3 3 0 0 1 0 6","M18 14.3c1.8.6 3 2.2 3 4.7"],"download":["M12 4v11","M7.5 11l4.5 4.5 4.5-4.5","M5 19.5h14"],"lock":["M6.5 11h11v8.5h-11z","M8.5 11V8a3.5 3.5 0 0 1 7 0v3"]};
function svgIcon(name) {
  const d = ICONS[name]; if (!d) return null;
  const NS = "http://www.w3.org/2000/svg", s = document.createElementNS(NS, "svg");
  [["viewBox", "0 0 24 24"], ["fill", "none"], ["stroke", "currentColor"], ["stroke-width", "1.7"], ["stroke-linecap", "round"], ["stroke-linejoin", "round"], ["aria-hidden", "true"]].forEach(([k, v]) => s.setAttribute(k, v));
  d.forEach(p => { const e = document.createElementNS(NS, "path"); e.setAttribute("d", p); s.append(e); });
  return s;
}
// значок: «@имя» — встроенная иконка, иначе символ или эмодзи
const iconNode = v => { const s = v && v[0] === "@" ? svgIcon(v.slice(1)) : null; return s || document.createTextNode(v || ""); };

// ----- лента фотографий (about.gallery) -----
// Большие фото уменьшаются до 1920 px и сжимаются, чтобы сайт открывался быстро
async function shrink(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || !window.createImageBitmap) return file;
  try {
    const bmp = await createImageBitmap(file), k = Math.min(1, 1920 / Math.max(bmp.width, bmp.height));
    if (k === 1 && file.size < 1.5 * 1048576) return file;
    const cv = document.createElement("canvas"); cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
    const cx = cv.getContext("2d"); cx.fillStyle = "#fff"; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(bmp, 0, 0, cv.width, cv.height);
    const blob = await new Promise(r => cv.toBlob(r, "image/jpeg", 0.86));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", {type: "image/jpeg"});
  } catch { return file; }
}
function pickerMulti(accept, onEach, onDone) {
  const f = mk("input"); f.type = "file"; f.multiple = true; if (accept) f.accept = accept;
  f.onchange = async () => {
    const files = [...f.files]; if (!files.length) return;
    const m = $("#msg"); let ok = 0;
    for (const file of files) {
      m.style.color = ""; m.textContent = "Загрузка " + (ok + 1) + " из " + files.length + "…";
      try { onEach(await upload(await shrink(file)), file); ok++; }
      catch (e) { m.textContent = e.message; m.style.color = "#ff5a64"; break; }
    }
    if (ok) { m.textContent = "Загружено фото: " + ok + " (не забудьте «Сохранить»)"; m.style.color = "#6ee7a0"; onDone(); }
  };
  f.click();
}
function galleryEditor(obj, k) {
  const g = obj[k], f = mk("fieldset", "blocks-ed");
  f.append(mk("legend", "", "Лента фотографий"));
  f.append(mk("small", "hint", "Появляется на сайте под блоком «О проекте» и листается сама. Загрузите сразу несколько фото: они сожмутся и добавятся в конец."));
  const up = mk("button", "wide", "⬆ Загрузить фото (можно несколько)"); up.type = "button";
  up.onclick = () => pickerMulti("image/*", u => g.items.push({url: u, caption: ""}), () => draw());
  f.append(up);
  const grid = mk("div", "gal-grid");
  g.items.forEach((it, i) => {
    const card = mk("div", "gal-card"), im = mk("img"), cap = mk("input"), t = mk("div", "tools");
    im.src = it.url; im.alt = ""; cap.value = it.caption; cap.placeholder = "Подпись (необязательно)"; cap.oninput = () => it.caption = cap.value;
    [["↑", () => i > 0 && ([g.items[i-1], g.items[i]] = [g.items[i], g.items[i-1]])], ["↓", () => i < g.items.length-1 && ([g.items[i+1], g.items[i]] = [g.items[i], g.items[i+1]])], ["✕", () => g.items.splice(i, 1)]]
      .forEach(([s, fn]) => { const b = mk("button", "mini", s); b.type = "button"; b.onclick = () => { fn(); draw(); }; t.append(b); });
    card.append(im, cap, t); grid.append(card);
  });
  f.append(grid);
  const row = mk("div", "row"), link = mk("input"), add = mk("button", "mini", "+ По ссылке");
  link.placeholder = "https://… ссылка на фото"; add.type = "button";
  add.onclick = () => { const u = link.value.trim(); if (/^https?:\/\//i.test(u)) { g.items.push({url: u, caption: ""}); draw(); } else { const m = $("#msg"); m.textContent = "Ссылка должна начинаться с https://"; m.style.color = "#ff5a64"; } };
  row.append(link, add); f.append(row);
  const two = mk("div", "two");
  two.append(
    fld("Смена фото", sel(g, "interval", [["2","каждые 2 сек"],["3","каждые 3 сек"],["4","каждые 4 сек"],["5","каждые 5 сек"],["7","каждые 7 сек"],["10","каждые 10 сек"],["15","каждые 15 сек"]])),
    fld("Сколько фото видно сразу", sel(g, "visible", [["auto","Автоматически"],["1","По одному"],["2","По два"],["3","По три"],["4","По четыре"]])),
    fld("Как вписывать фото", sel(g, "fit", [["cover","Заполнить кадр"],["contain","Показать целиком"]])),
    fld("Подписи", sel(g, "captions", [["show","Показывать"],["hide","Скрыть"]])));
  f.append(two); return f;
}

// ----- «витрина»: значок и список пунктов -----
const GLYPHS = ["★","⚡","⚙","☰","🛡","♥","✦","◆","⌂","⚔","♟","✎","☁","🔒","⬢","❖","➜","🎮"];
const iconBtn = v => { const b = mk("button", "mini ibtn"); b.type = "button"; b.title = "Выбрать значок"; b.append(iconNode(v || "＋")); return b; };
function iconPopup(anchor, onPick, upload) {
  closePop();
  const pop = mk("div", "pop icons"), grid = mk("div", "igrid");
  const cell = v => { const b = mk("button"); b.type = "button"; b.title = v; b.append(iconNode(v)); b.onclick = () => { closePop(); onPick(v); }; grid.append(b); };
  Object.keys(ICONS).forEach(k => cell("@" + k)); GLYPHS.forEach(cell);
  pop.append(grid);
  const row = mk("div", "row"), inp = mk("input"), ok = mk("button", "mini", "OK");
  inp.placeholder = "Свой символ или эмодзи"; ok.type = "button";
  const done = () => { const v = inp.value.trim(); if (v) { closePop(); onPick(v.slice(0, 8)); } };
  ok.onclick = done; inp.onkeydown = e => { if (e.key === "Enter") done(); };
  row.append(inp, ok); pop.append(row);
  if (upload) { const u = mk("button", "mini", "⬆ Загрузить свою картинку"); u.type = "button"; u.onclick = () => { closePop(); picker("image/*", url => onPick(url)); }; pop.append(u); }
  document.body.append(pop);
  const r = anchor.getBoundingClientRect();
  pop.style.left = Math.max(8, Math.min(r.left, innerWidth - pop.offsetWidth - 8)) + "px";
  pop.style.top = Math.max(8, Math.min(r.bottom + 4, innerHeight - pop.offsetHeight - 8)) + "px";
  setTimeout(() => document.addEventListener("click", function h(e) { if (!pop.contains(e.target)) { closePop(); document.removeEventListener("click", h); } }), 0);
}
function iconField(b) {
  const row = mk("div", "row"), pick = iconBtn(b.icon), i = txt(b, "icon", false, "значок или ссылка на картинку");
  pick.onclick = e => { e.stopPropagation(); iconPopup(pick, v => { b.icon = v; draw(); }, true); };
  row.append(pick, i); return row;
}
function pointsEditor(b) {
  const w = mk("div"), arr = b.points || [];
  arr.forEach((p, i) => {
    const r = mk("div", "row pt"), ic = iconBtn(p.icon), tx = mk("input");
    ic.onclick = e => { e.stopPropagation(); iconPopup(ic, v => { p.icon = v; draw(); }, false); };
    tx.value = p.text; tx.placeholder = "Текст пункта"; tx.oninput = () => p.text = tx.value;
    r.append(ic, tx);
    [["↑", () => i > 0 && ([arr[i-1], arr[i]] = [arr[i], arr[i-1]])], ["↓", () => i < arr.length-1 && ([arr[i+1], arr[i]] = [arr[i], arr[i+1]])], ["✕", () => arr.splice(i, 1)]]
      .forEach(([t, fn]) => { const x = mk("button", "mini", t); x.type = "button"; x.onclick = () => { fn(); draw(); }; r.append(x); });
    w.append(r);
  });
  const add = mk("button", "mini", "+ Пункт"); add.type = "button";
  add.onclick = () => { (b.points = b.points || []).push({icon: b.look === "minimal" ? "@ring" : "✓", text: ""}); draw(); };
  w.append(add); return w;
}

const BFORM = {
  heading:(box, b) => box.append(fld("Уровень", sel(b, "level", [1,2,3,4,5,6].map(n => [n, "H" + n]), true)), fld("Текст заголовка", txt(b, "text"))),
  paragraph:(box, b) => box.append(fld("Текст абзаца", rich(b, "text", "Текст абзаца. Выделите слово и нажмите Ж или К"))),
  quote:(box, b) => box.append(fld("Цитата", rich(b, "text")), fld("Автор (необязательно)", txt(b, "author"))),
  callout:(box, b) => box.append(
    fld("Вид плашки", sel(b, "variant", [["info","Информация"],["success","Подсказка"],["warning","Внимание"],["danger","Важно"]])),
    fld("Заголовок плашки", txt(b, "title")), fld("Текст", rich(b, "text"))),
  ul:listForm, ol:listForm,
  table:(box, b) => {
    const t = mk("textarea"); t.value = [b.header, ...b.rows].map(r => r.join(" | ")).join("\n");
    t.placeholder = "Характеристика | Значение\nВерсия | 1.21";
    t.oninput = () => { const L = t.value.split("\n").map(l => l.split("|").map(c => c.trim())); b.header = L[0]; b.rows = L.slice(1).filter(r => r.some(Boolean)); };
    box.append(fld("Таблица: первая строка — заголовки, столбцы разделяйте символом |", t));
  },
  image:(box, b) => {
    box.append(fld("Ссылка на изображение или файл", urlField(b, "url", "image/*")), fld("Описание (alt)", txt(b, "alt")));
    if (b.url) { const im = mk("img", "pv"); im.src = b.url; box.append(im); }
  },
  split:(box, b) => {
    const show = b.layout === "showcase";
    const lay = sel(b, "layout", [["split","Текст + файл рядом"],["showcase","Витрина: значок · файл · список"]]);
    lay.addEventListener("change", () => draw());
    box.append(fld("Вид блока", lay));
    if (show) box.append(fld("Стиль карточки", (() => { const s2 = sel(b, "look", [["accent","Акцентная полоса"],["minimal","Минимальная рамка"]]); s2.addEventListener("change", () => draw()); return s2; })()), fld("Значок: выберите из набора, символ, эмодзи или картинка", iconField(b)));
    box.append(fld("Заголовок", txt(b, "title")));
    if (show) box.append(fld("Подзаголовок (цветом акцента)", txt(b, "subtitle")));
    box.append(
      fld("Текст", rich(b, "text", "Текст рядом с файлом")),
      fld("Файл, изображение, видео или ссылка (YouTube, Vimeo)", urlField(b, "url", "image/*,video/mp4,video/webm,application/pdf,.zip,.7z,.rar,.txt,.docx,.xlsx,.pptx,.mp3")),
      fld("Что это", sel(b, "kind", [["auto","Определить по ссылке"],["image","Изображение"],["video","Видео"],["file","Файл для скачивания"]])));
    if (!show) box.append(fld("Где файл", sel(b, "side", [["right","Справа от текста"],["left","Слева от текста"]])));
    box.append(
      fld("Ширина файла", sel(b, "ratio", [["33","Узкий — 33%"],["40","40%"],["50","Половина — 50%"],["60","Широкий — 60%"]])),
      fld("Выравнивание по высоте", sel(b, "valign", [["top","По верху"],["center","По центру"]])),
      fld("Подпись (у файла для скачивания — название кнопки)", txt(b, "caption")));
    if (show) box.append(fld("Цвет акцента (подзаголовок, значки, полоса)", colorField(b, "accent")), fld("Пункты справа от файла", pointsEditor(b)));
  },
  file:linkForm, link:linkForm,
  video:(box, b) => box.append(
    fld("Ссылка на видео (YouTube, Vimeo или прямая ссылка на файл) либо загрузка файла mp4/webm", urlField(b, "url", "video/mp4,video/webm")),
    fld("Подпись под видео (необязательно)", txt(b, "title")))
};
function styleRow(b) {
  const g = mk("div", "two"), z = mk("input");
  z.type = "number"; z.min = 10; z.max = 96; z.placeholder = "авто"; z.value = b.size || "";
  z.oninput = () => b.size = z.value === "" ? "" : String(Math.min(96, Math.max(10, Math.round(+z.value) || 10)));
  g.append(fld("Шрифт", sel(b, "font", [["","По умолчанию"],["serif","С засечками"],["mono","Моноширинный"]])), fld("Размер текста, px (10–96)", z));
  return g;
}
function blockTools(arr, i) {
  const t = mk("div", "tools");
  [["↑", () => i > 0 && ([arr[i-1], arr[i]] = [arr[i], arr[i-1]])],
   ["↓", () => i < arr.length-1 && ([arr[i+1], arr[i]] = [arr[i], arr[i+1]])],
   ["✕", () => arr.splice(i, 1)]].forEach(([s, fn]) => {
    const x = mk("button", "mini", s); x.type = "button"; x.onclick = () => { fn(); draw(); }; t.append(x);
  });
  const mv = mk("select"); mv.title = "Переместить блок в другой контейнер на сайте";
  mv.append(new Option("Переместить в…", ""));
  const all = containers(); all.forEach(([l], j) => mv.append(new Option(l, j)));
  mv.onchange = () => {
    if (mv.value === "") return;
    const to = all[+mv.value][1];
    if (to === arr) { mv.value = ""; return; }
    to.push(arr.splice(i, 1)[0]); draw();
  };
  t.prepend(mv);
  return t;
}
function blocksEditor(obj, k) {
  const arr = obj[k], f = mk("fieldset", "blocks-ed");
  f.append(mk("legend", "", "＋ Дополнительное содержимое"));
  f.append(mk("small", "hint", "Контейнер для текста, файлов и ссылок. Блоки появятся на сайте в этом месте."));
  arr.forEach((b, i) => {
    const box = mk("fieldset"); box.append(mk("legend", "", (i + 1) + ". " + (BTYPES[b.type] || b.type)));
    if (BFORM[b.type]) BFORM[b.type](box, b);
    const det = mk("details"); det.append(mk("summary", "", "Оформление и размещение"));
    if (STYLED.has(b.type)) det.append(styleRow(b));
    det.append(viewRow(b)); box.append(det);
    box.append(blockTools(arr, i)); f.append(box);
  });
  const bar = mk("div", "row"), s = mk("select");
  Object.entries(BTYPES).forEach(([v, t]) => { const o = mk("option", "", t); o.value = v; s.append(o); });
  const add = mk("button", "mini", "+ Добавить блок"); add.type = "button";
  add.onclick = () => { arr.push(BNEW[s.value]()); draw(); };
  bar.append(s, add); f.append(bar); return f;
}


/* ===== Цвета, размещение, структура страницы ===== */
function colorField(obj, k) {
  const row = mk("div", "row colorf"), c = mk("input"), t = mk("span", "cv"), x = mk("button", "mini", "Сбросить");
  c.type = "color"; x.type = "button";
  const show = () => { c.value = /^#[0-9a-f]{6}$/i.test(obj[k] || "") ? obj[k] : "#000000"; t.textContent = obj[k] || "не задан"; };
  c.oninput = () => { obj[k] = c.value; t.textContent = c.value; };
  x.onclick = () => { obj[k] = ""; show(); };
  show(); row.append(c, t, x); return row;
}
function viewRow(b) {
  const g = mk("div", "two");
  g.append(
    fld("Положение в контейнере", sel(b, "pos", [["bottom","Под основным содержимым"],["top","Над основным содержимым"]])),
    fld("Выравнивание", sel(b, "align", [["","По умолчанию"],["left","Слева"],["center","По центру"],["right","Справа"]])),
    fld("Ширина", sel(b, "width", [["","На всю ширину"],["75","75%"],["50","50%"],["33","33%"]])),
    fld("Цвет контейнера (фон)", colorField(b, "bg")));
  if (STYLED.has(b.type)) g.append(fld("Цвет текста", colorField(b, "color")));
  return g;
}
// Все контейнеры, куда можно переместить блок
function containers() {
  const out = [], C = data, add = (l, a) => Array.isArray(a) && out.push([l, a]);
  add("Главный экран", C.hero.blocks); add("О проекте", C.about.blocks);
  add("Возможности (раздел)", C.features.blocks);
  C.features.items.forEach((f, i) => add("Карточка: " + (f.title || i + 1), f.blocks));
  add("Присоединиться", C.join.blocks); add("Правила (раздел)", C.rules.blocks);
  add("Правила Discord", C.rules.discord.blocks); add("Правила Minecraft", C.rules.minecraft.blocks);
  add("FAQ (раздел)", C.faq.blocks);
  C.faq.items.forEach((f, i) => add("Вопрос: " + (f.q || i + 1), f.blocks));
  add("Подвал", C.footer.blocks);
  (C.sections || []).forEach(x => add("Раздел: " + (x.title || "без названия"), x.blocks));
  return out;
}
const NATIVE_NAMES = {hero:"Главный экран", stats:"Статистика (онлайн, 24/7…)", project:"О проекте", features:"Возможности", join:"Присоединиться", rules:"Правила", faq:"FAQ"};
function normLayout() {
  data.sections = data.sections || []; data.layout = data.layout || {};
  const L = data.layout, ids = [...Object.keys(NATIVE_NAMES), ...data.sections.map(x => x.id)];
  L.order = [...new Set([...(L.order || []).filter(x => ids.includes(x)), ...ids])];
  L.hidden = (L.hidden || []).filter(x => ids.includes(x));
  L.colors = L.colors || {};
  [...Object.keys(NATIVE_NAMES), "footer"].forEach(k => { if (typeof L.colors[k] !== "string") L.colors[k] = ""; });
}
function layoutEditor() {
  normLayout();
  const L = data.layout, f = mk("fieldset", "blocks-ed");
  f.append(mk("legend", "", "Структура страницы"));
  f.append(mk("small", "hint", "Порядок разделов на сайте, показ и скрытие, цвет фона, новые разделы. Содержимое существующих разделов редактируется ниже."));
  L.order.forEach((id, i) => {
    const sec = data.sections.find(x => x.id === id);
    const box = mk("fieldset");
    box.append(mk("legend", "", (i + 1) + ". " + (sec ? "Новый раздел: " + (sec.title || "без названия") : NATIVE_NAMES[id])));
    const show = mk("input"); show.type = "checkbox"; show.checked = !L.hidden.includes(id);
    show.onchange = () => { L.hidden = show.checked ? L.hidden.filter(x => x !== id) : [...L.hidden, id]; };
    const chk = mk("label"); chk.append(show, " Показывать на сайте"); box.append(chk);
    box.append(fld("Цвет фона раздела", colorField(sec || L.colors, sec ? "bg" : id)));
    if (sec) {
      box.append(fld("Заголовок раздела", txt(sec, "title")));
      const nav = mk("input"); nav.type = "checkbox"; nav.checked = sec.nav; nav.onchange = () => sec.nav = nav.checked;
      const nl = mk("label"); nl.append(nav, " Ссылка на раздел в меню сайта"); box.append(nl);
      box.append(blocksEditor(sec, "blocks"));
    }
    const t = mk("div", "tools");
    [["↑", () => i > 0 && ([L.order[i-1], L.order[i]] = [L.order[i], L.order[i-1]])],
     ["↓", () => i < L.order.length-1 && ([L.order[i+1], L.order[i]] = [L.order[i], L.order[i+1]])]].forEach(([s, fn]) => {
      const b = mk("button", "mini", s); b.type = "button"; b.onclick = () => { fn(); draw(); }; t.append(b);
    });
    if (sec) {
      const d = mk("button", "mini", "✕ Удалить раздел"); d.type = "button";
      d.onclick = () => { if (confirm("Удалить раздел вместе со всем его содержимым?")) { data.sections.splice(data.sections.indexOf(sec), 1); draw(); } };
      t.append(d);
    }
    box.append(t); f.append(box);
  });
  const add = mk("button", "mini", "+ Новый раздел"); add.type = "button";
  add.onclick = () => { data.sections.push({id: "c" + Date.now().toString(36), title: "", nav: false, bg: "", blocks: []}); draw(); };
  f.append(add, fld("Цвет фона подвала", colorField(L.colors, "footer")));
  return f;
}

function backupsEditor() {
  const f = mk("fieldset", "blocks-ed"), row = mk("div", "row"), sel1 = mk("select");
  f.append(mk("legend", "", "Резервные копии"));
  f.append(mk("small", "hint", "Перед каждым сохранением сервер хранит копию (последние 30). Загрузите копию — и у каждого контейнера появится кнопка «↺ Взять из копии». Ничего не меняется, пока вы не подтвердите и не нажмёте «Сохранить»."));
  const fill = list => {
    sel1.replaceChildren(new Option("Выберите копию…", ""));
    list.forEach(x => sel1.append(new Option(new Date(x.t).toLocaleString("ru-RU") + " · " + Math.max(1, Math.round(x.size / 1024)) + " КБ", x.name)));
    if (BACKUP && BACKUP.__name) sel1.value = BACKUP.__name;
  };
  if (BK_LIST) fill(BK_LIST);
  else api("GET", "/api/backups").then(r => r.ok ? r.json() : []).then(l => { BK_LIST = l; fill(l); }).catch(() => {});
  const load = mk("button", "mini", "Загрузить копию"), all = mk("button", "mini", "Заменить всё копией");
  load.type = all.type = "button";
  const say = (t, ok) => { const m = $("#msg"); m.textContent = t; m.style.color = ok ? "#6ee7a0" : "#ff5a64"; };
  load.onclick = async () => {
    if (!sel1.value) return;
    const r = await api("GET", "/api/backups/" + sel1.value);
    if (!r.ok) return say("Не удалось загрузить копию", false);
    BACKUP = await r.json(); Object.defineProperty(BACKUP, "__name", {value: sel1.value, enumerable: false});
    draw(); say("Копия загружена: нажимайте «↺ Взять из копии» у нужных контейнеров", true);
  };
  all.onclick = () => {
    if (!BACKUP) return say("Сначала загрузите копию", false);
    if (confirm("Заменить всё содержимое версией из копии? Несохранённые изменения будут потеряны.")) { data = JSON.parse(JSON.stringify(BACKUP)); draw(); say("Копия открыта в редакторе — нажмите «Сохранить»", true); }
  };
  row.append(sel1, load, all); f.append(row); return f;
}

function drawForm() {
  const y = scrollY;
  $("#root").replaceChildren();
  $("#root").append(layoutEditor(), backupsEditor());
  build($("#root"), data, ORIGINAL, "");
  scrollTo(0, y);
}

/* ===== Конструктор: сайт в центре, структура слева, свойства справа ===== */
let mode = "b", cur = {path: null, sec: null}, site = null, suppress = false, savedJSON = "", lastJSON = "", burstT = null, reveal = false, idc = 0;
const hist = [], redoSt = [];
const clone = o => JSON.parse(JSON.stringify(o));
const setPath = (o, p, v) => { const k = p.split("."), last = k.pop(); k.reduce((a, x) => a[x], o)[last] = v; };
const newId = () => "c" + (Date.now() + idc++).toString(36);
const SEC_OF = {hero:"hero", about:"project", socials:"project", features:"features", join:"join", rules:"rules", faq:"faq", footer:"footer"};
const SEC_DATA = {hero:["hero"], project:["about","socials"], features:["features"], join:["join"], rules:["rules"], faq:["faq"], stats:["ui"], footer:["footer"]};
const TOP = new Set(["hero","about","socials","features","join","rules","faq","footer"]);
const SEG = {gallery:"Лента фотографий", ui:"Тексты интерфейса", sections:"Разделы", blocks:"Блоки", groups:"Доп. контейнеры правил", paragraphs:"Абзацы", footer:"Подвал", ...NATIVE_NAMES};
const segName = k => /^\d+$/.test(k) ? "№" + (+k + 1) : (SEG[k] || lab(k));
const ITEM_NAMES = {"features.items":"Карточка","faq.items":"Вопрос","socials":"Соцсеть","rules.discord.items":"Правило Discord","rules.groups":"Контейнер правил",
  "rules.minecraft.mods.list":"Мод","about.paragraphs":"Абзац","rules.warning":"Строка предупреждения","rules.minecraft.basic":"Правило","sections":"Раздел"};
const pathName = p => {
  const k = p.split("."), v = getPath(data, p), ap = k.slice(0, -1).join(".");
  if (/^\d+$/.test(k[k.length - 1]) && ITEM_NAMES[ap]) return ITEM_NAMES[ap] + " " + (+k[k.length - 1] + 1);
  return /^blocks$/.test(k[k.length - 2] || "") && v && BTYPES[v.type] ? BTYPES[v.type] : segName(k[k.length - 1]);
};
const secOf = p => { if (!p) return null; const k = p.split("."); return k[0] === "sections" ? (data.sections[+k[1]]?.id || null) : (SEC_OF[k[0]] || null); };
const isCustom = id => data.sections.some(s => s.id === id);
const secName = id => { const s = data.sections.find(x => x.id === id); return s ? (s.title || "Новый раздел") : (id === "footer" ? "Подвал" : NATIVE_NAMES[id] || id); };
// ссылка на образец структуры (для кнопки «+ Добавить»); для номеров берётся первый элемент
const refAt = p => p.split(".").reduce((a, k) => Array.isArray(a) ? (a[+k] ?? a[0]) : a?.[k], ORIGINAL);

// ---------- состояние, отмена/повтор ----------
function select(path, sec) {
  const m = path && /^sections\.(\d+)$/.exec(path);
  if (m) { sec = data.sections[+m[1]]?.id || null; path = null; }
  cur = {path: path || null, sec: sec || (path ? secOf(path) : null)};
}
function renderSite() {
  if (!site || !site.__renderAll || !data) return;
  try { const y = site.scrollY; site.__renderAll(clone(data)); site.scrollTo(0, y); markSel(); } catch (e) { console.error(e); }
}
function selEl() {
  if (!site) return null;
  const d = site.document;
  return (cur.path && d.querySelector(`[data-p="${cur.path}"]`)) || (cur.sec && d.querySelector(`[data-sec="${cur.sec}"]`)) || null;
}
function markSel() {
  if (!site) return;
  site.document.querySelectorAll(".ed-sel").forEach(e => e.classList.remove("ed-sel"));
  const e = selEl();
  if (e) { e.classList.add("ed-sel"); if (reveal) e.scrollIntoView({behavior: "smooth", block: "center"}); }
  reveal = false; placeToolbar();
}
function dirtyUI() { $("#dirty").hidden = lastJSON === savedJSON; $("#undo").disabled = !hist.length; $("#redo").disabled = !redoSt.length; }
function applyState(js) {
  data = JSON.parse(js); lastJSON = js; clearTimeout(burstT); burstT = null;
  if (mode === "b") draw(); else drawForm();
  dirtyUI();
}
function undo() { if (!hist.length) return; redoSt.push(lastJSON); applyState(hist.pop()); }
function redo() { if (!redoSt.length) return; hist.push(lastJSON); applyState(redoSt.pop()); }
// Закрывает текущую «пачку» правок: следующее структурное действие станет отдельным шагом отмены
function flush() {
  if (!data) return;
  const j = JSON.stringify(data);
  if (j !== lastJSON) { if (!burstT) { hist.push(lastJSON); redoSt.length = 0; } lastJSON = j; }
  clearTimeout(burstT); burstT = null;
}
setInterval(() => {
  if (!data) return;
  const j = JSON.stringify(data);
  if (j === lastJSON) return;
  if (!burstT) { hist.push(lastJSON); if (hist.length > 60) hist.shift(); redoSt.length = 0; burstT = setTimeout(() => burstT = null, 900); }
  lastJSON = j; dirtyUI();
  if (mode === "b" && !suppress) renderSite();
}, 350);
window.addEventListener("beforeunload", e => { if (data && JSON.stringify(data) !== savedJSON) { e.preventDefault(); e.returnValue = ""; } });
function keys(e) {
  const t = e.target, typing = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)), k = (e.key || "").toLowerCase();
  if ((e.ctrlKey || e.metaKey) && k === "s") { e.preventDefault(); $("#save").click(); return; }
  if (typing || !data) return;
  if ((e.ctrlKey || e.metaKey) && k === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); }
  else if ((e.ctrlKey || e.metaKey) && k === "y") { e.preventDefault(); redo(); }
}
document.addEventListener("keydown", keys);

// ---------- всплывающее меню ----------
function closePop() { document.querySelectorAll(".pop").forEach(p => p.remove()); }
function popup(r, items) {
  closePop();
  const p = mk("div", "pop");
  items.forEach(([label, fn]) => { const b = mk("button", "", label); b.type = "button"; b.onclick = () => { closePop(); fn(); }; p.append(b); });
  document.body.append(p);
  p.style.left = Math.max(8, Math.min(r.left, innerWidth - p.offsetWidth - 8)) + "px";
  p.style.top = Math.max(8, Math.min(r.bottom + 4, innerHeight - p.offsetHeight - 8)) + "px";
  setTimeout(() => document.addEventListener("click", closePop, {once: true}), 0);
}
const rectOf = e => { const r = e.getBoundingClientRect(), f = $("#frame").getBoundingClientRect(); return {left: f.left + r.left, top: f.top + r.top, bottom: f.top + r.bottom, right: f.left + r.right}; };

// ---------- создание блоков, элементов и разделов ----------
const PH = {heading:{text:"Заголовок"}, paragraph:{text:"Новый абзац — нажмите, чтобы изменить"}, quote:{text:"Цитата", author:"Автор"},
  callout:{title:"Заметка", text:"Текст заметки"}, ul:{items:["Пункт 1","Пункт 2"]}, ol:{items:["Шаг 1","Шаг 2"]},
  table:{header:["Колонка 1","Колонка 2"], rows:[["Значение","Значение"]]}, split:{title:"Заголовок", text:"Описание рядом с файлом"}, file:{label:"Скачать файл"}, link:{label:"Ссылка", url:"https://"}};
const newBlock = (t, o) => Object.assign(BNEW[t](), PH[t] || {}, o || {});
function addBlock(path, t) {
  flush();
  const arr = getPath(data, path); if (!Array.isArray(arr)) return;
  arr.push(newBlock(t)); select(path + "." + (arr.length - 1)); reveal = true; draw();
}
const PRESETS = [
  ["Пустой раздел", () => []],
  ["Заголовок и текст", () => [newBlock("heading", {text: "Заголовок раздела"}), newBlock("paragraph")]],
  ["Призыв к действию", () => [newBlock("callout", {variant: "success", title: "Присоединяйся!", text: "Короткий призыв к действию."}), newBlock("link", {label: "Играть"})]],
  ["Видео", () => [newBlock("heading", {text: "Видео"}), newBlock("video")]],
  ["Список и таблица", () => [newBlock("ul"), newBlock("table")]]
];
function addSection(mk2) {
  flush();
  const s = {id: newId(), title: "Новый раздел", nav: false, bg: "", blocks: mk2()};
  data.sections.push(s); select(null, s.id); reveal = true; draw();
}
const presetMenu = r => popup(r, PRESETS.map(([n, f]) => [n, () => addSection(f)]));
function addItem(path) {
  flush();
  const arr = getPath(data, path); if (!Array.isArray(arr)) return;
  const sample = (refAt(path) || []).find(x => x !== undefined);
  arr.push(sample !== undefined ? blank(sample) : (typeof arr[0] === "object" && arr[0] ? blank(arr[0]) : ""));
  select(path + "." + (arr.length - 1)); reveal = true; draw();
}

// ---------- мост с сайтом (iframe читает window.parent.__builder) ----------
window.__builder = {
  siteReady(win) { site = win; win.document.addEventListener("keydown", keys); renderSite(); refreshUI(); },
  text(path, value, kind) {
    suppress = true;
    try { setPath(data, path, kind === "lines" ? value.split("\n").filter(x => x.trim()) : value); } catch (e) { console.error(e); }
  },
  textDone() { suppress = false; renderSite(); buildInspector(); },
  addBlk(path) {
    const e = site.document.querySelector(`[data-addblk="${path}"]`);
    popup(e ? rectOf(e) : {left: 300, bottom: 200}, Object.entries(BTYPES).map(([t, n]) => [n, () => addBlock(path, t)]));
  },
  addItem(path) {
    if (path === "sections") { const e = site.document.querySelector(`[data-additem="sections"]`); presetMenu(e ? rectOf(e) : {left: 300, bottom: 200}); }
    else addItem(path);
  },
  pick(path, kind, sec) { select(path, sec); refreshUI(); },
  moved() { placeToolbar(); }
};

// ---------- действия над выбранным ----------
function info() {
  if (cur.path) {
    const k = cur.path.split("."), last = k[k.length - 1];
    if (/^\d+$/.test(last)) { const ap = k.slice(0, -1).join("."), arr = getPath(data, ap); if (Array.isArray(arr)) return {t: "item", arr, ap, i: +last}; }
    return {t: "leaf"};
  }
  return cur.sec ? {t: "sec", id: cur.sec} : {t: "none"};
}
function parentSel() {
  if (!cur.path) return;
  const k = cur.path.split("."); k.pop();
  while (k.length) { const v = getPath(data, k.join(".")); if (v && typeof v === "object" && !Array.isArray(v)) break; k.pop(); }
  const was = cur.path; select(k.join(".") || null, k.length ? null : secOf(was)); reveal = true; refreshUI();
}
function act(a) {
  flush();
  const n = info();
  if (a === "parent") return parentSel();
  if (n.t === "item") {
    if (a === "up" || a === "down") {
      const j = n.i + (a === "up" ? -1 : 1); if (j < 0 || j >= n.arr.length) return;
      [n.arr[n.i], n.arr[j]] = [n.arr[j], n.arr[n.i]]; select(n.ap + "." + j);
    } else if (a === "dup") {
      const c = clone(n.arr[n.i]); n.arr.splice(n.i + 1, 0, c); select(n.ap + "." + (n.i + 1));
    } else if (a === "del") {
      if (!confirm("Удалить этот элемент?")) return;
      n.arr.splice(n.i, 1);
      const pp = n.ap.split(".").slice(0, -1).join("."); select(pp || null, pp ? null : secOf(n.ap));
    } else return;
  } else if (n.t === "sec") {
    const lay = data.layout, i = lay.order.indexOf(n.id);
    if (a === "up" || a === "down") {
      const j = i + (a === "up" ? -1 : 1); if (j < 0 || j >= lay.order.length) return;
      [lay.order[i], lay.order[j]] = [lay.order[j], lay.order[i]];
    } else if (a === "hide") lay.hidden = lay.hidden.includes(n.id) ? lay.hidden.filter(x => x !== n.id) : [...lay.hidden, n.id];
    else if (a === "dup" && isCustom(n.id)) {
      const c = clone(data.sections.find(s => s.id === n.id)); c.id = newId(); c.title += " (копия)";
      data.sections.push(c); lay.order.splice(i + 1, 0, c.id); select(null, c.id);
    } else if (a === "del" && isCustom(n.id)) {
      if (!confirm("Удалить раздел вместе со всем его содержимым?")) return;
      data.sections = data.sections.filter(s => s.id !== n.id); select(null, null);
    } else return;
  } else return;
  reveal = true; draw();
}
function actButtons(box, big) {
  const n = info(), add = (t, title, a) => { const b = mk("button", big ? "mini" : "", t + (big ? " " + title : "")); b.type = "button"; b.title = title; b.onmousedown = e => e.preventDefault(); b.onclick = () => act(a); box.append(b); };
  if (n.t === "item") { add("↑", "Выше", "up"); add("↓", "Ниже", "down"); add("⧉", "Дублировать", "dup"); add("✕", "Удалить", "del"); }
  if (n.t === "sec") { add("↑", "Выше", "up"); add("↓", "Ниже", "down"); add(data.layout.hidden.includes(n.id) ? "🚫" : "👁", "Показать / скрыть", "hide"); if (isCustom(n.id)) { add("⧉", "Дублировать", "dup"); add("✕", "Удалить раздел", "del"); } }
  if (cur.path) add("⤴", "Родитель", "parent");
}

// ---------- плавающая панель над выбранным элементом ----------
function selName() { return cur.path ? pathName(cur.path) : secName(cur.sec); }
function buildToolbar() {
  const tb = $("#etb"); tb.replaceChildren();
  if (info().t === "none") return;
  tb.append(mk("span", "tn", selName())); actButtons(tb, false);
}
function placeToolbar() {
  const tb = $("#etb"), e = mode === "b" ? selEl() : null;
  if (!e || !tb.childNodes.length) { tb.hidden = true; return; }
  const r = rectOf(e), f = $("#frame").getBoundingClientRect();
  if (r.bottom < f.top + 4 || r.top > f.bottom - 4) { tb.hidden = true; return; }
  tb.hidden = false;
  tb.style.left = Math.max(f.left + 4, Math.min(r.right - tb.offsetWidth, f.right - tb.offsetWidth - 6)) + "px";
  tb.style.top = Math.max(f.top + 4, r.top - tb.offsetHeight - 4) + "px";
}

// ---------- левая панель: структура ----------
function buildTree() {
  const t = $("#tree"), y = t.scrollTop, lay = data.layout; t.replaceChildren();
  t.append(mk("h3", "", "Структура страницы"));
  const row = (id, name, extra) => {
    const r = mk("div", "trow" + (cur.sec === id && !cur.path ? " on" : cur.sec === id ? " in" : "") + (lay.hidden.includes(id) ? " off" : ""));
    const eye = mk("button", "eye", lay.hidden.includes(id) ? "🚫" : "👁"); eye.type = "button"; eye.title = "Показать / скрыть";
    eye.onclick = e => { e.stopPropagation(); lay.hidden = lay.hidden.includes(id) ? lay.hidden.filter(x => x !== id) : [...lay.hidden, id]; draw(); };
    r.append(eye, mk("span", "nm", name));
    if (extra) r.append(extra);
    r.onclick = () => { select(null, id); reveal = true; refreshUI(); };
    return r;
  };
  lay.order.forEach((id, i) => {
    const mv = mk("span", "mv");
    [["↑", -1], ["↓", 1]].forEach(([s, d]) => {
      const b = mk("button", "mini", s); b.type = "button";
      b.onclick = e => { e.stopPropagation(); const j = i + d; if (j < 0 || j >= lay.order.length) return; [lay.order[i], lay.order[j]] = [lay.order[j], lay.order[i]]; draw(); };
      mv.append(b);
    });
    t.append(row(id, secName(id), mv));
  });
  const ft = row("footer", "Подвал"); ft.querySelector(".eye").remove(); t.append(ft);
  const ui = mk("div", "trow" + (cur.path === "ui" ? " on" : ""), ""); ui.append(mk("span", "nm", "Подписи и кнопки сайта")); ui.onclick = () => { select("ui"); refreshUI(); }; t.append(ui);
  const add = mk("button", "wide", "＋ Новый раздел"); add.type = "button";
  add.onclick = () => presetMenu(add.getBoundingClientRect());
  t.append(add);
  t.scrollTop = y;
}

// ---------- правая панель: свойства ----------
function nodeUI(box, parent, key, p) {
  const v = parent[key];
  if (Array.isArray(v)) box.append(list(parent, key, refAt(p), null));
  else if (v && typeof v === "object") { const f = mk("fieldset"); f.append(mk("legend", "", segName(key))); build(f, v, refAt(p), null); box.append(f); }
  else box.append(fld(segName(key), input(parent, key)));
}
function secOptions(id) {
  const lay = data.layout, sec = data.sections.find(s => s.id === id), f = mk("fieldset");
  f.append(mk("legend", "", "Оформление раздела"));
  if (id !== "footer") {
    const show = mk("input"); show.type = "checkbox"; show.checked = !lay.hidden.includes(id);
    show.onchange = () => { lay.hidden = show.checked ? lay.hidden.filter(x => x !== id) : [...lay.hidden, id]; };
    const l = mk("label"); l.append(show, " Показывать на сайте"); f.append(l);
  }
  f.append(fld("Цвет фона", colorField(sec || lay.colors, sec ? "bg" : id)));
  return f;
}
function crumbs() {
  const w = mk("div", "crumbs"), home = mk("button", "mini", "Страница");
  home.onclick = () => { select(null, null); refreshUI(); }; w.append(home);
  if (cur.path) {
    const k = cur.path.split(".");
    const s0 = secOf(cur.path);
    if (s0) { const b = mk("button", "mini", secName(s0)); b.onclick = () => { select(null, s0); refreshUI(); }; w.append(" › ", b); }
    k.forEach((seg, i) => {
      if (k[0] === "sections" && i < 2) return;
      if (i === 0 && s0 && segName(seg) === secName(s0)) return;
      const p = k.slice(0, i + 1).join("."), b = mk("button", "mini", pathName(p));
      b.onclick = () => { select(p); refreshUI(); }; w.append(" › ", b);
    });
  } else if (cur.sec) w.append(" › ", mk("span", "", secName(cur.sec)));
  return w;
}
function buildInspector() {
  const box = $("#insp"), y = box.scrollTop; box.replaceChildren();
  if (cur.path && getPath(data, cur.path) === undefined) cur = {path: null, sec: cur.sec};
  const n = info();
  if (n.t === "none") {
    box.append(mk("h3", "", "Конструктор"));
    const tips = mk("ul", "tips");
    ["Нажмите на любой текст на странице — и правьте его прямо там.",
     "Нажмите на панель, карточку или раздел — здесь появятся его свойства: цвет, файлы, видео, блоки.",
     "Кнопки «＋» на странице добавляют карточки, вопросы, правила, блоки и новые разделы.",
     "Ctrl+Z / Ctrl+Y — отмена и повтор, Ctrl+S — сохранить."].forEach(t => tips.append(mk("li", "", t)));
    const add = mk("button", "wide", "＋ Новый раздел"); add.type = "button"; add.onclick = () => presetMenu(add.getBoundingClientRect());
    box.append(tips, add, backupsEditor());
  } else {
    box.append(crumbs());
    const acts = mk("div", "iacts"); actButtons(acts, true); if (acts.childNodes.length) box.append(acts);
    if (n.t === "sec") {
      const id = n.id, sec = data.sections.find(s => s.id === id);
      box.append(mk("h3", "", secName(id)), secOptions(id));
      if (sec) {
        box.append(fld("Заголовок раздела", txt(sec, "title")));
        const nav = mk("input"); nav.type = "checkbox"; nav.checked = sec.nav; nav.onchange = () => sec.nav = nav.checked;
        const nl = mk("label"); nl.append(nav, " Ссылка на раздел в меню сайта"); box.append(nl, blocksEditor(sec, "blocks"));
      } else (SEC_DATA[id] || []).forEach(key => nodeUI(box, data, key, key));
    } else {
      const p = cur.path, k = p.split("."), key = k[k.length - 1], pp = k.slice(0, -1).join("."), parent = pp ? getPath(data, pp) : data, v = parent[key];
      box.append(mk("h3", "", pathName(p)));
      if (p === "about.gallery") box.append(galleryEditor(parent, key));
      else if (/\.blocks\.\d+$/.test(p) && v && typeof v === "object") { const c = mk("div", "card"); blockBody(c, v); box.append(c); }
      else if (Array.isArray(v)) box.append(list(parent, key, refAt(p), null));
      else if (v && typeof v === "object") { const c = mk("div", "card"); build(c, v, refAt(p), null); box.append(c); }
      else box.append(fld(segName(key), input(parent, key)));
      if (TOP.has(p)) box.append(secOptions(secOf(p)));
    }
  }
  box.scrollTop = y;
}
function blockBody(box, b) {
  if (BFORM[b.type]) BFORM[b.type](box, b);
  const det = mk("details"); det.open = true; det.append(mk("summary", "", "Оформление и размещение"));
  if (STYLED.has(b.type)) det.append(styleRow(b));
  det.append(viewRow(b)); box.append(det);
}
function refreshUI() { normLayout(); buildTree(); buildInspector(); buildToolbar(); markSel(); }

function setMode(m) {
  mode = m;
  document.body.classList.toggle("bm", m === "b");
  $("#builder").hidden = m !== "b"; $("#root").hidden = m === "b";
  document.querySelectorAll("#modes button").forEach(b => b.classList.toggle("on", b.dataset.m === m));
  document.querySelectorAll("#devs button").forEach(b => b.disabled = m !== "b");
  m === "b" ? draw() : drawForm();
}
document.querySelectorAll("#modes button").forEach(b => b.onclick = () => setMode(b.dataset.m));
document.querySelectorAll("#devs button").forEach(b => b.onclick = () => {
  document.querySelectorAll("#devs button").forEach(x => x.classList.toggle("on", x === b));
  $("#frame").style.width = b.dataset.w; setTimeout(placeToolbar, 260);
});
$("#undo").onclick = undo; $("#redo").onclick = redo;
window.addEventListener("resize", placeToolbar);

function draw() {
  if (mode !== "b") return drawForm();
  refreshUI(); renderSite();
}

async function open(user) {
  $("#login").hidden = true; $("#panel").hidden = false; $("#who").textContent = user;
  const [r, rs] = await Promise.all([fetch("/api/content", {cache:"no-store"}), fetch("/api/schema", {cache:"no-store"})]);
  const j = await r.json();
  if (!r.ok) { $("#msg").textContent = j.error || "Ошибка загрузки содержимого"; $("#msg").style.color = "#ff5a64"; return; }
  ORIGINAL = rs.ok ? await rs.json() : j;   // шаблон структуры: по нему «+ Добавить» работает даже в пустых списках
  data = JSON.parse(JSON.stringify(j));
  normLayout(); savedJSON = lastJSON = JSON.stringify(data);
  $("#frame").src = "/?edit=1";   // сайт открывается в режиме правки только после того, как мост window.__builder готов
  setMode("b");
}

async function login() {
  const r = await api("POST", "/api/login", {username:$("#u").value, password:$("#p").value});
  const j = await r.json();
  if (r.ok) open(j.user);
  else $("#err").textContent = j.error || "Ошибка";
}
$("#go").onclick = login;
$("#p").onkeydown = e => { if (e.key === "Enter") login(); };
$("#out").onclick = async () => { await api("POST", "/api/logout"); location.reload(); };
$("#save").onclick = async () => {
  const m = $("#msg"); m.textContent = "Сохраняю…"; m.style.color = "";
  const r = await api("PUT", "/api/content", data), j = await r.json();
  m.textContent = r.ok ? "Сохранено ✓" : (j.error || "Ошибка");
  m.style.color = r.ok ? "#6ee7a0" : "#ff5a64";
  if (r.ok) { savedJSON = JSON.stringify(data); BK_LIST = null; dirtyUI(); }
  if (r.status === 401) location.reload();
};

api("GET", "/api/me").then(async r => { if (r.ok) open((await r.json()).user); });