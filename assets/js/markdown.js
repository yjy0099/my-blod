/*!
 * 轻量 Markdown 解析器（零依赖）
 * 支持：标题、段落、有序/无序列表（含嵌套）、任务列表、围栏代码块、
 *       引用块、表格、分割线、图片、链接、行内代码、粗体、斜体、删除线
 * 安全：所有文本先做 HTML 转义，杜绝 XSS
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.Markdown = api;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var CODE_HOLDER = '\u0000C';

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function inline(text) {
    var codes = [];
    var out = escapeHtml(text);

    out = out.replace(/`([^`]+)`/g, function (_, code) {
      codes.push(code);
      return CODE_HOLDER + (codes.length - 1) + CODE_HOLDER;
    });

    out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, function (_, alt, src) {
      return '<img src="' + src + '" alt="' + alt + '" loading="lazy">';
    });

    out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_, label, href) {
      var external = /^https?:\/\//i.test(href);
      var attrs = 'href="' + href + '"' + (external ? ' target="_blank" rel="noopener noreferrer"' : '');
      return '<a ' + attrs + '>' + label + '</a>';
    });

    out = out.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    out = out.replace(/(^|[^_])_([^_\n]+)_/g, '$1<em>$2</em>');
    out = out.replace(/~~([^~]+)~~/g, '<del>$1</del>');

    out = out.replace(new RegExp(CODE_HOLDER + '(\\d+)' + CODE_HOLDER, 'g'), function (_, idx) {
      return '<code>' + codes[Number(idx)] + '</code>';
    });

    return out;
  }

  function inlineBlock(text) {
    return String(text)
      .split('\n')
      .map(function (line) { return inline(line.trim()); })
      .filter(function (line) { return line !== ''; })
      .join('<br>');
  }

  function isBlockStart(line) {
    return /^\s*(#{1,6}\s|```|~~~|>|([-*+]|\d+[.)])\s|\|)/.test(line);
  }

  var highlighter = null;

  /* 浏览器读 window.Highlighter，Node 下直接 require，两者都没有就退回纯转义 */
  function getHighlighter() {
    if (highlighter !== null) return highlighter;
    if (typeof window !== 'undefined' && window.Highlighter) {
      highlighter = window.Highlighter;
    } else if (typeof require === 'function') {
      try { highlighter = require('./highlight.js'); } catch (e) { highlighter = false; }
    } else {
      highlighter = false;
    }
    return highlighter;
  }

  function highlightCode(code, lang) {
    if (!lang) return escapeHtml(code);
    var hl = getHighlighter();
    return (hl && hl.highlight) ? hl.highlight(code, lang) : escapeHtml(code);
  }

  function renderCode(lines, start) {
    var fence = lines[start].trim();
    var lang = fence.slice(3).trim().split(/\s+/)[0] || '';
    var buf = [];
    var i = start + 1;
    while (i < lines.length && !/^\s*(```|~~~)/.test(lines[i])) {
      buf.push(lines[i]);
      i += 1;
    }
    var cls = lang ? ' class="language-' + escapeHtml(lang) + '"' : '';
    var html = '<pre><code' + cls + '>' + highlightCode(buf.join('\n'), lang) + '</code></pre>';
    return { html: html, next: i + 1 };
  }

  function renderQuote(lines, start) {
    var buf = [];
    var i = start;
    while (i < lines.length && /^\s*>/.test(lines[i])) {
      buf.push(lines[i].replace(/^\s*>\s?/, ''));
      i += 1;
    }
    return { html: '<blockquote>' + render(buf.join('\n')) + '</blockquote>', next: i };
  }

  function splitRow(line) {
    return line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(function (c) { return c.trim(); });
  }

  function renderTable(lines, start) {
    var header = splitRow(lines[start]);
    var aligns = splitRow(lines[start + 1]).map(function (cell) {
      if (/^:-+:$/.test(cell)) return 'center';
      if (/^-+:$/.test(cell)) return 'right';
      if (/^:-+$/.test(cell)) return 'left';
      return '';
    });
    var html = '<div class="table-wrap"><table><thead><tr>';
    header.forEach(function (cell, idx) {
      var align = aligns[idx] ? ' style="text-align:' + aligns[idx] + '"' : '';
      html += '<th' + align + '>' + inline(cell) + '</th>';
    });
    html += '</tr></thead><tbody>';

    var i = start + 2;
    while (i < lines.length && lines[i].indexOf('|') !== -1 && lines[i].trim() !== '') {
      var cells = splitRow(lines[i]);
      html += '<tr>';
      header.forEach(function (_, idx) {
        var align = aligns[idx] ? ' style="text-align:' + aligns[idx] + '"' : '';
        html += '<td' + align + '>' + inline(cells[idx] || '') + '</td>';
      });
      html += '</tr>';
      i += 1;
    }
    return { html: html + '</tbody></table></div>', next: i };
  }

  var LIST_RE = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
  var TABLE_SEP_RE = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

  function renderItems(items) {
    var html = '<' + (items[0].ordered ? 'ol' : 'ul') + '>';
    items.forEach(function (item) {
      var content = item.content;
      var task = /^\[([ xX])\]\s+([\s\S]*)$/.exec(content);
      if (task) {
        var checked = task[1].toLowerCase() === 'x' ? ' checked disabled' : ' disabled';
        content = '<input type="checkbox"' + checked + '> ' + inlineBlock(task[2]);
      } else {
        content = inlineBlock(content);
      }
      html += '<li>' + content;
      if (item.children.length) html += renderItems(item.children);
      html += '</li>';
    });
    return html + '</' + (items[0].ordered ? 'ol' : 'ul') + '>';
  }

  function renderList(lines, start) {
    var flat = [];
    var i = start;
    var baseIndent = null;

    while (i < lines.length) {
      var line = lines[i];
      var match = LIST_RE.exec(line);
      if (match) {
        var indent = match[1].replace(/\t/g, '  ').length;
        var ordered = /\d/.test(match[2]);
        if (baseIndent === null) {
          baseIndent = indent;
        } else if (indent === baseIndent && ordered !== flat[0].ordered) {
          break;
        }
        if (indent < baseIndent) break;
        flat.push({
          indent: indent,
          ordered: ordered,
          content: match[3],
          children: []
        });
        i += 1;
      } else if (line.trim() === '') {
        var next = i + 1 < lines.length ? LIST_RE.exec(lines[i + 1]) : null;
        if (!next) break;
        var nextIndent = next[1].replace(/\t/g, '  ').length;
        var nextOrdered = /\d/.test(next[2]);
        var sameType = !flat.length || nextOrdered === flat[0].ordered;
        if (nextIndent >= baseIndent && sameType) i += 1;
        else break;
      } else if (/^\s{2,}\S/.test(line) && flat.length) {
        flat[flat.length - 1].content += '\n' + line.trim();
        i += 1;
      } else break;
    }

    var root = [];
    var stack = [{ indent: -1, list: root }];
    flat.forEach(function (item) {
      while (stack.length > 1 && item.indent <= stack[stack.length - 1].indent) stack.pop();
      var parent = stack[stack.length - 1].list;
      parent.push(item);
      stack.push({ indent: item.indent, list: item.children });
    });

    return { html: renderItems(root), next: i };
  }

  function render(source) {
    var lines = String(source == null ? '' : source)
      .replace(/\r\n?/g, '\n')
      .split('\n');
    var html = '';
    var i = 0;

    while (i < lines.length) {
      var line = lines[i];

      if (line.trim() === '') { i += 1; continue; }

      if (/^\s*(```|~~~)/.test(line)) {
        var code = renderCode(lines, i);
        html += code.html; i = code.next; continue;
      }

      var heading = /^(#{1,6})\s+(.*)$/.exec(line);
      if (heading) {
        var level = heading[1].length;
        html += '<h' + level + '>' + inline(heading[2].trim()) + '</h' + level + '>';
        i += 1; continue;
      }

      if (/^\s*([-*_])\s*(\1\s*){2,}$/.test(line)) {
        html += '<hr>'; i += 1; continue;
      }

      if (/^\s*>/.test(line)) {
        var quote = renderQuote(lines, i);
        html += quote.html; i = quote.next; continue;
      }

      if (line.indexOf('|') !== -1 && i + 1 < lines.length && TABLE_SEP_RE.test(lines[i + 1])) {
        var table = renderTable(lines, i);
        html += table.html; i = table.next; continue;
      }

      if (LIST_RE.test(line)) {
        var list = renderList(lines, i);
        html += list.html; i = list.next; continue;
      }

      var buf = [];
      while (i < lines.length && lines[i].trim() !== '' && !isBlockStart(lines[i])) {
        buf.push(lines[i]);
        i += 1;
      }
      if (buf.length) html += '<p>' + inlineBlock(buf.join('\n')) + '</p>';
      else { i += 1; }
    }

    return html;
  }

  return { render: render, inline: inline, escapeHtml: escapeHtml };
});
