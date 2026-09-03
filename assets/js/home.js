/*!
 * 首页：文章列表渲染 + 侧边栏分类/标签/归档过滤
 */
(function () {
  'use strict';

  var esc = Store.escapeHtml;

  function postUrl(slug) {
    return 'post.html?slug=' + encodeURIComponent(slug);
  }

  function card(post) {
    var tags = (post.tags || []).map(function (tag) {
      return '<span class="tag">#' + esc(tag) + '</span>';
    }).join('');

    return '<a class="post-card" href="' + postUrl(post.slug) + '">' +
      '<h2>' + esc(post.title) + '</h2>' +
      '<p class="summary">' + esc(post.summary) + '</p>' +
      '<div class="post-meta">' +
        '<time datetime="' + esc(post.date) + '">' + esc(Store.formatDate(post.date)) + '</time>' +
        '<span class="sep">·</span>' +
        '<a class="cat" href="' + esc(Store.buildLink({ cat: post.category })) + '">' + esc(post.category) + '</a>' +
        (tags ? '<span class="sep">·</span>' + tags : '') +
        '<span class="sep">·</span>' +
        '<span>约 ' + esc(Store.readingTime(post.words)) + '</span>' +
      '</div>' +
    '</a>';
  }

  function renderFilterBar(criteria) {
    var bar = document.getElementById('filter-bar');
    var value = criteria.cat || criteria.tag || criteria.archive;
    if (!value) { bar.innerHTML = ''; return; }

    var label = criteria.cat ? '分类' : (criteria.tag ? '标签' : '归档');
    bar.innerHTML =
      '<div class="filter-bar">' +
        '<span class="label">正在按' + label + '筛选：</span>' +
        '<strong>' + esc(value) + '</strong>' +
        '<a class="clear" href="index.html">清除筛选</a>' +
      '</div>';
  }

  function renderList(posts) {
    var list = document.getElementById('post-list');
    list.innerHTML = posts.length
      ? posts.map(card).join('')
      : '<div class="empty">这个条件下还没有文章</div>';
  }

  function renderSidebar(posts, criteria) {
    var cats = document.getElementById('cat-list');
    cats.innerHTML = Store.categories(posts).map(function (item) {
      var active = criteria.cat === item.name ? ' class="active"' : '';
      return '<li><a' + active + ' href="' + esc(Store.buildLink({ cat: item.name })) + '">' +
        '<span>' + esc(item.name) + '</span><span class="count">' + item.count + '</span></a></li>';
    }).join('');

    var cloud = document.getElementById('tag-cloud');
    cloud.innerHTML = Store.tags(posts).map(function (item) {
      var active = criteria.tag === item.name ? ' class="active"' : '';
      return '<a' + active + ' href="' + esc(Store.buildLink({ tag: item.name })) + '">' + esc(item.name) + '</a>';
    }).join('');

    var archives = document.getElementById('archive-list');
    archives.innerHTML = Store.archives(posts).map(function (item) {
      var active = criteria.archive === item.name ? ' class="active"' : '';
      var parts = item.name.split('-');
      var label = parts[0] + ' 年 ' + Number(parts[1]) + ' 月';
      return '<li><a' + active + ' href="' + esc(Store.buildLink({ archive: item.name })) + '">' +
        '<span>' + esc(label) + '</span><span class="count">' + item.count + '</span></a></li>';
    }).join('');
  }

  function render(data, criteria) {
    var posts = data.posts || [];
    renderFilterBar(criteria);
    renderList(Store.filter(posts, criteria));
    renderSidebar(posts, criteria);

    var stat = document.getElementById('stat-line');
    if (stat) stat.textContent = '目前共 ' + posts.length + ' 篇文章。';
  }

  function showError(err) {
    document.getElementById('post-list').innerHTML =
      '<div class="empty">' + esc(err.message) +
      '<br><br>提示：请通过 <code>start.bat</code> 启动本地服务后访问，' +
      '直接双击打开 HTML 文件会被浏览器的跨域策略拦截。</div>';
  }

  document.addEventListener('DOMContentLoaded', function () {
    window.Theme.init();
    Store.load().then(function (data) {
      render(data, Store.query());
    }).catch(showError);
  });
})();
