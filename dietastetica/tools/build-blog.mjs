// =============================================================================
// Generador del blog de DietaStética (sin dependencias).
//
//   node dietastetica/tools/build-blog.mjs
//
// Lee los artículos en Markdown de /blog-posts y genera:
//   - dietastetica/blog.html            (listado)
//   - dietastetica/blog/<slug>.html     (un archivo por artículo)
//   - dietastetica/sitemap.xml + robots.txt
//   - el bloque "Del blog" de dietastetica/index.html (entre <!-- blog:latest -->)
// =============================================================================

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Cambia esto cuando la web tenga su dominio definitivo.
const SITE_URL = "https://dietastetica.vercel.app";
// Enlace corto de reseñas del Perfil de Empresa de Google ("Pedir reseñas").
// Mientras esté vacío, el bloque de reseñas no se muestra en los artículos.
const REVIEWS_URL = "https://g.page/r/CfdiOE7opm6LEBM/review";
const ASSET_VERSION = "20261005";

const SITE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const POSTS_DIR = path.resolve(SITE_DIR, "..", "blog-posts");
const OUT_DIR = path.join(SITE_DIR, "blog");

const STATIC_PAGES = [
  { loc: "/", file: "index.html", priority: "1.0" },
  { loc: "/tratamientos.html", file: "tratamientos.html", priority: "0.9" },
  { loc: "/sobre-nosotros.html", file: "sobre-nosotros.html", priority: "0.7" },
  { loc: "/contacto.html", file: "contacto.html", priority: "0.8" },
  { loc: "/blog.html", file: "blog.html", priority: "0.8" }
];

const BUSINESS = {
  "@type": "BeautySalon",
  "@id": SITE_URL + "/#negocio",
  name: "DietaStética",
  url: SITE_URL + "/",
  logo: SITE_URL + "/assets/img/logo-mark.png",
  image: SITE_URL + "/assets/img/gabinete-camilla-dietastetica.jpg",
  telephone: "+34609565252",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Calle Luis Álvarez Lencero, Edificio Eurodom, entreplanta",
    addressLocality: "Badajoz",
    addressRegion: "Extremadura",
    addressCountry: "ES"
  },
  sameAs: ["https://www.instagram.com/desteticacentro/"]
};

const WA_MSG = "Hola, me gustaría reservar una cita en DietaStética.";
const WA_HREF = "https://wa.me/34609565252?text=" + encodeURIComponent(WA_MSG);
const ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

// -----------------------------------------------------------------------------
// Utilidades
// -----------------------------------------------------------------------------
const esc = (s) => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const slugify = (s) => String(s).toLowerCase()
  .normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const formatDate = (iso) => new Date(iso + "T12:00:00").toLocaleDateString("es-ES", {
  day: "numeric", month: "long", year: "numeric"
});

const jsonLd = (obj) => '<script type="application/ld+json">' +
  JSON.stringify(obj).replace(/</g, "\\u003c") + "</script>";

const imgUrl = (img, prefix) => /^(https?:)?\//.test(img) ? img : prefix + "assets/img/" + img;
const absImg = (img) => /^https?:/.test(img) ? img : SITE_URL + "/assets/img/" + img.replace(/^\/?(assets\/img\/)?/, "");

// -----------------------------------------------------------------------------
// Front-matter + Markdown
// -----------------------------------------------------------------------------
function parseFrontMatter(raw, file) {
  const m = raw.replace(/^﻿/, "").match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new Error(`${file}: falta el bloque --- de cabecera al principio del archivo`);
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^\s*([A-Za-z]+)\s*:\s*(.*?)\s*$/);
    if (kv) data[kv[1]] = kv[2].replace(/^["'](.*)["']$/, "$1");
  }
  return { data, body: m[2] };
}

function inline(text, prefix) {
  // Los enlaces absolutos a la propia web se vuelven relativos (sobreviven a un cambio de dominio).
  const fixHref = (u) => {
    if (u.startsWith(SITE_URL + "/")) u = u.slice(SITE_URL.length + 1) || "index.html";
    return /^(https?:|mailto:|tel:|#|\/)/.test(u) ? u : prefix + u;
  };
  return esc(text)
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, src) =>
      `<img src="${imgUrl(src, prefix)}" alt="${alt}" loading="lazy" decoding="async">`)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
      const ext = /^https?:/.test(href) && !href.startsWith(SITE_URL);
      return `<a href="${fixHref(href)}"${ext ? ' target="_blank" rel="noopener"' : ""}>${label}</a>`;
    })
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\s][^*]*?)\*/g, "$1<em>$2</em>");
}

function markdown(src, prefix) {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let para = [], list = null, quote = [];

  const flushPara = () => { if (para.length) { out.push(`<p>${inline(para.join(" "), prefix)}</p>`); para = []; } };
  const flushList = () => {
    if (list) { out.push(`<${list.tag}>` + list.items.map((i) => `<li>${inline(i, prefix)}</li>`).join("") + `</${list.tag}>`); list = null; }
  };
  const flushQuote = () => { if (quote.length) { out.push(`<blockquote><p>${inline(quote.join(" "), prefix)}</p></blockquote>`); quote = []; } };
  const flushAll = () => { flushPara(); flushList(); flushQuote(); };

  for (const line of lines) {
    let m;
    if (!line.trim()) { flushAll(); continue; }
    if ((m = line.match(/^(#{2,4})\s+(.*)$/))) {
      flushAll();
      const level = m[1].length;
      out.push(`<h${level} id="${slugify(m[2])}">${inline(m[2], prefix)}</h${level}>`);
    } else if (/^(-{3,}|\*{3,})\s*$/.test(line)) {
      flushAll(); out.push("<hr>");
    } else if ((m = line.match(/^>\s?(.*)$/))) {
      flushPara(); flushList(); quote.push(m[1]);
    } else if ((m = line.match(/^\s*[-*]\s+(.*)$/)) || (m = line.match(/^\s*\d+[.)]\s+(.*)$/))) {
      flushPara(); flushQuote();
      const tag = /^\s*\d/.test(line) ? "ol" : "ul";
      if (!list || list.tag !== tag) { flushList(); list = { tag, items: [] }; }
      list.items.push(m[1]);
    } else if ((m = line.match(/^!\[([^\]]*)\]\(([^)\s]+)\)\s*$/))) {
      flushAll();
      out.push(`<figure><img src="${imgUrl(m[2], prefix)}" alt="${esc(m[1])}" loading="lazy" decoding="async">` +
        (m[1] ? `<figcaption>${esc(m[1])}</figcaption>` : "") + "</figure>");
    } else if (list && /^\s{2,}\S/.test(line)) {
      list.items[list.items.length - 1] += " " + line.trim();
    } else {
      flushList(); flushQuote(); para.push(line.trim());
    }
  }
  flushAll();
  return out.join("\n");
}

// "## Preguntas frecuentes" seguido de "### Pregunta" + respuesta → datos FAQPage.
function extractFaq(body) {
  const sec = body.replace(/\r\n/g, "\n").match(/^##\s+Preguntas frecuentes\s*\n([\s\S]*?)(?=^##\s|(?![\s\S]))/m);
  if (!sec) return [];
  const plain = (t) => t.replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/\*+/g, "").replace(/\s+/g, " ").trim();
  return sec[1].split(/^###\s+/m).slice(1).map((chunk) => {
    const [q, ...rest] = chunk.split("\n");
    return [plain(q), plain(rest.join(" "))];
  }).filter(([q, a]) => q && a);
}

// -----------------------------------------------------------------------------
// Carga de artículos
// -----------------------------------------------------------------------------
function loadPosts() {
  if (!fs.existsSync(POSTS_DIR)) return [];
  const posts = fs.readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith(".md") && f.toLowerCase() !== "readme.md")
    .map((file) => {
      const { data, body } = parseFrontMatter(fs.readFileSync(path.join(POSTS_DIR, file), "utf8"), file);
      for (const req of ["title", "date", "description", "image", "category"]) {
        if (!data[req]) throw new Error(`${file}: falta el campo obligatorio "${req}"`);
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) throw new Error(`${file}: la fecha debe tener formato AAAA-MM-DD`);
      const words = body.split(/\s+/).filter(Boolean).length;
      return {
        file,
        title: data.title,
        seoTitle: data.seoTitle || "",
        whatsapp: data.whatsapp || "",
        review: data.review || "",
        slug: slugify(data.slug || data.title),
        date: data.date,
        updated: data.updated || data.date,
        description: data.description,
        image: data.image,
        imageAlt: data.imageAlt || data.title,
        category: data.category,
        categorySlug: slugify(data.category),
        author: data.author || "Equipo DietaStética",
        draft: /^(true|si|sí|yes)$/i.test(data.draft || ""),
        readingMinutes: Math.max(1, Math.round(words / 200)),
        body
      };
    })
    .filter((p) => !p.draft)
    .sort((a, b) => b.date.localeCompare(a.date));

  const seen = new Set();
  for (const p of posts) {
    if (p.seoTitle.length > 60) console.warn(`Aviso: ${p.file}: seoTitle tiene ${p.seoTitle.length} caracteres (máx. recomendado 60)`);
    if (p.description.length > 160) console.warn(`Aviso: ${p.file}: description tiene ${p.description.length} caracteres (máx. recomendado 160)`);
    if (p.review && !REVIEWS_URL) console.warn(`Aviso: ${p.file}: falta REVIEWS_URL en build-blog.mjs; no se muestra el bloque de reseñas`);
    if (seen.has(p.slug)) throw new Error(`Hay dos artículos con el mismo slug: "${p.slug}"`);
    seen.add(p.slug);
  }
  return posts;
}

// -----------------------------------------------------------------------------
// Plantillas compartidas (mismo marcado que el resto de páginas)
// -----------------------------------------------------------------------------
function head({ p, title, description, canonical, ogType, ogImage, preload, extra = "" }) {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
<meta property="og:site_name" content="DietaStética">
<meta property="og:locale" content="es_ES">
<meta property="og:type" content="${ogType}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${ogImage}">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,500;1,600&family=Inter:wght@300;400;500;600;700&display=swap">
<link rel="icon" href="${p}assets/img/favicon.png" type="image/png">
<link rel="preload" as="image" href="${preload}" fetchpriority="high">
<link rel="stylesheet" href="${p}styles.css?v=${ASSET_VERSION}">
${extra}</head>
<body data-page="blog">
`;
}

function header(p) {
  const links = [
    ["inicio", "index.html", "Inicio"],
    ["tratamientos", "tratamientos.html", "Tratamientos"],
    ["sobre-nosotros", "sobre-nosotros.html", "Sobre nosotros"],
    ["blog", "blog.html", "Blog"],
    ["contacto", "contacto.html", "Contacto"]
  ];
  return `
<div class="splash" data-splash aria-hidden="true">
  <div class="splash-mark"><img src="${p}assets/img/logo-mark.png" alt=""><span>DietaStética</span></div>
</div>

<a class="skip-link" href="#main">Saltar al contenido</a>

<div class="nav-mobile" data-nav-mobile aria-hidden="true">
  <div class="nav-mobile-links">
${links.map(([id, href, label]) => `    <a href="${p}${href}" data-page-link="${id}">${label}</a>`).join("\n")}
  </div>
  <div class="nav-mobile-foot">
    <a class="btn btn-rose" data-wa="${WA_MSG}" href="${WA_HREF}">Reservar por WhatsApp</a>
    <a class="plain" href="tel:+34609565252">+34 609 565 252</a>
  </div>
</div>

<header class="nav">
  <div class="container nav-inner">
    <a href="${p}index.html" class="nav-logo">
      <img src="${p}assets/img/logo-mark.png" alt="DietaStética">
      <span class="nav-logo-text"><strong>DietaStética</strong><span>Badajoz</span></span>
    </a>
    <nav class="nav-links" aria-label="Principal">
${links.map(([id, href, label]) => `      <a class="nav-link" data-page-link="${id}" href="${p}${href}">${label}</a>`).join("\n")}
    </nav>
    <div class="nav-actions">
      <a class="btn" data-magnetic data-magnetic-strength="0.2" data-wa="${WA_MSG}" href="${WA_HREF}">
        <span class="long">Reservar cita</span><span class="short">Reservar</span>
      </a>
      <button class="nav-burger" data-nav-burger aria-expanded="false" aria-controls="nav-mobile" aria-label="Abrir menú"><span></span></button>
    </div>
  </div>
</header>
`;
}

function ctaBand(p, waMsg = WA_MSG) {
  const waHref = "https://wa.me/34609565252?text=" + encodeURIComponent(waMsg);
  return `
  <section class="section" style="padding-top:0;">
    <div class="container">
      <div class="cta-band" data-reveal>
        <span class="eyebrow" style="justify-content:center;">Pide tu cita</span>
        <h2>¿Te asesoramos en persona?</h2>
        <p>Cuéntanos qué te gustaría mejorar y te proponemos el plan que mejor encaja contigo, sin compromiso. Edificio Eurodom, Badajoz.</p>
        <div class="hero-actions">
          <a class="btn btn-rose" data-magnetic data-magnetic-strength="0.25" data-wa="${esc(waMsg)}" href="${waHref}">Reservar por WhatsApp</a>
          <a class="btn btn-ghost" href="${p}tratamientos.html">Ver tratamientos</a>
        </div>
      </div>
    </div>
  </section>
`;
}

function footer(p) {
  return `
<footer class="footer">
  <div class="container">
    <div class="footer-grid">
      <div>
        <div class="footer-brand"><img src="${p}assets/img/logo-mark.png" alt="DietaStética"><strong>DietaStética</strong></div>
        <p class="lede">Centro de estética y nutrición en Badajoz. Belleza que nace del bienestar.</p>
      </div>
      <div>
        <h5>Navegación</h5>
        <div class="footer-links">
          <a href="${p}index.html">Inicio</a>
          <a href="${p}tratamientos.html">Tratamientos</a>
          <a href="${p}sobre-nosotros.html">Sobre nosotros</a>
          <a href="${p}blog.html">Blog</a>
          <a href="${p}contacto.html">Contacto</a>
        </div>
      </div>
      <div>
        <h5>Contacto</h5>
        <div class="footer-links">
          <a href="tel:+34609565252">+34 609 565 252</a>
          <a data-wa="${WA_MSG}" href="https://wa.me/34609565252">WhatsApp</a>
          <a href="https://www.instagram.com/desteticacentro/" target="_blank" rel="noopener">Instagram @desteticacentro</a>
          <a href="${p}contacto.html">Edificio Eurodom, Badajoz</a>
        </div>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© ${new Date().getFullYear()} DietaStética · Badajoz</span>
      <a class="footer-social" href="https://www.instagram.com/desteticacentro/" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1"/></svg>
        @desteticacentro
      </a>
    </div>
  </div>
</footer>

<script defer src="${p}lib/gsap.min.js"></script>
<script defer src="${p}lib/ScrollTrigger.min.js"></script>
<script defer src="${p}lib/manifest.js"></script>
<script defer src="${p}main.js?v=${ASSET_VERSION}"></script>
</body>
</html>
`;
}

function postCard(post, p, headingTag = "h3") {
  return `          <article class="treat-card post-card" data-category="${post.categorySlug}">
            <a class="treat-card-media" href="${p}blog/${post.slug}.html" tabindex="-1" aria-hidden="true"><img src="${imgUrl(post.image, p)}" alt="" loading="lazy" decoding="async"></a>
            <div class="treat-card-body">
              <div class="post-card-meta"><span>${esc(post.category)}</span><time datetime="${post.date}">${formatDate(post.date)}</time></div>
              <${headingTag}><a href="${p}blog/${post.slug}.html">${esc(post.title)}</a></${headingTag}>
              <p>${esc(post.description)}</p>
              <a class="treat-card-cta" href="${p}blog/${post.slug}.html" aria-label="Leer: ${esc(post.title)}">Leer artículo ${ARROW}</a>
            </div>
          </article>`;
}

// -----------------------------------------------------------------------------
// Páginas
// -----------------------------------------------------------------------------
function renderPost(post, posts) {
  const p = "../";
  const url = `${SITE_URL}/blog/${post.slug}.html`;
  const related = [
    ...posts.filter((o) => o !== post && o.categorySlug === post.categorySlug),
    ...posts.filter((o) => o !== post && o.categorySlug !== post.categorySlug)
  ].slice(0, 3);

  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.description,
      image: [absImg(post.image)],
      datePublished: post.date,
      dateModified: post.updated,
      inLanguage: "es-ES",
      articleSection: post.category,
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      author: { "@type": "Organization", name: post.author, url: SITE_URL + "/" },
      publisher: { "@id": BUSINESS["@id"], "@type": "BeautySalon", name: "DietaStética", logo: { "@type": "ImageObject", url: BUSINESS.logo } }
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inicio", item: SITE_URL + "/" },
        { "@type": "ListItem", position: 2, name: "Blog", item: SITE_URL + "/blog.html" },
        { "@type": "ListItem", position: 3, name: post.title, item: url }
      ]
    }
  ];
  const faq = extractFaq(post.body);
  if (faq.length) {
    ld.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } }))
    });
  }

  const extra = `<meta property="article:published_time" content="${post.date}">
<meta property="article:modified_time" content="${post.updated}">
<meta property="article:section" content="${esc(post.category)}">
${jsonLd(ld)}
`;

  return head({
    p, title: post.seoTitle || `${post.title} · Blog DietaStética Badajoz`, description: post.description,
    canonical: url, ogType: "article", ogImage: absImg(post.image), preload: imgUrl(post.image, p), extra
  }) + header(p) + `
<main id="main">

  <section class="hero hero-inner hero-post">
    <div class="hero-bg"><img src="${imgUrl(post.image, p)}" alt="${esc(post.imageAlt)}" fetchpriority="high" loading="eager" decoding="sync"></div>
    <div class="hero-scrim"></div>
    <div class="container hero-content">
      <nav class="breadcrumbs" aria-label="Migas de pan">
        <a href="${p}index.html">Inicio</a><span aria-hidden="true">/</span><a href="${p}blog.html">Blog</a>
      </nav>
      <span class="hero-eyebrow">${esc(post.category)}</span>
      <h1 class="hero-title">${esc(post.title)}</h1>
      <div class="hero-meta post-meta">
        <div><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg><time datetime="${post.date}">${formatDate(post.date)}</time></div>
        <div><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>${post.readingMinutes} min de lectura</div>
        <div><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>${esc(post.author)}</div>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="container">
      <article class="post-body" data-reveal>
${markdown(post.body, p)}
${REVIEWS_URL && post.review ? `        <aside class="post-review">
          <p>${inline(post.review, p)}</p>
          <a class="btn btn-ghost" href="${REVIEWS_URL}" target="_blank" rel="noopener">Dejar mi opinión en Google</a>
        </aside>
` : ""}      </article>
    </div>
  </section>
${related.length ? `
  <section class="section" style="padding-top:0;">
    <div class="container">
      <div class="section-head" data-reveal>
        <span class="eyebrow">Sigue leyendo</span>
        <h2 class="section-title">Otros artículos <em>que te pueden interesar</em>.</h2>
      </div>
      <div class="treat-grid" data-reveal-stagger>
${related.map((r) => postCard(r, p)).join("\n")}
      </div>
    </div>
  </section>
` : ""}${ctaBand(p, post.whatsapp || WA_MSG)}
</main>
` + footer(p);
}

function renderIndex(posts) {
  const p = "";
  const url = SITE_URL + "/blog.html";
  const description = "Consejos de estética, cuidado de la piel, depilación láser y nutrición del equipo de DietaStética, tu centro de estética y nutrición en Badajoz.";
  const categories = [...new Map(posts.map((x) => [x.categorySlug, x.category])).entries()];
  const heroImg = "assets/img/tratamiento-facial.jpg";

  const ld = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Blog de DietaStética",
    description,
    url,
    inLanguage: "es-ES",
    publisher: { "@id": BUSINESS["@id"], "@type": "BeautySalon", name: "DietaStética" },
    blogPost: posts.map((x) => ({
      "@type": "BlogPosting",
      headline: x.title,
      url: `${SITE_URL}/blog/${x.slug}.html`,
      datePublished: x.date,
      image: absImg(x.image)
    }))
  };

  return head({
    p, title: "Blog de estética y nutrición · DietaStética Badajoz", description,
    canonical: url, ogType: "website", ogImage: absImg(heroImg), preload: heroImg, extra: jsonLd(ld) + "\n"
  }) + header(p) + `
<main id="main">

  <section class="hero hero-inner">
    <div class="hero-bg"><img src="${heroImg}" alt="Tratamiento facial en el gabinete de DietaStética" fetchpriority="high" loading="eager" decoding="sync"></div>
    <div class="hero-scrim"></div>
    <div class="container hero-content">
      <span class="hero-eyebrow">Blog</span>
      <h1 class="hero-title">Consejos para cuidarte, <em>de dentro afuera</em>.</h1>
      <p class="hero-sub">Estética, cuidado de la piel y nutrición explicados sin tecnicismos por el equipo de DietaStética, en Badajoz.</p>
    </div>
  </section>

  <section class="section">
    <div class="container">
${posts.length ? `${categories.length > 1 ? `      <div class="blog-filters" role="group" aria-label="Filtrar por categoría" data-blog-filters data-reveal>
        <button type="button" class="chip is-active" data-filter="all" aria-pressed="true">Todos</button>
${categories.map(([slug, name]) => `        <button type="button" class="chip" data-filter="${slug}" aria-pressed="false">${esc(name)}</button>`).join("\n")}
      </div>
` : ""}      <div class="treat-grid" data-blog-grid data-reveal-stagger>
${posts.map((x) => postCard(x, p, "h2")).join("\n")}
      </div>` : `      <div class="section-head is-center"><p class="section-lede">Muy pronto publicaremos nuestros primeros artículos.</p></div>`}
    </div>
  </section>
${ctaBand(p)}
</main>
` + footer(p);
}

function renderLatestBlock(posts) {
  if (!posts.length) return "";
  return `
  <section class="section" style="padding-top:0;">
    <div class="container">
      <div class="section-head" data-reveal>
        <span class="eyebrow">Del blog</span>
        <h2 class="section-title">Consejos para <em>cuidarte mejor</em>.</h2>
        <p class="section-lede">Estética y nutrición explicadas por nuestro equipo. <a class="text-link" href="blog.html">Ver todos los artículos</a></p>
      </div>
      <div class="treat-grid" data-reveal-stagger>
${posts.slice(0, 3).map((x) => postCard(x, "")).join("\n")}
      </div>
    </div>
  </section>
  `;
}

function renderSitemap(posts) {
  const today = new Date().toISOString().slice(0, 10);
  const lastmodOf = (file) => {
    try { return fs.statSync(path.join(SITE_DIR, file)).mtime.toISOString().slice(0, 10); } catch { return today; }
  };
  const latestPost = posts[0]?.updated;
  const urls = [
    ...STATIC_PAGES.map((pg) => ({
      loc: SITE_URL + pg.loc,
      lastmod: pg.file === "blog.html" && latestPost ? latestPost : lastmodOf(pg.file),
      priority: pg.priority
    })),
    ...posts.map((x) => ({ loc: `${SITE_URL}/blog/${x.slug}.html`, lastmod: x.updated, priority: "0.7" }))
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod><priority>${u.priority}</priority></url>`).join("\n")}
</urlset>
`;
}

// -----------------------------------------------------------------------------
// Build
// -----------------------------------------------------------------------------
const posts = loadPosts();

fs.mkdirSync(OUT_DIR, { recursive: true });
const keep = new Set(posts.map((x) => x.slug + ".html"));
for (const f of fs.readdirSync(OUT_DIR)) {
  // Borra artículos que ya no existen (o se han pasado a borrador).
  if (f.endsWith(".html") && !keep.has(f)) fs.unlinkSync(path.join(OUT_DIR, f));
}
for (const post of posts) fs.writeFileSync(path.join(OUT_DIR, post.slug + ".html"), renderPost(post, posts));
fs.writeFileSync(path.join(SITE_DIR, "blog.html"), renderIndex(posts));

const indexPath = path.join(SITE_DIR, "index.html");
const indexHtml = fs.readFileSync(indexPath, "utf8");
const marker = /(<!-- blog:latest -->)[\s\S]*?(<!-- \/blog:latest -->)/;
if (marker.test(indexHtml)) {
  fs.writeFileSync(indexPath, indexHtml.replace(marker, (_, a, b) => a + renderLatestBlock(posts) + b));
} else {
  console.warn("Aviso: no se encontró <!-- blog:latest --> en index.html; no se actualiza la portada.");
}

fs.writeFileSync(path.join(SITE_DIR, "sitemap.xml"), renderSitemap(posts));
fs.writeFileSync(path.join(SITE_DIR, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);

console.log(`Blog generado: ${posts.length} artículo(s).`);
for (const x of posts) console.log(`  · ${x.date}  blog/${x.slug}.html  (${x.category})`);
