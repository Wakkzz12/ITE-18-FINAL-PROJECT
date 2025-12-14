import * as THREE from 'three';

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

    const direction = new THREE.Vector3(0, 0, 1);
    const distance = size * 1.8;

    camera.position.lerp(
      center.clone().add(direction.multiplyScalar(distance)),
      0.15
    );
    camera.lookAt(center);
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

  renderer.domElement.addEventListener('pointerdown', onPointerDown);

  return {
    cleanup() {
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
    }
  };
}
