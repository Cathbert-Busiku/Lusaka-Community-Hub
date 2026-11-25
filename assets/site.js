/* Lusaka Community Hub Ministry – shared site script (no dependencies). */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  function toast(msg) {
    const t = document.createElement("div");
    t.className = "toast"; t.setAttribute("role", "status"); t.textContent = msg;
    document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
  }
  const fmtPhone = p => { const d = String(p).replace(/\D/g, ""); return d.startsWith("260") ? `+260 ${d.slice(3, 6)} ${d.slice(6, 9)} ${d.slice(9)}` : p; };
  const waLink = (p, text) => `https://wa.me/${String(p).replace(/\D/g, "")}${text ? "?text=" + encodeURIComponent(text) : ""}`;

  /* ---------------- Navigation ---------------- */
  const hubsBtn = $("#hubsBtn"), mega = $("#mega");
  if (hubsBtn && mega) {
    const close = () => { mega.classList.remove("open"); hubsBtn.setAttribute("aria-expanded", "false"); };
    hubsBtn.addEventListener("click", e => {
      e.stopPropagation();
      const open = !mega.classList.contains("open");
      mega.classList.toggle("open", open); hubsBtn.setAttribute("aria-expanded", String(open));
      if (open) $("a", mega).focus();
    });
    document.addEventListener("click", e => { if (!mega.contains(e.target)) close(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && mega.classList.contains("open")) { close(); hubsBtn.focus(); } });
  }
  const drawer = $("#drawer"), toggle = $("#menuToggle");
  if (drawer && toggle) {
    const open = () => { drawer.classList.add("open"); drawer.setAttribute("aria-hidden", "false"); toggle.setAttribute("aria-expanded", "true"); document.body.style.overflow = "hidden"; $(".drawer-panel a", drawer).focus(); };
    const close = () => { if (!drawer.classList.contains("open")) return; drawer.classList.remove("open"); drawer.setAttribute("aria-hidden", "true"); toggle.setAttribute("aria-expanded", "false"); document.body.style.overflow = ""; toggle.focus(); };
    toggle.addEventListener("click", open);
    drawer.addEventListener("click", e => { if (e.target.closest("[data-close]")) close(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
  }
  $$("[data-year]").forEach(el => { el.textContent = new Date().getFullYear(); });

  /* ---------------- Forms: validation + WhatsApp hand-off ---------------- */
  const clean = (s, max) => String(s || "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").replace(/[ \t]+/g, " ").trim().slice(0, max || 600);
  function normalisePhone(raw) {
    const d = raw.replace(/[\s\-().]/g, "");
    if (/^0[79]\d{8}$/.test(d)) return "+260" + d.slice(1);
    if (/^(\+?260)[79]\d{8}$/.test(d)) return "+260" + d.replace(/^\+?260/, "");
    if (/^\+[1-9]\d{7,14}$/.test(d)) return d;
    return null;
  }
  const isShown = el => !el.closest("[hidden]");

  function syncConditional(form) {
    $$("[data-show-if]", form).forEach(block => {
      const [name, vals] = block.dataset.showIf.split("=");
      const allowed = vals.split("|");
      const checked = $$(`[name="${name}"]`, form).filter(i => (i.type === "radio" || i.type === "checkbox") ? i.checked : true).map(i => i.value);
      const show = checked.some(v => allowed.includes(v));
      block.hidden = !show;
      $$("input,select,textarea", block).forEach(i => { i.disabled = !show; });
    });
    // Payment button visibility in the success panel is decided at submit time.
  }

  function setErr(field, msg) {
    const e = $("[data-err]", field);
    const ctrls = $$("input,select,textarea", field);
    if (msg) { field.setAttribute("data-invalid", ""); if (e) e.textContent = msg; ctrls.forEach(x => x.setAttribute("aria-invalid", "true")); }
    else { field.removeAttribute("data-invalid"); if (e) e.textContent = ""; ctrls.forEach(x => x.removeAttribute("aria-invalid")); }
  }

  function validate(form, focus) {
    let errors = 0;
    $$("[data-field]", form).forEach(field => {
      if (!isShown(field)) { setErr(field, ""); return; }
      const ctrls = $$("input,select,textarea", field).filter(c => !c.disabled);
      if (!ctrls.length) return;
      const c = ctrls[0];
      let msg = "";
      if (c.type === "radio") {
        if (field.hasAttribute("data-required") && !ctrls.some(r => r.checked)) msg = field.dataset.msg || "Choose one option.";
      } else if (c.type === "checkbox") {
        if (c.required && !c.checked) msg = field.dataset.msg || "Tick the box to continue.";
      } else {
        const v = clean(c.value, c.maxLength > 0 ? c.maxLength : 600);
        const kind = c.dataset.kind;
        if (c.required && !v) msg = field.dataset.msg || "This field is required.";
        else if (v && kind === "name" && (v.length < 2 || !/^[\p{L}\p{M}' .-]+$/u.test(v))) msg = "Enter your name using letters only.";
        else if (v && kind === "phone" && !normalisePhone(v)) msg = "Enter a valid number, for example 097 123 4567 or +260 97 123 4567.";
        else if (v && kind === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) msg = "Enter a valid email address, for example name@example.com.";
        else if (v && kind === "amount" && !(/^\d{1,7}(\.\d{1,2})?$/.test(v.replace(/,/g, "")) && parseFloat(v.replace(/,/g, "")) >= 10)) msg = "Enter an amount in Kwacha of at least K10, numbers only.";
        else if (v && c.minLength > 0 && v.length < c.minLength) msg = `Please write at least ${c.minLength} characters.`;
      }
      setErr(field, msg);
      if (msg) errors++;
    });
    const alert = $("[data-alert]", form);
    if (alert) alert.textContent = errors ? `Please fix ${errors === 1 ? "the highlighted field" : "the " + errors + " highlighted fields"} below.` : "";
    if (errors && focus) { const f = $("[data-invalid] input:not([disabled]),[data-invalid] select,[data-invalid] textarea", form); f && f.focus(); }
    return errors === 0;
  }

  function buildMessage(form) {
    const lines = [`Hello ${form.dataset.toLabel.replace(/^the /, "")},`, ""];
    let body = "";
    $$("[data-label]", form).forEach(c => {
      if (c.disabled || !isShown(c)) return;
      if ((c.type === "radio" || c.type === "checkbox") && !c.checked) return;
      let v = clean(c.value, c.maxLength > 0 ? c.maxLength : 600);
      if (!v || v === "__other") return;
      if (c.dataset.kind === "phone") v = normalisePhone(v) || v;
      if (c.dataset.kind === "amount") v = "K" + Number(v.replace(/,/g, "")).toLocaleString("en-GB");
      if (c.tagName === "TEXTAREA") body = clean(c.value.replace(/\r/g, ""), 1000);
      else lines.push(`${c.dataset.label}: ${v}`);
    });
    if (body) lines.push("", body);
    lines.push("", `(Sent from the ${document.body.dataset.site || "Lusaka Community Hub"} website)`);
    return lines.join("\n");
  }

  function wireForm(form) {
    const ok = document.getElementById(form.id + "-ok");
    const msg = $("textarea", form), count = $("[data-count]", form);
    if (msg && count) { const sync = () => { count.textContent = `${msg.value.length} / ${msg.maxLength}`; }; msg.addEventListener("input", sync); sync(); }

    // Preselect from the query string, e.g. get-involved.html?interest=financial#join
    const params = new URLSearchParams(location.search);
    $$("input[type=radio][data-key]", form).forEach(r => { if (params.get(r.name) === r.dataset.key) r.checked = true; });
    if (params.get("hub")) { const s = $("select[name=hub]", form); if (s) { const o = $$("option", s).find(o => o.dataset.key === params.get("hub")); if (o) s.value = o.value; } }

    syncConditional(form);
    form.addEventListener("change", () => { syncConditional(form); if (form.dataset.tried) validate(form, false); });
    form.addEventListener("input", () => { if (form.dataset.tried) validate(form, false); });
    form.addEventListener("submit", e => {
      e.preventDefault();
      form.dataset.tried = "1";
      if (!validate(form, true)) return;
      const text = buildMessage(form);
      $("[data-preview]", ok).textContent = text;
      $("[data-wa]", ok).href = waLink(form.dataset.to, text);
      ok.dataset.text = text;
      const pay = $("[data-pay]", ok);
      if (pay) {
        const fin = $$("[data-financial]", form).some(i => i.checked);
        pay.hidden = !(fin && form.dataset.payLink);
        if (!pay.hidden) pay.href = form.dataset.payLink;
        const note = $("[data-pay-note]", ok); if (note) note.hidden = !fin;
      }
      form.hidden = true; ok.hidden = false; ok.focus();
      ok.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    });
    $("[data-copy]", ok).addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(ok.dataset.text); toast("Message copied"); }
      catch (_) {
        const r = document.createRange(); r.selectNodeContents($("[data-preview]", ok));
        const s = getSelection(); s.removeAllRanges(); s.addRange(r); toast("Text selected. Press Ctrl+C or long-press to copy.");
      }
    });
    $("[data-edit]", ok).addEventListener("click", () => { ok.hidden = true; form.hidden = false; const f = $("input:not([type=radio]):not([disabled]),textarea", form); f && f.focus(); });
  }
  $$("form[data-wa]").forEach(wireForm);

  /* Amount chips: picking "Other" focuses the custom amount */
  $$("input[name=amount]").forEach(r => r.addEventListener("change", () => {
    if (r.value === "__other") { const o = $("#" + r.form.id + "-other"); o && setTimeout(() => o.focus(), 0); }
  }));

  /* ---------------- Resource library filter ---------------- */
  const lib = $("#library");
  if (lib) {
    const cards = $$("[data-res]", lib), chips = $$("[data-filter]"), q = $("#resSearch"), empty = $("#resEmpty"), countEl = $("#resCount");
    let type = "all";
    const apply = () => {
      const term = (q.value || "").trim().toLowerCase();
      let n = 0;
      cards.forEach(c => {
        const show = (type === "all" || c.dataset.type === type) && (!term || c.dataset.text.includes(term));
        c.hidden = !show; if (show) n++;
      });
      empty.hidden = n > 0;
      countEl.textContent = `${n} resource${n === 1 ? "" : "s"}`;
    };
    chips.forEach(ch => ch.addEventListener("click", () => {
      type = ch.dataset.filter;
      chips.forEach(c => c.setAttribute("aria-pressed", String(c === ch)));
      apply();
    }));
    q.addEventListener("input", apply);
    const reset = $("#resReset"); reset && reset.addEventListener("click", () => { q.value = ""; chips[0].click(); q.focus(); });
    apply();
  }

  /* Header shadow once the page scrolls */
  const header = $(".site-header");
  if (header) { const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 8); addEventListener("scroll", onScroll, { passive: true }); onScroll(); }

  window.LCH = { fmtPhone };
})();

/* ---------------- Motion: scroll reveal, staggered groups, count-up ---------------- */
(function () {
  "use strict";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.querySelectorAll(".stagger").forEach(g => {
    Array.from(g.children).forEach((c, i) => c.style.setProperty("--d", (Math.min(i, 8) * 0.08) + "s"));
  });
  const targets = document.querySelectorAll(".reveal, .stagger > *");
  if (reduce || !("IntersectionObserver" in window)) { targets.forEach(t => t.classList.add("in")); }
  else {
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
    }), { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    targets.forEach(t => io.observe(t));
    // Safety net: never leave content hidden
    setTimeout(() => targets.forEach(t => t.classList.add("in")), 4000);
  }
  const counters = document.querySelectorAll("[data-count]");
  const run = el => {
    const end = parseInt(el.dataset.count, 10); if (reduce || !end) { el.textContent = end; return; }
    const t0 = performance.now(), dur = 1200;
    const step = now => { const p = Math.min(1, (now - t0) / dur); el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  };
  if ("IntersectionObserver" in window && !reduce) {
    const co = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { run(en.target); co.unobserve(en.target); } }), { threshold: 0.6 });
    counters.forEach(c => co.observe(c));
  }
})();
