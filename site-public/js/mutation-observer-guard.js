(function () {
  if (!window.Popper || typeof window.Popper.createPopper !== "function") {
    window.Popper = {
      createPopper: function () {
        return {
          destroy: function () {},
          forceUpdate: function () {},
          setOptions: function () {},
          update: function () {
            return Promise.resolve();
          },
        };
      },
    };
  }

  if (!window.MutationObserver || !window.Node) return;

  var originalObserve = window.MutationObserver.prototype.observe;
  window.MutationObserver.prototype.observe = function (target, options) {
    if (!(target instanceof window.Node)) return;
    return originalObserve.call(this, target, options);
  };
})();
