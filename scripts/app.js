/* Minimal, dependency-free app that reads a published CSV and renders a searchable directory.
   Works with GitHub Pages (static hosting). */

function qs(sel) { return document.querySelector(sel); }
function qsa(sel) { return Array.from(document.querySelectorAll(sel)); }

function parseQuery() {
  const p = new URLSearchParams(location.search);
  return {
    lang: p.get("lang") || "",
    category: p.get("category") || "",
    q: p.get("q") || "",
    verify: p.get("verify") || "",
    org: p.get("org") || ""
  };
}

function setQuery(updates) {
  const p = new URLSearchParams(location.search);
  for (const [k, v] of Object.entries(updates)) {
    if (v === null || v === undefined || v === "") p.delete(k);
    else p.set(k, v);
  }
  const newUrl = location.pathname + "?" + p.toString();
  history.replaceState(null, "", newUrl);
}

function csvToRows(csvText) {
  // Simple CSV parser supporting quotes.
  const rows = [];
  let row = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const ch = csvText[i];
    const next = csvText[i + 1];

    if (ch === '"' && inQuotes && next === '"') { cur += '"'; i++; continue; }
    if (ch === '"') { inQuotes = !inQuotes; continue; }

    if (ch === "," && !inQuotes) { row.push(cur); cur = ""; continue; }
    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && next === "\n") i++;
      row.push(cur); rows.push(row);
      row = []; cur = "";
      continue;
    }
    cur += ch;
  }
  row.push(cur);
  rows.push(row);
  // Remove trailing empty row if present
  if (rows.length && rows[rows.length - 1].every(c => (c || "").trim() === "")) rows.pop();
  return rows;
}

function rowsToObjects(rows) {
  const headers = rows[0].map(h => h.trim());
  return rows.slice(1)
    .filter(r => r.some(c => (c || "").trim() !== ""))
    .map(r => {
      const obj = {};
      headers.forEach((h, idx) => obj[h] = (r[idx] ?? "").trim());
      return obj;
    });
}

async function fetchCsv(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch CSV");
  const text = await res.text();
  return rowsToObjects(csvToRows(text));
}

function normalizeVerify(v) {
  const t = (v || "").toLowerCase();
  if (t.includes("verified")) return "verified";
  if (t.includes("needs")) return "needs_review";
  if (t.includes("new")) return "new";
  return "all";
}

function safeUrl(u) {
  if (!u) return "";
  // Add https if it looks like a domain.
  if (!/^https?:\/\//i.test(u) && /\./.test(u)) return "https://" + u;
  return u;
}

function buildCategoryOptions(categories) {
  const sel = qs("#categorySelect");
  if (!sel) return;
  sel.innerHTML = "";
  const optAll = document.createElement("option");
  optAll.value = "All";
  optAll.textContent = "All";
  sel.appendChild(optAll);

  categories.forEach(c => {
    const o = document.createElement("option");
    o.value = c;
    o.textContent = c;
    sel.appendChild(o);
  });
}

function buildLanguageOptions(languages, selected) {
  const sel = qs("#languageSelect");
  if (!sel) return;
  sel.innerHTML = "";
  languages.forEach(name => {
    const o = document.createElement("option");
    o.value = name;
    o.textContent = name;
    sel.appendChild(o);
  });
  sel.value = selected || CONFIG.DEFAULT_LANGUAGE_NAME;
}

function cardTemplate(r, handoutLink) {
  const website = safeUrl(r.website);
  const phone = r.phone || "";
  const address = r.address || "";
  const help = r.help || "";
  const langs = r.langs || "";
  const verifyText = r.verify || "";
  const cat = r.category || "";
  const desc = r.translated || "";

  const chips = [cat, verifyText].filter(Boolean).map(t => `<span class="chip">${escapeHtml(t)}</span>`).join("");

  const siteLink = website ? `<a class="small-link" href="${escapeAttr(website)}" target="_blank" rel="noopener">Website</a>` : "";
  const handout = `<a class="small-link" href="${escapeAttr(handoutLink)}">Handout</a>`;

  return `
    <article class="card">
      <div class="card-top">
        <div class="card-title">${escapeHtml(r.org || "Unnamed Resource")}</div>
        ${help ? `<div class="card-help">${escapeHtml(help)}</div>` : ""}
        <div class="chips">${chips}</div>
      </div>

      <div class="row">
        ${address ? `<div><strong>Area:</strong> ${escapeHtml(address)}</div>` : ""}
        ${phone ? `<div><strong>Phone:</strong> ${escapeHtml(phone)}</div>` : ""}
      </div>

      ${langs ? `<div class="row"><div><strong>Languages:</strong> ${escapeHtml(langs)}</div></div>` : ""}

      ${desc ? `<div class="card-desc">${escapeHtml(desc)}</div>` : ""}

      <div class="card-actions">
        ${siteLink}
        ${handout}
      </div>
    </article>
  `;
}

function escapeHtml(s) {
  return (s ?? "").replace(/[&<>"]/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;" }[c]));
}
function escapeAttr(s) { return escapeHtml(s).replace(/'/g, "&#39;"); }

function mapRow(obj) {
  const c = CONFIG.COLUMNS;
  return {
    category: obj[c.category] || "",
    org: obj[c.org] || "",
    help: obj[c.help] || "",
    address: obj[c.address] || "",
    phone: obj[c.phone] || "",
    website: obj[c.website] || "",
    translated: obj[c.translated] || "",
    langs: obj[c.langs] || "",
    verify: obj[c.verify] || "",
    verifyNorm: normalizeVerify(obj[c.verify] || ""),
  };
}

function uniqueSorted(list) {
  return Array.from(new Set(list.filter(Boolean))).sort((a,b)=>a.localeCompare(b));
}

function applyFilters(rows, state) {
  const q = (state.q || "").toLowerCase().trim();
  return rows.filter(r => {
    if (state.category && state.category !== "All" && r.category !== state.category) return false;
    if (state.verify && state.verify !== "all" && r.verifyNorm !== state.verify) return false;
    if (!q) return true;

    const blob = [
      r.org, r.help, r.address, r.phone, r.website, r.translated, r.langs, r.category, r.verify
    ].join(" ").toLowerCase();
    return blob.includes(q);
  });
}

function initDirectoryPage(allRows) {
  const statusLine = qs("#statusLine");
  const cards = qs("#cards");
  const downloadCsvLink = qs("#downloadCsvLink");
  const lastUpdated = qs("#lastUpdated");
  const submitUpdateLink = qs("#submitUpdateLink");

  const stateFromUrl = parseQuery();
  const state = {
    lang: stateFromUrl.lang || CONFIG.DEFAULT_LANGUAGE_NAME,
    category: stateFromUrl.category || "All",
    q: stateFromUrl.q || "",
    verify: stateFromUrl.verify || "all",
  };

  // UI wiring
  const languageSelect = qs("#languageSelect");
  const categorySelect = qs("#categorySelect");
  const searchInput = qs("#searchInput");
  const verifiedSelect = qs("#verifiedSelect");

  const builtInLanguages = ["English","Spanish","Haitian Creole","Arabic","French","Portuguese","Vietnamese","Swahili"];

  buildLanguageOptions(builtInLanguages, state.lang);

  const categories = uniqueSorted(allRows.map(r => r.category));
  // Keep immigration first if present, rest alphabetical.
  const imm = "Immigration & ICE Resources";
  const ordered = categories.filter(c => c !== imm);
  if (categories.includes(imm)) ordered.unshift(imm);
  buildCategoryOptions(ordered);

  categorySelect.value = state.category;
  searchInput.value = state.q;
  verifiedSelect.value = state.verify;

  if (CONFIG.SUBMIT_UPDATE_URL) {
    submitUpdateLink.href = CONFIG.SUBMIT_UPDATE_URL;
  } else {
    submitUpdateLink.classList.add("button-outline");
    submitUpdateLink.textContent = "Add your Google Form link in config.js";
    submitUpdateLink.href = "#";
  }

  if (CONFIG.DIRECTORY_CSV_URL) {
    downloadCsvLink.href = CONFIG.DIRECTORY_CSV_URL;
  } else {
    downloadCsvLink.href = "#";
    downloadCsvLink.textContent = "Set DIRECTORY_CSV_URL in config.js";
  }

  lastUpdated.textContent = "Last updated: (from your sheet)";

  function render() {
    const filtered = applyFilters(allRows, state);
    statusLine.textContent = `${filtered.length} resources shown`;
    const html = filtered.map(r => {
      const handoutLink = `handout.html?org=${encodeURIComponent(r.org)}&category=${encodeURIComponent(r.category)}&lang=${encodeURIComponent(state.lang)}`;
      return cardTemplate(r, handoutLink);
    }).join("");
    cards.innerHTML = html || `<div class="status-line">No matching resources. Try clearing filters.</div>`;
  }

  languageSelect.addEventListener("change", () => {
    state.lang = languageSelect.value;
    setQuery({ lang: state.lang });
    // Note: This template assumes your Google Sheet already outputs translated text for the selected language.
    // If you later split translations into a separate CSV, we can upgrade to language-specific joins here.
    render();
  });

  categorySelect.addEventListener("change", () => {
    state.category = categorySelect.value;
    setQuery({ category: state.category });
    render();
  });

  verifiedSelect.addEventListener("change", () => {
    state.verify = verifiedSelect.value;
    setQuery({ verify: state.verify });
    render();
  });

  searchInput.addEventListener("input", () => {
    state.q = searchInput.value;
    setQuery({ q: state.q });
    render();
  });

  render();
}

function initHandoutPage(allRows) {
  const p = parseQuery();
  const lang = p.lang || CONFIG.DEFAULT_LANGUAGE_NAME;
  const orgName = p.org || "";
  const category = p.category || "";

  const card = qs("#handoutCard");
  if (!card) return;

  const match = allRows.find(r => r.org === orgName && (!category || r.category === category)) ||
                allRows.find(r => r.org === orgName);

  if (!match) {
    card.innerHTML = `<div class="status-line">Resource not found. Go back and try again.</div>`;
    return;
  }

  const website = safeUrl(match.website);
  card.innerHTML = `
    <h1 style="margin:0 0 6px 0;">${escapeHtml(match.org)}</h1>
    ${match.help ? `<div class="card-help">${escapeHtml(match.help)}</div>` : ""}
    <div class="chips" style="margin:10px 0;">${[match.category, match.verify].filter(Boolean).map(t=>`<span class="chip">${escapeHtml(t)}</span>`).join("")}</div>

    <div class="row">
      ${match.address ? `<div><strong>Address / Area:</strong> ${escapeHtml(match.address)}</div>` : ""}
    </div>
    <div class="row">
      ${match.phone ? `<div><strong>Phone:</strong> ${escapeHtml(match.phone)}</div>` : ""}
      ${website ? `<div><strong>Website:</strong> <a href="${escapeAttr(website)}">${escapeHtml(website)}</a></div>` : ""}
    </div>
    ${match.langs ? `<div class="row"><div><strong>Languages Supported:</strong> ${escapeHtml(match.langs)}</div></div>` : ""}

    <hr style="border:none;border-top:1px solid var(--border);margin:14px 0;" />

    ${match.translated ? `<div class="card-desc">${escapeHtml(match.translated)}</div>` : ""}

    <div style="margin-top:14px;color:var(--muted);font-size:12px;">
      Language selected: ${escapeHtml(lang)} • Handout generated from the shared community directory.
    </div>
  `;
}

async function main() {
  // Determine page type
  const isHandout = !!qs("#handoutCard");
  const isDirectory = !!qs("#cards");

  if (!CONFIG.DIRECTORY_CSV_URL) {
    if (isDirectory) qs("#statusLine").textContent = "Set DIRECTORY_CSV_URL in scripts/config.js";
    if (isHandout) qs("#handoutCard").innerHTML = "<div class='status-line'>Set DIRECTORY_CSV_URL in scripts/config.js</div>";
    return;
  }

  try {
    const raw = await fetchCsv(CONFIG.DIRECTORY_CSV_URL);
    const rows = raw.map(mapRow);
    if (isDirectory) initDirectoryPage(rows);
    if (isHandout) initHandoutPage(rows);
  } catch (e) {
    if (isDirectory) qs("#statusLine").textContent = "Could not load directory CSV. Check your published CSV URL.";
    if (isHandout) qs("#handoutCard").innerHTML = "<div class='status-line'>Could not load directory CSV. Check your published CSV URL.</div>";
  }
}

main();
