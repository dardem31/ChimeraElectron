(() => {
    let highLighterClickHandlerFn = null;
    let sessionActions = []
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
            } catch (_) {
            }
        }

        function enable() {
            if (window.__chimeraHighlighterEnabled) return;
            window.addEventListener('mousemove', onMove, {passive: true});
            initAiDialog();
            window.__chimeraHighlighterEnabled = true;
        }

        function disable() {
            if (!window.__chimeraHighlighterEnabled) return;
            window.removeEventListener('mousemove', onMove);
            destroyAiDialog();
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


        function initAiDialog() {
            // ======= Модалка для ввода команды =======
            const aiModal = document.createElement('div');
            aiModal.id = "aiModal-dialog"
            aiModal.style.position = 'fixed';
            aiModal.style.bottom = '20px';
            aiModal.style.left = '50%';
            aiModal.style.transform = 'translateX(-50%)';
            aiModal.style.background = 'rgba(0,0,0,0.85)';
            aiModal.style.color = '#fff';
            aiModal.style.padding = '8px 12px';
            aiModal.style.borderRadius = '6px';
            aiModal.style.zIndex = 2147483648;
            aiModal.style.display = 'none';
            aiModal.style.fontFamily = 'monospace';
            aiModal.style.minWidth = '300px';
            aiModal.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
            document.body.appendChild(aiModal);

            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = 'Введите команду для AI...';
            input.style.width = '100%';
            input.style.padding = '4px 6px';
            input.style.borderRadius = '4px';
            input.style.border = 'none';
            input.style.outline = 'none';
            input.style.fontFamily = 'monospace';
            aiModal.appendChild(input);

            const submitBtn = document.createElement('button');
            submitBtn.textContent = 'OK';
            submitBtn.style.marginLeft = '8px';
            submitBtn.style.padding = '4px 6px';
            submitBtn.style.border = 'none';
            submitBtn.style.borderRadius = '4px';
            submitBtn.style.cursor = 'pointer';
            aiModal.appendChild(submitBtn);
            submitBtn.addEventListener('click', () => {
                const command = input.value.trim();
                if (!command) return;

                const selectedElement = aiModal.__selectedElement;
                if (!selectedElement) return;

                // Создаём событие для отправки на backend
                const customEvent = new CustomEvent("submit-prompt", {
                    detail: {selectedElement: selectedElement, userCommand: command}
                });
                console.log({selectedElement: selectedElement, userCommand: command})
                window.dispatchEvent(customEvent);

                // Скрываем модалку
                aiModal.style.display = 'none';
            });
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') submitBtn.click();
            });
            highLighterClickHandlerFn = async function (e) {
                console.log('TEST')
                e.preventDefault();
                e.stopPropagation();
                const el = document.elementFromPoint(e.clientX, e.clientY);
                if (!el) {
                    console.log('Failed to get element on click!', e)
                    return;
                }

                const selectedElement = {
                    outerHTML: el.outerHTML,
                    selector: getUniqueSelector(el),
                    tagName: el.tagName,
                    classList: Array.from(el.classList),
                    inlineStyle: el.getAttribute("style"),
                    computedStyle: getComputedStyleObject(el),
                    parentHTML: el.parentElement ? el.parentElement.outerHTML : null,
                    hash: await hashElement(el)
                };

                // Показываем модалку и фокус на input
                console.log('Going to show ai modal', aiModal)
                aiModal.style.display = 'flex';
                input.value = '';
                input.focus();

                // Сохраняем выбранный элемент для отправки после ввода
                aiModal.__selectedElement = selectedElement;
            };

            document.addEventListener("mousedown", highLighterClickHandlerFn, { passive: true });

            function getUniqueSelector(el) {
                if (!(el instanceof Element)) return null;

                const path = [];
                while (el && el.nodeType === Node.ELEMENT_NODE) {
                    let selector = el.nodeName.toLowerCase();
                    if (el.id) {
                        selector += `#${el.id}`;
                        path.unshift(selector);
                        break;
                    } else {
                        // учитываем позицию элемента среди однотипных
                        let sib = el;
                        let nth = 1;
                        while ((sib = sib.previousElementSibling)) {
                            if (sib.nodeName.toLowerCase() === selector) nth++;
                        }
                        selector += `:nth-of-type(${nth})`;
                    }
                    path.unshift(selector);
                    el = el.parentElement;
                }
                return path.join(" > ");
            }

            function getComputedStyleObject(el) {
                const computed = window.getComputedStyle(el);
                const importantProps = [
                    "color",
                    "background-color",
                    "font-size",
                    "font-weight",
                    "display",
                    "position",
                    "width",
                    "height",
                    "margin",
                    "padding",
                    "border",
                    "border-radius",
                    "text-align",
                ];
                const styleObj = {};
                importantProps.forEach((prop) => {
                    styleObj[prop] = computed.getPropertyValue(prop);
                });
                return styleObj;
            }
        }
        function destroyAiDialog() {
            document.getElementById('aiModal-dialog').remove();
            if (highLighterClickHandlerFn != null) {
                document.removeEventListener("click", highLighterClickHandlerFn);
            }

        }

        window.addEventListener("message", (event) => {
            const type = event.data.type;
            const payload = event.data.payload;
            if (type != null && payload != null) {
                switch (type) {
                    case 'prompt-response': {
                        console.log('Prompt response: ', payload)
                        if (payload.type === 'JS_ACTION') {
                            eval(payload.jsCode)
                        }
                        break
                    }
                    case 'preload-session-actions': {
                        console.log(payload)
                        applyActions(payload)
                        break
                    }
                }
            }
        });
        async function applyActions(sessionActions) {
            let notUsedActions = [];
            for (let action of sessionActions) {
                let selector = action.selector;
                let hash = action.elementHash;
                let element = document.querySelector(selector);
                if (element != null) {
                    let elementHash = await hashElement(element);
                    if (hash === elementHash) {
                        let instruction = JSON.parse(action.instruction);
                        eval(instruction.jsCode);
                        continue;
                    }
                }
                notUsedActions.push(action)
            }
            sessionActions = notUsedActions;
            if (sessionActions.length !== 0) {
                setTimeout(function () {
                    applyActions(sessionActions)
                }, 1000)
            }
        }

        async function hashElement(el) {
            function getElementPath(node) {
                const path = [];
                while (node && node !== document.body && node.nodeType === Node.ELEMENT_NODE) {
                    const tag = node.tagName;

                    // Определяем индекс среди элементов с тем же тегом
                    const siblings = Array.from(node.parentNode?.children || [])
                        .filter(n => n.tagName === tag);

                    const index = siblings.indexOf(node);

                    path.unshift(`${tag}[${index}]`);
                    node = node.parentNode;
                }
                // Включаем BODY как корень
                path.unshift("BODY");
                return path.join("/");
            }

            function stableMinimalIdentity(node) {
                return {
                    tag: node.tagName,
                    id: node.id || null,
                    classes: node.classList.length
                        ? Array.from(node.classList).sort()
                        : null
                };
            }

            const payload = JSON.stringify({
                path: getElementPath(el),
                identity: stableMinimalIdentity(el)
            });

            // SHA-256 HEX (работает и в Electron)
            if (window.crypto && crypto.subtle) {
                const buf = await crypto.subtle.digest(
                    "SHA-256",
                    new TextEncoder().encode(payload)
                );
                return Array.from(new Uint8Array(buf))
                    .map(x => x.toString(16).padStart(2, "0"))
                    .join("");
            }

            // fallback (Node / старые браузеры)
            const cryptoNode = require("crypto");
            let result = await cryptoNode.createHash("sha256").update(payload).digest("hex");
            console.log(`Generated hash element ${result}`)
            return result;
        }

    } catch (err) {
        console.error('Highlighter init failed:', err);
    }
})();
