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
      })
      .catch(function (err) {
        fail(err.message);
      });
  });
})();
