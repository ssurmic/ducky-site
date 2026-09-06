(function () {
  "use strict";
  document.querySelectorAll(".records-period").forEach(section => {
    const controls = section.querySelector("[data-records-filter]");
    const ticker = controls.querySelector("[data-records-ticker]");
    const status = controls.querySelector("[data-records-status]");
    const rows = [...section.querySelectorAll("[data-records-row]")];
    const count = controls.querySelector("[data-records-count]");
    function update() {
      let visible = 0;
      rows.forEach(row => {
        row.hidden = !!((ticker.value && ticker.value !== row.dataset.ticker) || (status.value && status.value !== row.dataset.status));
        if (!row.hidden) visible++;
      });
      count.textContent = count.dataset.label.replace("{shown}", visible).replace("{total}", rows.length);
      section.querySelector("[data-records-empty]").hidden = visible !== 0;
    }
    controls.hidden = false;
    ticker.addEventListener("change", update);
    status.addEventListener("change", update);
    update();
  });
})();
