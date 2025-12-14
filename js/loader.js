import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export async function createScene({ canvasContainerId, objPath }) {
    const container = document.getElementById(canvasContainerId);

    // Setup Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#111');

    const camera = new THREE.PerspectiveCamera(
        45,
        container.clientWidth / container.clientHeight,
        0.1,
        1000
    );
    camera.position.set(0, 120, 350);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputColorSpace = THREE.SRGBColorSpace; // Optional: often looks better for GLTF
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(50, 100, 100);
    scene.add(dirLight);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 80, 0);
    controls.update();

    // Resize Handler
    window.addEventListener('resize', () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });

    // Load the GLTF Model
    const loader = new GLTFLoader();
    const boneMeshes = [];

    const root = await new Promise((resolve, reject) => {
        loader.load(
        objPath,
        (gltf) => {
            const model = gltf.scene;

            model.traverse((child) => {
                if (child.isMesh) {
                    console.log(child.name);

                    // DO NOT replace material – preserve GLTF data
                    if (child.material) {
                    child.material.color.set(0xe3dac9);
                    child.material.roughness = 0.5;
                    }

                    child.name = child.name || 'Bone_' + child.id;
                    boneMeshes.push(child);
                }
                });

                // Calculate the bounding box of the raw model
                const box = new THREE.Box3().setFromObject(model);
                const size = box.getSize(new THREE.Vector3());
                const center = box.getCenter(new THREE.Vector3());
                
                model.position.sub(center);

                // Reset position to center the model at (0,0,0)
               /*  model.position.x += (model.position.x - center.x);
                model.position.y += (model.position.y - center.y);
                model.position.z += (model.position.z - center.z); */

                // Scale it to a target size (e.g., 150 units tall)
                // This ensures it looks the same regardless of the original file units
                const maxAxis = Math.max(size.x, size.y, size.z);
                const targetSize = 150; 
                const scaleFactor = targetSize / maxAxis;

                model.scale.set(scaleFactor, scaleFactor, scaleFactor);

                // Add to scene
                scene.add(model);

                // Log the dimensions to debug
                console.log(`Model Original Size: ${size.y.toFixed(2)} units`);
                console.log(`Scaled to: ${targetSize} units`);

                resolve(model);
        },
        undefined,
        (error) => {
            console.error('An error happened loading the GLTF:', error);
            reject(error);
        });
    });

    return { scene, camera, renderer, controls, root, boneMeshes };
}