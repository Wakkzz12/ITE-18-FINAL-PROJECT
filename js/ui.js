export function createUI({ bonesMetadata }) {
  const panel = document.getElementById('info-panel');
  const title = document.getElementById('bone-title');
  const desc = document.getElementById('bone-desc');
  const func = document.getElementById('bone-func');
  const closeBtn = document.getElementById('close-info');
  const resetBtn = document.getElementById('reset-btn');

  closeBtn.addEventListener('click', () => {
    panel.setAttribute('aria-hidden', 'true');
    title.textContent = '';
    desc.textContent = '';
    func.textContent = '';
  });

  function showBone(meshName, meta) {
    const person = {
      ...(bonesMetadata[meshName] || {}),
      ...(meta || {})
    };
    title.textContent = person.displayName || meshName;
    desc.textContent = person.definition || 'No description provided.';
    func.textContent = person.function || 'No function text provided.';
    panel.setAttribute('aria-hidden', 'false');
  }

  function hide() {
    panel.setAttribute('aria-hidden', 'true');
  }

  return { showBone, hide, closeBtn, resetBtn };
}
