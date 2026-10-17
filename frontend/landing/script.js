;(function () {
  'use strict'
  var root = document.documentElement
  root.classList.add('js')

  /* Selector de escenarios y sub-opciones */
  function wire(buttons, group) {
    buttons.forEach(function (btn) {
      var panel = document.getElementById(btn.getAttribute('aria-controls'))
      btn.addEventListener('click', function () {
        var open = btn.getAttribute('aria-expanded') === 'true'
        if (open && group === 'sub') return
        buttons.forEach(function (b) {
          var p = document.getElementById(b.getAttribute('aria-controls'))
          var on = b === btn ? !open : false
          if (group === 'sub') on = b === btn
          b.setAttribute('aria-expanded', on ? 'true' : 'false')
          if (p) p.hidden = !on
        })
      })
      if (panel) panel.hidden = btn.getAttribute('aria-expanded') !== 'true'
    })
  }
  wire([].slice.call(document.querySelectorAll('.scn-btn')), 'scn')
  wire([].slice.call(document.querySelectorAll('.sub-btn')), 'sub')

  /* Tema claro/oscuro */
  var KEY = 'insieme-theme'
  var btn = document.getElementById('theme-toggle')
  var mq = window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null
  function current() {
    var t = root.getAttribute('data-theme')
    if (t) return t
    return mq && mq.matches ? 'dark' : 'light'
  }
  function label() {
    if (!btn) return
    var dark = current() === 'dark'
    btn.textContent = dark ? 'Modo claro' : 'Modo oscuro'
    btn.setAttribute(
      'aria-label',
      dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'
    )
  }
  if (btn) {
    btn.hidden = false
    label()
    btn.addEventListener('click', function () {
      var next = current() === 'dark' ? 'light' : 'dark'
      root.setAttribute('data-theme', next)
      try {
        localStorage.setItem(KEY, next)
      } catch (e) {}
      label()
    })
    if (mq && mq.addEventListener) mq.addEventListener('change', label)
  }
})()
