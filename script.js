/**
 * The PR Project — Main Script
 * Cleaned, organized, and hardened. Keeps all existing features.
 */
(() => {
  'use strict';

  // -------- Utilities --------
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const on = (el, evt, fn, opts) => el && el.addEventListener(evt, fn, opts);

  // Respect user motion preference
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;

  // -------- Mobile menu --------
  function initMobileMenu(){
    const btn = $('#mobile-menu-btn');
    const menu = $('#mobile-menu');
    const menuIcon = $('#menu-icon');
    const closeIcon = $('#close-icon');

    if (!btn || !menu) return;

    function setOpen(open){
      if (open){
        menu.removeAttribute('hidden');
        if (menuIcon)  menuIcon.style.display  = 'none';
        if (closeIcon) closeIcon.style.display = 'inline-block';
        btn.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
        document.body.style.touchAction = 'none';
      } else {
        menu.setAttribute('hidden', '');
        if (menuIcon)  menuIcon.style.display  = 'inline-block';
        if (closeIcon) closeIcon.style.display = 'none';
        btn.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
        document.body.style.touchAction = '';
      }
    }

    on(btn, 'click', () => {
      const isOpen = !menu.hasAttribute('hidden');
      setOpen(!isOpen);
    });

    // Close when clicking any link inside the drawer (event delegation)
    on(menu, 'click', (e) => {
      const a = e.target.closest('a');
      if (a) setOpen(false);
    });
  }

  // -------- Smooth scroll for in-page anchors --------
  function initSmoothScroll(){
    $$('a[href^="#"]').forEach(a => {
      on(a, 'click', (e) => {
        const id = a.getAttribute('href');
        if (!id || id === '#') return;
        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        const nav = $('.nav');
        const navH = nav ? nav.offsetHeight : 0;
        const top = target.getBoundingClientRect().top + window.pageYOffset - navH - 8; // 8px breathing room
        if (prefersReducedMotion){
          window.scrollTo(0, top);
        } else {
          window.scrollTo({ top, behavior: 'smooth' });
        }
      });
    });
  }

  // -------- Reveal on scroll --------
  function initRevealOnScroll(){
    const revealEls = $$('.reveal, .service-card, .case-card, .artist-card, .team-card, .stat-card');
    if (!revealEls.length) return;

    if (prefersReducedMotion){
      revealEls.forEach(el => { el.style.opacity = '1'; el.style.transform = 'none'; });
      return;
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting){
          entry.target.style.animation = 'fadeIn .4s ease-out forwards';
          io.unobserve(entry.target);
        }
      });
    }, {
      root: null,
      rootMargin: '0px 0px -2% 0px',
      threshold: 0.01
    });

    revealEls.forEach(el => io.observe(el));
  }

  // -------- Lightbox (guarded) --------
  function initLightbox(){
    const lb = $('#lightbox');
    if (!lb) return;

    const lbImg   = $('.lightbox-img', lb);
    const lbCap   = $('.lightbox-caption', lb);
    const lbClose = $('.lightbox-close', lb);

    function openLightbox(src, alt){
      if (!lbImg) return;
      lbImg.src = src;
      lbImg.alt = alt || '';
      if (lbCap) lbCap.textContent = alt || '';
      lb.setAttribute('aria-hidden','false');
      document.body.classList.add('modal-open');
    }
    function closeLightbox(){
      lb.setAttribute('aria-hidden','true');
      document.body.classList.remove('modal-open');
      if (lbImg){ lbImg.src = ''; lbImg.alt = ''; }
      if (lbCap) lbCap.textContent = '';
    }

    $$('.artist-image img, .case-image img').forEach(img => {
      on(img, 'click', () => openLightbox(img.src, img.alt));
    });

    on(lb, 'click', (e) => { if (e.target === lb) closeLightbox(); });
    on(lbClose, 'click', closeLightbox);
    on(document, 'keydown', (e) => { if (e.key === 'Escape') closeLightbox(); });
  }

  // -------- Lazy attributes for iframes (YouTube etc.) --------
  function initLazyIframes(){
    $$('iframe').forEach(f => {
      if (!f.hasAttribute('loading')) {
        f.setAttribute('loading', 'lazy');
      }
    });
  }

  // -------- Contact form (validate + submit to contact.php, mailto as fallback) --------
  function initContactForm(){
    const form = $('#contact-form');
    if (!form) return;

    const submitBtn  = form.querySelector('button[type="submit"]');
    const btnText    = submitBtn?.querySelector('.btn-text')   || null;
    const btnLoading = submitBtn?.querySelector('.btn-loading')|| null;
    const successBox = $('#success-message');
    const errorBox   = $('#error-message');

    const fields = {
      name:     $('#name', form),
      email:    $('#email', form),
      phone:    $('#phone', form),
      project:  $('#project', form),
      message:  $('#message', form),
      consent:  $('#consent', form),
      honeypot: $('#company', form)
    };

    // This script is shared by index.html (lang="es") and en/index.html (lang="en").
    const LANG = (document.documentElement.lang || 'es').toLowerCase().startsWith('en') ? 'en' : 'es';
    const MSG = {
      es: {
        name:    'Escribe tu nombre',
        email:   'Escribe un email válido',
        message: 'Cuéntanos tu proyecto',
        consent: 'Debes aceptar la Política de Privacidad para enviar el formulario.'
      },
      en: {
        name:    'Please enter your name',
        email:   'Please enter a valid email address',
        message: 'Tell us about your project',
        consent: 'You must accept the Privacy Policy before submitting the form.'
      }
    }[LANG];

    function setLoading(isLoading){
      if (!submitBtn) return;
      if (btnText)    btnText.style.display    = isLoading ? 'none'  : 'inline';
      if (btnLoading) btnLoading.style.display = isLoading ? 'inline' : 'none';
      submitBtn.disabled = !!isLoading;
    }

    function setFieldError(inputEl, message){
      if (!inputEl) return;
      // .form-group, not parentElement: the consent checkbox is nested inside .consent-row
      const group = inputEl.closest('.form-group') || inputEl.parentElement;
      const errorSpan = group && group.querySelector('.error-message');
      if (errorSpan) errorSpan.textContent = message || '';
      inputEl.setAttribute('aria-invalid', message ? 'true' : 'false');
      inputEl.classList.toggle('is-invalid', !!message);
    }

    function clearErrors(){
      $$('.error-message', form).forEach(sp => sp.textContent = '');
      $$('[aria-invalid="true"]', form).forEach(el => el.setAttribute('aria-invalid', 'false'));
      $$('.is-invalid', form).forEach(el => el.classList.remove('is-invalid'));
      if (errorBox)   errorBox.style.display = 'none';
      if (successBox) successBox.style.display = 'none';
    }

    function validate(){
      let ok = true;
      clearErrors();

      if (!fields.name.value.trim()){
        setFieldError(fields.name, MSG.name);
        ok = false;
      }

      const emailVal = fields.email.value.trim();
      const emailOk  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal);
      if (!emailVal || !emailOk){
        setFieldError(fields.email, MSG.email);
        ok = false;
      }

      if (!fields.message.value.trim()){
        setFieldError(fields.message, MSG.message);
        ok = false;
      }

      // RGPD: consent is mandatory — no consent, no submit.
      if (!fields.consent || !fields.consent.checked){
        setFieldError(fields.consent, MSG.consent);
        ok = false;
      }

      if (!ok){
        const firstInvalid = form.querySelector('.is-invalid');
        if (firstInvalid) firstInvalid.focus({ preventScroll: false });
      }
      return ok;
    }

    // Fallback mailto link, only surfaced if the real submission fails.
    function buildMailtoFallback(){
      const CRLF = '\r\n';
      const to = 'hola@theprproject.es';
      const subject = `Nuevo mensaje web — ${fields.name.value.trim()}`;
      const bodyLines = [
        `Nombre: ${fields.name.value}`,
        `Email: ${fields.email.value}`,
        `Teléfono: ${fields.phone.value || '-'}`,
        `Tipo de proyecto: ${fields.project.value || '-'}`,
        `Consentimiento RGPD: aceptado (${new Date().toISOString()})`,
        '',
        'Mensaje:',
        fields.message.value
      ];
      const bodyEncoded = encodeURIComponent(bodyLines.join(CRLF));
      return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${bodyEncoded}`;
    }

    const FALLBACK_TEXT = {
      es: 'Hubo un problema al enviar el formulario. Escríbenos directamente a',
      en: 'There was a problem sending the form. Please email us directly at'
    }[LANG];

    function showSendError(){
      if (!errorBox) return;
      const mailto = buildMailtoFallback();
      errorBox.innerHTML = `${FALLBACK_TEXT} <a href="${mailto}">hola@theprproject.es</a>.`;
      errorBox.style.display = 'block';
    }

    on(form, 'submit', (e) => {
      e.preventDefault();
      if (!validate()) return;
      setLoading(true);
      if (errorBox) errorBox.style.display = 'none';

      const payload = new URLSearchParams({
        name:    fields.name.value.trim(),
        email:   fields.email.value.trim(),
        phone:   fields.phone.value.trim(),
        project: fields.project.value,
        message: fields.message.value.trim(),
        consent: fields.consent.checked ? 'yes' : '',
        lang:    LANG,
        company: fields.honeypot ? fields.honeypot.value : ''
      });

      fetch('/contact.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: payload.toString()
      })
        .then((res) => res.json().catch(() => ({ success: false })))
        .then((data) => {
          setLoading(false);
          if (data && data.success) {
            if (successBox) successBox.style.display = 'block';
            form.reset();
            if (typeof gtag === 'function') {
              gtag('event', 'generate_lead', { 'event_category': 'contact', 'event_label': 'contact_form' });
            }
          } else {
            showSendError();
          }
        })
        .catch(() => {
          setLoading(false);
          showSendError();
        });
    });
  }

  // -------- Cookie consent (GDPR-friendly) --------
  function initCookieConsent(){
    const KEY = 'pr_cookie_consent_v1';

    // This script is shared by index.html (lang="es") and en/index.html + en/ pages (lang="en").
    const LANG = (document.documentElement.lang || 'es').toLowerCase().startsWith('en') ? 'en' : 'es';
    const T = {
      es: {
        title: 'Usamos cookies',
        text: 'Utilizamos cookies técnicas para que el sitio funcione y, con tu permiso, cookies analíticas para mejorar nuestra web. Puedes aceptar, rechazar o configurar tus preferencias.',
        accept: 'Aceptar todas',
        reject: 'Rechazar',
        settings: 'Configurar',
        panelTitle: 'Preferencias de cookies',
        panelIntro: 'Activa o desactiva las categorías opcionales. Las cookies técnicas son necesarias y no se pueden desactivar.',
        catTechnical: 'Cookies técnicas (necesarias)',
        catAnalytics: 'Cookies analíticas',
        cancel: 'Cancelar',
        save: 'Guardar'
      },
      en: {
        title: 'We use cookies',
        text: 'We use technical cookies to make the site work and, with your permission, analytics cookies to improve our website. You can accept, reject or manage your preferences.',
        accept: 'Accept all',
        reject: 'Reject',
        settings: 'Manage preferences',
        panelTitle: 'Cookie preferences',
        panelIntro: 'Enable or disable the optional categories. Technical cookies are required and cannot be disabled.',
        catTechnical: 'Technical cookies (required)',
        catAnalytics: 'Analytics cookies',
        cancel: 'Cancel',
        save: 'Save'
      }
    }[LANG];

    function getConsent(){
      try { return JSON.parse(localStorage.getItem(KEY) || '{}'); }
      catch { return {}; }
    }
    function setConsent(obj){
      try { localStorage.setItem(KEY, JSON.stringify(obj)); }
      catch { /* ignore quota errors */ }
    }
    function hasMadeChoice(){
      const c = getConsent();
      return typeof c.accepted !== 'undefined' || typeof c.rejected !== 'undefined' || c.settings;
    }

    function buildBanner(){
      const el = document.createElement('div');
      el.className = 'cookie-banner';
      el.innerHTML = `
        <div class="cookie-title">${T.title}</div>
        <div class="cookie-text">${T.text}</div>
        <div class="cookie-actions">
          <button type="button" class="cookie-btn cookie-accept">${T.accept}</button>
          <button type="button" class="cookie-btn cookie-reject">${T.reject}</button>
          <button type="button" class="cookie-btn cookie-settings">${T.settings}</button>
        </div>
      `;
      document.body.appendChild(el);

      on($('.cookie-accept', el), 'click', () => {
        setConsent({ analytics:true, accepted:true, ts:Date.now() });
        el.remove();
        updateConsentState();
        document.dispatchEvent(new Event('pr:cookie-banner-dismissed'));
      });
      on($('.cookie-reject', el), 'click', () => {
        setConsent({ analytics:false, rejected:true, ts:Date.now() });
        el.remove();
        document.dispatchEvent(new Event('pr:cookie-banner-dismissed'));
      });
      on($('.cookie-settings', el), 'click', openSettings);
    }

    function buildSettings(){
      const modal = document.createElement('div');
      modal.className = 'cookie-modal';
      modal.id = 'cookie-modal';
      modal.innerHTML = `
        <div class="cookie-panel" role="dialog" aria-modal="true" aria-labelledby="cookie-title">
          <h3 id="cookie-title">${T.panelTitle}</h3>
          <p>${T.panelIntro}</p>
          <div class="cookie-options">
            <div class="cookie-option">
              <span>${T.catTechnical}</span>
              <input type="checkbox" checked disabled>
            </div>
            <div class="cookie-option">
              <span>${T.catAnalytics}</span>
              <label><input type="checkbox" id="ck-ana"></label>
            </div>
          </div>
          <div class="cookie-actions">
            <button type="button" class="cookie-btn cookie-reject" id="ck-cancel">${T.cancel}</button>
            <button type="button" class="cookie-btn cookie-accept cookie-save" id="ck-save">${T.save}</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      const saved = getConsent();
      $('#ck-ana').checked  = !!saved.analytics;

      on($('#ck-cancel'), 'click', () => modal.removeAttribute('open'));
      on($('#ck-save'), 'click', () => {
        const ana  = $('#ck-ana').checked;
        setConsent({ analytics:ana, settings:true, ts:Date.now() });
        modal.removeAttribute('open');
        updateConsentState();
      });
      return modal;
    }

    function openSettings(e){
      e && e.preventDefault && e.preventDefault();
      let modal = $('#cookie-modal');
      if(!modal){ modal = buildSettings(); }
      modal.setAttribute('open','');
    }

    // Allow opening settings from known IDs
    on(document, 'click', (ev) => {
      const id = ev.target?.id || '';
      if (id === 'open-cookie-settings' || id === 'open-cookie-settings-2' || id === 'open-cookie-settings-footer'){
        openSettings(ev);
      }
    });

    function updateConsentState(){
      if(typeof gtag !== 'function') return;
      const consent = getConsent();
      gtag('consent', 'update', {
        'analytics_storage': consent.analytics ? 'granted' : 'denied'
      });
    }

    function init(){
      if(!hasMadeChoice()){
        buildBanner();
      }else{
        updateConsentState();
      }
    }

    if (document.readyState === 'loading'){
      on(document, 'DOMContentLoaded', init);
    } else {
      init();
    }

    // Expose a tiny helper for testing
    window.resetCookieConsent = function(){
      try { localStorage.removeItem(KEY); } catch {}
      location.reload();
    };
  }

  // -------- Stat counter animation --------
  function initStatCounters(){
    const counters = $$('.stat-number[data-count]');
    if (!counters.length || prefersReducedMotion) return;

    const animate = (el) => {
      const target = parseInt(el.dataset.count, 10);
      const suffix = el.dataset.suffix || '';
      const duration = 1200;
      const start = performance.now();

      const tick = (now) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(eased * target) + suffix;
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animate(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    counters.forEach(el => io.observe(el));
  }

  // -------- Sticky contact CTA --------
  function initStickyCta(){
    const cta = $('.sticky-cta');
    if (!cta) return;

    const showThreshold = () => window.innerHeight * 0.6;
    let contactInView = false;

    const contactSection = $('#contacto') || $('#contact');
    if (contactSection && 'IntersectionObserver' in window){
      const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => { contactInView = entry.isIntersecting; });
        update();
      }, { threshold: 0.1 });
      io.observe(contactSection);
    }

    function update(){
      const pastHero = window.scrollY > showThreshold();
      const cookieBannerShowing = !!document.querySelector('.cookie-banner');
      const shouldShow = pastHero && !contactInView && !cookieBannerShowing;
      cta.classList.toggle('is-visible', shouldShow);
    }

    let ticking = false;
    on(window, 'scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { update(); ticking = false; });
    }, { passive:true });
    on(document, 'pr:cookie-banner-dismissed', update);

    update();
  }

  // -------- Analytics event tracking --------
  function initAnalyticsTracking(){
    // Scroll depth tracking (25 / 50 / 75 / 90 %)
    const depths = [25, 50, 75, 90];
    const fired = new Set();
    window.addEventListener('scroll', () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max <= 0) return;
      const pct = Math.round((window.scrollY / max) * 100);
      depths.forEach(d => {
        if (pct >= d && !fired.has(d)) {
          fired.add(d);
          if (typeof gtag === 'function') gtag('event', 'scroll', { 'percent_scrolled': d });
        }
      });
    }, { passive: true });

    // Outbound links, mailto and tel tracking
    on(document, 'click', (e) => {
      const link = e.target.closest('a[href]');
      if (!link || typeof gtag !== 'function') return;
      const href = link.getAttribute('href') || '';
      if (href.startsWith('mailto:')) {
        gtag('event', 'click', { 'event_category': 'contact', 'event_label': href });
      } else if (href.startsWith('tel:')) {
        gtag('event', 'click', { 'event_category': 'contact', 'event_label': 'phone' });
      } else if (link.hostname && link.hostname !== location.hostname) {
        gtag('event', 'click', { 'event_category': 'outbound', 'event_label': link.href });
      }
    });
  }

  // -------- Boot --------
  function boot(){
    initMobileMenu();
    initSmoothScroll();
    initRevealOnScroll();
    initStatCounters();
    initLightbox();
    initLazyIframes();
    initContactForm();
    initCookieConsent();
    initStickyCta();
    initAnalyticsTracking();
  }

  if (document.readyState === 'loading'){
    on(document, 'DOMContentLoaded', boot);
  } else {
    boot();
  }
})();