/*!
 * 轻量代码高亮器（零依赖）
 * 原理：按语言词法规则从原始代码扫描出 token，逐 token 转义后包上 <span>。
 * 先分词再转义，避免破坏 HTML 实体，从根上杜绝 XSS。
 * 支持：python / bash / json / javascript / sql，未知语言原样转义。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Highlighter = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function wrap(cls, text) {
    return '<span class="' + cls + '">' + escapeHtml(text) + '</span>';
  }

  function alt(words) {
    return '\\b(?:' + words.join('|') + ')\\b';
  }

  /* 部分浏览器不支持后行断言，构建失败时降级为普通高亮 */
  function safe(pattern, flags) {
    try {
      return new RegExp(pattern, flags);
    } catch (e) {
      return null;
    }
  }

  var PY_KEYWORDS = [
    'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def',
    'del', 'elif', 'else', 'except', 'finally', 'for', 'from', 'global', 'if',
    'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise',
    'return', 'try', 'while', 'with', 'yield', 'match', 'case'
  ];

  var PY_BUILTINS = [
    'abs', 'all', 'any', 'bin', 'bool', 'bytes', 'callable', 'chr', 'dict', 'dir',
    'enumerate', 'filter', 'float', 'format', 'frozenset', 'getattr', 'hasattr',
    'hash', 'help', 'id', 'input', 'int', 'isinstance', 'issubclass', 'iter',
    'len', 'list', 'map', 'max', 'min', 'next', 'object', 'open', 'ord', 'print',
    'range', 'repr', 'reversed', 'round', 'set', 'setattr', 'slice', 'sorted',
    'staticmethod', 'classmethod', 'property', 'str', 'sum', 'super', 'tuple',
    'type', 'vars', 'zip', 'self', 'cls',
    'True', 'False', 'None', 'NotImplemented', 'Ellipsis'
  ];

  var SH_KEYWORDS = [
    'if', 'then', 'elif', 'else', 'fi', 'for', 'while', 'until', 'do', 'done',
    'case', 'esac', 'in', 'function', 'return', 'export', 'local', 'source',
    'echo', 'cd', 'exit', 'set', 'unset'
  ];

  var JS_KEYWORDS = [
    'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while',
    'do', 'switch', 'case', 'break', 'continue', 'new', 'class', 'extends',
    'super', 'this', 'typeof', 'instanceof', 'try', 'catch', 'finally', 'throw',
    'async', 'await', 'import', 'export', 'from', 'default', 'delete', 'in', 'of',
    'null', 'undefined', 'true', 'false'
  ];

  var SQL_KEYWORDS = [
    'SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET',
    'DELETE', 'CREATE', 'TABLE', 'DROP', 'ALTER', 'ADD', 'JOIN', 'LEFT', 'RIGHT',
    'INNER', 'OUTER', 'ON', 'GROUP', 'BY', 'ORDER', 'HAVING', 'LIMIT', 'OFFSET',
    'AS', 'AND', 'OR', 'NOT', 'NULL', 'IS', 'IN', 'LIKE', 'BETWEEN', 'DISTINCT',
    'COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'CASE', 'WHEN', 'THEN', 'END', 'WITH'
  ];

  function pyRules() {
    return [
      { re: /#[^\n]*/y, cls: 'tok-comment' },
      { re: /(?:[rbfuRBFU]{0,2})(?:"""[\s\S]*?"""|'''[\s\S]*?''')/y, cls: 'tok-string' },
      { re: /(?:[rbfuRBFU]{0,2})(?:"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n]*)')/y, cls: 'tok-string' },
      { re: /@[A-Za-z_][\w.]*/y, cls: 'tok-decorator' },
      { re: safe('(?<=\\b(?:class|def)\\s+)[A-Za-z_]\\w*', 'y'), cls: 'tok-def' },
      { re: /\b0[xXbBoO][\da-fA-F_]+\b|-?\b\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d+)?[jJ]?\b/y, cls: 'tok-number' },
      { re: new RegExp(alt(PY_KEYWORDS), 'y'), cls: 'tok-keyword' },
      { re: new RegExp(alt(PY_BUILTINS), 'y'), cls: 'tok-builtin' },
      { re: /[A-Za-z_]\w*(?=\s*\()/y, cls: 'tok-func' },
      { re: /[A-Za-z_]\w*/y, cls: '' },
      { re: /[+\-*/%=<>!&|^~]+/y, cls: 'tok-op' },
      { re: /[{}()\[\];,.:@]/y, cls: 'tok-punc' },
      { re: /\s+/y, cls: '' }
    ];
  }

  function shRules() {
    return [
      { re: /#[^\n]*/y, cls: 'tok-comment' },
      { re: /"(?:\\.|[^"\\])*"|'[^']*'/y, cls: 'tok-string' },
      { re: /\$\{?[A-Za-z_]\w*\}?/y, cls: 'tok-var' },
      { re: /--?[A-Za-z][\w-]*/y, cls: 'tok-attr' },
      { re: new RegExp(alt(SH_KEYWORDS), 'y'), cls: 'tok-keyword' },
      { re: /\b\d+\b/y, cls: 'tok-number' },
      { re: /[|&><]+/y, cls: 'tok-op' },
      { re: /[A-Za-z_][\w.\-]*/y, cls: '' },
      { re: /\s+/y, cls: '' }
    ];
  }

  function jsonRules() {
    return [
      { re: /"(?:\\.|[^"\\])*"(?=\s*:)/y, cls: 'tok-key' },
      { re: /"(?:\\.|[^"\\])*"/y, cls: 'tok-string' },
      { re: /\b(?:true|false|null)\b/y, cls: 'tok-keyword' },
      { re: /-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/y, cls: 'tok-number' },
      { re: /[{}[\],:]/y, cls: 'tok-punc' },
      { re: /\s+/y, cls: '' }
    ];
  }

  function jsRules() {
    return [
      { re: /\/\/[^\n]*/y, cls: 'tok-comment' },
      { re: /\/\*[\s\S]*?\*\//y, cls: 'tok-comment' },
      { re: /`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n]*)'/y, cls: 'tok-string' },
      { re: new RegExp(alt(JS_KEYWORDS), 'y'), cls: 'tok-keyword' },
      { re: /\b\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?\b/y, cls: 'tok-number' },
      { re: /[A-Za-z_$]\w*(?=\s*\()/y, cls: 'tok-func' },
      { re: /[A-Za-z_$]\w*/y, cls: '' },
      { re: /[+\-*/%=<>!&|^~?]+/y, cls: 'tok-op' },
      { re: /[{}()\[\];,.:]/y, cls: 'tok-punc' },
      { re: /\s+/y, cls: '' }
    ];
  }

  function sqlRules() {
    return [
      { re: /--[^\n]*/y, cls: 'tok-comment' },
      { re: /'(?:''|[^'])*'/y, cls: 'tok-string' },
      { re: new RegExp(alt(SQL_KEYWORDS), 'y'), cls: 'tok-keyword' },
      { re: /\b\d+(?:\.\d+)?\b/y, cls: 'tok-number' },
      { re: /[A-Za-z_]\w*/y, cls: '' },
      { re: /[+\-*/%=<>!|]+/y, cls: 'tok-op' },
      { re: /[(),.;]/y, cls: 'tok-punc' },
      { re: /\s+/y, cls: '' }
    ];
  }

  var PLAIN = { text: 1, txt: 1, plain: 1, plaintext: 1, '': 1, none: 1 };

  function rulesFor(lang) {
    var key = String(lang || '').toLowerCase();
    if (PLAIN[key]) return null;
    if (key === 'python' || key === 'py') return pyRules();
    if (key === 'bash' || key === 'sh' || key === 'shell' || key === 'zsh' || key === 'console') return shRules();
    if (key === 'json') return jsonRules();
    if (key === 'javascript' || key === 'js' || key === 'jsx' || key === 'ts' || key === 'typescript') return jsRules();
    if (key === 'sql') return sqlRules();
    return null;
  }

  function highlight(code, lang) {
    if (code == null || code === '') return '';
    var source = String(code);
    var rules = rulesFor(lang);
    if (!rules) return escapeHtml(source);

    var out = '';
    var len = source.length;
    var i = 0;

    while (i < len) {
      var matched = false;
      for (var k = 0; k < rules.length; k++) {
        var rule = rules[k];
        if (!rule || !rule.re) continue;
        rule.re.lastIndex = i;
        var m = rule.re.exec(source);
        if (m && m.index === i && m[0].length > 0) {
          out += rule.cls ? wrap(rule.cls, m[0]) : escapeHtml(m[0]);
          i += m[0].length;
          matched = true;
          break;
        }
      }
      if (!matched) {
        out += escapeHtml(source.charAt(i));
        i += 1;
      }
    }
    return out;
  }

  return { highlight: highlight, escapeHtml: escapeHtml };
});
