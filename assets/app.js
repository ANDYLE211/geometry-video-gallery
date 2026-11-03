(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const grid = $('#video-grid');
  const filters = $('#filters');
  const search = $('#search-input');
  const sort = $('#sort-order');
  const dialog = $('#detail-dialog');
  const { compare, categoryRank, weight } = window.VideoOrder;
  let videos = [];
  let category = '全部作品';
  let editing = false;
  let draft = [];
  let dirty = false;
  let saving = false;
  let editorSession;
  let editorBar;
  let editorStatus;
  let saveButton;
  let cancelButton;
  const allowedUrl = (url) => { if(typeof url !== 'string') return null; if (/^assets\/[a-zA-Z0-9_.-]+$/.test(url)) return url; try { const u = new URL(url); return u.protocol === 'https:' ? u.href : null; } catch { return null; } };
  const el = (tag, className, text) => { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; };
  const defaultOption = el('option', '', '默认排序');
  defaultOption.value = 'default';
  sort.prepend(defaultOption);
  sort.value = 'default';
  function orderControls(video) {
    const controls = el('div', 'order-controls');
    const pinLabel = el('label', 'pin-control');
    const pin = el('input');
    pin.type = 'checkbox'; pin.checked = video.pinned === true; pin.disabled = saving;
    pin.setAttribute('aria-label', `置顶：${video.title}`);
    const weightLabel = el('label', 'weight-control', '权重');
    const input = el('input');
    input.type = 'number'; input.min = '-999999'; input.max = '999999'; input.step = '1'; input.value = String(weight(video));
    input.required = true; input.disabled = saving; input.setAttribute('aria-label', `排序权重：${video.title}`);
    const update = (control) => {
      if (saving) return;
      if (control === input && !input.reportValidity()) return;
      if (control === pin) video.pinned = pin.checked;
      else video.sortWeight = Number(input.value);
      dirty = true; editorStatus.textContent = '有未保存的更改';
      render();
      const updated = [...grid.querySelectorAll('.video-card')].find(item => item.dataset.videoId === String(video.id));
      updated?.querySelector(control === pin ? '[type="checkbox"]' : '[type="number"]')?.focus({ preventScroll: true });
    };
    pin.addEventListener('change', () => update(pin));
    input.addEventListener('change', () => update(input));
    pinLabel.append(pin, el('span', '', '置顶')); weightLabel.append(input);
    controls.append(pinLabel, weightLabel);
    return controls;
  }
  const validBvid = (value) => /^BV[\da-zA-Z]{10}$/.test(value || '');
  const videoMeta = (video) => video.duration ? `时长 ${video.duration}` : '';
  const getUrl = (video) => validBvid(video.bvid) ? `https://www.bilibili.com/video/${video.bvid}/` : null;
  const getEmbedUrl = (video) => { const u = new URL('https://player.bilibili.com/player.html'); u.searchParams.set('bvid', video.bvid); u.searchParams.set('p', String(Math.max(1, Number(video.page) || 1))); u.searchParams.set('autoplay', '0'); u.searchParams.set('danmaku', 'false'); return u.href; };
  function card(video) {
    const article = el('article', 'video-card');
    article.dataset.videoId = video.id;
    const btn = el('button', 'card-link'); btn.type = 'button'; btn.setAttribute('aria-label', `查看${video.title}的视频详情`); btn.addEventListener('click', () => openVideo(video));
    const thumb = el('div', 'thumbnail');
    const fallback = allowedUrl(`assets/${video.placeholder || 'cover-geometry.svg'}`) || 'assets/cover-geometry.svg';
    const img = el('img'); img.src = allowedUrl(video.cover) || fallback; img.alt = `${video.title}封面`; img.loading = 'lazy'; img.onerror = () => { img.onerror = null; img.src = fallback; };
    thumb.append(img, el('span','corner',video.category || '技术演示'),el('span','play-bubble','▶'));
    const content = el('div','card-content'); content.append(el('h3','',video.title),el('p','',video.summary || '点击查看视频详情。'));
    if (videoMeta(video)) content.append(el('div', 'results-count', videoMeta(video)));
    const bottom = el('div','card-bottom'); const tags = el('div','tag-list'); (video.tags || []).slice(0,2).forEach(tag => tags.append(el('span','tag',tag)));
    bottom.append(tags,el('span','view-more',validBvid(video.bvid) ? '观看视频 ↗' : '查看详情 ↗')); content.append(bottom); btn.append(thumb,content); article.append(btn);
    if (editing) article.append(orderControls(video));
    return article;
  }
  function render() {
    const term = search.value.trim().toLocaleLowerCase();
    const result = (editing ? draft : videos).filter(video => (category === '全部作品' || video.category === category) && [video.title,video.summary,video.description,video.category,...(video.tags||[])].join(' ').toLocaleLowerCase().includes(term));
    result.sort((a, b) => compare(a, b, editing ? 'default' : sort.value));
    grid.replaceChildren(...result.map(card)); $('#empty-state').hidden = result.length > 0; $('#results-count').textContent = `${result.length} / ${videos.length} 个作品`;
  }
  function finishEditing() {
    editing = false; dirty = false; draft = [];
    sort.disabled = false; sort.value = 'default';
    editorBar.remove();
    const url = new URL(location.href); url.searchParams.delete('edit');
    history.replaceState(null, '', url.pathname + url.search + url.hash);
    render();
  }
  async function startEditing() {
    if (new URLSearchParams(location.search).get('edit') !== '1') return;
    editorBar = el('div', 'order-editor');
    editorStatus = el('span', 'order-status', '正在连接排序编辑服务…');
    editorStatus.setAttribute('role', 'status');
    editorBar.append(el('strong', '', '编辑默认排序'), editorStatus);
    grid.before(editorBar);
    try {
      const response = await fetch('/api/video-order', { cache: 'no-store' });
      if (!response.ok) throw new Error('编辑服务不可用');
      editorSession = await response.json();
      if (!editorSession.token || !editorSession.revision || !Array.isArray(editorSession.videos)) throw new Error('编辑服务不可用');
    } catch {
      editorStatus.textContent = '无法进入编辑，请使用 python3 serve.py 启动本地维护服务。';
      return;
    }
    videos = editorSession.videos;
    editing = true; draft = videos.map(video => ({ ...video })); sort.disabled = true;
    editorStatus.textContent = '尚无更改';
    const actions = el('div', 'order-actions');
    saveButton = el('button', 'order-save', '保存为默认排序');
    cancelButton = el('button', 'order-cancel', '取消');
    saveButton.type = cancelButton.type = 'button';
    cancelButton.addEventListener('click', () => {
      if (!dirty || confirm('放弃尚未保存的排序更改？')) finishEditing();
    });
    saveButton.addEventListener('click', async () => {
      if (![...grid.querySelectorAll('input')].every(input => input.reportValidity())) return;
      saving = true; saveButton.disabled = cancelButton.disabled = true;
      grid.querySelectorAll('.order-controls input').forEach(input => { input.disabled = true; });
      editorStatus.textContent = '正在保存…';
      try {
        const response = await fetch('/api/video-order', {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Editor-Token': editorSession.token },
          body: JSON.stringify({ revision: editorSession.revision, order: draft.map(video => ({ id: video.id, pinned: video.pinned === true, sortWeight: weight(video) })) })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || '保存失败');
        videos = draft; finishEditing();
      } catch (error) {
        editorStatus.textContent = `保存失败：${error.message}。更改尚未保存。`;
      } finally {
        saving = false; saveButton.disabled = cancelButton.disabled = false;
        grid.querySelectorAll('.order-controls input').forEach(input => { input.disabled = false; });
      }
    });
    actions.append(cancelButton, saveButton); editorBar.append(actions);
    render();
  }
  window.addEventListener('beforeunload', event => {
    if (dirty || saving) { event.preventDefault(); event.returnValue = ''; }
  });
  function setCategory(value) { category = value; filters.querySelectorAll('button').forEach(btn => { const active = btn.dataset.category === value; btn.classList.toggle('active', active); btn.setAttribute('aria-pressed',String(active)); }); render(); }
  function renderFilters() {
    const categories = [...new Set(videos.map(video=>video.category))].sort((a, b) => categoryRank(a) - categoryRank(b));
    categories.push('全部作品');
    categories.forEach(item => { const btn = el('button','filter-chip',item); btn.type = 'button'; btn.dataset.category=item; btn.addEventListener('click',()=>setCategory(item)); filters.append(btn); });
    setCategory(category);
  }
  function link(label, href) { const a = el('a','',label+' ↗'); a.href=href; a.target='_blank'; a.rel='noopener noreferrer'; return a; }
  function openVideo(video) {
    $('#detail-category').textContent = [video.category || '技术演示', videoMeta(video)].filter(Boolean).join(' · '); $('#detail-title').textContent = video.title; $('#detail-description').textContent = video.description || video.summary || '';
    const tags = $('#detail-tags'); tags.replaceChildren(...(video.tags||[]).map(tag=>el('span','tag',tag)));
    const links = $('#detail-links'); links.replaceChildren();
    const url = getUrl(video); if(url) links.append(link('在 B 站观看',url));
    (video.links||[]).forEach(item=>{const safe=allowedUrl(item.url); if(safe) links.append(link(item.label || '相关链接',safe));});
    const player = $('#player-wrap'); player.replaceChildren();
    if(url) { const iframe=el('iframe'); iframe.src=getEmbedUrl(video); iframe.title=`${video.title} - B站播放器`; iframe.loading='lazy'; iframe.allow='autoplay; fullscreen; picture-in-picture'; iframe.setAttribute('allowfullscreen',''); iframe.referrerPolicy='strict-origin-when-cross-origin'; player.append(iframe); }
    else player.append(el('div','no-player','此视频尚未配置有效的 B 站 BV 号。\n请编辑 data/videos.json 中对应视频的 bvid 字段。'));
    dialog.showModal(); history.replaceState(null,'',`#video/${encodeURIComponent(video.id)}`);
  }
  function closeVideo() { dialog.close(); $('#player-wrap').replaceChildren(); history.replaceState(null,'','#works'); }
  $('#close-dialog').addEventListener('click',closeVideo);
  dialog.addEventListener('click',(event)=>{if(event.target===dialog)closeVideo();});
  dialog.addEventListener('close',()=>{$('#player-wrap').replaceChildren(); if(location.hash.startsWith('#video/'))history.replaceState(null,'','#works');});
  search.addEventListener('input',render);
  sort.addEventListener('change',render);
  $('#year').textContent = String(new Date().getFullYear());
  fetch('data/videos.json', { cache: 'no-store' }).then(response=>{ if(!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); }).then(data=>{
    if(!Array.isArray(data))throw new Error('JSON 根节点必须是数组');
    videos=data.filter(video=>video && video.id && video.title && video.category);
    $('#stat-total').textContent=String(videos.length).padStart(2,'0'); $('#stat-categories').textContent=String(new Set(videos.map(v=>v.category)).size).padStart(2,'0');
    renderFilters();
    startEditing();
    if(location.hash.startsWith('#video/')){const id=decodeURIComponent(location.hash.substring(7));const video=videos.find(v=>v.id===id);if(video)openVideo(video);}
  }).catch(error=>{console.error(error);$('#results-count').textContent='加载失败';grid.append(el('p','empty-state','无法读取视频数据。请通过本地 HTTP 服务打开网站，并检查 data/videos.json。'));});
})();
