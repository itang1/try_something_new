// The site's only script. Counts the visit and button taps (no cookies, nothing about the visitor), and sends the
// waitlist form without leaving the page. Without it, the form still posts and shows a thank-you page.
(() => {
  const share = document.body.dataset.share || 'other';
  const activity = document.body.dataset.activity || null;

  function count(event) {
    const data = JSON.stringify({ event, share_kind: share, activity_id: activity });
    try {
      navigator.sendBeacon?.('/api/count', new Blob([data], { type: 'application/json' }));
    } catch {
      // Counting must never get in the way.
    }
  }

  count('visit');
  document.addEventListener('click', (e) => {
    const link = e.target.closest?.('[data-count]');
    if (link) count(link.dataset.count);
  });

  const form = document.querySelector('form[data-waitlist]');
  if (!form) return;
  const status = form.querySelector('.status');
  const button = form.querySelector('button');
  const show = (text, kind) => {
    status.className = `status ${kind}`;
    status.textContent = text;
  };
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    button.disabled = true;
    show('Sending…', '');
    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      const result = await response.json().catch(() => ({ ok: false }));
      if (result.ok) {
        form.reset();
        show('You’re on the list. We’ll email you when the beta has room.', 'thanks');
      } else {
        show(result.error || 'That didn’t work. Please try again.', 'error');
      }
    } catch {
      show('That didn’t work. Check your connection and try again.', 'error');
    } finally {
      button.disabled = false;
    }
  });
})();
