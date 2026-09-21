/*!
 * 面试题页：加载题库、筛选/搜索、答案懒渲染与折叠展开
 */
(function () {
  'use strict';

  var PAGE_SIZE = 30;
  var esc = Store.escapeHtml;

  var state = {
    all: [],
    filtered: [],
    cat: '',
    type: '',
    topic: '',
    q: '',
    shown: PAGE_SIZE,
    expandAll: false
  };

  var els = {};
  var index = {};

  function byId(id) { return document.getElementById(id); }

  /* ---------- URL 同步 ---------- */

  function readUrl() {
    var params = new URLSearchParams(window.location.search);
    state.cat = params.get('cat') || '';
    state.type = params.get('type') || '';
    state.topic = params.get('topic') || '';
    state.q = params.get('q') || '';
  }

  function writeUrl() {
    var params = new URLSearchParams();
    if (state.cat) params.set('cat', state.cat);
    if (state.type) params.set('type', state.type);
    if (state.topic) params.set('topic', state.topic);
    if (state.q) params.set('q', state.q);
    var qs = params.toString();
    if (window.history.replaceState) {
      window.history.replaceState(null, '', qs ? '?' + qs : window.location.pathname);
    }
  }

  /* ---------- 工具 ---------- */

  function unique(values) {
    var seen = Object.create(null), out = [];
    values.forEach(function (value) {
      if (value && !seen[value]) { seen[value] = 1; out.push(value); }
    });
    return out;
  }

  function debounce(fn, wait) {
    var timer = null;
    return function () {
      var args = arguments, self = this;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(self, args); }, wait);
    };
  }

  /* ---------- 筛选 ---------- */

  function applyFilter() {
    var keyword = state.q.trim().toLowerCase();
    state.filtered = state.all.filter(function (item) {
      if (state.cat && item.category !== state.cat) return false;
      if (state.type && item.type !== state.type) return false;
      if (state.topic && item.topic !== state.topic) return false;
      if (keyword) {
        var hay = (item.question + ' ' + (item.tags || []).join(' ')).toLowerCase();
        if (hay.indexOf(keyword) === -1) return false;
      }
      return true;
    });
    state.shown = PAGE_SIZE;
  }

  /* ---------- 片段 ---------- */

  function chip(label, value, key, active) {
    return '<button type="button" class="iv-chip' + (active ? ' is-active' : '') +
      '" data-key="' + esc(key) + '" data-value="' + esc(value) + '">' + esc(label) + '</button>';
  }

  function badge(text, kind) {
    return '<span class="iv-badge iv-badge-' + kind + '">' + esc(text) + '</span>';
  }

  function cardHtml(item) {
    var badges = badge(item.category, 'cat') + badge(item.type, item.type === '代码' ? 'code' : 'short');
    if (item.topic) badges += badge(item.topic, 'topic');
    (item.tags || []).forEach(function (tag) { badges += badge('#' + tag, 'tag'); });

    return '<article class="iv-card" data-id="' + esc(item.id) + '">' +
        '<div class="iv-top">' +
          '<div class="iv-main">' +
            '<div class="iv-q">' + Markdown.render(item.question) + '</div>' +
            '<div class="iv-meta">' + badges + '</div>' +
          '</div>' +
          '<button class="iv-toggle" type="button" data-toggle aria-expanded="false">查看答案</button>' +
        '</div>' +
        '<div class="iv-ans" hidden></div>' +
      '</article>';
  }

  /* ---------- 交互 ---------- */

  function renderChips() {
    var cats = unique(state.all.map(function (i) { return i.category; }));
    var types = unique(state.all.map(function (i) { return i.type; }));

    els.cat.innerHTML = chip('全部', '', 'cat', !state.cat) +
      cats.map(function (c) { return chip(c, c, 'cat', state.cat === c); }).join('');

    els.type.innerHTML = chip('全部', '', 'type', !state.type) +
      types.map(function (t) { return chip(t, t, 'type', state.type === t); }).join('');
  }

  function renderTopics() {
    var pool = state.all.filter(function (i) { return !state.cat || i.category === state.cat; });
    var topics = unique(pool.map(function (i) { return i.topic; }));
    if (state.topic && topics.indexOf(state.topic) === -1) state.topic = '';

    els.topic.innerHTML = '<option value="">全部主题</option>' +
      topics.map(function (t) {
        return '<option value="' + esc(t) + '"' + (state.topic === t ? ' selected' : '') + '>' + esc(t) + '</option>';
      }).join('');
  }

  function updateMore() {
    var rest = state.filtered.length - state.shown;
    if (rest > 0) {
      els.more.hidden = false;
      els.more.textContent = '加载更多（还有 ' + rest + ' 题）';
    } else {
      els.more.hidden = true;
    }
  }

  function renderCount() {
    if (!state.filtered.length) {
      els.count.textContent = '共 ' + state.all.length + ' 题，当前条件下没有匹配的题目';
      return;
    }
    els.count.textContent = state.filtered.length === state.all.length
      ? '共 ' + state.all.length + ' 题'
      : '共 ' + state.all.length + ' 题，当前筛选出 ' + state.filtered.length + ' 题';
  }

  function renderList() {
    var items = state.filtered.slice(0, state.shown);
    els.list.innerHTML = items.length
      ? items.map(cardHtml).join('')
      : '<div class="empty">没有匹配的题目，换个关键词或清空筛选试试</div>';
    renderCount();
    updateMore();
  }

  function appendMore() {
    var from = state.shown;
    state.shown = Math.min(state.shown + PAGE_SIZE, state.filtered.length);
    els.list.insertAdjacentHTML('beforeend',
      state.filtered.slice(from, state.shown).map(cardHtml).join(''));
    updateMore();
  }

  function setOpen(card, open) {
    var btn = card.querySelector('[data-toggle]');
    var box = card.querySelector('.iv-ans');
    if (!btn || !box) return;
    if (open && card.getAttribute('data-rendered') !== '1') {
      var item = index[card.getAttribute('data-id')];
      box.innerHTML = '<div class="iv-ans-inner">' + Markdown.render(item ? item.answer : '') + '</div>';
      card.setAttribute('data-rendered', '1');
    }
    box.hidden = !open;
    card.classList.toggle('is-open', open);
    btn.textContent = open ? '收起答案' : '查看答案';
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function setAll(open) {
    state.expandAll = open;
    Array.prototype.forEach.call(els.list.querySelectorAll('.iv-card'), function (card) {
      setOpen(card, open);
    });
    els.toggleAll.textContent = open ? '全部收起' : '全部展开';
  }

  function refresh() {
    applyFilter();
    writeUrl();
    renderChips();
    renderTopics();
    renderList();
    els.toggleAll.textContent = '全部展开';
    state.expandAll = false;
  }

  function showError(err) {
    els.list.innerHTML = '<div class="empty">' + esc(err.message) +
      '<br><br>提示：请通过 <code>start.bat</code> 启动本地服务后访问，' +
      '直接双击打开 HTML 文件会被浏览器的跨域策略拦截。</div>';
  }

  /* ---------- 启动 ---------- */

  function bind() {
    els.cat.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-key]');
      if (!btn) return;
      state.cat = btn.getAttribute('data-value');
      refresh();
    });

    els.type.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-key]');
      if (!btn) return;
      state.type = btn.getAttribute('data-value');
      refresh();
    });

    els.topic.addEventListener('change', function () {
      state.topic = els.topic.value;
      refresh();
    });

    els.search.addEventListener('input', debounce(function () {
      state.q = els.search.value;
      refresh();
    }, 200));

    els.list.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-toggle]');
      if (!btn) return;
      var card = btn.closest('.iv-card');
      setOpen(card, !card.classList.contains('is-open'));
    });

    els.more.addEventListener('click', appendMore);

    els.toggleAll.addEventListener('click', function () {
      setAll(!state.expandAll);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    window.Theme.init();

    els = {
      cat: byId('iv-cat'),
      type: byId('iv-type'),
      topic: byId('iv-topic'),
      search: byId('iv-search'),
      count: byId('iv-count'),
      list: byId('iv-list'),
      more: byId('iv-more'),
      toggleAll: byId('iv-toggle-all'),
      stat: byId('iv-stat')
    };

    readUrl();
    bind();

    fetch('interviews/index.json', { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('无法读取题库索引（HTTP ' + res.status + '）');
        return res.json();
      })
      .then(function (data) {
        state.all = Array.isArray(data.questions) ? data.questions : [];
        state.all.forEach(function (item) { index[item.id] = item; });

        var stats = {};
        state.all.forEach(function (item) {
          stats[item.category] = (stats[item.category] || 0) + 1;
        });
        var detail = Object.keys(stats).map(function (k) { return k + ' ' + stats[k]; }).join(' · ');
        if (els.stat) els.stat.textContent = '共 ' + state.all.length + ' 题（' + detail + '）。';

        if (els.search) els.search.value = state.q;
        refresh();
      })
      .catch(showError);
  });
})();
