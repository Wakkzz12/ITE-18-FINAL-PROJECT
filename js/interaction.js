import * as THREE from 'three';

export function createInteractor({ scene, camera, renderer, boneMeshes, bonesMetadata, onSelect }) {
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let highlightedMaterial = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0x442200 });
    let originalMaterial = null;
    let selectedBone = null;

    function onPointerDown(event) {
        // 1. Calculate pointer position in normalized device coordinates (-1 to +1)
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        // 2. Cast a ray from the camera
        raycaster.setFromCamera(pointer, camera);

        // 3. See what we hit
        const intersects = raycaster.intersectObjects(boneMeshes, false);

        if (intersects.length > 0) {
        const hitObject = intersects[0].object;
        
        // Restore previous bone material if one was selected
        if (selectedBone && selectedBone !== hitObject) {
            if (originalMaterial) selectedBone.material = originalMaterial;
        }

        // Select new bone
        if (selectedBone !== hitObject) {
            selectedBone = hitObject;
            originalMaterial = selectedBone.material; // Save original color
            selectedBone.material = highlightedMaterial; // Highlight
            
            // Notify main.js
            const meshName = selectedBone.name || 'Unknown';
            onSelect(meshName, bonesMetadata[meshName]);

            // Optional: Zoom camera to bone (simple implementation)
            // camera.position.lerp(new THREE.Vector3(hitObject.position.x, hitObject.position.y + 20, hitObject.position.z + 50), 0.1);
        }
        }
    }

    // Add listener to the canvas
    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    return {
        cleanup: () => {
        renderer.domElement.removeEventListener('pointerdown', onPointerDown);
        }
    };
}