/* app.js — gallery, uploads, modal, animations */
(function(){
  const STORAGE_KEY = 'as_products_v1';
  const MAX_IMG = 2 * 1024 * 1024; // 2MB

  let products = [];
  let currentFilter = 'all';

  function loadProducts(){
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      products = raw ? JSON.parse(raw) : [];
    } catch(e){ products = []; }
  }
  function saveProducts(){
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(products)); }
    catch(e){ showToast(window.t('toast_toobig')); }
  }

  // ---------- Gallery render ----------
  window.renderGallery = function(){
    const grid = document.getElementById('galleryGrid');
    const empty = document.getElementById('emptyState');
    if(!grid) return;
    grid.innerHTML = '';
    const list = products.filter(p => currentFilter === 'all' || p.category === currentFilter);
    if(list.length === 0){ empty.style.display = 'flex'; return; }
    empty.style.display = 'none';

    list.slice().reverse().forEach((p, idx) => {
      const card = document.createElement('article');
      card.className = 'product-card glass reveal in';
      card.dataset.id = p.id;
      card.style.cursor = 'pointer';
      card.style.animationDelay = (idx * 0.06) + 's';
      card.innerHTML = `
        <div class="pc-media">
          <img src="${p.image}" alt="${escapeHtml(p.name)}" loading="lazy" />
          <span class="pc-cat">${window.t('filter_' + p.category)}</span>
        </div>
        <div class="pc-body">
          <h3 class="pc-name">${escapeHtml(p.name)}</h3>
          ${p.price ? `<div class="pc-price">${escapeHtml(p.price)}</div>` : ''}
          ${p.desc ? `<p class="pc-desc">${escapeHtml(p.desc)}</p>` : ''}
          <div class="pc-foot">
            <span class="pc-date">${window.t('created_label')} · ${formatDate(p.date)}</span>
            <button class="pc-del" data-id="${p.id}" aria-label="${window.t('btn_delete')}">🗑</button>
          </div>
        </div>`;
      grid.appendChild(card);
    });

    // delete handlers
    grid.querySelectorAll('.pc-del').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        products = products.filter(p => p.id !== id);
        saveProducts();
        renderGallery();
        showToast(window.t('toast_deleted'));
      });
    });
  };

  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function formatDate(iso){
    try { return new Date(iso).toLocaleDateString(); } catch(e){ return iso; }
  }

  // ---------- Upload modal ----------
  const modal = document.getElementById('uploadModal');
  function openModal(){ modal.classList.add('open'); modal.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; }
  function closeModal(){ modal.classList.remove('open'); modal.setAttribute('aria-hidden','true'); document.body.style.overflow=''; resetForm(); }
  function resetForm(){
    document.getElementById('uploadForm').reset();
    const prev = document.getElementById('previewImg');
    prev.hidden = true; prev.src = '';
    document.getElementById('dropInner').hidden = false;
    document.getElementById('uploadDrop').classList.remove('has-img');
  }

  document.getElementById('openUpload').addEventListener('click', openModal);
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalBackdrop').addEventListener('click', closeModal);
  document.getElementById('modalCancel').addEventListener('click', closeModal);

  // drag & drop
  const drop = document.getElementById('uploadDrop');
  const fileInput = document.getElementById('uplFile');
  drop.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
  ['dragenter','dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('drag'); }));
  ['dragleave','drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('drag'); }));
  drop.addEventListener('drop', e => {
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if(f) handleFile(f);
  });

  let currentFileData = null;
  function handleFile(file){
    if(!file) return;
    if(!file.type.startsWith('image/')) return;
    if(file.size > MAX_IMG){ showToast(window.t('toast_toobig')); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      currentFileData = ev.target.result;
      const prev = document.getElementById('previewImg');
      prev.src = currentFileData;
      prev.hidden = false;
      document.getElementById('dropInner').hidden = true;
      drop.classList.add('has-img');
    };
    reader.readAsDataURL(file);
  }

  document.getElementById('uploadForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('uplName').value.trim();
    if(!name){ showToast(window.t('toast_needname')); return; }
    if(!currentFileData){ showToast(window.t('toast_needimg')); return; }
    const prod = {
      id: 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2,7),
      name,
      category: document.getElementById('uplCat').value,
      price: document.getElementById('uplPrice').value.trim(),
      desc: document.getElementById('uplDesc').value.trim(),
      image: currentFileData,
      date: new Date().toISOString(),
    };
    products.push(prod);
    saveProducts();
    currentFileData = null;
    closeModal();
    renderGallery();
    showToast(window.t('toast_saved'));
    // scroll to gallery
    document.getElementById('gallery').scrollIntoView({behavior:'smooth'});
  });

  // ---------- Filter chips ----------
  document.getElementById('filterChips').addEventListener('click', e => {
    const btn = e.target.closest('.chip-btn');
    if(!btn) return;
    document.querySelectorAll('#filterChips .chip-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.getAttribute('data-filter');
    renderGallery();
  });

  // ---------- Product detail / zoom ----------
  const detailModal = document.getElementById('detailModal');
  let zoomScale = 1, zoomTx = 0, zoomTy = 0;
  const detailImg = document.getElementById('detailImg');
  const zoomViewport = document.getElementById('zoomViewport');
  function applyZoom(){
    detailImg.style.transform = `translate(${zoomTx}px, ${zoomTy}px) scale(${zoomScale})`;
    document.getElementById('zoomLevel').textContent = Math.round(zoomScale*100) + '%';
  }
  function resetZoom(){ zoomScale = 1; zoomTx = 0; zoomTy = 0; applyZoom(); }
  function openDetail(prod){
    if(!prod) return;
    document.getElementById('detailName').textContent = prod.name;
    const priceEl = document.getElementById('detailPrice');
    priceEl.textContent = prod.price || '';
    priceEl.style.display = prod.price ? '' : 'none';
    document.getElementById('detailDesc').textContent = prod.desc || '';
    document.getElementById('detailCat').textContent = window.t('filter_' + prod.category);
    document.getElementById('detailDate').textContent = window.t('created_label') + ' · ' + formatDate(prod.date);
    detailImg.src = prod.image;
    detailImg.alt = prod.name;
    resetZoom();
    detailModal.classList.add('open');
    detailModal.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
  }
  function closeDetail(){
    detailModal.classList.remove('open');
    detailModal.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
    detailImg.src = '';
  }
  document.getElementById('detailClose').addEventListener('click', closeDetail);
  document.getElementById('detailBackdrop').addEventListener('click', closeDetail);
  document.getElementById('zoomIn').addEventListener('click', () => { zoomScale = Math.min(4, zoomScale + 0.25); applyZoom(); });
  document.getElementById('zoomOut').addEventListener('click', () => { zoomScale = Math.max(0.5, zoomScale - 0.25); applyZoom(); });
  document.getElementById('zoomReset').addEventListener('click', resetZoom);

  // wheel zoom
  zoomViewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.15 : -0.15;
    zoomScale = Math.min(4, Math.max(0.5, zoomScale + delta));
    applyZoom();
  }, { passive: false });

  // drag to pan
  let dragging = false, startX=0, startY=0, origTx=0, origTy=0;
  zoomViewport.addEventListener('pointerdown', (e) => {
    dragging = true; zoomViewport.classList.add('dragging');
    startX = e.clientX; startY = e.clientY; origTx = zoomTx; origTy = zoomTy;
    zoomViewport.setPointerCapture(e.pointerId);
  });
  zoomViewport.addEventListener('pointermove', (e) => {
    if(!dragging) return;
    zoomTx = origTx + (e.clientX - startX);
    zoomTy = origTy + (e.clientY - startY);
    applyZoom();
  });
  zoomViewport.addEventListener('pointerup', () => { dragging = false; zoomViewport.classList.remove('dragging'); });
  zoomViewport.addEventListener('pointercancel', () => { dragging = false; zoomViewport.classList.remove('dragging'); });

  // click on gallery card -> open detail
  const grid = document.getElementById('galleryGrid');
  grid.addEventListener('click', (e) => {
    if(e.target.closest('.pc-del')) return;
    const card = e.target.closest('.product-card');
    if(!card) return;
    const id = card.dataset.id;
    const prod = products.find(p => p.id === id);
    if(prod) openDetail(prod);
  });

  // ---------- Contact form ----------
  document.getElementById('contactForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = (document.getElementById('formName').value || '').trim();
    const phone = (document.getElementById('formPhone').value || '').trim();
    const msg = (document.getElementById('formMsg').value || '').trim();
    const text = encodeURIComponent('Name: ' + name + '\\nPhone: ' + phone + '\\nProject: ' + msg);
    const status = document.getElementById('formStatus');
    status.textContent = window.t('form_sent');
    status.classList.add('show');
    // Open WhatsApp chat with prefilled message (received on phone)
    window.open('https://wa.me/221772037032?text=' + text, '_blank');
    // Open email client to send the same (received on Gmail)
    setTimeout(() => {
      window.location.href = 'mailto:papelemenuisier@gmail.com?subject=' + encodeURIComponent('New project request') + '&body=' + text;
    }, 400);
    e.target.reset();
    setTimeout(() => status.classList.remove('show'), 4000);
  });

  // ---------- Mobile menu ----------
  const menuToggle = document.getElementById('menuToggle');
  const nav = document.getElementById('nav');
  menuToggle.addEventListener('click', () => {
    nav.classList.toggle('open');
    menuToggle.classList.toggle('open');
  });
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('open');
    menuToggle.classList.remove('open');
  }));

  // ---------- Language switch ----------
  document.getElementById('langSwitch').addEventListener('click', e => {
    const btn = e.target.closest('button[data-lang]');
    if(!btn) return;
    document.querySelectorAll('#langSwitch button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    window.setLang(btn.getAttribute('data-lang'));
  });
  // sync active button on load
  document.querySelectorAll('#langSwitch button').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-lang') === window.I18N.current);
  });

  // ---------- Scroll reveal ----------
  const revealEls = () => document.querySelectorAll('.reveal');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if(en.isIntersecting){
        en.target.classList.add('in');
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  function observeReveals(){
    revealEls().forEach(el => { if(!el.classList.contains('in')) io.observe(el); });
  }
  observeReveals();
  // re-observe after gallery render adds elements (cards already .in)
  const mo = new MutationObserver(observeReveals);
  mo.observe(document.body, {childList:true, subtree:true});

  // ---------- Header shrink on scroll ----------
  const header = document.getElementById('siteHeader');
  window.addEventListener('scroll', () => {
    if(window.scrollY > 60) header.classList.add('scrolled');
    else header.classList.remove('scrolled');
  }, {passive:true});

  // ---------- Cursor glow ----------
  const glow = document.getElementById('cursorGlow');
  let gx=0, gy=0, cx=0, cy=0;
  window.addEventListener('mousemove', e => { gx = e.clientX; gy = e.clientY; }, {passive:true});
  function animGlow(){
    cx += (gx - cx) * 0.12;
    cy += (gy - cy) * 0.12;
    glow.style.transform = `translate(${cx-200}px, ${cy-200}px)`;
    requestAnimationFrame(animGlow);
  }
  animGlow();

  // ---------- Toast ----------
  let toastTimer = null;
  window.showToast = function(msg){
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
  };
  function showToast(msg){ window.showToast(msg); }

  // ---------- Admin area ----------
  const ADMIN_PASS = '$$Senegal1960';
  let isAdmin = (function(){ try { return sessionStorage.getItem('as_admin') === '1'; } catch(e){ return false; } })();

  function applyAdmin(){
    document.body.classList.toggle('is-admin', isAdmin);
    const lbl = document.getElementById('adminBtnLabel');
    if(lbl) lbl.textContent = isAdmin ? (window.t ? 'Logout' : 'Logout') : 'Admin';
  }
  const adminBtn = document.getElementById('adminBtn');
  const loginModal = document.getElementById('loginModal');
  function openLogin(){ loginModal.classList.add('open'); loginModal.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; document.getElementById('loginStatus').textContent=''; document.getElementById('loginForm').reset(); }
  function closeLogin(){ loginModal.classList.remove('open'); loginModal.setAttribute('aria-hidden','true'); document.body.style.overflow=''; }
  if(adminBtn) adminBtn.addEventListener('click', () => {
    if(isAdmin){
      isAdmin = false;
      try { sessionStorage.removeItem('as_admin'); } catch(e){}
      applyAdmin();
      showToast('Logged out.');
    } else {
      openLogin();
    }
  });
  document.getElementById('loginClose').addEventListener('click', closeLogin);
  document.getElementById('loginBackdrop').addEventListener('click', closeLogin);
  document.getElementById('loginCancel').addEventListener('click', closeLogin);
  document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const val = document.getElementById('loginPass').value;
    if(val === ADMIN_PASS){
      isAdmin = true;
      try { sessionStorage.setItem('as_admin','1'); } catch(e){}
      applyAdmin();
      closeLogin();
      showToast('Welcome, Pape!');
    } else {
      document.getElementById('loginStatus').textContent = 'Wrong password.';
    }
  });
  applyAdmin();

  // ---------- Init ----------
  loadProducts();
  // seed a couple of demo products if empty (optional)
  if(products.length === 0){
    // no seed, keep empty
  }
  renderGallery();
  window.applyI18n();

  // expose
  window.renderGallery = window.renderGallery;
})();
