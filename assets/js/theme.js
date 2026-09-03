/*!
 * 亮/暗主题切换
 * - 首次访问跟随系统偏好（prefers-color-scheme）
 * - 用户手动切换后写入 localStorage，之后以用户选择为准
 * - 配合 <head> 中的内联脚本使用，避免首屏闪烁
 */
window.Theme = (function () {
  'use strict';

  var KEY = 'blog-theme';
  var media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function current() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function apply(theme, persist) {
    document.documentElement.setAttribute('data-theme', theme);
    if (persist) {
      try { localStorage.setItem(KEY, theme); } catch (e) { /* 隐私模式下忽略 */ }
    }
    syncButtons(theme);
  }

  function syncButtons(theme) {
    var buttons = document.querySelectorAll('[data-theme-toggle]');
    for (var i = 0; i < buttons.length; i++) {
      var btn = buttons[i];
      var next = theme === 'dark' ? '日间' : '夜间';
      btn.setAttribute('aria-label', '切换到' + next + '模式');
      btn.setAttribute('title', '切换到' + next + '模式');
      btn.setAttribute('data-current', theme);
    }
  }

  function toggle() {
    apply(current() === 'dark' ? 'light' : 'dark', true);
  }

  function init() {
    var stored = null;
    try { stored = localStorage.getItem(KEY); } catch (e) { /* 忽略 */ }
    apply(stored || (media && media.matches ? 'dark' : 'light'), false);

    var buttons = document.querySelectorAll('[data-theme-toggle]');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', toggle);
    }

    /* 未手动选择过时，跟随系统变化 */
    if (media && !stored) {
      var onChange = function (e) { apply(e.matches ? 'dark' : 'light', false); };
      if (media.addEventListener) media.addEventListener('change', onChange);
      else if (media.addListener) media.addListener(onChange);
    }
  }

  return { init: init, toggle: toggle, current: current };
})();
