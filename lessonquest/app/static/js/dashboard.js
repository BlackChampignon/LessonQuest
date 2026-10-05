const dialog = document.getElementById('template-dialog');
for (const id of ['create-activity', 'new-card']) document.getElementById(id).onclick = () => dialog.showModal();
document.getElementById('close-dialog').onclick = () => dialog.close();
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
let filter = 'all';
function search() {
  const query = document.getElementById('search').value.toLocaleLowerCase().trim(); let matches = 0;
  document.querySelectorAll('.activity-card').forEach(card => {
    const kind = card.dataset.kind;
    const visible = card.dataset.title.includes(query) && (filter === 'all' || kind === filter || (filter === 'quiz' && kind === 'gameshow') || (filter === 'other' && !['quiz','gameshow','flashcards','maths'].includes(kind)));
    card.hidden = !visible; if (visible) matches++;
  });
  document.getElementById('no-results').hidden = matches > 0 || (!query && filter === 'all');
}
document.getElementById('search').oninput = search;
document.querySelectorAll('[data-filter]').forEach(button => button.onclick = () => { filter = button.dataset.filter; document.querySelectorAll('.filter').forEach(el => el.classList.toggle('active', el === button)); search(); });
document.querySelectorAll('[data-duplicate],[data-delete]').forEach(button => button.onclick = async () => {
  const deleting = Boolean(button.dataset.delete); const id = button.dataset.delete || button.dataset.duplicate;
  if (deleting && !confirm(`Delete “${button.dataset.name}”? This removes the saved activity permanently.`)) return;
  button.disabled = true;
  try { await LQ.request(`/api/activities/${id}${deleting ? '' : '/duplicate'}`, deleting ? 'DELETE' : 'POST'); location.reload(); }
  catch (error) { LQ.toast(error.message); button.disabled = false; }
});
