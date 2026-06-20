import { initEngine } from './db.js';

// Result rendering contract (reused in later phases):
//   db.exec(sql) -> [{ columns, values }]  (empty [] for no-row statements)
// HTML-escape every cell.

/** HTML-escape a value for safe insertion as text content. */
function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Render a single {columns, values} result set into an HTML table string. */
function renderTable(result) {
  const head =
    '<tr>' + result.columns.map((c) => `<th>${escapeHtml(c)}</th>`).join('') + '</tr>';
  const body = result.values
    .map(
      (row) =>
        '<tr>' + row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('') + '</tr>'
    )
    .join('');
  return `<table><thead>${head}</thead><tbody>${body}</tbody></table>`;
}

async function main() {
  const statusEl = document.getElementById('status');
  const resultEl = document.getElementById('result');

  try {
    const SQL = await initEngine();
    const db = new SQL.Database();
    db.run("CREATE TABLE t(a,b); INSERT INTO t VALUES (1,'Vash'),(2,'Spike');");
    const results = db.exec('SELECT * FROM t;');

    statusEl.textContent = 'SQL engine ready.';
    statusEl.classList.remove('error');
    statusEl.classList.add('ready');

    resultEl.innerHTML = results.map(renderTable).join('');
  } catch (err) {
    statusEl.textContent = 'Error: ' + (err && err.message ? err.message : String(err));
    statusEl.classList.remove('ready');
    statusEl.classList.add('error');
    // Also surface to the console for debugging.
    console.error(err);
  }
}

main();
