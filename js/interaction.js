import * as THREE from 'three';


let cameraTargetPos = null;
let cameraTargetLook = null;
let isCameraAnimating = false;

export function createInteractor({
  camera,
  renderer,
  boneMeshes,
  bonesMetadata,
  onSelect
}) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  let selectedBone = null;
  let originalMaterial = null;
  let hoveredBone = null;

  function highlightBone(bone) {
    originalMaterial = bone.material.clone();
    bone.material = bone.material.clone();
    bone.material.emissive.setHex(0xff8800);
    bone.material.emissiveIntensity = 0.6;
  }

  function restoreBone() {
    if (selectedBone && originalMaterial) {
      selectedBone.material = originalMaterial;
    }
  }

  function focusCameraOnBone(bone) {
    const box = new THREE.Box3().setFromObject(bone);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3()).length();

    const meshName = bone.name;
    const meta = bonesMetadata[meshName];
    const offset = meta?.cameraOffset || [0, 1, 2.5];

    cameraTargetPos = center.clone().add(
      new THREE.Vector3(
        offset[0] * size,
        offset[1] * size,
        offset[2] * size
      )
    );

    cameraTargetLook = center.clone();
    isCameraAnimating = true;
  }

  function updateCameraAnimation() {
  if (!isCameraAnimating || !cameraTargetPos) return;

  camera.position.lerp(cameraTargetPos, 0.08);
  camera.lookAt(cameraTargetLook);

  // Stop when close enough
  if (camera.position.distanceTo(cameraTargetPos) < 0.05) {
    isCameraAnimating = false;
  }
}


  function onPointerDown(event) {
    const rect = renderer.domElement.getBoundingClientRect();

    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(boneMeshes, false);

    if (!intersects.length) return;

    const hitBone = intersects[0].object;
    if (hitBone === selectedBone) return;

    restoreBone();
    selectedBone = hitBone;
    highlightBone(hitBone);

    const name = hitBone.name;
    const metadata = bonesMetadata[name] || {
      name,
      definition: 'No data available.',
      function: 'No data available.'
    };

    onSelect(name, metadata);
    focusCameraOnBone(hitBone);
  }

  function onPointerMove(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(boneMeshes, false);

    if (!hits.length) {
      if (hoveredBone && hoveredBone !== selectedBone) {
        hoveredBone.material.emissive.setHex(0x000000);
        hoveredBone = null;
      }
      return;
    }

    const bone = hits[0].object;
    if (bone !== hoveredBone && bone !== selectedBone) {
      if (hoveredBone) hoveredBone.material.emissive.setHex(0x000000);
      hoveredBone = bone;
      hoveredBone.material.emissive.setHex(0x333333);
    }
  }

  function resetSelection() {
    if (selectedBone && originalMaterial) {
      selectedBone.material = originalMaterial;
    }
    selectedBone = null;
    originalMaterial = null;

    boneMeshes.forEach(bone => {
      bone.material.opacity = 1;
      bone.material.transparent = false;
    });

  }

  function isolateBone(activeBone) {
    boneMeshes.forEach(bone => {
      bone.material.transparent = true;
      bone.material.opacity = bone === activeBone ? 1 : 0.15;
    });
  }

  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointermove', onPointerMove);

  isolateBone(selectedBone);

  return {
    cleanup() {
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
    },
    resetSelection,
    updateCameraAnimation
  };
}
