// The page shell every route shares: meta tags, the Dusk Ember theme from src/theme.ts, and the header and footer.
// No cookies, fonts or third-party scripts. The only script is /site.js, for the counts and the waitlist form.

export const SITE_NAME = 'Try Something New';

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escapes text for HTML content and attribute values. */
export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

/** Tagged template that escapes every interpolated value unless it's already marked as HTML with `raw`. */
export function html(strings, ...values) {
  let out = strings[0];
  values.forEach((v, i) => {
    out += render(v) + strings[i + 1];
  });
  return new Html(out);
}

class Html {
  constructor(value) {
    this.value = value;
  }
  toString() {
    return this.value;
  }
}

export function raw(value) {
  return new Html(String(value));
}

function render(v) {
  if (v == null || v === false) return '';
  if (v instanceof Html) return v.value;
  if (Array.isArray(v)) return v.map(render).join('');
  return escapeHtml(v);
}

// The app icon (assets/brand/icon.svg): an open door with a sparkle, on the brand gradient.
export const MARK = raw(
  '<svg class="mark" viewBox="0 0 1024 1024" aria-hidden="true" focusable="false"><defs><linearGradient id="dusk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFC24D"/><stop offset="0.5" stop-color="#F0405A"/><stop offset="1" stop-color="#7A2BE2"/></linearGradient></defs><rect width="1024" height="1024" rx="230" fill="url(#dusk)"/><path d="M224 900 L332 790 H692 L800 900Z" fill="#FFFFFF" fill-opacity="0.28"/><path fill-rule="evenodd" d="M332 790 V430 A180 180 0 0 1 692 430 V790Z M512 400 Q527.6 504.4 632 520 Q527.6 535.6 512 640 Q496.4 535.6 392 520 Q496.4 504.4 512 400Z" fill="#FFFFFF"/><path d="M692 300 L812 236 V862 L692 790Z" fill="#FFFFFF" fill-opacity="0.6"/></svg>',
);

const CSS = `
:root{color-scheme:light dark;--bg:#FCF5F4;--card:#FFFFFF;--fill:rgba(120,80,88,0.1);--label:#23151A;--secondary:#6E5A5E;--sep:rgba(110,80,88,0.22);--accent:#B8274A;--accent-soft:rgba(184,39,74,0.08);--on-accent:#FFFFFF;--done:#1E8048;--red:#C62828}
@media (prefers-color-scheme:dark){:root{--bg:#1C1013;--card:#2B1D21;--fill:rgba(220,180,188,0.14);--label:#F8EEEF;--secondary:#B8A4A8;--sep:rgba(220,170,180,0.2);--accent:#FF8A8A;--accent-soft:rgba(255,138,138,0.12);--on-accent:#1C1013;--done:#4CD488;--red:#FF6B6B}}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--label);font:17px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main,header,footer{width:100%;max-width:680px;margin:0 auto;padding:0 20px}
header{display:flex;align-items:center;gap:10px;padding-top:20px;padding-bottom:8px}
header a{display:flex;align-items:center;gap:10px;color:var(--label);text-decoration:none;font-weight:700}
.mark{width:36px;height:36px;flex:none}
.hero .mark{width:72px;height:72px}
h1{font-size:2rem;line-height:1.15;margin:24px 0 12px;letter-spacing:-0.01em}
h2{font-size:1.25rem;margin:32px 0 8px}
p{margin:0 0 14px}
a{color:var(--accent)}
.lede{font-size:1.125rem;color:var(--secondary)}
.muted{color:var(--secondary)}
.card{background:var(--card);border:1px solid var(--sep);border-radius:20px;padding:20px;margin:20px 0}
.chip{display:inline-block;color:#FFFFFF;border-radius:999px;padding:4px 12px;font-size:.875rem;font-weight:600}
.facts{display:grid;grid-template-columns:auto 1fr;gap:6px 16px;margin:16px 0 0}
.facts dt{color:var(--secondary)}
.facts dd{margin:0;font-weight:600}
.points{list-style:none;padding:0;margin:16px 0;display:grid;gap:10px}
.points li{background:var(--card);border:1px solid var(--sep);border-radius:14px;padding:12px 16px}
.points strong{display:block}
.buttons{display:flex;flex-wrap:wrap;gap:12px;margin:20px 0}
.button{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:12px 22px;border-radius:999px;font-weight:700;text-decoration:none;border:2px solid var(--accent);background:var(--accent);color:var(--on-accent);font-size:1rem;cursor:pointer}
.button.secondary{background:transparent;color:var(--accent)}
form{display:grid;gap:12px}
label{font-weight:600;display:grid;gap:4px}
label span{font-weight:400;color:var(--secondary)}
input{font:inherit;color:var(--label);background:var(--bg);border:1px solid var(--secondary);border-radius:12px;padding:12px 14px;min-height:48px;width:100%}
.hp{position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden}
.status{min-height:1.5em;margin:0;font-weight:600}
.status.error{color:var(--red)}
.thanks{color:var(--done)}
:focus-visible{outline:3px solid var(--accent);outline-offset:3px}
footer{padding-top:24px;padding-bottom:40px;color:var(--secondary);font-size:.9375rem}
footer a{color:var(--secondary)}
.prose h2{font-size:1.125rem}
.prose ul{padding-left:1.2em}
.prose li{margin-bottom:8px}
@media (min-width:600px){h1{font-size:2.5rem}}
@media (prefers-reduced-motion:no-preference){.button{transition:transform .1s}.button:active{transform:scale(.98)}}
`;

/**
 * A full page.
 * @param {{ title: string, description: string, origin: string, path: string, body: unknown, data?: Record<string, string>,
 *   noindex?: boolean, fullTitle?: boolean }} page
 */
export function layout({ title, description, origin, path, body, data = {}, noindex = false, fullTitle = false }) {
  const pageTitle = fullTitle ? title : `${title} · ${SITE_NAME}`;
  const url = origin + path;
  const image = `${origin}/icon-512.png`;
  const dataAttrs = Object.entries(data).map(([k, v]) => raw(` data-${k}="${escapeHtml(v)}"`));
  return `<!doctype html>${html`<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${pageTitle}</title>
<meta name="description" content="${description}">
${noindex ? raw('<meta name="robots" content="noindex">') : ''}
<link rel="canonical" href="${url}">
<meta name="theme-color" content="#FCF5F4" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#1C1013" media="(prefers-color-scheme: dark)">
<link rel="icon" href="/favicon.png" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${image}">
<meta property="og:image:width" content="512">
<meta property="og:image:height" content="512">
<meta property="og:image:alt" content="The Try Something New app icon: an open door with a sparkle">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${image}">
<style>${raw(CSS)}</style>
<script src="/site.js" defer></script>
</head>
<body${dataAttrs}>
<header><a href="/">${MARK}<span>${SITE_NAME}</span></a></header>
<main>
${body}
</main>
<footer>
<p><a href="/">Home</a> · <a href="/privacy">Privacy</a></p>
<p>No account, no ads, no tracking across apps.</p>
</footer>
</body>
</html>`}`;
}
