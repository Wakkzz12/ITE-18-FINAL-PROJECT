// js/main.js
//
import * as THREE from 'https://unpkg.com/three@0.156.0/build/three.module.js';
import { createScene } from './loader.js';
import { createInteractor } from './interaction.js';
import { createUI } from './ui.js';

async function loadJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to load '+url);
  return res.json();
}

(async function init() {
  const bonesMetadata = await loadJSON('data/bones.json').catch((e) => {
    console.warn('Could not load bones.json', e);
    return {};
  });

  const { scene, camera, renderer, controls, root, boneMeshes } = await createScene({
    canvasContainerId: 'viewer',
    objPath: 'assets/skeleton.obj'
  });

  const ui = createUI({ bonesMetadata });

  const interactor = createInteractor({
    scene, camera, renderer, controls, boneMeshes, bonesMetadata,
    onSelect: (meshName, meta) => {
      ui.showBone(meshName, meta);
    }
  });

  // reset button
  ui.resetBtn.addEventListener('click', () => {
    // simple reset camera
    camera.position.set(0, 120, 350);
    controls.target.set(0, 80, 0);
    ui.hide();
  });

  // render loop
  function render() {
    requestAnimationFrame(render);
    controls.update();
    renderer.render(scene, camera);
  }
  render();
})();
