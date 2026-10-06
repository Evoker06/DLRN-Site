const $ = s => document.querySelector(s);
const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const get = (o, p) => p.split(".").reduce((a, k) => a?.[k], o);
const safeUrl = u => /^(https?:\/\/|\/uploads\/)/.test(u) ? u : "#";
const onlineEl = $("#online"), heroOnlineEl = $("#heroOnline"), toast = $("#toast");
let C, IP = "", lastVer = "";
// Режим конструктора: сайт открыт внутри админки (iframe того же домена) по адресу /?edit=1
const EDIT = (() => { try { return /[?&]edit=1\b/.test(location.search) && window.parent !== window && !!window.parent.__builder; } catch { return false; } })();
const B = EDIT ? window.parent.__builder : null;
// Помечает узел путём к данным (data-p): по нему админка знает, что именно редактируется
const tag = (n, p, k, ml) => { if (EDIT && n && n.nodeType === 1) { n.dataset.p = p; n.dataset.k = k || "text"; if (ml) n.dataset.ml = "1"; } return n; };
const zone = (attr, val, label) => { const z = el("div", "ed-add", label); z.dataset[attr] = val; return z; };
if (EDIT) document.body.classList.add("editing");

function tok(node, text) {
  String(text).split(/(\{ip\}|\{version\})/).forEach(s => {
    if (s === "{ip}") node.append(el("strong", "", IP));
    else if (s === "{version}") node.append(el("strong", "ver", "—"));
    else if (s) node.append(s);
  });
}
function lines(node, text) {
  String(text).split("\n").forEach((l, i) => {
    if (i) node.append(document.createElement("br"));
    node.append(l);
  });
}
function link(cls, url, label) {
  const a = el("a", cls); a.href = safeUrl(url); a.target = "_blank"; a.rel = "noopener";
  a.append(label + " "); a.append(el("span", "", "↗")); return a;
}
function block(title, text, inline, pt, px, pk) {
  const p = el("p"), st = el("strong", "", title); p.append("● ", st);
  if (pt) tag(st, pt);
  if (text || (EDIT && px)) {
    if (inline) p.append(" "); else p.append(document.createElement("br"));
    if (EDIT && px) { const sp = el("span", "", text); tag(sp, px, pk || "text", 1); p.append(sp); }
    else lines(p, text);
  }
  return p;
}

/* ===== Дополнительное содержимое (блоки из админки) ===== */
const FONTS = { serif: 'Georgia, "Times New Roman", serif', mono: 'ui-monospace, Menlo, Consolas, monospace' };
function inline(node, text) {
  String(text).split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*|\[[^\]\n]+\]\((?:https?:\/\/|\/uploads\/)[^)\s]+\))/).forEach((s, i) => {
    if (!s) return;
    if (!(i % 2)) return node.append(s);
    let m;
    if (s.startsWith("**")) node.append(el("strong", "", s.slice(2, -2)));
    else if (s[0] === "*") node.append(el("em", "", s.slice(1, -1)));
    else if ((m = s.match(/^\[([^\]]+)\]\(([^)]+)\)$/))) {
      const a = el("a", "blk-link", m[1]); a.href = safeUrl(m[2]); a.target = "_blank"; a.rel = "noopener"; node.append(a);
    } else node.append(s);
  });
}
function rich(node, text) {
  String(text).split("\n").forEach((l, i) => { if (i) node.append(document.createElement("br")); inline(node, l); });
}
const HEX = /^#[0-9a-f]{6}$/i;
const STYLED = new Set(["heading", "paragraph", "quote", "callout", "ul", "ol", "table", "split"]);
function embedUrl(u) {
  let m;
  if ((m = u.match(/^https?:\/\/(?:www\.|m\.)?youtube\.com\/watch\?(?:[^#]*&)?v=([\w-]{11})/)) ||
      (m = u.match(/^https?:\/\/youtu\.be\/([\w-]{11})/)) ||
      (m = u.match(/^https?:\/\/(?:www\.)?youtube\.com\/(?:embed|shorts)\/([\w-]{11})/)))
    return "https://www.youtube-nocookie.com/embed/" + m[1];
  if ((m = u.match(/^https?:\/\/(?:www\.)?vimeo\.com\/(\d+)/))) return "https://player.vimeo.com/video/" + m[1];
  return "";
}
// Файл рядом с текстом: определяем тип по ссылке, если не указан явно
function guessKind(u) {
  if (!u) return "";
  if (embedUrl(u) || /\.(mp4|webm)(\?|#|$)/i.test(u)) return "video";
  if (/\.(png|jpe?g|gif|webp)(\?|#|$)/i.test(u)) return "image";
  return "file";
}
function mediaEl(b) {
  const u = b.url || "", w = el("div", "split-media");
  if (!u) { if (!EDIT) return null; w.append(el("div", "split-empty", "＋ Выберите файл или видео в панели справа")); return w; }
  const k = b.kind && b.kind !== "auto" ? b.kind : guessKind(u);
  if (k === "video") {
    const e = embedUrl(u);
    if (e) {
      const r = el("div", "blk-ratio"), f = document.createElement("iframe");
      f.src = e; f.title = b.caption || b.title || "Видео"; f.loading = "lazy"; f.allowFullscreen = true;
      f.setAttribute("allow", "fullscreen; picture-in-picture"); f.referrerPolicy = "strict-origin-when-cross-origin";
      r.append(f); w.append(r);
    } else {
      const v = document.createElement("video");
      v.controls = true; v.preload = "metadata"; v.playsInline = true; v.src = safeUrl(u); w.append(v);
    }
  } else if (k === "image") {
    const i = el("img"); i.src = safeUrl(u); i.alt = b.caption || b.title || ""; i.loading = "lazy"; w.append(i);
  } else {
    const a = link("contact-btn", u, "⬇ " + (b.caption || "Файл"));
    if (/^\/uploads\//.test(u)) a.setAttribute("download", "");
    w.append(a); return w;
  }
  if (b.caption) w.append(el("div", "blk-cite", b.caption));
  return w;
}
// Встроенные иконки (рисуются как SVG, красятся цветом текста)
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

// «Витрина»: значок + заголовок + подзаголовок | файл | список преимуществ (как карточка плагина)
function showcaseEl(b) {
  const n = el("div", "blk blk-show" + (b.look === "minimal" ? " look-min" : "") + " va-" + (b.valign === "top" ? "top" : "center"));
  if (HEX.test(b.accent || "")) n.style.setProperty("--ac", b.accent);
  n.style.setProperty("--mw", ["33", "40", "50", "60"].includes(String(b.ratio)) ? b.ratio + "%" : "40%");
  const head = el("div", "show-head");
  if (b.icon) {
    const ic = el("div", "show-icon");
    if (/^(https?:\/\/|\/uploads\/)/.test(b.icon)) { const i = el("img"); i.src = safeUrl(b.icon); i.alt = ""; ic.append(i); }
    else ic.append(iconNode(b.icon));
    head.append(ic);
  }
  const tt = el("div", "show-titles");
  if (b.title) { const h = el("h3", "split-title"); inline(h, b.title); tt.append(h); }
  if (b.subtitle) tt.append(el("div", "show-sub", b.subtitle));
  if (b.text) { const p = el("p"); rich(p, b.text); tt.append(p); }
  head.append(tt); n.append(head);
  const m = mediaEl(b); if (m) n.append(m);
  const pts = (b.points || []).filter(x => x && String(x.text).trim());
  if (pts.length) {
    const ul = el("ul", "show-points");
    pts.forEach(x => { const li = el("li"); const pi = el("span", "pt-ic"); pi.append(iconNode(x.icon || "✓")); li.append(pi); const s = el("span", "pt-tx"); inline(s, x.text); li.append(s); ul.append(li); });
    n.append(ul);
  }
  return n;
}
function blockEl(b) {
  let n;
  switch (b.type) {
    case "heading": n = el("h" + Math.min(6, Math.max(1, +b.level || 2)), "blk"); inline(n, b.text); break;
    case "paragraph": n = el("p", "blk"); rich(n, b.text); break;
    case "quote":
      n = el("blockquote", "blk blk-quote"); const q = el("p"); rich(q, b.text); n.append(q);
      if (b.author) n.append(el("div", "blk-cite", "— " + b.author));
      break;
    case "callout": {
      const v = ["info", "success", "warning", "danger"].includes(b.variant) ? b.variant : "info";
      n = el("div", "blk blk-callout v-" + v);
      if (b.title) n.append(el("strong", "blk-callout-title", b.title));
      const p = el("p"); rich(p, b.text); n.append(p); break;
    }
    case "ul": case "ol":
      n = el(b.type, "blk");
      (b.items || []).filter(x => String(x).trim()).forEach(x => { const li = el("li"); inline(li, x); n.append(li); });
      break;
    case "table": {
      n = el("div", "blk blk-table"); const t = el("table");
      if ((b.header || []).some(Boolean)) {
        const tr = el("tr"); b.header.forEach(c => { const th = el("th"); inline(th, c); tr.append(th); });
        const th = el("thead"); th.append(tr); t.append(th);
      }
      const tb = el("tbody");
      (b.rows || []).forEach(r => { const tr = el("tr"); r.forEach(c => { const td = el("td"); inline(td, c); tr.append(td); }); tb.append(tr); });
      t.append(tb); n.append(t); break;
    }
    case "image": n = el("img", "blk"); n.src = safeUrl(b.url); n.alt = b.alt || ""; n.loading = "lazy"; break;
    case "file": n = link("contact-btn blk", b.url, "⬇ " + (b.label || "Файл"));
      if (/^\/uploads\//.test(b.url)) n.setAttribute("download", ""); break;
    case "link": n = link("contact-btn blk", b.url, b.label || "Ссылка"); break;
    case "video": {
      n = el("figure", "blk blk-video");
      const e = embedUrl(b.url || "");
      if (e) {
        const w = el("div", "blk-ratio"), f = document.createElement("iframe");
        f.src = e; f.title = b.title || "Видео"; f.loading = "lazy"; f.allowFullscreen = true;
        f.setAttribute("allow", "fullscreen; picture-in-picture"); f.referrerPolicy = "strict-origin-when-cross-origin";
        w.append(f); n.append(w);
      } else {
        const v = document.createElement("video");
        v.controls = true; v.preload = "metadata"; v.playsInline = true; v.src = safeUrl(b.url || ""); n.append(v);
      }
      if (b.title) n.append(el("figcaption", "blk-cite", b.title));
      break;
    }
    case "split": {
      if (b.layout === "showcase") { n = showcaseEl(b); break; }
      n = el("div", "blk blk-split side-" + (b.side === "left" ? "left" : "right") + " va-" + (b.valign === "center" ? "center" : "top"));
      n.style.setProperty("--mw", ["33", "40", "50", "60"].includes(String(b.ratio)) ? b.ratio + "%" : "40%");
      const tx = el("div", "split-text");
      if (b.title) { const h = el("h3", "split-title"); inline(h, b.title); tx.append(h); }
      if (b.text) { const p = el("p"); rich(p, b.text); tx.append(p); }
      n.append(tx);
      const m = mediaEl(b); if (m) n.append(m);
      break;
    }
    default: return document.createComment("");
  }
  // оформление и размещение
  if (HEX.test(b.bg || "")) { n.style.backgroundColor = b.bg; n.classList.add("has-bg"); }
  const widthSet = ["75", "50", "33"].includes(String(b.width));
  if (widthSet) n.style.width = b.width + "%";
  const sides = { left: "flex-start", center: "center", right: "flex-end" };
  if (sides[b.align]) {
    n.style.textAlign = b.align;
    if (widthSet || ["image", "video", "file", "link"].includes(b.type)) n.style.alignSelf = sides[b.align];
  } else if (widthSet) n.style.alignSelf = "flex-start";
  if (STYLED.has(b.type)) {
    if (FONTS[b.font]) n.style.fontFamily = FONTS[b.font];
    if (/^\d{2}$/.test(b.size)) n.style.fontSize = b.size + "px";
    if (HEX.test(b.color || "")) { n.style.setProperty("--bc", b.color); n.classList.add("has-color"); }
  }
  return n;
}
// Вставка блоков: top/bottom — [узел, способ вставки] для блоков «над» и «под» основным содержимым.
// bpath — путь к массиву блоков в данных (нужен конструктору)
function putAt(blocks, top, bottom, bpath) {
  if (!Array.isArray(blocks)) return;
  [[top, "top"], [bottom, "bottom"]].forEach(([at, pos]) => {
    if (!at || !at[0]) return;
    const list = blocks.map((b, idx) => [b, idx]).filter(([b]) => (b.pos === "top" ? "top" : "bottom") === pos);
    if (!list.length && !(EDIT && pos === "bottom")) return;
    const d = el("div", "blocks" + (pos === "top" ? " blocks-top" : ""));
    list.forEach(([b, idx]) => { try { d.append(tag(blockEl(b), bpath + "." + idx, "block")); } catch (e) { console.error(e); } });
    if (EDIT && pos === "bottom") d.append(zone("addblk", bpath, "＋ Добавить блок"));
    at[0][at[1]](d);
  });
}
// Плашка про проходку в блоке «Присоединиться» (C.join.notice); все поля пустые — плашки нет
function renderNotice() {
  const n = C.join.notice, p = $(".join-inner p");
  if (!p || !n || !(n.title || n.text || n.buttonLabel)) return;
  const box = el("div", "join-notice"); box.dataset.gen = "1";
  const body = el("div", "jn-body");
  if (n.title) body.append(tag(el("strong", "", n.title), "join.notice.title"));
  if (n.text) body.append(tag(el("span", "", n.text), "join.notice.text", "text", true));
  box.append(body);
  if (n.buttonLabel && n.buttonUrl) box.append(link("btn btn-primary jn-btn", n.buttonUrl, n.buttonLabel));
  tag(box, "join.notice", "item");
  p.after(box);
}
// ===== Лента фотографий под «О проекте» (C.about.gallery): автоматически листается =====
let galTimer = null, galResize = null;
function galView(g) {
  const w = innerWidth, auto = w > 1000 ? 3 : w > 640 ? 2 : 1, want = g.visible === "auto" ? auto : +g.visible;
  return Math.max(1, Math.min(want, w <= 640 ? 1 : w <= 900 ? 2 : 4));
}
function lightbox(items, start) {
  let i = start;
  const ov = el("div", "gal-lb"), im = el("img"), cap = el("div", "gal-lbcap");
  const close = () => { ov.remove(); document.removeEventListener("keydown", key); };
  const show = () => { im.src = safeUrl(items[i].url); im.alt = items[i].caption || ""; cap.textContent = items[i].caption || ""; };
  const step = d => { i = (i + d + items.length) % items.length; show(); };
  const key = e => { if (e.key === "Escape") close(); else if (e.key === "ArrowRight") step(1); else if (e.key === "ArrowLeft") step(-1); };
  const nb = (t, d, c) => { const b = el("button", "gal-lbn " + c, t); b.type = "button"; b.setAttribute("aria-label", d > 0 ? "Следующее фото" : "Предыдущее фото"); b.onclick = e => { e.stopPropagation(); step(d); }; return b; };
  ov.onclick = close; im.onclick = e => e.stopPropagation();
  ov.append(im, cap);
  if (items.length > 1) ov.append(nb("‹", -1, "l"), nb("›", 1, "r"));
  const x = el("button", "gal-lbx", "✕"); x.type = "button"; x.setAttribute("aria-label", "Закрыть"); x.onclick = close; ov.append(x);
  document.addEventListener("keydown", key); document.body.append(ov); show();
}
function buildGallery(wrap, g, v) {
  wrap.replaceChildren();
  clearInterval(galTimer);
  const items = g.items, n = items.length, loop = n > v;
  const view = el("div", "gal-view"), track = el("div", "gal-track");
  const slide = (it, idx, clone) => {
    const s = el("figure", "gal-slide" + (clone ? " gal-clone" : "")), im = el("img");
    im.src = safeUrl(it.url); im.alt = it.caption || ""; im.loading = "lazy"; im.decoding = "async"; im.draggable = false;
    if (g.fit === "contain") im.classList.add("contain");
    s.append(im);
    if (g.captions !== "hide" && it.caption) s.append(el("figcaption", "", it.caption));
    if (!EDIT) { s.tabIndex = 0; s.setAttribute("role", "button"); const open = () => lightbox(items, idx); s.onclick = open; s.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } }; }
    return s;
  };
  items.forEach((it, i) => track.append(slide(it, i, false)));
  if (loop) items.slice(0, v).forEach((it, i) => track.append(slide(it, i, true)));   // копии в конце — для бесшовного круга
  view.append(track); wrap.append(view);
  wrap.style.setProperty("--v", v);
  let pos = 0, busy = false;
  const dots = el("div", "gal-dots");
  const step = () => (track.children[0] ? track.children[0].getBoundingClientRect().width : 0) + parseFloat(getComputedStyle(track).columnGap || 0);
  const place = (anim) => {
    track.style.transition = anim ? "" : "none";
    track.style.transform = `translateX(${-pos * step()}px)`;
    [...dots.children].forEach((d, i) => d.classList.toggle("on", i === pos % n));
    if (!anim) void track.offsetWidth;
  };
  const go = d => {
    if (!loop || busy) return;
    if (d < 0 && pos === 0) { pos = n; place(false); }
    pos += d; busy = true; place(true);
  };
  track.addEventListener("transitionend", e => { if (e.target !== track) return; busy = false; if (pos >= n) { pos = 0; place(false); } });
  if (loop) {
    const mkb = (t, d, c) => { const b = el("button", "gal-nav " + c, t); b.type = "button"; b.setAttribute("aria-label", d > 0 ? "Следующее фото" : "Предыдущее фото"); b.onclick = () => { go(d); restart(); }; return b; };
    wrap.append(mkb("‹", -1, "prev"), mkb("›", 1, "next"));
    if (n <= 14) for (let i = 0; i < n; i++) { const d = el("button", "gal-dot"); d.type = "button"; d.setAttribute("aria-label", "Фото " + (i + 1)); d.onclick = () => { if (busy) return; pos = i; busy = true; place(true); restart(); }; dots.append(d); }
    wrap.append(dots);
  }
  place(false);
  const sec = Math.max(2, +g.interval || 4) * 1000;
  let hold = false;
  function restart() { clearInterval(galTimer); if (loop && !EDIT) galTimer = setInterval(() => { if (!hold && !document.hidden) go(1); }, sec); }
  wrap.onmouseenter = () => hold = true; wrap.onmouseleave = () => hold = false;
  wrap.onfocusin = () => hold = true; wrap.onfocusout = () => hold = false;
  let x0 = null;
  view.addEventListener("touchstart", e => { x0 = e.touches[0].clientX; hold = true; }, { passive: true });
  view.addEventListener("touchend", e => { if (x0 != null) { const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) { go(dx < 0 ? 1 : -1); restart(); } } x0 = null; hold = false; }, { passive: true });
  restart();
}
function renderGallery() {
  clearInterval(galTimer); window.removeEventListener("resize", galResize);
  const g = C.about.gallery, host = $("#socials");
  if (!host || !g) return;
  const has = g.items && g.items.length;
  if (!has && !EDIT) return;
  const wrap = el("div", "gal"); wrap.dataset.gen = "1";
  if (!has) { const e = el("div", "gal-empty", "＋ Здесь будет лента фотографий — загрузите фото в панели справа"); wrap.append(e); tag(wrap, "about.gallery", "item"); host.after(wrap); return; }
  let v = galView(g);
  buildGallery(wrap, g, v); tag(wrap, "about.gallery", "item"); host.after(wrap);
  galResize = () => { clearTimeout(galResize.t); galResize.t = setTimeout(() => { v = galView(g); buildGallery(wrap, g, v); }, 250); };
  window.addEventListener("resize", galResize);
}
function renderBlocks() {
  putAt(C.hero.blocks, [$(".hero-copy"), "prepend"], [$(".hero-text"), "after"], "hero.blocks");
  putAt(C.about.blocks, [$("#aboutText"), "prepend"], [$("#aboutText"), "append"], "about.blocks");
  putAt(C.features.blocks, [$("#features h2"), "after"], [$("#features"), "append"], "features.blocks");
  putAt(C.join.blocks, [$(".join-inner p"), "before"], [$(".join-inner p"), "after"], "join.blocks");
  putAt(C.rules.discord.blocks, [$("#discordRules h3"), "after"], [$("#discordRules"), "append"], "rules.discord.blocks");
  putAt(C.rules.minecraft.blocks, [$("#mcRules h3"), "after"], [$("#mcRules"), "append"], "rules.minecraft.blocks");
  putAt(C.rules.blocks, [$("#rules h2"), "after"], [$("#warning"), "before"], "rules.blocks");
  putAt(C.faq.blocks, [$("#faq h2"), "after"], [$("#faq"), "append"], "faq.blocks");
  putAt(C.footer.blocks, [$(".footer-main p"), "before"], [$(".footer-main p"), "after"], "footer.blocks");
}
// Порядок, видимость и цвета разделов + собственные разделы
const SECTION_SEL = { hero: ".hero", stats: ".stats", project: "#project", features: "#features", join: "#join", rules: "#rules", faq: "#faq" };
function applyLayout() {
  const main = $("main"), L = C.layout || {}, hidden = new Set(L.hidden || []), custom = {};
  (C.sections || []).forEach((s, si) => {
    const sec = el("section", "section custom-section"), body = el("div", "custom-body"), sp = `sections.${si}`;
    sec.id = s.id;
    if (s.title || EDIT) sec.append(tag(el("h2", "", s.title), sp + ".title"));
    sec.append(body); putAt(s.blocks, [body, "append"], [body, "append"], sp + ".blocks");
    if (HEX.test(s.bg || "")) sec.style.backgroundColor = s.bg;
    if (s.nav && s.title) {
      const a = el("a", "", s.title); a.href = "#" + s.id; a.dataset.gen = "1";
      a.addEventListener("click", () => document.getElementById("nav").classList.remove("open"));
      document.getElementById("nav").append(a);
    }
    custom[s.id] = sec;
  });
  const secEl = id => SECTION_SEL[id] ? $(SECTION_SEL[id]) : custom[id];
  (L.order || []).forEach(id => {
    const e = secEl(id);
    if (!e) return;
    main.append(e);
    if (EDIT) e.dataset.sec = id;
    if (HEX.test(L.colors?.[id] || "")) e.style.backgroundColor = L.colors[id];
  });
  hidden.forEach(id => {
    const e = secEl(id);
    if (e) { if (EDIT) e.classList.add("ed-hidden"); else e.style.display = "none"; }
    document.querySelectorAll(`#nav a[href="#${id}"], .footer-links a[href="#${id}"]`).forEach(a => a.style.display = "none");
  });
  if (EDIT) $("footer").dataset.sec = "footer";
  if (HEX.test(L.colors?.footer || "")) $("footer").style.backgroundColor = L.colors.footer;
}

// Подписи интерфейса (меню, кнопки, статистика), редактируются в админке: C.ui
function setText(e, t) {
  if (!e || typeof t !== "string") return;
  const n = [...e.childNodes].find(x => x.nodeType === 3 && x.textContent.trim());
  if (n) n.textContent = t + (/\s$/.test(n.textContent) ? " " : "");
  else e.prepend(t);
}
function applyUi() {
  const u = C.ui; if (!u) return;
  const all = sel => [...document.querySelectorAll(sel)];
  const ts = (e, k) => { setText(e, u[k]); tag(e, "ui." + k, "field"); };
  ["navHome", "navProject", "navFeatures", "navRules", "navFaq"].forEach((k, i) => ts(all("#nav a")[i], k));
  ts($(".discord-btn"), "headerPlay");
  ts($(".hero-actions .btn-primary"), "heroPlay"); ts($(".hero-actions .btn-ghost"), "heroMore");
  ts($(".server-mini small"), "heroIpLabel"); ts($(".hero-badge small"), "heroOnline");
  const st = all(".stat");
  ts(st[0]?.querySelector("span"), "statOnline");
  ts(st[1]?.querySelector("strong"), "statUptimeValue"); ts(st[1]?.querySelector("span"), "statUptime");
  ts(st[2]?.querySelector("span"), "statVersion");
  ts(st[3]?.querySelector("strong"), "statMoreValue"); ts(st[3]?.querySelector("span"), "statMore");
  [["#project", "labelProject"], ["#features", "labelFeatures"], ["#join", "labelJoin"], ["#rules", "labelRules"], ["#faq", "labelFaq"]]
    .forEach(([sel, k]) => ts($(sel + " .section-label"), k));
  ts($(".join-box > span"), "joinIpLabel"); ts($("#copyJoin"), "joinCopy");
  ["footerRules", "footerFaq", "footerPlay"].forEach((k, i) => ts(all(".footer-links a")[i], k));
  if (typeof u.msgCopied === "string") toast.textContent = u.msgCopied;
}

function render() {
  document.title = C.site.title;
  IP = C.site.ip;
  document.querySelectorAll("[data-t]").forEach(e => { e.textContent = get(C, e.dataset.t) ?? ""; tag(e, e.dataset.t); });
  const br = () => document.createElement("br");

  $("#aboutText").replaceChildren(...C.about.paragraphs.map((t, i) => tag(el("p", "", t), `about.paragraphs.${i}`, "text", 1)));

  $("#socials").replaceChildren(...C.socials.map((s, i) => {
    const a = el("a", "social-link"), sp = `socials.${i}`;
    a.href = safeUrl(s.url); a.target = "_blank"; a.rel = "noopener";
    const l = el("span");
    l.append(tag(el("b", "", s.name), sp + ".name"), tag(el("small", "", s.desc), sp + ".desc"));
    a.append(l, el("span", "", "↗"));
    return tag(a, sp, "item");
  }));

  $("#cards").replaceChildren(...C.features.items.map((f, i) => {
    const c = el("article", "feature-card"), fp = `features.items.${i}`;
    c.append(tag(el("div", "icon", f.icon), fp + ".icon"), tag(el("h3", "", f.title), fp + ".title"), tag(el("p", "", f.text), fp + ".text", "text", 1));
    if (HEX.test(f.bg || "")) c.style.backgroundColor = f.bg;
    putAt(f.blocks, [c, "prepend"], [c, "append"], fp + ".blocks");
    return tag(c, fp, "item");
  }));

  const d = C.rules.discord, dr = $("#discordRules");
  dr.replaceChildren(tag(el("h3", "", d.title), "rules.discord.title"),
    ...d.items.map((it, i) => { const ip = `rules.discord.items.${i}`; return tag(block(it.title, it.text, it.inline, ip + ".title", ip + ".text"), ip, "item"); }));
  tag(dr, "rules.discord", "item");

  const m = C.rules.minecraft, mr = $("#mcRules"), basic = el("p"), mp = "rules.minecraft";
  m.basic.forEach((t, i) => {
    if (i) basic.append(br());
    basic.append("● ", tag(el("strong", "", t), `${mp}.basic.${i}`));
  });
  const det = el("details", "mods-details"), sum = el("summary"), ol = el("ol", "mods-list");
  sum.append(m.mods.listLabel + " ", el("span", "", "+")); tag(sum, mp + ".mods.listLabel", "field");
  m.mods.list.forEach((x, i) => {
    const li = el("li"); li.append(tag(el("b", "", x.name), `${mp}.mods.list.${i}.name`));
    if (x.note) li.append(" — " + x.note);
    ol.append(tag(li, `${mp}.mods.list.${i}`, "item"));
  });
  det.append(sum, ol); if (EDIT) det.open = true;
  const bugs = block(m.bugs.title, m.bugs.text, false, mp + ".bugs.title", mp + ".bugs.text");
  bugs.append(" ", link("contact-btn rules-btn", m.bugs.buttonUrl, m.bugs.buttonLabel));
  const farms = block(m.farms.title, EDIT ? m.farms.items.join("\n") : m.farms.items.join("\n"), false, mp + ".farms.title", mp + ".farms.items", "lines");
  mr.replaceChildren(tag(el("h3", "", m.title), mp + ".title"), basic,
    block(m.mods.title, m.mods.text, false, mp + ".mods.title", mp + ".mods.text"), det, bugs,
    block(m.chat.title, m.chat.text, false, mp + ".chat.title", mp + ".chat.text"), farms);
  tag(mr, mp, "item");

  $("#warning").replaceChildren(...C.rules.warning.map((t, i) => {
    const dv = el("div"); dv.append("−  ", tag(el("span", "", t), `rules.warning.${i}`)); return dv;
  }));

  // «Главные контейнеры» правил: скрытие, цвет и дополнительные контейнеры
  [[dr, d], [mr, m]].forEach(([box, g]) => {
    box.style.display = g.hidden && !EDIT ? "none" : "";
    box.classList.toggle("ed-hidden", !!g.hidden && EDIT);
    const hb = HEX.test(g.bg || "");
    box.style.backgroundColor = hb ? g.bg : ""; box.classList.toggle("has-bg", hb);
  });
  $("#warning").before(...(C.rules.groups || []).map((g, gi) => {
    const gp = `rules.groups.${gi}`, box = el("div", "rules-block extra-rules");
    box.append(tag(el("h3", "", g.title), gp + ".title"),
      ...(g.items || []).map((it, i) => tag(block(it.title, it.text, it.inline, `${gp}.items.${i}.title`, `${gp}.items.${i}.text`), `${gp}.items.${i}`, "item")));
    if (HEX.test(g.bg || "")) { box.style.backgroundColor = g.bg; box.classList.add("has-bg"); }
    putAt(g.blocks, [box, "append"], [box, "append"], gp + ".blocks");
    return tag(box, gp, "item");
  }));

  $("#faqList").replaceChildren(...C.faq.items.map((it, i) => {
    const fp = `faq.items.${i}`, dt = el("details"); if (i === 0 || EDIT) dt.open = true;
    const sm = el("summary"); sm.append(it.q, el("span", "", "+")); tag(sm, fp + ".q", "field"); dt.append(sm);
    if (EDIT) { const p = el("p", "", it.a || ""); tag(p, fp + ".a", "text", 1); dt.append(p); }
    else if (it.a) { const p = el("p"); tok(p, it.a); dt.append(p); }
    if (it.buttons && it.buttons.length) {
      const b = el("div", "contact-buttons");
      it.buttons.forEach(x => b.append(link("contact-btn", x.url, x.label)));
      dt.append(b);
    }
    if (HEX.test(it.bg || "")) dt.style.backgroundColor = it.bg;
    putAt(it.blocks, [sm, "after"], [dt, "append"], fp + ".blocks");
    return tag(dt, fp, "item");
  }));
}

// Полная перерисовка из данных (используется и конструктором для живого предпросмотра)
function renderAll(c) {
  C = c;
  document.querySelectorAll(".blocks, .extra-rules, .custom-section, .ed-add, [data-gen]").forEach(e => e.remove());
  document.querySelectorAll("#nav a, .footer-links a").forEach(a => a.style.display = "");
  Object.values(SECTION_SEL).forEach(q => { const e = $(q); if (e) { e.style.display = ""; e.style.backgroundColor = ""; e.classList.remove("ed-hidden"); } });
  $("footer").style.backgroundColor = "";
  render(); applyUi(); renderBlocks(); renderNotice(); renderGallery(); applyLayout();
  if (EDIT) {
    const z = (host, how, attr, val, label) => { if (host) host[how](zone(attr, val, label)); };
    z($("#cards"), "after", "additem", "features.items", "＋ Добавить карточку");
    z($("#socials"), "after", "additem", "socials", "＋ Добавить соцсеть");
    z($("#faqList"), "after", "additem", "faq.items", "＋ Добавить вопрос");
    z($("#discordRules"), "append", "additem", "rules.discord.items", "＋ Добавить правило");
    z($("#warning"), "before", "additem", "rules.groups", "＋ Добавить контейнер правил");
    z($("main"), "append", "additem", "sections", "＋ Новый раздел");
  }
  if (lastVer) setVersion(lastVer);
}

function setOnline(n) { onlineEl.textContent = n; heroOnlineEl.textContent = n; }
function cleanVersion(value) {
  if (!value) return "—";
  const matches = String(value).trim().match(/\b\d+(?:\.\d+){1,3}\b/g);
  return matches?.[matches.length - 1] || String(value).trim();
}
function setVersion(value) {
  lastVer = value;
  const v = cleanVersion(value);
  document.querySelectorAll(".ver").forEach(e => e.textContent = v);
}
async function fetchStatus() {
  try {
    const r = await fetch(`https://api.mcsrvstat.us/3/${encodeURIComponent(IP)}`, { cache: "no-store" });
    if (!r.ok) throw 0;
    const data = await r.json();
    setOnline(data.online ? (data.players?.online ?? 0) : 0);
    setVersion(data.version);
  } catch { setOnline("—"); setVersion("—"); }
}

async function copyIP() {
  try { await navigator.clipboard.writeText(IP); }
  catch {
    const a = document.createElement("textarea"); a.value = IP;
    document.body.appendChild(a); a.select(); document.execCommand("copy"); a.remove();
  }
  toast.classList.add("show"); setTimeout(() => toast.classList.remove("show"), 1800);
}
$("#copyIp").addEventListener("click", copyIP);
$("#copyJoin").addEventListener("click", () => {
  copyIP();
  $("#copyMessage").textContent = C?.ui?.msgCopiedShort ?? "Скопировано!";
  setTimeout(() => $("#copyMessage").textContent = "", 1800);
});

fetch("/api/content", { cache: "no-store" })
  .then(async r => {
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || ("HTTP " + r.status));
    return j;
  })
  .then(c => {
    renderAll(c);
    fetchStatus();
    setInterval(fetchStatus, 30000);
    if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
    if (EDIT) { window.__renderAll = renderAll; initEdit(); B.siteReady(window); }
  })
  .catch(err => {
    console.error(err);
    const box = document.createElement("div");
    box.style.cssText = "position:fixed;top:0;left:0;right:0;background:#2a1215;color:#ff6b6b;padding:10px 16px;font:14px/1.4 Inter,Arial,sans-serif;z-index:999;text-align:center";
    box.textContent = "Не удалось загрузить содержимое сайта (" + (err.message || err) + "). Проверьте, что запущен server.js.";
    document.body.appendChild(box);
  });

const menuBtn = document.getElementById("menuBtn");
const nav = document.getElementById("nav");
menuBtn.addEventListener("click", () => nav.classList.toggle("open"));
nav.querySelectorAll("a").forEach(a => a.addEventListener("click", () => nav.classList.remove("open")));

const topBtn = document.getElementById("topBtn");
window.addEventListener("scroll", () => topBtn.classList.toggle("show", scrollY > 500));
topBtn.addEventListener("click", () => scrollTo({ top: 0, behavior: "smooth" }));

const head = document.getElementById("minecraftHead");
const headSpeech = document.getElementById("headSpeech");
let typingTimer;
head.addEventListener("click", () => {
  clearInterval(typingTimer);
  headSpeech.textContent = "";
  headSpeech.classList.add("show");
  let index = 0;
  const phrase = C?.hero?.headPhrase || "";
  typingTimer = setInterval(() => {
    headSpeech.textContent = phrase.slice(0, index++);
    if (index > phrase.length) {
      clearInterval(typingTimer);
      setTimeout(() => headSpeech.classList.remove("show"), 3500);
    }
  }, 55);
});

/* ===== Режим конструктора: клики по тексту и панелям, правка прямо на странице ===== */
function initEdit() {
  const CE = (() => { const t = document.createElement("div"); try { t.contentEditable = "plaintext-only"; } catch {} return t.contentEditable === "plaintext-only" ? "plaintext-only" : "true"; })();
  const read = n => n.innerText.replace(/\n+$/, "");
  function caret(x, y, n) {
    let r = null;
    if (document.caretRangeFromPoint) r = document.caretRangeFromPoint(x, y);
    else if (document.caretPositionFromPoint) { const c = document.caretPositionFromPoint(x, y); if (c) { r = document.createRange(); r.setStart(c.offsetNode, c.offset); } }
    const sel = getSelection(); sel.removeAllRanges();
    if (r && n.contains(r.startContainer)) { r.collapse(true); sel.addRange(r); }
    else { const rr = document.createRange(); rr.selectNodeContents(n); rr.collapse(false); sel.addRange(rr); }
  }
  const onInput = e => B.text(e.currentTarget.dataset.p, read(e.currentTarget), e.currentTarget.dataset.k);
  const onKey = e => {
    const n = e.currentTarget;
    if (e.key === "Escape") { n.blur(); return; }
    if (e.key === "Enter" && !e.shiftKey) {
      const multi = n.tagName === "P" || n.dataset.ml === "1" || n.dataset.k === "lines" || n.innerText.includes("\n");
      if (!multi) { e.preventDefault(); n.blur(); }
    }
  };
  const onPaste = e => { if (CE === "true") { e.preventDefault(); document.execCommand("insertText", false, (e.clipboardData || window.clipboardData).getData("text")); } };
  function startEdit(n, x, y) {
    if (n.isContentEditable) return;
    n.contentEditable = CE;
    n.addEventListener("input", onInput); n.addEventListener("keydown", onKey); n.addEventListener("paste", onPaste);
    n.addEventListener("blur", () => {
      n.removeAttribute("contenteditable");
      n.removeEventListener("input", onInput); n.removeEventListener("keydown", onKey); n.removeEventListener("paste", onPaste);
      B.textDone();
    }, { once: true });
    n.focus(); caret(x, y, n);
  }
  document.addEventListener("click", e => {
    if (e.target.closest("[contenteditable]")) return;
    e.preventDefault(); e.stopPropagation();
    const z = e.target.closest(".ed-add");
    if (z) { if (z.dataset.addblk) B.addBlk(z.dataset.addblk); else B.addItem(z.dataset.additem); return; }
    const n = e.target.closest("[data-p]"), s = e.target.closest("[data-sec]");
    if (n && n.dataset.k === "text") startEdit(n, e.clientX, e.clientY);
    B.pick(n ? n.dataset.p : null, n ? n.dataset.k : null, s ? s.dataset.sec : null);
  }, true);
  document.addEventListener("submit", e => e.preventDefault(), true);
  window.addEventListener("scroll", () => B.moved(), { passive: true });
  window.addEventListener("resize", () => B.moved());
}
