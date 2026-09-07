/*!
 * 文章详情页：加载 posts/<slug>.md，渲染正文与上下篇导航
 */
(function () {
  'use strict';

  var esc = Store.escapeHtml;

  function postUrl(slug) {
    return 'post.html?slug=' + encodeURIComponent(slug);
  }

  function fail(message) {
    document.getElementById('article-root').innerHTML =
      '<div class="empty">' + esc(message) +
      '<br><br><a href="index.html">返回文章列表</a></div>';
  }

  function metaLine(post) {
    var tags = (post.tags || []).map(function (tag) {
      return '<a class="tag" href="' + esc(Store.buildLink({ tag: tag })) + '">#' + esc(tag) + '</a>';
    }).join('');

    return '<div class="post-meta">' +
      '<time datetime="' + esc(post.date) + '">' + esc(Store.formatDate(post.date)) + '</time>' +
      '<span class="sep">·</span>' +
      '<a class="cat" href="' + esc(Store.buildLink({ cat: post.category })) + '">' + esc(post.category) + '</a>' +
      (tags ? '<span class="sep">·</span>' + tags : '') +
      '</div>';
  }

  function renderNav(neighbors) {
    var nav = document.getElementById('post-nav');
    var html = '';

    if (neighbors.newer) {
      html += '<a href="' + postUrl(neighbors.newer.slug) + '">' +
        '<span class="hint">← 上一篇</span>' +
        '<span class="title">' + esc(neighbors.newer.title) + '</span></a>';
    } else {
      html += '<a class="placeholder"><span class="hint">← 上一篇</span>' +
        '<span class="title">已经是最新一篇</span></a>';
    }

    if (neighbors.older) {
      html += '<a class="next" href="' + postUrl(neighbors.older.slug) + '">' +
        '<span class="hint">下一篇 →</span>' +
        '<span class="title">' + esc(neighbors.older.title) + '</span></a>';
    } else {
      html += '<a class="next placeholder"><span class="hint">下一篇 →</span>' +
        '<span class="title">已经是最后一篇</span></a>';
    }

    nav.innerHTML = html;
  }

  document.addEventListener('DOMContentLoaded', function () {
    window.Theme.init();

    var criteria = Store.query();
    if (!criteria.slug) { fail('缺少文章参数（slug）'); return; }

    Promise.all([Store.load(), Store.fetchPost(criteria.slug)])
      .then(function (results) {
        var posts = results[0].posts || [];
        var post = results[1];

        document.title = post.title + ' · 于锦洋的博客';
        document.getElementById('article-root').innerHTML =
          '<header class="article-header">' +
            '<h1>' + esc(post.title) + '</h1>' +
            metaLine(post) +
          '</header>' +
          '<div class="article-body">' + window.Markdown.render(post.body) + '</div>';

        renderNav(Store.neighbors(posts, post.slug));
        buildToc();
      })
      .catch(function (err) {
        fail(err.message);
      });
  });

  /* 根据正文标题(h2-h4)自动生成目录，点击平滑跳转，并高亮当前章节 */
  function buildToc() {
    var body = document.querySelector('.article-body');
    var wrap = document.getElementById('toc-wrap');
    var nav = document.getElementById('toc-nav');
    if (!body || !wrap || !nav) return;

    var heads = body.querySelectorAll('h2, h3, h4');
    if (!heads.length) { wrap.hidden = true; return; }
    wrap.hidden = false;

    var html = '';
    Array.prototype.forEach.call(heads, function (h) {
      var level = Number(h.tagName.charAt(1));
      html += '<li class="toc-l' + level + '">' +
        '<a href="#' + encodeURIComponent(h.id) + '" data-target="' + esc(h.id) + '">' +
        esc(h.textContent.trim()) + '</a></li>';
    });
    nav.innerHTML = html;

    bindToc();
    initScrollSpy(heads);
  }

  function bindToc() {
    var nav = document.getElementById('toc-nav');
    var wrap = document.getElementById('toc-wrap');
    var toggle = document.getElementById('toc-toggle');

    nav.addEventListener('click', function (e) {
      var a = e.target.closest('a[data-target]');
      if (!a) return;
      e.preventDefault();
      var id = a.getAttribute('data-target');
      var target = document.getElementById(id);
      if (!target) return;
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (history.replaceState) history.replaceState(null, '', '#' + id);
      if (wrap.classList.contains('open')) wrap.classList.remove('open');
    });

    if (toggle) {
      toggle.addEventListener('click', function () {
        var open = wrap.classList.toggle('open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }
  }

  function initScrollSpy(heads) {
    var links = document.querySelectorAll('#toc-nav a[data-target]');
    if (!('IntersectionObserver' in window)) return;

    var linkMap = {};
    Array.prototype.forEach.call(links, function (a) {
      linkMap[a.getAttribute('data-target')] = a;
    });

    var visible = [];
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var idx = visible.indexOf(en.target);
        if (en.isIntersecting) { if (idx === -1) visible.push(en.target); }
        else if (idx !== -1) { visible.splice(idx, 1); }
      });
      Array.prototype.forEach.call(links, function (a) { a.classList.remove('active'); });
      if (visible.length) {
        var top = visible.reduce(function (a, b) { return a.getBoundingClientRect().top <= b.getBoundingClientRect().top ? a : b; });
        var act = linkMap[top.id];
        if (act) act.classList.add('active');
      }
    }, { rootMargin: '-80px 0px -70% 0px', threshold: 0 });

    Array.prototype.forEach.call(heads, function (h) { observer.observe(h); });
  }
})();
