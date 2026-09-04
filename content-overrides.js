(function () {
  var API =
    'https://script.google.com/macros/s/AKfycbwf3-MNZBBi64zXcNH7wfhBRoEBl9brtQ9QRI4Won5RmUIOrl_WBivN6uI5NAp6Mc0h/exec';
  var unitId = document.body.dataset.contentUnit;
  if (!unitId) return;
  fetch(API, { method: 'POST', body: JSON.stringify({ action: 'getContentOverrides', unit_id: unitId }) })
    .then(function (res) {
      return res.json();
    })
    .then(function (data) {
      if (!data.ok) return;
      var overrides = (data.data && data.data.overrides) || {};
      Object.keys(overrides).forEach(function (key) {
        if (!overrides[key]) return;
        var el = document.querySelector('[data-field-key="' + key + '"]');
        if (el) el.textContent = overrides[key];
      });
    })
    .catch(function () {
      /* שקט — נשאר הטקסט המקורי אם הטעינה נכשלה */
    });
})();
