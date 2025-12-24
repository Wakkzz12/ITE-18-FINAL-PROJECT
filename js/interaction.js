import * as THREE from 'three';

export function createInteractor({
  camera,
  renderer,
  controls,
  root,
  boneMeshes,
  bonesMetadata,
  onSelect
}) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  let selectedBone = null;
  let originalMaterial = null;
  let isAnimating = false;
  let isSkeletonRotating = false;
  let skeletonRotation = 0; // Track current rotation (0 or Math.PI)

  // Double-click detection
  let lastClickTime = 0;
  let lastClickWasBackground = false;
  const DOUBLE_CLICK_DELAY = 300;

  // Map to store original materials for each mesh
  const materialMap = new Map();

  // Store initial camera position and controls target
  const initialCameraPos = camera.position.clone();
  const initialControlsTarget = controls.target.clone();

  function highlightBone(bone) {
    // Store original material for this specific bone if not already stored
    if (!materialMap.has(bone.uuid)) {
      materialMap.set(bone.uuid, bone.material.clone());
    }
    
    // Create new material for highlight
    bone.material = bone.material.clone();
    bone.material.emissive.setHex(0xff8800);
    bone.material.emissiveIntensity = 0.6;
  }

  function restoreBone() {
    if (selectedBone && materialMap.has(selectedBone.uuid)) {
      selectedBone.material = materialMap.get(selectedBone.uuid);
    }
  }

  function animateCamera(targetPos, targetControlsTarget, duration = 800) {
    if (isAnimating) return;
    isAnimating = true;

    const startPos = camera.position.clone();
    const startControlsTarget = controls.target.clone();
    const startTime = Date.now();

    function updateAnimation() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-in-out cubic)
      const easeProgress = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      camera.position.lerpVectors(startPos, targetPos, easeProgress);
      controls.target.lerpVectors(startControlsTarget, targetControlsTarget, easeProgress);
      controls.update();

      if (progress < 1) {
        requestAnimationFrame(updateAnimation);
      } else {
        isAnimating = false;
      }
    }

    updateAnimation();
  }

  function rotateSkeletonTo(targetRotation, duration = 800) {
    if (isSkeletonRotating) return;
    isSkeletonRotating = true;

    const startRotation = skeletonRotation;
    const startTime = Date.now();

    function updateRotation() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-in-out cubic)
      const easeProgress = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      const currentRotation = startRotation + (targetRotation - startRotation) * easeProgress;
      root.rotation.y = currentRotation;

      if (progress < 1) {
        requestAnimationFrame(updateRotation);
      } else {
        isSkeletonRotating = false;
        skeletonRotation = targetRotation;
      }
    }

    updateRotation();
  }

  function focusCameraOnBone(bone) {
    const box = new THREE.Box3().setFromObject(bone);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3()).length();

    const direction = new THREE.Vector3(0, 0, 1);
    const distance = size * 1.8;

    const targetPos = center.clone().add(direction.clone().multiplyScalar(distance));
    animateCamera(targetPos, center.clone());
  }

  function resetCamera() {
    animateCamera(initialCameraPos, initialControlsTarget);
  }

  function onPointerDown(event) {
    if (isAnimating) return;

    const rect = renderer.domElement.getBoundingClientRect();

    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(boneMeshes, false);

    const currentTime = Date.now();
    const isDoubleClick = lastClickWasBackground && (currentTime - lastClickTime) < DOUBLE_CLICK_DELAY;

    if (!intersects.length) {
      // Background clicked
      if (isDoubleClick) {
        // Double-click on background - reset view
        restoreBone();
        selectedBone = null;
        onSelect('Skeletal System', bonesMetadata['Skeletal System'] || {
          name: 'Skeletal System',
          definition: 'No description available.',
          function: 'No function data available.'
        });
        resetCamera();
        rotateSkeletonTo(0); // Reset to front view
      }
      // Single click on background does nothing now
      lastClickWasBackground = true;
      lastClickTime = currentTime;
      return;
    }

    // Clicked on a bone - not a background click
    lastClickWasBackground = false;

    const hitBone = intersects[0].object;
    console.log('Clicked bone:', hitBone.name, 'UUID:', hitBone.uuid);
    
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

    // Rotate skeleton to show back for scapula or vertebrae (spine)
    if (name === 'Scapula' || name === 'Vertebrae') {
      rotateSkeletonTo(Math.PI); // 180 degrees to show back
    } else {
      rotateSkeletonTo(0); // Front view for other bones
    }
  }

  renderer.domElement.addEventListener('pointerdown', onPointerDown);

  return {
    resetSelection() {
      restoreBone();
      selectedBone = null;
      resetCamera();
      rotateSkeletonTo(0);
    },
    cleanup() {
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
    }
  };
}
