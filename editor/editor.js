// ScreenTutorial — Editor Script
// Full-page UI for reviewing, editing, reordering, and exporting tutorial steps.

var steps = [];
var title = '';

var titleInput   = document.getElementById('tutorial-title');
var stepsList    = document.getElementById('steps-list');
var emptyState   = document.getElementById('empty-state');
var stepInfo     = document.getElementById('step-info');
var btnExportMd   = document.getElementById('btn-export-md');
var btnExportHtml = document.getElementById('btn-export-html');
var btnExportPdf  = document.getElementById('btn-export-pdf');
var modal        = document.getElementById('modal');
var modalImg     = document.getElementById('modal-img');
var modalClose   = document.getElementById('modal-close');

// ── Load data ───────────────────────────────────────────────────────────────

browser.runtime.sendMessage({ type: 'GET_STATE' }).then(function (state) {
  title = state.title || '';
  steps = state.steps || [];
  titleInput.value = title;
  render();
});

// ── Title editing ───────────────────────────────────────────────────────────

titleInput.addEventListener('input', function () {
  title = titleInput.value;
  browser.runtime.sendMessage({ type: 'UPDATE_TITLE', title: title });
});

// ── Render ───────────────────────────────────────────────────────────────────

function render() {
  stepInfo.textContent = steps.length + ' \u00e9tape' + (steps.length > 1 ? 's' : '');
  emptyState.hidden = steps.length > 0;
  stepsList.innerHTML = '';
  steps.forEach(function (step, i) {
    stepsList.appendChild(buildCard(step, i));
  });
}

function buildCard(step, index) {
  var card = document.createElement('div');
  card.className = 'step-card';
  card.draggable = true;
  card.dataset.id = step.id;

  // ── Header ──────────────────────────────────────────────
  var header = document.createElement('div');
  header.className = 'step-header';

  var num = document.createElement('div');
  num.className = 'step-number';
  num.textContent = index + 1;

  var desc = document.createElement('input');
  desc.type = 'text';
  desc.className = 'step-description';
  desc.value = step.description;
  desc.draggable = false;
  desc.addEventListener('change', function () {
    step.description = desc.value;
    browser.runtime.sendMessage({ type: 'UPDATE_STEP', stepId: step.id, description: desc.value });
  });
  desc.addEventListener('mousedown', function (e) { e.stopPropagation(); });

  var url = document.createElement('span');
  url.className = 'step-url';
  try { url.textContent = new URL(step.url).hostname; } catch { url.textContent = ''; }
  url.title = step.url || '';

  var del = document.createElement('button');
  del.className = 'btn-delete';
  del.innerHTML = '&times;';
  del.title = 'Supprimer cette \u00e9tape';
  del.addEventListener('click', function () {
    steps = steps.filter(function (s) { return s.id !== step.id; });
    browser.runtime.sendMessage({ type: 'DELETE_STEP', stepId: step.id });
    render();
  });

  header.appendChild(num);
  header.appendChild(desc);
  header.appendChild(url);
  header.appendChild(del);
  card.appendChild(header);

  // ── Screenshot ──────────────────────────────────────────
  if (step.screenshot) {
    var ssDiv = document.createElement('div');
    ssDiv.className = 'step-screenshot';
    var img = document.createElement('img');
    img.src = step.screenshot;
    img.alt = '\u00c9tape ' + (index + 1);
    img.loading = 'lazy';
    img.draggable = false;
    img.addEventListener('click', function () { openModal(step.screenshot); });
    ssDiv.appendChild(img);
    card.appendChild(ssDiv);
  } else {
    var noSs = document.createElement('div');
    noSs.className = 'step-no-screenshot';
    noSs.textContent = 'Aucune capture d\u2019\u00e9cran';
    card.appendChild(noSs);
  }

  // ── Drag & drop ─────────────────────────────────────────
  card.addEventListener('dragstart', function (e) {
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', step.id);
  });

  card.addEventListener('dragend', function () {
    card.classList.remove('dragging');
    document.querySelectorAll('.drag-over').forEach(function (el) { el.classList.remove('drag-over'); });
  });

  card.addEventListener('dragover', function (e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    card.classList.add('drag-over');
  });

  card.addEventListener('dragleave', function () {
    card.classList.remove('drag-over');
  });

  card.addEventListener('drop', function (e) {
    e.preventDefault();
    card.classList.remove('drag-over');
    var draggedId = e.dataTransfer.getData('text/plain');
    if (draggedId === step.id) return;

    var fromIdx = steps.findIndex(function (s) { return s.id === draggedId; });
    var toIdx   = steps.findIndex(function (s) { return s.id === step.id; });
    if (fromIdx === -1 || toIdx === -1) return;

    var moved = steps.splice(fromIdx, 1)[0];
    steps.splice(toIdx, 0, moved);

    browser.runtime.sendMessage({
      type: 'REORDER_STEPS',
      order: steps.map(function (s) { return s.id; })
    });
    render();
  });

  return card;
}

// ── Modal ────────────────────────────────────────────────────────────────────

function openModal(src) {
  modalImg.src = src;
  modal.hidden = false;
}

function closeModal() { modal.hidden = true; }

modalClose.addEventListener('click', closeModal);
modal.querySelector('.modal-backdrop').addEventListener('click', closeModal);
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && !modal.hidden) closeModal();
});

// ── Export: Markdown ─────────────────────────────────────────────────────────

btnExportMd.addEventListener('click', function () {
  var md = '# ' + title + '\n\n';
  steps.forEach(function (step, i) {
    md += '## \u00c9tape ' + (i + 1) + ' : ' + step.description + '\n\n';
    if (step.screenshot) {
      md += '![\u00c9tape ' + (i + 1) + '](' + step.screenshot + ')\n\n';
    }
  });
  md += '\n---\n*G\u00e9n\u00e9r\u00e9 avec ScreenTutorial*\n';
  download(slugify(title) + '.md', md, 'text/markdown');
});

// ── Export: Standalone HTML ──────────────────────────────────────────────────

btnExportHtml.addEventListener('click', function () {
  var stepsHtml = '';
  steps.forEach(function (step, i) {
    stepsHtml +=
      '<div class="step">' +
        '<div class="step-header">' +
          '<div class="step-number">' + (i + 1) + '</div>' +
          '<div class="step-description">' + esc(step.description) + '</div>' +
        '</div>' +
        (step.screenshot
          ? '<img src="' + step.screenshot + '" alt="\u00c9tape ' + (i + 1) + '">'
          : '') +
      '</div>';
  });

  var html = HTML_TEMPLATE
    .replace(/\{\{TITLE\}\}/g, esc(title))
    .replace('{{STEP_COUNT}}', steps.length)
    .replace('{{DATE}}', new Date().toLocaleDateString('fr-FR'))
    .replace('{{STEPS}}', stepsHtml);

  download(slugify(title) + '.html', html, 'text/html');
});

// ── Export: PDF (via print) ──────────────────────────────────────────────────

btnExportPdf.addEventListener('click', function () {
  var stepsHtml = '';
  steps.forEach(function (step, i) {
    stepsHtml +=
      '<div class="step">' +
        '<div class="step-header">' +
          '<div class="step-number">' + (i + 1) + '</div>' +
          '<div class="step-description">' + esc(step.description) + '</div>' +
        '</div>' +
        (step.screenshot
          ? '<img src="' + step.screenshot + '" alt="\u00c9tape ' + (i + 1) + '">'
          : '') +
      '</div>';
  });

  var html = HTML_TEMPLATE
    .replace(/\{\{TITLE\}\}/g, esc(title))
    .replace('{{STEP_COUNT}}', steps.length)
    .replace('{{DATE}}', new Date().toLocaleDateString('fr-FR'))
    .replace('{{STEPS}}', stepsHtml);

  var w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
  // Wait for images to load before triggering print
  w.onload = function () { w.print(); };
});

// ── Utilities ────────────────────────────────────────────────────────────────

function download(filename, content, type) {
  var blob = new Blob([content], { type: type });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    || 'tutoriel';
}

function esc(text) {
  var d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

// ── HTML export template ─────────────────────────────────────────────────────

var HTML_TEMPLATE =
  '<!DOCTYPE html>\n' +
  '<html lang="fr">\n' +
  '<head>\n' +
  '<meta charset="UTF-8">\n' +
  '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
  '<title>{{TITLE}}</title>\n' +
  '<style>\n' +
  '*{margin:0;padding:0;box-sizing:border-box}\n' +
  'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;line-height:1.6;color:#333;max-width:820px;margin:0 auto;padding:2.5rem 2rem;background:#fafafa}\n' +
  'h1{font-size:2rem;margin-bottom:.4rem;color:#1a1a2e}\n' +
  '.meta{color:#888;font-size:.9rem;margin-bottom:2.5rem;padding-bottom:1.2rem;border-bottom:2px solid #e5e5e5}\n' +
  '.step{background:#fff;border-radius:12px;margin-bottom:1.5rem;box-shadow:0 1px 4px rgba(0,0,0,.07);overflow:hidden}\n' +
  '.step-header{display:flex;align-items:center;gap:.8rem;padding:1.2rem 1.5rem}\n' +
  '.step-number{width:32px;height:32px;background:#4a90d9;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.85rem;flex-shrink:0}\n' +
  '.step-description{font-size:1.05rem;font-weight:500}\n' +
  '.step img{width:100%;display:block;border-top:1px solid #f0f0f0}\n' +
  'footer{text-align:center;margin-top:3rem;color:#aaa;font-size:.8rem}\n' +
  '@media print{\n' +
  '  @page{margin:1.5cm}\n' +
  '  body{padding:0;background:#fff}\n' +
  '  .step{break-inside:avoid;box-shadow:none;border:1px solid #ddd}\n' +
  '  .step img{max-height:60vh}\n' +
  '  footer{margin-top:1rem}\n' +
  '}\n' +
  '</style>\n' +
  '</head>\n' +
  '<body>\n' +
  '<h1>{{TITLE}}</h1>\n' +
  '<div class="meta">{{STEP_COUNT}} \u00e9tapes \u2014 G\u00e9n\u00e9r\u00e9 le {{DATE}}</div>\n' +
  '{{STEPS}}\n' +
  '<footer>G\u00e9n\u00e9r\u00e9 avec ScreenTutorial</footer>\n' +
  '</body>\n' +
  '</html>';
