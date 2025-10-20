(() => {
    try {
        if (window.__chimeraHighlighterInstalled) return;
        window.__chimeraHighlighterInstalled = true;
        window.__chimeraHighlighterEnabled = false;

        const style = document.createElement('style');
        style.id = 'chimera-hl-style';
        style.textContent = `
      .chimera-hl-box {
        position: fixed;
        border: 2px solid #ff9800;
        background: rgba(255,152,0,0.06);
        pointer-events: none;
        z-index: 2147483647;
        transition: all 0.05s ease-out;
      }
      .chimera-hl-tip {
        position: fixed;
        padding: 4px 6px;
        background: rgba(0,0,0,0.75);
        color: #fff;
        font-size: 12px;
        border-radius: 4px;
        pointer-events: none;
        z-index: 2147483647;
        font-family: monospace;
      }
    `;
        document.head.appendChild(style);

        const box = document.createElement('div');
        box.className = 'chimera-hl-box';
        box.style.display = 'none';
        document.body.appendChild(box);

        const tip = document.createElement('div');
        tip.className = 'chimera-hl-tip';
        tip.style.display = 'none';
        document.body.appendChild(tip);

        let lastEl = null;

        function onMove(e) {
            try {
                const el = document.elementFromPoint(e.clientX, e.clientY);
                if (!el || el === lastEl || el === box || el === tip) return;
                lastEl = el;

                const r = el.getBoundingClientRect();
                box.style.left = r.left + 'px';
                box.style.top = r.top + 'px';
                box.style.width = r.width + 'px';
                box.style.height = r.height + 'px';
                box.style.display = 'block';

                const label = el.tagName.toLowerCase()
                    + (el.id ? `#${el.id}` : '')
                    + (el.className ? '.' + String(el.className).split(' ').slice(0, 2).join('.') : '');

                tip.textContent = label + ` (${Math.round(r.width)}×${Math.round(r.height)})`;
                tip.style.left = (e.clientX + 10) + 'px';
                tip.style.top = (e.clientY - 28) + 'px';
                tip.style.display = 'block';
            } catch (_) {}
        }

        document.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const el = document.elementFromPoint(e.clientX, e.clientY);
            if (!el) return;
            const htmlSnippet = el.outerHTML;

            // создаём кастомное событие, которое поймает preload
            const customEvent = new CustomEvent("chimera-element-selected", {
                detail: htmlSnippet,
            });
            window.dispatchEvent(customEvent);
        });

        function enable() {
            if (window.__chimeraHighlighterEnabled) return;
            window.addEventListener('mousemove', onMove, { passive: true });
            window.__chimeraHighlighterEnabled = true;
        }

        function disable() {
            if (!window.__chimeraHighlighterEnabled) return;
            window.removeEventListener('mousemove', onMove);
            window.__chimeraHighlighterEnabled = false;
            box.style.display = 'none';
            tip.style.display = 'none';
        }

        window.__chimeraEnableHighlighter = enable;
        window.__chimeraDisableHighlighter = disable;
        window.__chimeraHighlighterToggle = () => {
            if (window.__chimeraHighlighterEnabled) disable(); else enable();
        };

        enable();

        window.addEventListener('beforeunload', () => {
            disable();
            box.remove();
            tip.remove();
            style.remove();
            window.__chimeraHighlighterInstalled = false;
        });
    } catch (err) {
        console.error('Highlighter init failed:', err);
    }
})();
