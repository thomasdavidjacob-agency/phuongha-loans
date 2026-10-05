/* Site-wide nav: "Down Payment Help" dropdown.
   Desktop: opens on hover or keyboard focus (pure CSS). Touch: first tap opens the menu, second tap follows the link. */
(function () {
  var dds = document.querySelectorAll('.nav-dd');
  if (!dds.length) return;
  var touch = window.matchMedia && window.matchMedia('(hover: none)').matches;
  function closeAll(except) {
    dds.forEach(function (d) {
      if (d !== except) {
        d.classList.remove('is-open');
        var t = d.querySelector('.nav-dd__top');
        if (t) t.setAttribute('aria-expanded', 'false');
      }
    });
  }
  dds.forEach(function (dd) {
    var top = dd.querySelector('.nav-dd__top');
    if (!top) return;
    top.addEventListener('click', function (e) {
      dd.classList.remove('is-dismissed');
      if (touch && !dd.classList.contains('is-open')) {
        e.preventDefault();
        closeAll(dd);
        dd.classList.add('is-open');
        top.setAttribute('aria-expanded', 'true');
      }
    });
    dd.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        dd.classList.remove('is-open');
        dd.classList.add('is-dismissed');
        top.setAttribute('aria-expanded', 'false');
        top.focus();
      }
    });
    dd.addEventListener('mouseleave', function () { dd.classList.remove('is-dismissed'); });
    dd.addEventListener('focusout', function (e) {
      if (!dd.contains(e.relatedTarget)) dd.classList.remove('is-dismissed');
    });
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest || !e.target.closest('.nav-dd')) closeAll(null);
  });
})();
