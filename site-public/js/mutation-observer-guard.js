(function () {
  if (!window.MutationObserver || !window.Node) return;

  var originalObserve = window.MutationObserver.prototype.observe;
  window.MutationObserver.prototype.observe = function (target, options) {
    if (!(target instanceof window.Node)) return;
    return originalObserve.call(this, target, options);
  };
})();
