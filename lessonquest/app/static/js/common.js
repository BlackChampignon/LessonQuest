window.LQ = {
  icons() { window.lucide?.createIcons(); },
  math(root, bare = false) {
    if (bare && window.katex) root.querySelectorAll('[data-math]').forEach(el => {
      if (el.querySelector('.katex')) return;
      const text = el.textContent;
      if (!text.includes('$') && !text.includes('\\(') && !text.includes('\\[')) {
        window.katex.render(text, el, { throwOnError: false, trust: false, strict: 'ignore' });
      }
    });
    window.renderMathInElement?.(root, { delimiters: [{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false},{left:'\\(',right:'\\)',display:false},{left:'\\[',right:'\\]',display:true}], throwOnError:false, trust:false });
  },
  toast(message) {
    const el = document.getElementById('toast'); el.textContent = message; el.hidden = false;
    clearTimeout(this.toastTimer); this.toastTimer = setTimeout(() => { el.hidden = true; }, 4000);
  },
  async request(url, method, body) {
    const response = await fetch(url, { method, headers: body ? {'Content-Type':'application/json'} : {}, body: body ? JSON.stringify(body) : undefined });
    if (!response.ok) {
      let message = `Request failed (${response.status})`;
      try { const data = await response.json(); message = Array.isArray(data.detail) ? data.detail.map(e => e.msg).join('\n') : data.detail || message; } catch (_) {}
      throw new Error(message);
    }
    return response.status === 204 ? null : response.json();
  }
};
document.addEventListener('DOMContentLoaded', () => LQ.icons());
