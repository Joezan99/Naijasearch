/* =========================================================
   NaijaReach — shared script
   Prototype only: all data lives in the browser's localStorage.
   No backend, no real ad delivery, no real authentication.

   File map (for when a backend is added later):
   - CONFIG / DATA        -> constants + localStorage helpers
   - UTILS                -> small formatting helpers
   - NAV                  -> mobile menu, active link (all pages)
   - HOMEPAGE              -> index.html example ads
   - CAMPAIGN FORM         -> campaign.html form + live preview
   - ADS PAGE              -> ads.html grid
   - ADMIN                 -> admin.html login + dashboard
   ========================================================= */

/* ---------------------------- CONFIG / DATA ---------------------------- */

const NR_STORAGE_KEY = "naijareach_campaigns";
const NR_SEEDED_KEY = "naijareach_seeded";
const NR_ADMIN_SESSION_KEY = "naijareach_admin_session";
const NR_ADMIN_EMAIL = "joebankole99@gmail.com";

/* Prototype-only password gate.
   IMPORTANT — read this before relying on it for anything real:
   GitHub Pages is static hosting with no server, so there is no way to
   check a password "secretly" here. Whatever this file compares against
   is downloadable by anyone who opens dev tools or views source — a
   SHA-256 hash (below) keeps the PLAIN password out of the source code,
   but it is still just a client-side check: someone could brute-force
   the hash offline, or simply skip this check entirely by editing the
   page in their browser's dev tools, since nothing on a server is
   enforcing it. This only deters casual snooping — it is not real
   authentication. See the project notes for what a real fix requires
   (a backend + a real auth service, e.g. Firebase Auth / Supabase Auth /
   Auth0, checking credentials server-side). */
const NR_ADMIN_PASSWORD_HASH =
  "423d60e2ab3cb57644ab1fdcc192772bf39ceb8a91724cb06d8749b23b38c538";

async function nrHashPassword(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

const NR_CATEGORIES = [
  "Business", "Fashion", "Technology", "Education", "Food",
  "Sports", "Entertainment", "Finance", "Health", "Other"
];

const NR_AUDIENCES = [
  "Students", "Business owners", "Professionals", "Parents",
  "Sports fans", "Gamers", "Entrepreneurs", "Shoppers", "General audience"
];

const NR_COUNTRIES = [
  "Nigeria", "Ghana", "United Kingdom", "United States", "Canada", "Other"
];

function nrGetCampaigns() {
  try {
    const raw = localStorage.getItem(NR_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("NaijaReach: could not read campaigns", e);
    return [];
  }
}

function nrSaveCampaigns(list) {
  localStorage.setItem(NR_STORAGE_KEY, JSON.stringify(list));
}

function nrAddCampaign(campaign) {
  const list = nrGetCampaigns();
  list.unshift(campaign);
  nrSaveCampaigns(list);
  return campaign;
}

function nrUpdateCampaignStatus(id, status) {
  const list = nrGetCampaigns();
  const idx = list.findIndex(c => c.id === id);
  if (idx > -1) {
    list[idx].status = status;
    nrSaveCampaigns(list);
  }
  return list;
}

function nrGenerateId() {
  return "cmp_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* Seed a handful of example campaigns the first time the site loads,
   so the homepage / ads page / admin dashboard aren't empty. */
function nrSeedExamples() {
  if (localStorage.getItem(NR_SEEDED_KEY)) return;
  const examples = [
    {
      id: nrGenerateId(),
      businessName: "Ade's Kitchen",
      title: "Home-cooked Nigerian meals, delivered hot",
      description: "Order jollof rice, egusi and more, delivered across Lagos in under 45 minutes.",
      url: "https://example.com/adeskitchen",
      category: "Food",
      country: "Nigeria",
      city: "Lagos",
      audience: "General audience",
      budget: 45000,
      startDate: "2026-09-10",
      endDate: "2026-10-10",
      status: "approved",
      createdAt: Date.now() - 8 * 86400000
    },
    {
      id: nrGenerateId(),
      businessName: "CodeCamp Naija",
      title: "Learn to code in 12 weeks — job ready",
      description: "A hands-on bootcamp for beginners who want a career in tech. Weekend classes available.",
      url: "https://example.com/codecampnaija",
      category: "Education",
      country: "Nigeria",
      city: "Abuja",
      audience: "Students",
      budget: 60000,
      startDate: "2026-09-01",
      endDate: "2026-11-01",
      status: "approved",
      createdAt: Date.now() - 5 * 86400000
    },
    {
      id: nrGenerateId(),
      businessName: "Zenith Fits",
      title: "Ankara streetwear for the new season",
      description: "Bold, locally-made Ankara pieces for men and women. Free delivery on orders above ₦20,000.",
      url: "https://example.com/zenithfits",
      category: "Fashion",
      country: "Nigeria",
      city: "Port Harcourt",
      audience: "Shoppers",
      budget: 30000,
      startDate: "2026-09-05",
      endDate: "2026-09-30",
      status: "approved",
      createdAt: Date.now() - 3 * 86400000
    },
    {
      id: nrGenerateId(),
      businessName: "PitchPoint Sports Bar",
      title: "Catch every match, every weekend",
      description: "Big screens, cold drinks and suya. Come watch the weekend fixtures with us.",
      url: "https://example.com/pitchpoint",
      category: "Sports",
      country: "Nigeria",
      city: "Enugu",
      audience: "Sports fans",
      budget: 15000,
      startDate: "2026-09-12",
      endDate: "2026-10-12",
      status: "pending",
      createdAt: Date.now() - 1 * 86400000
    }
  ];
  nrSaveCampaigns(examples);
  localStorage.setItem(NR_SEEDED_KEY, "1");
}

/* ---------------------------------- UTILS ---------------------------------- */

function nrFormatNaira(amount) {
  const n = Number(amount) || 0;
  return "₦" + n.toLocaleString("en-NG");
}

function nrFormatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/* Illustrative-only formula. There is no real ad-serving system yet,
   so this is just a rough number to give the advertiser a sense of scale. */
function nrEstimateImpressions(budget) {
  const n = Number(budget) || 0;
  return Math.round(n * 18);
}

function nrInitials(name) {
  if (!name) return "NR";
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

function nrEscapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

function nrFillSelect(select, options, placeholder) {
  if (!select) return;
  let html = placeholder ? `<option value="" disabled selected>${placeholder}</option>` : "";
  html += options.map(o => `<option value="${o}">${o}</option>`).join("");
  select.innerHTML = html;
}

/* ----------------------------------- NAV ----------------------------------- */

function nrInitNav() {
  const toggle = document.querySelector("[data-nav-toggle]");
  const links = document.querySelector("[data-nav-links]");
  if (toggle && links) {
    toggle.addEventListener("click", () => {
      const open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    links.querySelectorAll("a").forEach(a => {
      a.addEventListener("click", () => links.classList.remove("open"));
    });
  }
  // mark active link based on current file name
  const current = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("[data-nav-links] a").forEach(a => {
    const href = a.getAttribute("href");
    if (href === current) a.classList.add("active");
  });
}

/* --------------------------------- HOMEPAGE --------------------------------- */

function nrRenderAdCard(c) {
  return `
    <article class="ad-card">
      <div class="ad-card-media">${nrEscapeHtml(c.businessName)}</div>
      <div class="ad-card-body">
        <span class="ad-card-cat">${nrEscapeHtml(c.category)}</span>
        <h3>${nrEscapeHtml(c.title)}</h3>
        <p>${nrEscapeHtml(c.description)}</p>
        <div class="ad-card-meta">
          <span>${nrEscapeHtml(c.city)}, ${nrEscapeHtml(c.country)}</span>
          <span class="ad-card-cta">Learn more →</span>
        </div>
      </div>
    </article>`;
}

function nrInitHomepage() {
  const grid = document.getElementById("homeAdGrid");
  if (!grid) return;
  const approved = nrGetCampaigns().filter(c => c.status === "approved").slice(0, 3);
  grid.innerHTML = approved.length
    ? approved.map(nrRenderAdCard).join("")
    : `<p>No live advertisements yet — be the first to <a href="campaign.html">create a campaign</a>.</p>`;
}

/* ------------------------------ CAMPAIGN FORM ------------------------------ */

function nrInitCampaignForm() {
  const form = document.getElementById("campaignForm");
  if (!form) return;

  nrFillSelect(document.getElementById("category"), NR_CATEGORIES, "Select a category");
  nrFillSelect(document.getElementById("country"), NR_COUNTRIES, "Select a country");
  nrFillSelect(document.getElementById("audience"), NR_AUDIENCES, "Select target audience");

  const fields = {
    businessName: document.getElementById("businessName"),
    title: document.getElementById("title"),
    description: document.getElementById("description"),
    url: document.getElementById("url"),
    category: document.getElementById("category"),
    country: document.getElementById("country"),
    city: document.getElementById("city"),
    audience: document.getElementById("audience"),
    budget: document.getElementById("budget"),
    startDate: document.getElementById("startDate"),
    endDate: document.getElementById("endDate")
  };

  const previewMedia = document.getElementById("previewMedia");
  const previewCat = document.getElementById("previewCat");
  const previewTitle = document.getElementById("previewTitle");
  const previewDesc = document.getElementById("previewDesc");
  const previewLoc = document.getElementById("previewLoc");
  const previewSummary = document.getElementById("previewSummary");
  const impressionsBox = document.getElementById("impressionsEstimate");
  const successBanner = document.getElementById("formSuccess");

  function updatePreview() {
    const v = k => (fields[k].value || "").trim();
    previewMedia.textContent = v("businessName") || "Your business name";
    previewCat.textContent = v("category") || "Category";
    previewTitle.textContent = v("title") || "Your advert title will appear here";
    previewDesc.textContent = v("description") || "Your advert description will appear here, so keep it clear and inviting.";
    const city = v("city"), country = v("country");
    previewLoc.textContent = (city || country) ? `${city}${city && country ? ", " : ""}${country}` : "Target location";

    previewSummary.innerHTML = `
      <div>Audience: <span>${v("audience") || "—"}</span></div>
      <div>Budget: <span>${fields.budget.value ? nrFormatNaira(fields.budget.value) : "—"}</span></div>
      <div>Runs: <span>${v("startDate") ? nrFormatDate(v("startDate")) : "—"} to ${v("endDate") ? nrFormatDate(v("endDate")) : "—"}</span></div>
    `;

    if (fields.budget.value && Number(fields.budget.value) > 0) {
      impressionsBox.classList.remove("hidden");
      impressionsBox.innerHTML = `<strong>${nrEstimateImpressions(fields.budget.value).toLocaleString("en-NG")}</strong> estimated impressions (illustrative only — no live ad delivery yet)`;
    } else {
      impressionsBox.classList.add("hidden");
    }
  }

  Object.values(fields).forEach(el => {
    el.addEventListener("input", updatePreview);
    el.addEventListener("change", updatePreview);
  });
  updatePreview();

  function setFieldValid(key, valid, message) {
    const wrap = fields[key].closest(".field");
    wrap.classList.toggle("invalid", !valid);
    if (!valid) wrap.querySelector(".field-error").textContent = message;
  }

  function validate() {
    let ok = true;
    const v = k => (fields[k].value || "").trim();

    if (!v("businessName")) { setFieldValid("businessName", false, "Enter your business name."); ok = false; }
    else setFieldValid("businessName", true);

    if (!v("title")) { setFieldValid("title", false, "Enter an advert title."); ok = false; }
    else setFieldValid("title", true);

    if (!v("description") || v("description").length < 10) { setFieldValid("description", false, "Description should be at least 10 characters."); ok = false; }
    else setFieldValid("description", true);

    if (v("url") && !/^https?:\/\/.+/i.test(v("url"))) { setFieldValid("url", false, "Start the URL with http:// or https://"); ok = false; }
    else setFieldValid("url", true);

    if (!v("category")) { setFieldValid("category", false, "Choose a category."); ok = false; }
    else setFieldValid("category", true);

    if (!v("country")) { setFieldValid("country", false, "Choose a target country."); ok = false; }
    else setFieldValid("country", true);

    if (!v("city")) { setFieldValid("city", false, "Enter a target city or region."); ok = false; }
    else setFieldValid("city", true);

    if (!v("audience")) { setFieldValid("audience", false, "Choose a target audience."); ok = false; }
    else setFieldValid("audience", true);

    const budgetNum = Number(fields.budget.value);
    if (!fields.budget.value || budgetNum <= 0) { setFieldValid("budget", false, "Enter a budget greater than 0."); ok = false; }
    else setFieldValid("budget", true);

    if (!v("startDate")) { setFieldValid("startDate", false, "Choose a start date."); ok = false; }
    else setFieldValid("startDate", true);

    if (!v("endDate")) { setFieldValid("endDate", false, "Choose an end date."); ok = false; }
    else if (v("startDate") && v("endDate") < v("startDate")) { setFieldValid("endDate", false, "End date must be after the start date."); ok = false; }
    else setFieldValid("endDate", true);

    return ok;
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!validate()) {
      successBanner.classList.add("hidden");
      const firstInvalid = form.querySelector(".field.invalid");
      if (firstInvalid) firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const campaign = {
      id: nrGenerateId(),
      businessName: fields.businessName.value.trim(),
      title: fields.title.value.trim(),
      description: fields.description.value.trim(),
      url: fields.url.value.trim(),
      category: fields.category.value,
      country: fields.country.value,
      city: fields.city.value.trim(),
      audience: fields.audience.value,
      budget: Number(fields.budget.value),
      startDate: fields.startDate.value,
      endDate: fields.endDate.value,
      status: "pending",
      createdAt: Date.now()
    };

    nrAddCampaign(campaign);
    form.reset();
    updatePreview();
    Object.keys(fields).forEach(k => fields[k].closest(".field").classList.remove("invalid"));
    successBanner.classList.remove("hidden");
    successBanner.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

/* ---------------------------------- ADS PAGE ---------------------------------- */

function nrInitAdsPage() {
  const grid = document.getElementById("adsGrid");
  if (!grid) return;
  const filterSelect = document.getElementById("adsFilter");
  nrFillSelect(filterSelect, NR_CATEGORIES, null);
  filterSelect.insertAdjacentHTML("afterbegin", `<option value="" selected>All categories</option>`);

  function render() {
    const approved = nrGetCampaigns().filter(c => c.status === "approved");
    const filter = filterSelect.value;
    const list = filter ? approved.filter(c => c.category === filter) : approved;
    grid.innerHTML = list.length
      ? list.map(nrRenderAdCard).join("")
      : `<div class="empty-state">No advertisements in this category yet.</div>`;
  }

  filterSelect.addEventListener("change", render);
  render();
}

/* ------------------------------------ ADMIN ------------------------------------ */

function nrInitAdmin() {
  const loginForm = document.getElementById("adminLoginForm");
  const dashboard = document.getElementById("adminDashboard");
  const loginWrap = document.getElementById("adminLoginWrap");
  if (!loginForm || !dashboard) return;

  function showDashboard() {
    loginWrap.classList.add("hidden");
    dashboard.classList.remove("hidden");
    nrRenderAdmin();
  }

  if (sessionStorage.getItem(NR_ADMIN_SESSION_KEY) === "1") {
    showDashboard();
  }

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const passInput = document.getElementById("adminPassword");
    const errorEl = document.getElementById("adminLoginError");
    const submitBtn = loginForm.querySelector("button[type='submit']");

    if (!window.crypto || !window.crypto.subtle) {
      // crypto.subtle needs a secure context (https:// or localhost).
      // Opening the file directly (file://) or over plain http:// won't work.
      errorEl.textContent = "This browser/connection can't verify the password securely (needs HTTPS). Open the site over https:// — e.g. your GitHub Pages URL.";
      errorEl.classList.remove("hidden");
      return;
    }

    if (submitBtn) submitBtn.disabled = true;
    const enteredHash = await nrHashPassword(passInput.value);
    if (submitBtn) submitBtn.disabled = false;

    if (enteredHash === NR_ADMIN_PASSWORD_HASH) {
      sessionStorage.setItem(NR_ADMIN_SESSION_KEY, "1");
      errorEl.classList.add("hidden");
      passInput.value = "";
      showDashboard();
    } else {
      errorEl.textContent = "Incorrect password. Try again.";
      errorEl.classList.remove("hidden");
    }
  });

  const logoutBtn = document.getElementById("adminLogout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      sessionStorage.removeItem(NR_ADMIN_SESSION_KEY);
      dashboard.classList.add("hidden");
      loginWrap.classList.remove("hidden");
      loginForm.reset();
    });
  }
}

function nrRenderAdmin() {
  const list = nrGetCampaigns();
  const total = list.length;
  const pending = list.filter(c => c.status === "pending").length;
  const approved = list.filter(c => c.status === "approved").length;
  const rejected = list.filter(c => c.status === "rejected").length;
  const impressions = list
    .filter(c => c.status === "approved")
    .reduce((sum, c) => sum + nrEstimateImpressions(c.budget), 0);

  document.getElementById("statTotal").textContent = total;
  document.getElementById("statPending").textContent = pending;
  document.getElementById("statApproved").textContent = approved;
  document.getElementById("statRejected").textContent = rejected;
  document.getElementById("statImpressions").textContent = impressions.toLocaleString("en-NG");

  const tbody = document.getElementById("adminTableBody");
  const emptyState = document.getElementById("adminEmptyState");

  if (!list.length) {
    tbody.innerHTML = "";
    emptyState.classList.remove("hidden");
    return;
  }
  emptyState.classList.add("hidden");

  tbody.innerHTML = list.map(c => `
    <tr>
      <td>${nrEscapeHtml(c.businessName)}</td>
      <td>${nrEscapeHtml(c.title)}</td>
      <td>${nrEscapeHtml(c.country)}</td>
      <td>${nrEscapeHtml(c.audience)}</td>
      <td>${nrFormatNaira(c.budget)}</td>
      <td><span class="status-pill status-${c.status}">${c.status}</span></td>
      <td>
        <div class="row-actions">
          <button class="btn btn-primary btn-sm" data-action="approve" data-id="${c.id}" ${c.status === "approved" ? "disabled" : ""}>Approve</button>
          <button class="btn btn-outline btn-sm" data-action="reject" data-id="${c.id}" ${c.status === "rejected" ? "disabled" : ""}>Reject</button>
          <button class="btn btn-outline btn-sm" data-action="view" data-id="${c.id}">View</button>
        </div>
      </td>
    </tr>
  `).join("");

  tbody.querySelectorAll("button[data-action]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const action = btn.getAttribute("data-action");
      if (action === "approve") { nrUpdateCampaignStatus(id, "approved"); nrRenderAdmin(); }
      if (action === "reject") { nrUpdateCampaignStatus(id, "rejected"); nrRenderAdmin(); }
      if (action === "view") { nrOpenCampaignModal(id); }
    });
  });
}

function nrOpenCampaignModal(id) {
  const c = nrGetCampaigns().find(x => x.id === id);
  if (!c) return;
  const overlay = document.getElementById("campaignModal");
  const body = document.getElementById("campaignModalBody");
  document.getElementById("campaignModalTitle").textContent = c.title;
  body.innerHTML = `
    <div class="row"><span>Business</span><span>${nrEscapeHtml(c.businessName)}</span></div>
    <div class="row"><span>Description</span><span>${nrEscapeHtml(c.description)}</span></div>
    <div class="row"><span>Website</span><span>${nrEscapeHtml(c.url) || "—"}</span></div>
    <div class="row"><span>Category</span><span>${nrEscapeHtml(c.category)}</span></div>
    <div class="row"><span>Target country</span><span>${nrEscapeHtml(c.country)}</span></div>
    <div class="row"><span>Target city/region</span><span>${nrEscapeHtml(c.city)}</span></div>
    <div class="row"><span>Target audience</span><span>${nrEscapeHtml(c.audience)}</span></div>
    <div class="row"><span>Budget</span><span>${nrFormatNaira(c.budget)}</span></div>
    <div class="row"><span>Runs</span><span>${nrFormatDate(c.startDate)} – ${nrFormatDate(c.endDate)}</span></div>
    <div class="row"><span>Estimated impressions</span><span>${nrEstimateImpressions(c.budget).toLocaleString("en-NG")}</span></div>
    <div class="row"><span>Status</span><span><span class="status-pill status-${c.status}">${c.status}</span></span></div>
  `;
  overlay.classList.remove("hidden");
}

function nrInitModal() {
  const overlay = document.getElementById("campaignModal");
  if (!overlay) return;
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay || e.target.closest("[data-modal-close]")) {
      overlay.classList.add("hidden");
    }
  });
}

/* ----------------------------------- BOOT ----------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
  nrSeedExamples();
  nrInitNav();
  nrInitHomepage();
  nrInitCampaignForm();
  nrInitAdsPage();
  nrInitAdmin();
  nrInitModal();
});
