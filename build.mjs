// JANAPAINT — build script (no dependencies).
// Reads /posts/*.md and generates the full site into /dist:
//   /index.html  (generator + latest posts)
//   /blog/index.html, /blog/<slug>/index.html
//   /sitemap.xml, /robots.txt, /blog/feed.xml, /blog/og/<slug>.png
// Run: node build.mjs

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const CFG = JSON.parse(fs.readFileSync(path.join(ROOT, "site.config.json"), "utf8"));
const SITE = CFG.url.replace(/\/$/, "");
const DIST = path.join(ROOT, "dist");
const TODAY = new Date().toISOString().slice(0, 10);

/* ---------- helpers ---------- */
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const write = (p, c) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, c); };
const copyDir = (a, b) => { fs.mkdirSync(b, { recursive: true }); for (const f of fs.readdirSync(a)) { const s = path.join(a, f), d = path.join(b, f); fs.statSync(s).isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d); } };
const fmtDate = d => new Date(d + "T12:00:00Z").toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const slugify = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/* ---------- images ---------- */
// Reads width/height from PNG, JPEG or WebP files in /public so the page doesn't jump while loading.
function imgSize(src) {
  try {
    if (!src.startsWith("/")) return null;
    const b = fs.readFileSync(path.join(ROOT, "public", src));
    if (b.readUInt32BE(0) === 0x89504e47) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
    if (b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") {
      const t = b.toString("ascii", 12, 16);
      if (t === "VP8 ") return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
      if (t === "VP8L") { const n = b.readUInt32LE(21); return { w: (n & 0x3fff) + 1, h: ((n >> 14) & 0x3fff) + 1 }; }
      if (t === "VP8X") return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
    }
    if (b[0] === 0xff && b[1] === 0xd8) {
      let i = 2;
      while (i < b.length) {
        if (b[i] !== 0xff) { i++; continue; }
        const m = b[i + 1], len = b.readUInt16BE(i + 2);
        if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
        i += 2 + len;
      }
    }
  } catch (e) {}
  return null;
}
function imgTag(src, alt, eager) {
  const s = imgSize(src);
  if (src.startsWith("/") && !s) throw new Error(`No encuentro la imagen ${src} (debe estar en public${src})`);
  return `<img src="${esc(src)}" alt="${esc(alt)}"${s ? ` width="${s.w}" height="${s.h}"` : ""} ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
}

/* ---------- palette block ---------- */
function paletteBlock(title, cols) {
  if (cols.length < 2 || cols.length > 6 || !cols.every(c => /^#[0-9A-F]{6}$/.test(c))) throw new Error(`Paleta mal escrita: ${title}`);
  const lum = h => { const [r, g, b] = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4); return .2126 * r + .7152 * g + .0722 * b; };
  const link = cols.length === 5 ? `<a class="pal-open" href="/#p=${cols.map(c => c.slice(1)).join("-")}">Abrir en el generador →</a>` : "";
  return `<figure class="pal">
  <div class="pal-row">${cols.map(c => `<button type="button" class="pal-sw" data-hex="${c}" style="background:${c};color:${lum(c) > .179 ? "#111" : "#fff"}" title="Copiar ${c}"><span>${c}</span></button>`).join("")}</div>
  <figcaption><strong>${inline(title)}</strong>${link}</figcaption>
</figure>`;
}

/* ---------- tiny markdown ---------- */
function inline(s) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\[(.+?)\]\((.+?)\)/g, (m, t, u) => {
      const ext = /^https?:\/\//.test(u) && !u.startsWith(SITE);
      return `<a href="${u}"${ext ? ' target="_blank" rel="noopener"' : ""}>${t}</a>`;
    });
}
function markdown(md) {
  const out = []; let list = null, para = [];
  const flushP = () => { if (para.length) { out.push(`<p>${inline(para.join(" "))}</p>`); para = []; } };
  const flushL = () => { if (list) { out.push(`<${list.t}>${list.items.map(i => `<li>${inline(i)}</li>`).join("")}</${list.t}>`); list = null; } };
  for (const raw of md.split(/\r?\n/)) {
    const line = raw.trim();
    let m;
    if (!line) { flushP(); flushL(); continue; }
    // [[paleta: Título | #A1B2C3,#...(5)]]
    if ((m = line.match(/^\[\[paleta:\s*(.+?)\s*\|\s*([#0-9A-Fa-f,\s]+)\]\]$/))) { flushP(); flushL(); out.push(paletteBlock(m[1], m[2].split(",").map(s => s.trim().toUpperCase()))); continue; }
    // ![texto alternativo](/blog/img/foto.webp "Pie de foto")
    if ((m = line.match(/^!\[(.*?)\]\((\S+?)(?:\s+"(.*)")?\)$/))) { flushP(); flushL(); out.push(`<figure>${imgTag(m[2], m[1])}${m[3] ? `<figcaption>${inline(m[3])}</figcaption>` : ""}</figure>`); continue; }
    if ((m = line.match(/^(#{2,4})\s+(.*)/))) { flushP(); flushL(); const n = m[1].length; out.push(`<h${n} id="${slugify(m[2])}">${inline(m[2])}</h${n}>`); continue; }
    if ((m = line.match(/^[-*]\s+(.*)/))) { flushP(); if (!list || list.t !== "ul") { flushL(); list = { t: "ul", items: [] }; } list.items.push(m[1]); continue; }
    if ((m = line.match(/^\d+[.)]\s+(.*)/))) { flushP(); if (!list || list.t !== "ol") { flushL(); list = { t: "ol", items: [] }; } list.items.push(m[1]); continue; }
    if ((m = line.match(/^>\s?(.*)/))) { flushP(); flushL(); out.push(`<blockquote>${inline(m[1])}</blockquote>`); continue; }
    flushL(); para.push(line);
  }
  flushP(); flushL();
  return out.join("\n");
}

/* ---------- posts ---------- */
function parsePost(file) {
  const src = fs.readFileSync(file, "utf8");
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) throw new Error(`Falta la cabecera --- en ${file}`);
  const meta = {};
  for (const l of m[1].split(/\r?\n/)) {
    const i = l.indexOf(":"); if (i < 0) continue;
    const k = l.slice(0, i).trim(); let v = l.slice(i + 1).trim();
    if (v.startsWith("[")) v = JSON.parse(v); else v = v.replace(/^["']|["']$/g, "");
    meta[k] = v;
  }
  const need = ["title", "description", "date", "tag", "colors"];
  for (const k of need) if (!meta[k]) throw new Error(`Falta "${k}" en ${path.basename(file)}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.date)) throw new Error(`Fecha inválida en ${path.basename(file)} (usa AAAA-MM-DD)`);
  if (!Array.isArray(meta.colors) || meta.colors.length !== 5 || !meta.colors.every(c => /^#[0-9A-Fa-f]{6}$/.test(c))) throw new Error(`"colors" debe tener 5 códigos HEX en ${path.basename(file)}`);
  const words = m[2].split(/\s+/).filter(Boolean).length;
  return {
    ...meta,
    colors: meta.colors.map(c => c.toUpperCase()),
    slug: meta.slug || path.basename(file, ".md"),
    draft: meta.draft === "true",
    html: markdown(m[2]),
    min: Math.max(2, Math.round(words / 200)),
    words,
  };
}
const all = fs.readdirSync(path.join(ROOT, "posts")).filter(f => f.endsWith(".md")).map(f => parsePost(path.join(ROOT, "posts", f)));
// Drafts and future-dated posts are not published (lets you schedule posts ahead).
const posts = all.filter(p => !p.draft && p.date <= TODAY).sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
const slugs = new Set(); for (const p of posts) { if (slugs.has(p.slug)) throw new Error(`Slug repetido: ${p.slug}`); slugs.add(p.slug); }

/* ---------- palette OG images (PNG, built with zlib) ---------- */
function crcTable() { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; }
const CRC = crcTable();
const crc32 = b => { let c = 0xffffffff; for (const x of b) c = CRC[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, c]); }
function palettePNG(colors, W = 1200, H = 630) {
  const rgb = colors.map(h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)));
  const row = Buffer.alloc(1 + W * 3);
  for (let x = 0; x < W; x++) { const c = rgb[Math.min(4, Math.floor(x / (W / 5)))]; row[1 + x * 3] = c[0]; row[2 + x * 3] = c[1]; row[3 + x * 3] = c[2]; }
  const raw = Buffer.concat(Array.from({ length: H }, () => row));
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

/* ---------- shared HTML ---------- */
const HEAD_COMMON = `<meta name="theme-color" content="#ffffff">
<link rel="icon" type="image/png" href="/assets/favicon.png">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<meta property="og:site_name" content="JANAPAINT">
<meta property="og:locale" content="es_ES">
<meta name="twitter:card" content="summary_large_image">
<script>window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments)};</script>
<script defer src="/_vercel/insights/script.js"></script>${CFG.googleVerification ? `\n<meta name="google-site-verification" content="${esc(CFG.googleVerification)}">` : ""}`;
const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&family=DM+Mono:wght@500&display=swap" rel="stylesheet">`;
const cover = (cs, p) => p && p.image ? `<div class="cover img">${imgTag(p.image, p.imageAlt || p.title)}</div>` : `<div class="cover">${cs.map(c => `<span style="background:${c}"></span>`).join("")}</div>`;
const card = p => `<a class="post" href="/blog/${p.slug}/">
        ${cover(p.colors, p)}
        <h3>${esc(p.title)}</h3>
        <p>${esc(p.description)}</p>
        <span class="tag">${esc(p.tag)}</span> <span class="by">· ${fmtDate(p.date)} · ${p.min} min</span>
      </a>`;
const featured = p => p ? `<a class="featured" href="/blog/${p.slug}/">
        ${cover(p.colors, p)}
        <div>
          <span class="latest">ÚLTIMO</span><span class="tag">${esc(p.tag)}</span>
          <h3>${esc(p.title)}</h3>
          <p>${esc(p.description)}</p>
          <span class="by">${fmtDate(p.date)} · ${p.min} min de lectura</span>
        </div>
      </a>` : `<p class="by">Pronto publicaremos el primer artículo.</p>`;
const header = `<header><div class="wrap bar">
  <a class="brand" href="/" aria-label="JANAPAINT, inicio"><img src="/assets/logo.png" alt="JANAPAINT" width="640" height="291"></a>
  <nav><a class="navlink" href="/">Generador</a><a class="navlink" href="/blog/">Blog</a></nav>
</div></header>`;
const footer = `<footer><div class="wrap"><img src="/assets/logo.png" alt="JANAPAINT" width="640" height="291"><span><a href="/colores-corporativos/">Colores corporativos</a> · <a href="/blog/">Blog</a> · <a href="/privacidad/">Política de privacidad</a> · © ${new Date().getFullYear()} JANAPAINT</span></div></footer>`;
const jsonld = o => JSON.stringify(o).replace(/</g, "\\u003c");

function page({ title, description, canonical, ogImage, ogType = "website", body, ld, extraHead = "" }) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
${HEAD_COMMON}
<meta property="og:type" content="${ogType}">
<meta property="og:url" content="${canonical}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${ogImage}">
<link rel="alternate" type="application/rss+xml" title="Blog de JANAPAINT" href="${SITE}/blog/feed.xml">
${extraHead}${FONTS}
<link rel="stylesheet" href="/assets/blog.css">
<script type="application/ld+json">${jsonld(ld)}</script>
</head>
<body>
${header}
<main>
${body}
</main>
${footer}
<div class="toast" id="toast" role="status"></div>
<script>
document.addEventListener("click", e => {
  const b = e.target.closest("[data-hex]"); if (!b) return;
  const hex = b.dataset.hex, t = document.getElementById("toast");
  const show = m => { t.textContent = m; t.classList.add("show"); clearTimeout(window.__tt); window.__tt = setTimeout(() => t.classList.remove("show"), 1600); };
  try { navigator.clipboard.writeText(hex).then(() => show(hex + " copiado"), () => show(hex)); } catch (err) { show(hex); }
});
</script>
</body>
</html>`;
}

/* ---------- build ---------- */
fs.rmSync(DIST, { recursive: true, force: true });
copyDir(path.join(ROOT, "public"), DIST);

// Home
const home = fs.readFileSync(path.join(ROOT, "src/home.html"), "utf8")
  .replaceAll("{{SITE}}", SITE)
  .replace("{{SUPABASE_URL}}", CFG.supabaseUrl || "")
  .replace("{{SUPABASE_KEY}}", CFG.supabaseKey || "")
  .replace("{{HEAD_COMMON}}", HEAD_COMMON)
  .replace("{{JSONLD_HOME}}", jsonld({
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", "@id": SITE + "/#web", url: SITE + "/", name: "JANAPAINT", inLanguage: "es" },
      { "@type": "WebApplication", name: "JANAPAINT — Generador de paletas de colores", url: SITE + "/", applicationCategory: "DesignApplication", operatingSystem: "Web", inLanguage: "es", offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" } },
    ],
  }))
  .replace("{{FEATURED}}", featured(posts[0]))
  .replace("{{POSTS}}", posts.slice(1, 7).map(card).join("\n      "));
write(path.join(DIST, "index.html"), home);

// Blog index
write(path.join(DIST, "blog/index.html"), page({
  title: "Blog de color y paletas | JANAPAINT",
  description: "Artículos sobre paletas de colores para marca personal, empresas, moda, animales y naturaleza. Ideas y códigos de color listos para usar.",
  canonical: `${SITE}/blog/`,
  ogImage: `${SITE}/assets/og.png`,
  ld: { "@context": "https://schema.org", "@type": "Blog", name: "Blog de JANAPAINT", url: `${SITE}/blog/`, inLanguage: "es",
    blogPost: posts.slice(0, 20).map(p => ({ "@type": "BlogPosting", headline: p.title, url: `${SITE}/blog/${p.slug}/`, datePublished: p.date })) },
  body: `<section class="wrap blog-top">
  <h1>Blog</h1>
  <p class="lede-l">Color para marcas, empresas, moda, animales y naturaleza.</p>
  ${featured(posts[0])}
  <h2 class="all-title">Todos los artículos</h2>
  <div class="grid">
      ${posts.slice(1).map(card).join("\n      ")}
  </div>
</section>`,
}));

// Posts
posts.forEach((p, i) => {
  const url = `${SITE}/blog/${p.slug}/`;
  if (!p.image) write(path.join(DIST, `blog/og/${p.slug}.png`), palettePNG(p.colors));
  const og = p.image ? SITE + p.image : `${SITE}/blog/og/${p.slug}.png`;
  const related = posts.filter(q => q !== p).sort((a, b) => (b.tag === p.tag) - (a.tag === p.tag)).slice(0, 3);
  write(path.join(DIST, `blog/${p.slug}/index.html`), page({
    title: `${p.title} | JANAPAINT`,
    description: p.description,
    canonical: url,
    ogType: "article",
    ogImage: og,
    extraHead: `<meta property="article:published_time" content="${p.date}">\n<meta property="article:section" content="${esc(p.tag)}">\n`,
    ld: { "@context": "https://schema.org", "@graph": [
      { "@type": "BlogPosting", headline: p.title, description: p.description, datePublished: p.date, dateModified: p.updated || p.date,
        inLanguage: "es", wordCount: p.words, articleSection: p.tag, image: og, mainEntityOfPage: url,
        author: { "@type": "Organization", name: CFG.author || "JANAPAINT", url: SITE + "/" },
        publisher: { "@type": "Organization", name: "JANAPAINT", logo: { "@type": "ImageObject", url: `${SITE}/assets/logo.png` } } },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inicio", item: SITE + "/" },
        { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE}/blog/` },
        { "@type": "ListItem", position: 3, name: p.title, item: url } ] } ] },
    body: `<article class="post-page">
  ${p.image ? "" : `<div class="post-cover">${p.colors.map(c => `<span style="background:${c}"></span>`).join("")}</div>`}
  <div class="wrap narrow">
    <nav class="crumbs" aria-label="Ruta"><a href="/">Inicio</a> / <a href="/blog/">Blog</a> / <span>${esc(p.tag)}</span></nav>
    <span class="tag">${esc(p.tag)}</span>
    <h1>${esc(p.title)}</h1>
    <p class="by"><time datetime="${p.date}">${fmtDate(p.date)}</time> · ${p.min} min de lectura</p>
    ${p.image ? `<figure class="post-hero">${imgTag(p.image, p.imageAlt || p.title, true)}${p.imageCaption ? `<figcaption>${esc(p.imageCaption)}</figcaption>` : ""}</figure>` : ""}
    <div class="content">
${p.html}
    </div>
    <div class="palette-box">
      <h2>La paleta de este artículo</h2>
      <div class="codes">${p.colors.map(c => `<span><i style="background:${c}"></i>${c}</span>`).join("")}</div>
      <a class="btn primary" href="/">Generar mi paleta</a>
    </div>
  </div>
</article>
${related.length ? `<section class="wrap related"><h2 class="all-title">Sigue leyendo</h2><div class="grid">${related.map(card).join("")}</div></section>` : ""}`,
  }));
});

// Static pages (/pages/*.md → /<slug>/)
const PAGES = [];
for (const f of fs.readdirSync(path.join(ROOT, "pages")).filter(f => f.endsWith(".md"))) {
  const src = fs.readFileSync(path.join(ROOT, "pages", f), "utf8");
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  const meta = Object.fromEntries(m[1].split(/\r?\n/).map(l => [l.slice(0, l.indexOf(":")).trim(), l.slice(l.indexOf(":") + 1).trim()]));
  const slug = path.basename(f, ".md");
  const fill = s => s.replace(/\{\{(\w+)\}\}/g, (x, k) => CFG[k] || `[${k} pendiente]`);
  const url = `${SITE}/${slug}/`;
  PAGES.push({ url, lastmod: meta.updated || TODAY });
  write(path.join(DIST, slug, "index.html"), page({
    title: `${meta.title} | JANAPAINT`, description: meta.description, canonical: url, ogImage: `${SITE}/assets/og.png`,
    ld: { "@context": "https://schema.org", "@type": "WebPage", name: meta.title, url, inLanguage: "es" },
    body: `<article class="post-page"><div class="wrap narrow" style="padding-top:40px;padding-bottom:60px">
  <h1>${esc(meta.title)}</h1>
  ${slug === "privacidad" ? `<p class="by">Última actualización: ${fmtDate(meta.updated || TODAY)}</p>` : ""}
  <div class="content">
${markdown(fill(m[2]))}
  </div>
</div></article>`,
  }));
}

// Sitemap, robots, RSS
const urls = [{ loc: SITE + "/", lastmod: posts[0]?.date || TODAY }, { loc: `${SITE}/blog/`, lastmod: posts[0]?.date || TODAY },
  ...posts.map(p => ({ loc: `${SITE}/blog/${p.slug}/`, lastmod: p.updated || p.date })),
  ...PAGES.map(p => ({ loc: p.url, lastmod: p.lastmod }))];
write(path.join(DIST, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod></url>`).join("\n")}
</urlset>
`);
write(path.join(DIST, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
write(path.join(DIST, "blog/feed.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>Blog de JANAPAINT</title><link>${SITE}/blog/</link><description>Color y paletas para marcas, moda y naturaleza.</description><language>es</language>
${posts.slice(0, 30).map(p => `<item><title>${esc(p.title)}</title><link>${SITE}/blog/${p.slug}/</link><guid>${SITE}/blog/${p.slug}/</guid><pubDate>${new Date(p.date + "T08:00:00Z").toUTCString()}</pubDate><description>${esc(p.description)}</description></item>`).join("\n")}
</channel></rss>
`);

const pending = all.length - posts.length;
console.log(`✓ ${posts.length} artículos publicados${pending ? ` · ${pending} en borrador o programados` : ""} → dist/`);
