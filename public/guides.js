(() => {
  const start = () => {
    const certificate = document.getElementById('certificate');
    const inner = certificate?.querySelector('.certificate-inner');
    if (!certificate || !inner) return;

    const style = document.createElement('style');
    style.id = 'designer-guides-style';
    style.textContent = `
      .designer-guides{position:absolute;inset:0;z-index:999;pointer-events:none;display:block}
      .designer-guides.hidden{display:none}
      .designer-guide{position:absolute;pointer-events:none}
      .designer-guide.v{top:0;bottom:0;left:50%;width:1px;background:repeating-linear-gradient(to bottom,#2d83d8 0 6px,transparent 6px 12px);box-shadow:0 0 0 1px rgba(255,255,255,.55);transform:translateX(-.5px)}
      .designer-guide.h{left:0;right:0;top:50%;height:1px;background:repeating-linear-gradient(to right,#2d83d8 0 6px,transparent 6px 12px);box-shadow:0 0 0 1px rgba(255,255,255,.55);transform:translateY(-.5px)}
      .designer-guide-label{position:absolute;background:#2d83d8;color:#fff;border-radius:4px;font:600 9px/1 Arial,sans-serif;padding:4px 6px;white-space:nowrap;box-shadow:0 2px 7px rgba(20,55,95,.2)}
      .designer-guide-label.v{left:calc(50% + 6px);top:8px}.designer-guide-label.h{top:calc(50% + 6px);left:8px}
      .designer-guides-button.active{background:#e9f3ff!important;border-color:#7fb1e7!important;color:#1d5f9f!important}
      .designer-snap-indicator{position:absolute;z-index:1000;pointer-events:none;border:1px solid #2d83d8;border-radius:3px;display:none}
      @media print{
        @page{size:A4 landscape;margin:0!important}
        html,body{width:297mm!important;height:210mm!important;min-width:297mm!important;min-height:210mm!important;margin:0!important;padding:0!important;overflow:hidden!important;background:#fff!important}
        body{display:block!important}
        .topbar,.panel,.canvas-toolbar,.no-print{display:none!important}
        .workspace,.editor-area,.canvas-scroller,.canvas-holder{display:block!important;width:297mm!important;height:210mm!important;min-width:297mm!important;min-height:210mm!important;margin:0!important;padding:0!important;overflow:hidden!important;background:#fff!important;transform:none!important}
        .certificate{display:block!important;width:297mm!important;height:210mm!important;min-width:297mm!important;min-height:210mm!important;margin:0!important;padding:7.5mm 15.5mm 7mm!important;box-shadow:none!important;break-before:avoid!important;break-after:avoid!important;break-inside:avoid!important;page-break-before:avoid!important;page-break-after:avoid!important;page-break-inside:avoid!important}
        .designer-guides{display:none!important}
      }
    `;
    document.head.appendChild(style);

    const guides = document.createElement('div');
    guides.className = 'designer-guides';
    guides.innerHTML = '<div class="designer-guide v"></div><div class="designer-guide h"></div><div class="designer-guide-label v">CENTRO · 148,5 mm</div><div class="designer-guide-label h">CENTRO · 105 mm</div>';
    inner.appendChild(guides);

    const tools = document.querySelector('.canvas-tools');
    if (tools) {
      const guideButton = document.createElement('button');
      guideButton.type = 'button';
      guideButton.id = 'toggleGuides';
      guideButton.className = 'designer-guides-button active';
      guideButton.textContent = 'Guías';
      guideButton.title = 'Mostrar u ocultar guías de centrado';
      guideButton.setAttribute('aria-pressed', 'true');
      tools.appendChild(guideButton);

      const snapButton = document.createElement('button');
      snapButton.type = 'button';
      snapButton.id = 'toggleSnap';
      snapButton.className = 'designer-guides-button active';
      snapButton.textContent = 'Ajustar';
      snapButton.title = 'Ajustar elementos al centro';
      snapButton.setAttribute('aria-pressed', 'true');
      tools.appendChild(snapButton);

      let guidesOn = true;
      let snapOn = true;
      guideButton.addEventListener('click', () => {
        guidesOn = !guidesOn;
        guides.classList.toggle('hidden', !guidesOn);
        guideButton.classList.toggle('active', guidesOn);
        guideButton.setAttribute('aria-pressed', String(guidesOn));
      });
      snapButton.addEventListener('click', () => {
        snapOn = !snapOn;
        snapButton.classList.toggle('active', snapOn);
        snapButton.setAttribute('aria-pressed', String(snapOn));
      });

      document.addEventListener('pointermove', () => {
        if (!snapOn) return;
        const selected = certificate.querySelector('.editable-element.element-selected');
        if (!selected) return;
        const xInput = document.getElementById('elementX');
        const yInput = document.getElementById('elementY');
        const wInput = document.getElementById('elementWidth');
        const hInput = document.getElementById('elementHeight');
        if (!xInput || !yInput || !wInput || !hInput) return;
        const x = Number(xInput.value), y = Number(yInput.value), w = Number(wInput.value), h = Number(hInput.value);
        if (![x,y,w,h].every(Number.isFinite)) return;
        const centerX = x + w / 2;
        const centerY = y + h / 2;
        const SNAP = 2.5;
        let nx = x, ny = y, changed = false;
        if (Math.abs(centerX - 148.5) <= SNAP) { nx = 148.5 - w / 2; changed = true; }
        if (Math.abs(centerY - 105) <= SNAP) { ny = 105 - h / 2; changed = true; }
        if (!changed) return;
        if (nx !== x) { xInput.value = nx.toFixed(1); xInput.dispatchEvent(new Event('input', {bubbles:true})); }
        if (ny !== y) { yInput.value = ny.toFixed(1); yInput.dispatchEvent(new Event('input', {bubbles:true})); }
      }, true);
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
