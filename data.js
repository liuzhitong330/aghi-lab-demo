/* Primary data are derived reproducibly by scripts/build_data.py. */
(function () {
  'use strict';
  window.AghiData = Promise.all(['data/data.json', 'data/caf_pipeline_audit.json'].map(async path => {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Could not load ${path}`);
    return response.json();
  }));
})();
