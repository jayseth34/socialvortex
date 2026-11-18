/* Social Vortex — hero walking characters (Lottie walk cycles, see assets/walkers-data.js for credits) */
(function () {
  "use strict";

  const data = window.SV_WALKERS;
  const anims = [];

  function mount(selector, animationData) {
    const el = document.querySelector(selector);
    if (!el || !animationData || !window.lottie) return;
    const anim = lottie.loadAnimation({
      container: el,
      renderer: "svg",
      loop: true,
      autoplay: false,
      animationData,
      rendererSettings: { preserveAspectRatio: "xMidYMax meet" },
    });
    anims.push(anim);
  }

  if (data) {
    mount(".walker-man", data.man);
    mount(".walker-woman", data.woman);
  }
  const cats = window.SV_CATS;
  if (cats) {
    mount(".cat-orange", cats.orange);
    mount(".cat-tux", cats.tux);
  }

  window.Walkers = {
    start() {
      anims.forEach((a, i) => {
        // stagger start frames so nobody steps in sync
        a.goToAndPlay(Math.round(a.totalFrames * [0, 0.4, 0.15, 0.6][i % 4]), true);
      });
    },
  };
})();
