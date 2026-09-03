/*!
 * 数据层：读取 posts/index.json，提供分类/标签/归档聚合与过滤
 */
window.Store = (function () {
  'use strict';

  var SLUG_RE = /^[A-Za-z0-9_\-\u4e00-\u9fa5]+$/;
  var FRONT_MATTER_RE = /^\uFEFF?---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/;
  var indexPromise = null;

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function load() {
    if (!indexPromise) {
      indexPromise = fetch('posts/index.json', { cache: 'no-store' })
        .then(function (res) {
          if (!res.ok) throw new Error('无法读取文章索引（HTTP ' + res.status + '）');
          return res.json();
        })
        .then(function (data) {
          data.posts = Array.isArray(data.posts) ? data.posts : [];
          return data;
        });
    }
    return indexPromise;
  }

  function countBy(posts, pick) {
    var map = {};
    posts.forEach(function (post) {
      var values = pick(post);
      if (!Array.isArray(values)) values = [values];
      values.forEach(function (value) {
        if (!value) return;
        map[value] = (map[value] || 0) + 1;
      });
    });
    return Object.keys(map)
      .map(function (name) { return { name: name, count: map[name] }; })
      .sort(function (a, b) { return b.count - a.count || a.name.localeCompare(b.name, 'zh'); });
  }

  function categories(posts) {
    return countBy(posts, function (p) { return p.category; });
  }

  function tags(posts) {
    return countBy(posts, function (p) { return p.tags; });
  }

  function archives(posts) {
    return countBy(posts, function (p) { return String(p.date || '').slice(0, 7); })
      .filter(function (item) { return /^\d{4}-\d{2}$/.test(item.name); })
      .sort(function (a, b) { return a.name < b.name ? 1 : -1; });
  }

  function filter(posts, criteria) {
    var cat = (criteria && criteria.cat) || '';
    var tag = (criteria && criteria.tag) || '';
    var archive = (criteria && criteria.archive) || '';
    return posts.filter(function (post) {
      if (cat && post.category !== cat) return false;
      if (tag && (post.tags || []).indexOf(tag) === -1) return false;
      if (archive && String(post.date).slice(0, 7) !== archive) return false;
      return true;
    });
  }

  /* URL 查询参数：?cat=技术&tag=HDFS&archive=2026-09 */
  function query() {
    var params = new URLSearchParams(window.location.search);
    return {
      cat: params.get('cat') || '',
      tag: params.get('tag') || '',
      archive: params.get('archive') || '',
      slug: params.get('slug') || ''
    };
  }

  function buildLink(criteria) {
    var parts = [];
    if (criteria.cat) parts.push('cat=' + encodeURIComponent(criteria.cat));
    if (criteria.tag) parts.push('tag=' + encodeURIComponent(criteria.tag));
    if (criteria.archive) parts.push('archive=' + encodeURIComponent(criteria.archive));
    return parts.length ? 'index.html?' + parts.join('&') : 'index.html';
  }

  function parseTags(value) {
    return String(value || '')
      .replace(/^\[|\]$/g, '')
      .split(',')
      .map(function (t) { return t.trim().replace(/^["']|["']$/g, ''); })
      .filter(Boolean);
  }

  function parseFrontMatter(text) {
    var body = String(text || '').replace(/^\uFEFF/, '');
    var match = FRONT_MATTER_RE.exec(body);
    if (!match) return { meta: {}, body: body };
    var meta = {};
    match[1].split(/\r?\n/).forEach(function (line) {
      line = line.trim();
      if (!line || line.indexOf('#') === 0 || line.indexOf(':') === -1) return;
      var idx = line.indexOf(':');
      meta[line.slice(0, idx).trim().toLowerCase()] = line.slice(idx + 1).trim();
    });
    return { meta: meta, body: body.slice(match[0].length) };
  }

  function fetchPost(slug) {
    if (!SLUG_RE.test(slug)) return Promise.reject(new Error('非法的文章标识'));
    return fetch('posts/' + encodeURIComponent(slug) + '.md', { cache: 'no-store' }).then(function (res) {
      if (!res.ok) throw new Error('文章不存在或已删除（HTTP ' + res.status + '）');
      return res.text();
    }).then(function (text) {
      var parsed = parseFrontMatter(text);
      return {
        slug: slug,
        title: parsed.meta.title || slug,
        date: parsed.meta.date || '',
        category: parsed.meta.category || '未分类',
        tags: parseTags(parsed.meta.tags),
        summary: parsed.meta.summary || '',
        body: parsed.body
      };
    });
  }

  function formatDate(value) {
    var parts = String(value || '').split('-');
    if (parts.length !== 3) return String(value || '');
    return parts[0] + ' 年 ' + Number(parts[1]) + ' 月 ' + Number(parts[2]) + ' 日';
  }

  function readingTime(words) {
    var minutes = Math.max(1, Math.round((Number(words) || 0) / 350));
    return minutes + ' 分钟';
  }

  /* 返回 { newer, older }，列表按日期倒序，newer 为更新的一篇 */
  function neighbors(posts, slug) {
    var idx = -1;
    for (var i = 0; i < posts.length; i++) {
      if (posts[i].slug === slug) { idx = i; break; }
    }
    if (idx === -1) return { newer: null, older: null };
    return {
      newer: idx - 1 >= 0 ? posts[idx - 1] : null,
      older: idx + 1 < posts.length ? posts[idx + 1] : null
    };
  }

  return {
    load: load,
    categories: categories,
    tags: tags,
    archives: archives,
    filter: filter,
    query: query,
    buildLink: buildLink,
    fetchPost: fetchPost,
    parseFrontMatter: parseFrontMatter,
    formatDate: formatDate,
    readingTime: readingTime,
    neighbors: neighbors,
    escapeHtml: escapeHtml
  };
})();
