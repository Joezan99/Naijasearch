/* =========================================================
   NaijaReach — shared script
   Data and authentication now run through Supabase (see
   supabase-config.js for the client). No secrets live in this
   file — only the public anon key, loaded from supabase-config.js,
   which is safe to expose (see the comment there).

   File map:
   - AUTH HELPERS          -> sign up / in / out, password reset, profile lookup
   - CONFIG / DATA         -> category/audience/country lists, small helpers
   - UTILS                 -> formatting helpers
   - NAV                   -> mobile menu, active link, auth-aware links (all pages)
   - HOMEPAGE              -> index.html example ads (from Supabase)
   - CAMPAIGN FORM         -> campaign.html form + live preview + Supabase insert
   - ADS PAGE              -> ads.html grid (from Supabase)
   - MY CAMPAIGNS          -> my-campaigns.html (advertiser's own campaigns)
   - ADMIN                 -> admin.html real auth + role check + dashboard
   - AUTH PAGES            -> login.html, signup.html, forgot/reset password
   ========================================================= */

/* ---------------------------- AUTH HELPERS ---------------------------- */

async function nrGetSession() {
  const { data, error } = await nrSupabase.auth.getSession();
  if (error) {
    console.error("NaijaReach: could not read session", error);
    return null;
  }
  return data.session;
}

async function nrGetProfile(userId) {
  const { data, error } = await nrSupabase
    .from("profiles")
    .select("id, email, role, business_name")
    .eq("id", userId)
    .single();
  if (error) {
    console.error("NaijaReach: could not load profile", error);
    return null;
  }
  return data;
}

async function nrRedirectAfterAuth(userId) {
  const profile = await nrGetProfile(userId);
  window.location.href = (profile && profile.role === "admin") ? "admin.html" : "my-campaigns.html";
}

function nrSignUp(email, password) {
  return nrSupabase.auth.signUp({ email, password });
}

function nrSignIn(email, password) {
  return nrSupabase.auth.signInWithPassword({ email, password });
}

function nrSignOut() {
  return nrSupabase.auth.signOut();
}

function nrRequestPasswordReset(email) {
  const redirectTo = new URL("reset-password.html", window.location.href).href;
  return nrSupabase.auth.resetPasswordForEmail(email, { redirectTo });
}

function nrUpdatePassword(newPassword) {
  return nrSupabase.auth.updateUser({ password: newPassword });
}

function nrAuthErrorMessage(error) {
  if (!error) return "Something went wrong. Please try again.";
  const msg = error.message || "";
  if (/already registered/i.test(msg)) return "That email is already registered — try logging in instead.";
  if (/invalid login credentials/i.test(msg)) return "Incorrect email or password.";
  if (/email not confirmed/i.test(msg)) return "Please confirm your email first — check your inbox for a confirmation link.";
  if (/password should be at least/i.test(msg)) return msg;
  return msg || "Something went wrong. Please try again.";
}

/* ---------------------------- CONFIG / DATA ---------------------------- */

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

function nrInitNavBasics() {
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

async function nrInitNavAuthSlot() {
  const slot = document.getElementById("navAuthSlot");
  if (!slot) return;

  const session = await nrGetSession();

  if (session) {
    slot.innerHTML = `
      <a href="dashboard.html">Dashboard</a>
      <a href="#" id="navLogoutLink">Log out</a>
    `;
    const logoutLink = document.getElementById("navLogoutLink");
    if (logoutLink) {
      logoutLink.addEventListener("click", async (e) => {
        e.preventDefault();
        await nrSignOut();
        window.location.href = "index.html";
      });
    }
  } else {
    slot.innerHTML = `
      <a href="login.html">Log in</a>
      <a href="signup.html">Sign up</a>
    `;
  }
}

function nrInitNav() {
  nrInitNavBasics();
  nrInitNavAuthSlot();
}

/* ---------------------------- DASHBOARD SUB-NAV ---------------------------- */
/* Shared pill nav for the advertiser area (dashboard, my-business, services,
   campaigns, create campaign, billing, settings). Pages that need it just
   include an empty <div id="dashSubnavSlot"></div> — public pages that don't
   have this element are unaffected. */

function nrInitDashSubnav() {
  const slot = document.getElementById("dashSubnavSlot");
  if (!slot) return;

  const links = [
    { href: "dashboard.html", label: "Dashboard" },
    { href: "my-business.html", label: "My Business" },
    { href: "services.html", label: "Services" },
    { href: "my-campaigns.html", label: "Campaigns" },
    { href: "campaign.html", label: "Create Campaign" },
    { href: "billing.html", label: "Billing" },
    { href: "settings.html", label: "Settings" }
  ];

  const current = location.pathname.split("/").pop() || "index.html";

  slot.innerHTML = `
    <nav class="dash-subnav">
      ${links.map(l => `<a href="${l.href}" class="${l.href === current ? "active" : ""}">${l.label}</a>`).join("")}
    </nav>
  `;
}

/* --------------------------------- AD CARDS --------------------------------- */

function nrRenderAdCard(c) {
  return `
    <article class="ad-card">
      <div class="ad-card-media">${nrEscapeHtml(c.business_name)}</div>
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

/* --------------------------------- HOMEPAGE --------------------------------- */

async function nrInitHomepage() {
  const grid = document.getElementById("homeAdGrid");
  if (!grid) return;

  const { data, error } = await nrSupabase
    .from("campaigns")
    .select("*")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(3);

  if (error) {
    console.error("NaijaReach: could not load homepage ads", error);
    grid.innerHTML = `<p>Couldn't load advertisements right now — please refresh.</p>`;
    return;
  }

  grid.innerHTML = data.length
    ? data.map(nrRenderAdCard).join("")
    : `<p>No live advertisements yet — be the first to <a href="campaign.html">create a campaign</a>.</p>`;
}

/* ------------------------------ CAMPAIGN FORM ------------------------------ */

async function nrInitCampaignForm() {
  const form = document.getElementById("campaignForm");
  if (!form) return;

  nrFillSelect(document.getElementById("category"), NR_CATEGORIES, "Select a category");
  nrFillSelect(document.getElementById("country"), NR_COUNTRIES, "Select a country");
  nrFillSelect(document.getElementById("audience"), NR_AUDIENCES, "Select target audience");

  const businessSelect = document.getElementById("businessSelect");
  const noBusinessPrompt = document.getElementById("noBusinessPrompt");
  const businessFieldWrap = document.getElementById("businessFieldWrap");
  const campaignFormSession = await nrGetSession();

  if (businessSelect) {
    if (campaignFormSession) {
      const myBusinesses = await nrGetMyBusinesses(campaignFormSession.user.id);
      if (myBusinesses.length) {
        let html = `<option value="">No business (general ad)</option>`;
        html += myBusinesses.map(b => `<option value="${b.id}">${nrEscapeHtml(b.business_name)} (${b.status})</option>`).join("");
        businessSelect.innerHTML = html;
        if (businessFieldWrap) businessFieldWrap.classList.remove("hidden");
        if (noBusinessPrompt) noBusinessPrompt.classList.add("hidden");
      } else {
        if (businessFieldWrap) businessFieldWrap.classList.add("hidden");
        if (noBusinessPrompt) noBusinessPrompt.classList.remove("hidden");
      }
    } else {
      // Not logged in yet — hide both; the existing loginRequiredBanner on
      // submit already covers this case, no need to show business UI too.
      if (businessFieldWrap) businessFieldWrap.classList.add("hidden");
      if (noBusinessPrompt) noBusinessPrompt.classList.add("hidden");
    }
  }

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
  const loginRequiredBanner = document.getElementById("loginRequiredBanner");
  const submitErrorBanner = document.getElementById("submitErrorBanner");

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

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    submitErrorBanner.classList.add("hidden");
    loginRequiredBanner.classList.add("hidden");

    if (!validate()) {
      successBanner.classList.add("hidden");
      const firstInvalid = form.querySelector(".field.invalid");
      if (firstInvalid) firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const session = await nrGetSession();
    if (!session) {
      loginRequiredBanner.classList.remove("hidden");
      loginRequiredBanner.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const submitBtn = form.querySelector("button[type='submit']");
    submitBtn.disabled = true;

    const { error } = await nrSupabase.from("campaigns").insert({
      user_id: session.user.id,
      business_id: (businessSelect && businessSelect.value) ? businessSelect.value : null,
      business_name: fields.businessName.value.trim(),
      title: fields.title.value.trim(),
      description: fields.description.value.trim(),
      url: fields.url.value.trim() || null,
      category: fields.category.value,
      country: fields.country.value,
      city: fields.city.value.trim(),
      audience: fields.audience.value,
      budget: Number(fields.budget.value),
      start_date: fields.startDate.value,
      end_date: fields.endDate.value
    });

    submitBtn.disabled = false;

    if (error) {
      console.error("NaijaReach: campaign insert failed", error);
      submitErrorBanner.textContent = "Something went wrong submitting your campaign. Please try again.";
      submitErrorBanner.classList.remove("hidden");
      return;
    }

    form.reset();
    updatePreview();
    Object.keys(fields).forEach(k => fields[k].closest(".field").classList.remove("invalid"));
    successBanner.classList.remove("hidden");
    successBanner.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

/* ---------------------------------- ADS PAGE ---------------------------------- */

async function nrInitAdsPage() {
  const grid = document.getElementById("adsGrid");
  if (!grid) return;
  const filterSelect = document.getElementById("adsFilter");
  nrFillSelect(filterSelect, NR_CATEGORIES, null);
  filterSelect.insertAdjacentHTML("afterbegin", `<option value="" selected>All categories</option>`);

  async function render() {
    grid.innerHTML = `<div class="empty-state">Loading advertisements…</div>`;

    let query = nrSupabase
      .from("campaigns")
      .select("*")
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    const filter = filterSelect.value;
    if (filter) query = query.eq("category", filter);

    const { data, error } = await query;

    if (error) {
      console.error("NaijaReach: could not load ads", error);
      grid.innerHTML = `<div class="empty-state">Couldn't load advertisements right now — please refresh.</div>`;
      return;
    }

    grid.innerHTML = data.length
      ? data.map(nrRenderAdCard).join("")
      : `<div class="empty-state">No advertisements in this category yet.</div>`;
  }

  filterSelect.addEventListener("change", render);
  render();
}

/* --------------------------- BUSINESS / SERVICES DATA --------------------------- */
/* These wrap the "businesses" and "business_services" tables added in the
   Phase 1 discovery-system migration. Row Level Security on both tables
   already restricts reads/writes to what each user is allowed to touch —
   these helpers don't re-implement that, they just call Supabase. */

async function nrGetCategories() {
  const { data, error } = await nrSupabase
    .from("categories")
    .select("id, name")
    .eq("status", "active")
    .order("name", { ascending: true });
  if (error) {
    console.error("NaijaReach: could not load categories", error);
    return [];
  }
  return data;
}

async function nrFillCategorySelect(select, placeholder) {
  if (!select) return;
  const categories = await nrGetCategories();
  let html = placeholder ? `<option value="" ${placeholder ? "selected" : ""}>${placeholder}</option>` : "";
  html += categories.map(c => `<option value="${c.id}">${nrEscapeHtml(c.name)}</option>`).join("");
  select.innerHTML = html;
}

/* Phase 1 keeps this to one business per user in the UI (the database
   itself allows more — owner_id has no uniqueness constraint — this is
   just the simplest advertiser experience for now). This always returns
   the user's first (oldest) business, or null if they have none yet. */
async function nrGetMyBusiness(userId) {
  const { data, error } = await nrSupabase
    .from("businesses")
    .select("*")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("NaijaReach: could not load business", error);
    return null;
  }
  return data;
}

async function nrGetMyBusinesses(userId) {
  const { data, error } = await nrSupabase
    .from("businesses")
    .select("id, business_name, status")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("NaijaReach: could not load businesses", error);
    return [];
  }
  return data;
}

function nrCreateBusiness(payload) {
  return nrSupabase.from("businesses").insert(payload).select().single();
}

function nrUpdateBusiness(id, payload) {
  return nrSupabase.from("businesses").update(payload).eq("id", id).select().single();
}

async function nrGetMyServices(businessId) {
  const { data, error } = await nrSupabase
    .from("business_services")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("NaijaReach: could not load services", error);
    return [];
  }
  return data;
}

function nrCreateService(payload) {
  return nrSupabase.from("business_services").insert(payload).select().single();
}

function nrUpdateService(id, payload) {
  return nrSupabase.from("business_services").update(payload).eq("id", id);
}

function nrDeleteService(id) {
  return nrSupabase.from("business_services").delete().eq("id", id);
}

/* ------------------------------- MY CAMPAIGNS ------------------------------- */

let nrModalCampaignsCache = [];

async function nrInitMyCampaignsPage() {
  const gate = document.getElementById("myCampaignsAuthGate");
  const wrap = document.getElementById("myCampaignsWrap");
  if (!wrap) return;

  const session = await nrGetSession();

  if (!session) {
    gate.classList.remove("hidden");
    wrap.classList.add("hidden");
    return;
  }

  gate.classList.add("hidden");
  wrap.classList.remove("hidden");

  const { data, error } = await nrSupabase
    .from("campaigns")
    .select("*")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });

  const listEl = document.getElementById("myCampaignsList");
  const emptyEl = document.getElementById("myCampaignsEmpty");

  if (error) {
    console.error("NaijaReach: could not load your campaigns", error);
    emptyEl.textContent = "Couldn't load your campaigns right now — please refresh.";
    emptyEl.classList.remove("hidden");
    return;
  }

  nrModalCampaignsCache = data;

  if (!data.length) {
    emptyEl.classList.remove("hidden");
    listEl.innerHTML = "";
    return;
  }
  emptyEl.classList.add("hidden");

  listEl.innerHTML = data.map(c => `
    <div class="campaign-card">
      <div class="campaign-card-top">
        <div>
          <h3>${nrEscapeHtml(c.title)}</h3>
          <span class="biz">${nrEscapeHtml(c.business_name)}</span>
        </div>
        <span class="status-pill status-${c.status}">${c.status}</span>
      </div>
      <dl class="campaign-card-grid">
        <dt>Category</dt><dd>${nrEscapeHtml(c.category)}</dd>
        <dt>Budget</dt><dd>${nrFormatNaira(c.budget)}</dd>
        <dt>Location</dt><dd>${nrEscapeHtml(c.city)}, ${nrEscapeHtml(c.country)}</dd>
        <dt>Payment</dt><dd>${nrEscapeHtml(c.payment_status)}</dd>
      </dl>
      <div class="campaign-card-actions">
        <button class="btn btn-outline btn-sm" data-action="view" data-id="${c.id}">View details</button>
      </div>
    </div>
  `).join("");

  listEl.querySelectorAll("button[data-action='view']").forEach(btn => {
    btn.addEventListener("click", () => nrOpenCampaignModal(btn.getAttribute("data-id")));
  });
}

/* --------------------------------- DASHBOARD HUB --------------------------------- */

async function nrInitDashboardPage() {
  const gate = document.getElementById("dashboardAuthGate");
  const wrap = document.getElementById("dashboardWrap");
  if (!wrap) return;

  const session = await nrGetSession();
  if (!session) {
    gate.classList.remove("hidden");
    wrap.classList.add("hidden");
    return;
  }
  gate.classList.add("hidden");
  wrap.classList.remove("hidden");

  document.getElementById("dashboardEmail").textContent = session.user.email;

  const business = await nrGetMyBusiness(session.user.id);
  const businessCard = document.getElementById("dashboardBusinessCard");

  if (business) {
    businessCard.innerHTML = `
      <h3 style="margin-bottom:4px;">${nrEscapeHtml(business.business_name)}</h3>
      <span class="status-pill status-${business.status}">${business.status}</span>
      <p style="margin-top:10px;">Manage your profile, services and campaigns from the links below.</p>
      <a href="my-business.html" class="btn btn-outline btn-sm">Edit business profile</a>
    `;
  } else {
    businessCard.innerHTML = `
      <h3 style="margin-bottom:4px;">No business profile yet</h3>
      <p>Create one so you can list services and link your campaigns to a persistent business page.</p>
      <a href="my-business.html" class="btn btn-primary btn-sm">Create your business profile</a>
    `;
  }

  const { data: myCampaigns, error } = await nrSupabase
    .from("campaigns")
    .select("status")
    .eq("user_id", session.user.id);

  const campaignCountEl = document.getElementById("dashboardCampaignCount");
  if (!error && campaignCountEl) {
    campaignCountEl.textContent = myCampaigns.length;
  }
}

/* --------------------------------- MY BUSINESS --------------------------------- */

async function nrInitMyBusinessPage() {
  const gate = document.getElementById("businessAuthGate");
  const wrap = document.getElementById("businessWrap");
  const form = document.getElementById("businessForm");
  if (!wrap || !form) return;

  const session = await nrGetSession();
  if (!session) {
    gate.classList.remove("hidden");
    wrap.classList.add("hidden");
    return;
  }
  gate.classList.add("hidden");
  wrap.classList.remove("hidden");

  const categorySelect = document.getElementById("businessCategory");
  await nrFillCategorySelect(categorySelect, "Select a category");

  const fields = {
    businessName: document.getElementById("businessNameField"),
    description: document.getElementById("businessDescription"),
    category: categorySelect,
    website: document.getElementById("businessWebsite"),
    phone: document.getElementById("businessPhone"),
    email: document.getElementById("businessEmail"),
    country: document.getElementById("businessCountry"),
    state: document.getElementById("businessState"),
    city: document.getElementById("businessCity"),
    address: document.getElementById("businessAddress")
  };

  const successBanner = document.getElementById("businessSuccess");
  const errorBanner = document.getElementById("businessError");
  const statusNote = document.getElementById("businessStatusNote");
  const formTitle = document.getElementById("businessFormTitle");
  const submitBtn = document.getElementById("businessSubmitBtn");

  const existing = await nrGetMyBusiness(session.user.id);

  if (existing) {
    formTitle.textContent = "Edit your business profile";
    submitBtn.textContent = "Save changes";
    fields.businessName.value = existing.business_name || "";
    fields.description.value = existing.description || "";
    if (existing.category_id) fields.category.value = existing.category_id;
    fields.website.value = existing.website || "";
    fields.phone.value = existing.phone || "";
    fields.email.value = existing.email || "";
    fields.country.value = existing.country || "";
    fields.state.value = existing.state || "";
    fields.city.value = existing.city || "";
    fields.address.value = existing.address || "";
    statusNote.innerHTML = `Status: <span class="status-pill status-${existing.status}">${existing.status}</span> &nbsp; Verification: <span class="status-pill status-${existing.verification_status}">${existing.verification_status}</span>`;
    statusNote.classList.remove("hidden");
  } else {
    formTitle.textContent = "Create your business profile";
    submitBtn.textContent = "Create business";
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    successBanner.classList.add("hidden");
    errorBanner.classList.add("hidden");

    if (!fields.businessName.value.trim() || !fields.country.value.trim() || !fields.city.value.trim()) {
      errorBanner.textContent = "Business name, country and city are required.";
      errorBanner.classList.remove("hidden");
      return;
    }

    submitBtn.disabled = true;

    const payload = {
      business_name: fields.businessName.value.trim(),
      description: fields.description.value.trim() || null,
      category_id: fields.category.value || null,
      website: fields.website.value.trim() || null,
      phone: fields.phone.value.trim() || null,
      email: fields.email.value.trim() || null,
      country: fields.country.value.trim(),
      state: fields.state.value.trim() || null,
      city: fields.city.value.trim(),
      address: fields.address.value.trim() || null
    };

    let result;
    if (existing) {
      result = await nrUpdateBusiness(existing.id, payload);
    } else {
      result = await nrCreateBusiness({ ...payload, owner_id: session.user.id });
    }

    submitBtn.disabled = false;

    if (result.error) {
      console.error("NaijaReach: business save failed", result.error);
      errorBanner.textContent = "Something went wrong saving your business profile. Please try again.";
      errorBanner.classList.remove("hidden");
      return;
    }

    successBanner.textContent = existing ? "Business profile updated." : "Business profile created.";
    successBanner.classList.remove("hidden");
    successBanner.scrollIntoView({ behavior: "smooth", block: "center" });

    if (!existing) {
      setTimeout(() => window.location.reload(), 1200);
    }
  });
}

/* ----------------------------------- SERVICES ----------------------------------- */

async function nrInitServicesPage() {
  const gate = document.getElementById("servicesAuthGate");
  const noBusinessGate = document.getElementById("servicesNoBusinessGate");
  const wrap = document.getElementById("servicesWrap");
  if (!wrap) return;

  const session = await nrGetSession();
  if (!session) {
    gate.classList.remove("hidden");
    noBusinessGate.classList.add("hidden");
    wrap.classList.add("hidden");
    return;
  }
  gate.classList.add("hidden");

  const business = await nrGetMyBusiness(session.user.id);
  if (!business) {
    noBusinessGate.classList.remove("hidden");
    wrap.classList.add("hidden");
    return;
  }
  noBusinessGate.classList.add("hidden");
  wrap.classList.remove("hidden");

  const form = document.getElementById("serviceForm");
  const nameField = document.getElementById("serviceName");
  const descField = document.getElementById("serviceDescription");
  const priceField = document.getElementById("servicePrice");
  const statusField = document.getElementById("serviceStatus");
  const formTitle = document.getElementById("serviceFormTitle");
  const submitBtn = document.getElementById("serviceSubmitBtn");
  const cancelEditBtn = document.getElementById("serviceCancelEdit");
  const successBanner = document.getElementById("serviceSuccess");
  const errorBanner = document.getElementById("serviceError");
  const listEl = document.getElementById("servicesList");
  const emptyEl = document.getElementById("servicesEmpty");

  let editingId = null;

  function resetForm() {
    editingId = null;
    form.reset();
    statusField.value = "active";
    formTitle.textContent = "Add a service";
    submitBtn.textContent = "Add service";
    cancelEditBtn.classList.add("hidden");
  }

  async function renderServices() {
    const services = await nrGetMyServices(business.id);

    if (!services.length) {
      emptyEl.classList.remove("hidden");
      listEl.innerHTML = "";
      return;
    }
    emptyEl.classList.add("hidden");

    listEl.innerHTML = services.map(s => `
      <div class="campaign-card">
        <div class="campaign-card-top">
          <div>
            <h3>${nrEscapeHtml(s.name)}</h3>
            <span class="biz">${s.price != null ? nrFormatNaira(s.price) : "Contact for price"}</span>
          </div>
          <span class="status-pill status-${s.status}">${s.status}</span>
        </div>
        <dl class="campaign-card-grid">
          <dt>Description</dt><dd>${nrEscapeHtml(s.description || "—")}</dd>
        </dl>
        <div class="campaign-card-actions">
          <button class="btn btn-outline btn-sm" data-action="edit" data-id="${s.id}">Edit</button>
          <button class="btn btn-outline btn-sm" data-action="delete" data-id="${s.id}">Delete</button>
        </div>
      </div>
    `).join("");

    listEl.querySelectorAll("button[data-action='edit']").forEach(btn => {
      btn.addEventListener("click", async () => {
        const s = services.find(x => String(x.id) === btn.getAttribute("data-id"));
        if (!s) return;
        editingId = s.id;
        nameField.value = s.name || "";
        descField.value = s.description || "";
        priceField.value = s.price != null ? s.price : "";
        statusField.value = s.status;
        formTitle.textContent = "Edit service";
        submitBtn.textContent = "Save changes";
        cancelEditBtn.classList.remove("hidden");
        form.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });

    listEl.querySelectorAll("button[data-action='delete']").forEach(btn => {
      btn.addEventListener("click", async () => {
        if (!confirm("Delete this service? This can't be undone.")) return;
        const { error } = await nrDeleteService(btn.getAttribute("data-id"));
        if (error) {
          console.error("NaijaReach: service delete failed", error);
          alert("Couldn't delete this service. Please try again.");
          return;
        }
        if (editingId === btn.getAttribute("data-id")) resetForm();
        await renderServices();
      });
    });
  }

  cancelEditBtn.addEventListener("click", resetForm);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    successBanner.classList.add("hidden");
    errorBanner.classList.add("hidden");

    if (!nameField.value.trim()) {
      errorBanner.textContent = "Service name is required.";
      errorBanner.classList.remove("hidden");
      return;
    }

    submitBtn.disabled = true;

    const payload = {
      name: nameField.value.trim(),
      description: descField.value.trim() || null,
      price: priceField.value ? Number(priceField.value) : null,
      status: statusField.value
    };

    let result;
    if (editingId) {
      result = await nrUpdateService(editingId, payload);
    } else {
      result = await nrCreateService({ ...payload, business_id: business.id });
    }

    submitBtn.disabled = false;

    if (result.error) {
      console.error("NaijaReach: service save failed", result.error);
      errorBanner.textContent = "Something went wrong saving this service. Please try again.";
      errorBanner.classList.remove("hidden");
      return;
    }

    successBanner.textContent = editingId ? "Service updated." : "Service added.";
    successBanner.classList.remove("hidden");
    resetForm();
    await renderServices();
  });

  statusField.value = "active";
  await renderServices();
}

/* ------------------------------------ BILLING ------------------------------------ */

async function nrInitBillingPage() {
  const gate = document.getElementById("billingAuthGate");
  const wrap = document.getElementById("billingWrap");
  if (!wrap) return;

  const session = await nrGetSession();
  if (!session) {
    gate.classList.remove("hidden");
    wrap.classList.add("hidden");
    return;
  }
  gate.classList.add("hidden");
  wrap.classList.remove("hidden");
}

/* ----------------------------------- SETTINGS ----------------------------------- */

async function nrInitSettingsPage() {
  const gate = document.getElementById("settingsAuthGate");
  const wrap = document.getElementById("settingsWrap");
  if (!wrap) return;

  const session = await nrGetSession();
  if (!session) {
    gate.classList.remove("hidden");
    wrap.classList.add("hidden");
    return;
  }
  gate.classList.add("hidden");
  wrap.classList.remove("hidden");

  document.getElementById("settingsEmail").textContent = session.user.email;

  const logoutBtn = document.getElementById("settingsLogout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await nrSignOut();
      window.location.href = "index.html";
    });
  }
}

/* ------------------------------------ ADMIN ------------------------------------ */

async function nrInitAdmin() {
  const dashboard = document.getElementById("adminDashboard");
  if (!dashboard) return;

  const gate = document.getElementById("adminAuthGate");
  const gateContent = document.getElementById("adminGateContent");

  const session = await nrGetSession();

  if (!session) {
    gateContent.innerHTML = `
      <h2 style="font-size:1.2rem;">Admin sign in required</h2>
      <p>Log in with an admin account to view this dashboard.</p>
      <a href="login.html" class="btn btn-primary btn-block">Go to login</a>
    `;
    gate.classList.remove("hidden");
    dashboard.classList.add("hidden");
    return;
  }

  const profile = await nrGetProfile(session.user.id);

  if (!profile || profile.role !== "admin") {
    gateContent.innerHTML = `
      <h2 style="font-size:1.2rem;">Access denied</h2>
      <p>Signed in as ${nrEscapeHtml(session.user.email)}, but this account doesn't have admin access.</p>
      <button class="btn btn-outline btn-block" id="adminGateLogout">Log out</button>
    `;
    gate.classList.remove("hidden");
    dashboard.classList.add("hidden");
    const gateLogout = document.getElementById("adminGateLogout");
    if (gateLogout) {
      gateLogout.addEventListener("click", async () => {
        await nrSignOut();
        window.location.reload();
      });
    }
    return;
  }

  gate.classList.add("hidden");
  dashboard.classList.remove("hidden");
  await nrRenderAdmin();

  const logoutBtn = document.getElementById("adminLogout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await nrSignOut();
      window.location.href = "index.html";
    });
  }
}

async function nrRenderAdmin() {
  const { data: list, error } = await nrSupabase
    .from("campaigns")
    .select("*")
    .order("created_at", { ascending: false });

  const tbody = document.getElementById("adminTableBody");
  const emptyState = document.getElementById("adminEmptyState");

  if (error) {
    console.error("NaijaReach: admin campaign fetch failed", error);
    tbody.innerHTML = "";
    emptyState.textContent = "Couldn't load campaigns right now — please refresh.";
    emptyState.classList.remove("hidden");
    return;
  }

  nrModalCampaignsCache = list;

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

  if (!list.length) {
    tbody.innerHTML = "";
    emptyState.classList.remove("hidden");
    return;
  }
  emptyState.classList.add("hidden");

  tbody.innerHTML = list.map(c => `
    <tr>
      <td>${nrEscapeHtml(c.business_name)}</td>
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
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      const action = btn.getAttribute("data-action");

      if (action === "view") { nrOpenCampaignModal(id); return; }

      const newStatus = action === "approve" ? "approved" : "rejected";
      btn.disabled = true;
      const { error: updateError } = await nrSupabase
        .from("campaigns")
        .update({ status: newStatus })
        .eq("id", id);

      if (updateError) {
        console.error("NaijaReach: status update failed", updateError);
        alert("Couldn't update this campaign. Please try again.");
        btn.disabled = false;
        return;
      }
      await nrRenderAdmin();
    });
  });
}

function nrOpenCampaignModal(id) {
  const c = nrModalCampaignsCache.find(x => String(x.id) === String(id));
  if (!c) return;
  const overlay = document.getElementById("campaignModal");
  const body = document.getElementById("campaignModalBody");
  document.getElementById("campaignModalTitle").textContent = c.title;
  body.innerHTML = `
    <div class="row"><span>Business</span><span>${nrEscapeHtml(c.business_name)}</span></div>
    <div class="row"><span>Description</span><span>${nrEscapeHtml(c.description)}</span></div>
    <div class="row"><span>Website</span><span>${nrEscapeHtml(c.url) || "—"}</span></div>
    <div class="row"><span>Category</span><span>${nrEscapeHtml(c.category)}</span></div>
    <div class="row"><span>Target country</span><span>${nrEscapeHtml(c.country)}</span></div>
    <div class="row"><span>Target city/region</span><span>${nrEscapeHtml(c.city)}</span></div>
    <div class="row"><span>Target audience</span><span>${nrEscapeHtml(c.audience)}</span></div>
    <div class="row"><span>Budget</span><span>${nrFormatNaira(c.budget)}</span></div>
    <div class="row"><span>Runs</span><span>${nrFormatDate(c.start_date)} – ${nrFormatDate(c.end_date)}</span></div>
    <div class="row"><span>Estimated impressions</span><span>${nrEstimateImpressions(c.budget).toLocaleString("en-NG")}</span></div>
    <div class="row"><span>Payment status</span><span>${nrEscapeHtml(c.payment_status)}</span></div>
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

/* ---------------------------------- AUTH PAGES ---------------------------------- */

async function nrInitLoginPage() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  const existingSession = await nrGetSession();
  if (existingSession) { await nrRedirectAfterAuth(existingSession.user.id); return; }

  const msg = document.getElementById("loginMessage");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.classList.add("hidden");
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    const btn = document.getElementById("loginSubmitBtn");
    btn.disabled = true;

    const { data, error } = await nrSignIn(email, password);
    btn.disabled = false;

    if (error) {
      msg.textContent = nrAuthErrorMessage(error);
      msg.classList.remove("hidden");
      return;
    }
    await nrRedirectAfterAuth(data.user.id);
  });
}

async function nrInitSignupPage() {
  const form = document.getElementById("signupForm");
  if (!form) return;

  const existingSession = await nrGetSession();
  if (existingSession) { await nrRedirectAfterAuth(existingSession.user.id); return; }

  const msg = document.getElementById("signupMessage");
  const successMsg = document.getElementById("signupSuccess");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.classList.add("hidden");
    successMsg.classList.add("hidden");

    const email = document.getElementById("signupEmail").value.trim();
    const password = document.getElementById("signupPassword").value;
    const confirm = document.getElementById("signupConfirmPassword").value;

    if (password.length < 6) {
      msg.textContent = "Password should be at least 6 characters.";
      msg.classList.remove("hidden");
      return;
    }
    if (password !== confirm) {
      msg.textContent = "Passwords don't match.";
      msg.classList.remove("hidden");
      return;
    }

    const btn = document.getElementById("signupSubmitBtn");
    btn.disabled = true;
    const { data, error } = await nrSignUp(email, password);
    btn.disabled = false;

    if (error) {
      msg.textContent = nrAuthErrorMessage(error);
      msg.classList.remove("hidden");
      return;
    }

    form.reset();

    // If email confirmation is required, Supabase returns a user with no
    // active session yet. If confirmation is off, a session comes back
    // immediately and we can send them straight in.
    if (data.session) {
      window.location.href = "my-campaigns.html";
    } else {
      successMsg.classList.remove("hidden");
    }
  });
}

async function nrInitForgotPasswordPage() {
  const form = document.getElementById("forgotPasswordForm");
  if (!form) return;

  const msg = document.getElementById("forgotPasswordMessage");
  const successMsg = document.getElementById("forgotPasswordSuccess");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.classList.add("hidden");
    successMsg.classList.add("hidden");

    const email = document.getElementById("forgotPasswordEmail").value.trim();
    const btn = document.getElementById("forgotPasswordSubmitBtn");
    btn.disabled = true;
    const { error } = await nrRequestPasswordReset(email);
    btn.disabled = false;

    if (error) {
      msg.textContent = nrAuthErrorMessage(error);
      msg.classList.remove("hidden");
      return;
    }
    form.reset();
    successMsg.classList.remove("hidden");
  });
}

async function nrInitResetPasswordPage() {
  const form = document.getElementById("resetPasswordForm");
  if (!form) return;

  const invalidLinkNotice = document.getElementById("resetPasswordInvalid");
  const msg = document.getElementById("resetPasswordMessage");
  const successMsg = document.getElementById("resetPasswordSuccess");

  // Supabase's client detects the recovery token in the URL automatically
  // and turns it into a temporary session. If there's no session at all,
  // the link was invalid, already used, or expired.
  const session = await nrGetSession();
  if (!session) {
    form.classList.add("hidden");
    invalidLinkNotice.classList.remove("hidden");
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.classList.add("hidden");

    const password = document.getElementById("resetPassword").value;
    const confirm = document.getElementById("resetConfirmPassword").value;

    if (password.length < 6) {
      msg.textContent = "Password should be at least 6 characters.";
      msg.classList.remove("hidden");
      return;
    }
    if (password !== confirm) {
      msg.textContent = "Passwords don't match.";
      msg.classList.remove("hidden");
      return;
    }

    const btn = document.getElementById("resetPasswordSubmitBtn");
    btn.disabled = true;
    const { error } = await nrUpdatePassword(password);
    btn.disabled = false;

    if (error) {
      msg.textContent = nrAuthErrorMessage(error);
      msg.classList.remove("hidden");
      return;
    }

    form.classList.add("hidden");
    successMsg.classList.remove("hidden");
  });
}

/* ----------------------------------- BOOT ----------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
  nrInitNav();
  nrInitDashSubnav();
  nrInitHomepage();
  nrInitCampaignForm();
  nrInitAdsPage();
  nrInitMyCampaignsPage();
  nrInitAdmin();
  nrInitModal();
  nrInitLoginPage();
  nrInitSignupPage();
  nrInitForgotPasswordPage();
  nrInitResetPasswordPage();
  nrInitDashboardPage();
  nrInitMyBusinessPage();
  nrInitServicesPage();
  nrInitBillingPage();
  nrInitSettingsPage();
});
