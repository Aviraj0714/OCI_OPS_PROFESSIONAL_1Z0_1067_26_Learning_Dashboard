(function(){
  const VISITED_KEY = 'oci_dashboard_visited_v1';
  function getVisited(){
    try{ return JSON.parse(localStorage.getItem(VISITED_KEY) || '{}'); }
    catch(e){ return {}; }
  }
  function markVisited(id){
    const v = getVisited();
    v[id] = true;
    try{ localStorage.setItem(VISITED_KEY, JSON.stringify(v)); }catch(e){}
  }

  // Flatten a linear order of content pages (theory/lab) for prev/next nav
  const linearOrder = [];
  window.NAV_DAYS.forEach(d=>{
    if (d.theory) linearOrder.push({id:d.theory, day:d.day, kind:'theory', label:`Day ${d.day} Theory`});
    if (d.lab) linearOrder.push({id:d.lab, day:d.day, kind:'lab', label:`Day ${d.day} Hands-on Lab`});
  });

  const ALL_PAGE_IDS = linearOrder.map(x=>x.id).concat(window.NAV_PRACTICE.map(p=>p.id));
  const TOTAL_QUESTIONS = 55 + 93;

  let currentId = null; // 'home' or a page id

  const mainEl = document.getElementById('main');
  const homeView = document.getElementById('home-view');
  const loadingEl = document.getElementById('view-loading');

  function labelFor(id){
    const l = linearOrder.find(x=>x.id===id);
    if (l) return l.label;
    const p = window.NAV_PRACTICE.find(x=>x.id===id);
    if (p) return p.title;
    return id;
  }

  function dayGroupTitle(day){
    const d = window.NAV_DAYS.find(x=>x.day===day);
    return d ? `Day ${d.day} — ${d.title}` : `Day ${day}`;
  }

  // ---------- Sidebar ----------
  function buildSidebar(){
    const sb = document.getElementById('sidebar');
    sb.innerHTML = '';

    const home = document.createElement('div');
    home.className = 'side-home';
    home.textContent = '⌂ Dashboard';
    home.onclick = ()=> navigate('home');
    sb.appendChild(home);

    const daysLabel = document.createElement('div');
    daysLabel.className = 'side-section-label';
    daysLabel.textContent = 'Day-Wise Curriculum';
    sb.appendChild(daysLabel);

    const visited = getVisited();

    window.NAV_DAYS.forEach(d=>{
      const group = document.createElement('div');
      group.className = 'day-group';
      group.dataset.day = d.day;
      if ((d.theory && visited[d.theory]) || (d.lab && visited[d.lab])) group.classList.add('visited');

      const head = document.createElement('div');
      head.className = 'day-head';
      head.innerHTML = `<span class="day-num">${d.day}</span><span class="day-title">${d.title}</span><span class="chev">▶</span>`;
      head.onclick = ()=> group.classList.toggle('open');
      group.appendChild(head);

      const links = document.createElement('div');
      links.className = 'day-links';
      if (d.theory){
        const a = document.createElement('div');
        a.className = 'day-link'; a.dataset.id = d.theory;
        if (visited[d.theory]) a.classList.add('visited');
        a.innerHTML = `<span class="dot"></span>Theory Visualizer`;
        a.onclick = (e)=>{ e.stopPropagation(); navigate(d.theory); };
        links.appendChild(a);
      }
      if (d.lab){
        const a = document.createElement('div');
        a.className = 'day-link'; a.dataset.id = d.lab;
        if (visited[d.lab]) a.classList.add('visited');
        a.innerHTML = `<span class="dot"></span>Hands-on Lab`;
        a.onclick = (e)=>{ e.stopPropagation(); navigate(d.lab); };
        links.appendChild(a);
      }
      group.appendChild(links);
      sb.appendChild(group);
    });

    const pLabel = document.createElement('div');
    pLabel.className = 'side-section-label';
    pLabel.textContent = 'Practice';
    sb.appendChild(pLabel);

    window.NAV_PRACTICE.forEach(p=>{
      const el = document.createElement('div');
      el.className = 'practice-link';
      el.dataset.id = p.id;
      el.innerHTML = `<div class="pl-title">${p.title}</div><div class="pl-sub">${p.subtitle}</div>`;
      el.onclick = ()=> navigate(p.id);
      sb.appendChild(el);
    });
  }

  function updateSidebarActive(id){
    document.querySelectorAll('.day-link, .practice-link, .side-home').forEach(el=>el.classList.remove('active'));
    if (id === 'home'){
      document.querySelector('.side-home').classList.add('active');
      return;
    }
    const link = document.querySelector(`.day-link[data-id="${id}"]`);
    if (link){
      link.classList.add('active');
      const group = link.closest('.day-group');
      if (group) group.classList.add('open');
    }
    const pl = document.querySelector(`.practice-link[data-id="${id}"]`);
    if (pl) pl.classList.add('active');
  }

  // ---------- Dashboard ----------
  function renderDashboard(){
    const visited = getVisited();
    const visitedCount = ALL_PAGE_IDS.filter(id=>visited[id]).length;

    const stats = document.getElementById('home-stats');
    stats.innerHTML = `
      <div class="stat-card"><div class="stat-num">11</div><div class="stat-label">Learning Days</div></div>
      <div class="stat-card"><div class="stat-num">11</div><div class="stat-label">Theory Visualizers</div></div>
      <div class="stat-card"><div class="stat-num">9</div><div class="stat-label">Hands-on Labs</div></div>
      <div class="stat-card"><div class="stat-num">${TOTAL_QUESTIONS}</div><div class="stat-label">Practice Questions</div></div>
      <div class="stat-card"><div class="stat-num">${visitedCount}/${ALL_PAGE_IDS.length}</div><div class="stat-label">Sections Explored</div></div>
    `;

    const grid = document.getElementById('day-grid');
    grid.innerHTML = '';
    window.NAV_DAYS.forEach(d=>{
      const isVisited = (d.theory && visited[d.theory]) || (d.lab && visited[d.lab]);
      const card = document.createElement('div');
      card.className = 'day-card' + (isVisited ? ' visited' : '');
      const badges = [];
      if (d.theory) badges.push('<span class="dc-badge theory">Theory</span>');
      if (d.lab) badges.push('<span class="dc-badge lab">Hands-on Lab</span>');
      card.innerHTML = `
        <div class="dc-top"><span class="dc-num">DAY ${d.day}</span></div>
        <div class="dc-title">${d.title}</div>
        <div class="dc-badges">${badges.join('')}</div>
      `;
      card.onclick = ()=> navigate(d.theory || d.lab);
      grid.appendChild(card);
    });

    const pgrid = document.getElementById('practice-grid');
    pgrid.innerHTML = '';
    window.NAV_PRACTICE.forEach(p=>{
      const card = document.createElement('div');
      card.className = 'practice-card';
      card.innerHTML = `<div class="pc-title">${p.title}</div><div class="pc-sub">${p.subtitle}</div>`;
      card.onclick = ()=> navigate(p.id);
      pgrid.appendChild(card);
    });

    document.getElementById('progress-pill-text').innerHTML = `<b>${visitedCount}/${ALL_PAGE_IDS.length}</b> explored`;
  }

  // ---------- View topbar (breadcrumb + prev/next) ----------
  function buildViewTopbar(id, hostContainer){
    const bar = document.createElement('div');
    bar.className = 'view-topbar';

    const home = document.createElement('span');
    home.className = 'vb-crumb';
    home.textContent = 'Dashboard';
    home.onclick = ()=> navigate('home');
    bar.appendChild(home);

    const sep = document.createElement('span');
    sep.className = 'vb-sep'; sep.textContent = '›';
    bar.appendChild(sep);

    const cur = document.createElement('span');
    cur.className = 'vb-current';
    cur.textContent = labelFor(id);
    bar.appendChild(cur);

    const idx = linearOrder.findIndex(x=>x.id===id);
    if (idx !== -1){
      const nav = document.createElement('div');
      nav.className = 'vb-nav';
      const prevBtn = document.createElement('button');
      prevBtn.className = 'vb-navbtn'; prevBtn.textContent = '← Previous';
      prevBtn.disabled = idx <= 0;
      prevBtn.onclick = ()=> navigate(linearOrder[idx-1].id);
      const nextBtn = document.createElement('button');
      nextBtn.className = 'vb-navbtn'; nextBtn.textContent = 'Next →';
      nextBtn.disabled = idx >= linearOrder.length-1;
      nextBtn.onclick = ()=> navigate(linearOrder[idx+1].id);
      nav.appendChild(prevBtn); nav.appendChild(nextBtn);
      bar.appendChild(nav);
    }
    hostContainer.appendChild(bar);
  }

  // ---------- Router ----------
  const viewHosts = {}; // id -> element

  async function navigate(id){
    if (window.innerWidth <= 880) document.getElementById('sidebar').classList.remove('open');
    closeSearch();

    if (id === 'home'){
      document.querySelectorAll('.view-host').forEach(v=>v.classList.remove('active'));
      homeView.classList.add('active');
      renderDashboard();
      currentId = 'home';
      updateSidebarActive('home');
      location.hash = '';
      return;
    }

    markVisited(id);
    document.querySelectorAll('.view-host').forEach(v=>v.classList.remove('active'));
    homeView.classList.remove('active');

    if (viewHosts[id]){
      viewHosts[id].classList.add('active');
      currentId = id;
      updateSidebarActive(id);
      location.hash = id;
      return;
    }

    loadingEl.classList.add('active');
    const frame = document.createElement('div');
    frame.className = 'view-host';
    frame.id = 'view-' + id;
    buildViewTopbar(id, frame);
    const body = document.createElement('div');
    body.className = 'view-frame-body';
    frame.appendChild(body);
    mainEl.appendChild(frame);

    try{
      await window.ViewLoader.mount(id, body);
    }catch(e){
      body.innerHTML = `<div style="padding:30px;color:#ff6b6b;">Could not load this section: ${e.message}</div>`;
    }

    loadingEl.classList.remove('active');
    viewHosts[id] = frame;
    frame.classList.add('active');
    currentId = id;
    updateSidebarActive(id);
    location.hash = id;
    renderDashboardBadgesQuiet();
  }
  window.navigate = navigate;

  function renderDashboardBadgesQuiet(){
    // keep sidebar visited dots in sync without full sidebar rebuild
    const visited = getVisited();
    document.querySelectorAll('.day-link').forEach(a=>{
      if (visited[a.dataset.id]) a.classList.add('visited');
    });
    document.querySelectorAll('.day-group').forEach(g=>{
      const day = Number(g.dataset.day);
      const d = window.NAV_DAYS.find(x=>x.day===day);
      if (d && ((d.theory && visited[d.theory]) || (d.lab && visited[d.lab]))) g.classList.add('visited');
    });
  }

  // ---------- Global Search ----------
  let SEARCH_INDEX = window.SEARCH_INDEX || [];

  const searchInput = document.getElementById('global-search');
  const resultsEl = document.getElementById('search-results');

  function closeSearch(){
    resultsEl.classList.remove('open');
    resultsEl.innerHTML = '';
  }

  function runSearch(q){
    q = q.trim().toLowerCase();
    if (!q){ closeSearch(); return; }
    const hits = [];
    SEARCH_INDEX.forEach(page=>{
      let score = 0;
      const matchedTerms = [];
      if (page.title.toLowerCase().includes(q)) score += 5;
      page.terms.forEach(t=>{
        if (t.toLowerCase().includes(q)){ score += 1; matchedTerms.push(t); }
      });
      if (score > 0) hits.push({page, score, matchedTerms: matchedTerms.slice(0,3)});
    });
    hits.sort((a,b)=> b.score - a.score);
    resultsEl.innerHTML = '';
    if (!hits.length){
      resultsEl.innerHTML = '<div class="sr-empty">No matches. Try a topic like "VCN", "IAM policy", or "Terraform".</div>';
    } else {
      hits.slice(0,12).forEach(h=>{
        const item = document.createElement('div');
        item.className = 'sr-item';
        const metaBits = [];
        if (h.page.day) metaBits.push('Day ' + h.page.day);
        if (h.page.kind) metaBits.push(h.page.kind === 'theory' ? 'Theory' : h.page.kind === 'lab' ? 'Hands-on Lab' : 'Practice');
        if (h.matchedTerms.length) metaBits.push(h.matchedTerms.join(' · '));
        item.innerHTML = `<div class="sr-title">${h.page.title.split('|')[0].split('—')[0].trim()}</div><div class="sr-meta">${metaBits.join(' · ')}</div>`;
        item.onclick = ()=> { searchInput.value=''; navigate(h.page.id); };
        resultsEl.appendChild(item);
      });
    }
    resultsEl.classList.add('open');
  }
  searchInput.addEventListener('input', ()=> runSearch(searchInput.value));
  searchInput.addEventListener('focus', ()=> { if (searchInput.value) runSearch(searchInput.value); });
  document.addEventListener('click', (e)=>{
    if (!e.target.closest('#global-search-wrap')) closeSearch();
  });

  // ---------- Mobile menu ----------
  document.getElementById('menu-toggle').onclick = ()=>{
    document.getElementById('sidebar').classList.toggle('open');
  };
  document.querySelector('.brand').onclick = ()=> navigate('home');

  // ---------- Init ----------
  buildSidebar();
  const startId = location.hash ? location.hash.slice(1) : 'home';
  if (startId !== 'home' && ALL_PAGE_IDS.includes(startId)) navigate(startId);
  else navigate('home');
})();
