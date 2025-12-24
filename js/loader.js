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

    // Mapping of mesh names/indices to bone names from bones.json
    // Note: Order matters - more specific patterns should come first
    const meshNameMap = {
        'Skull': ['Skull', 'skull', 'head', 'cranium'],
        'Femur': ['Femur', 'femur', 'thigh', 'thigh_bone', 'femur_l', 'femur_r', 'femur_left', 'femur_right'],
        'Humerus': ['Humerus', 'humerus', 'upper_arm', 'arm', 'humerus_l', 'humerus_r', 'humerus_left', 'humerus_right'],
        'Ribcage': ['Ribcage', 'ribcage', 'ribs', 'rib_cage'],
        'Vertebrae': ['Vertebrae', 'vertebrae', 'spine', 'spinal', 'vertebra', 'backbone'],
        'Sternum': ['Sternum', 'sternum', 'breastbone'],
        'Hipbone': ['Hipbone', 'hipbone', 'pelvis', 'hip_bone'],
        'Metacarpals': ['Metacarpals', 'metacarpals', 'hand_bones', 'metacarpal_l', 'metacarpal_r', 'metacarpal_left', 'metacarpal_right'],
        'Phalanges': ['Phalanges', 'phalanges', 'fingers', 'toes', 'phalanges_l', 'phalanges_r', 'phalanges_left', 'phalanges_right'],
        'Tibia': ['Tibia', 'tibia', 'shin_bone', 'shin', 'tibia_l', 'tibia_r', 'tibia_left', 'tibia_right'],
        'Radius': ['Radius', 'radius', 'thumb_side', 'radius_bone', 'radius_l', 'radius_r', 'radius_left', 'radius_right'],
        'Ulna': ['Ulna', 'ulna', 'pinky_side', 'ulna_bone', 'ulna_l', 'ulna_r', 'ulna_left', 'ulna_right'],
        'Scapula': ['Scapula', 'scapula', 'shoulder_blade', 'scapula_l', 'scapula_r', 'scapula_left', 'scapula_right'],
        'Clavicle': ['Clavicle', 'clavicle', 'collar_bone', 'clavicle_l', 'clavicle_r', 'clavicle_left', 'clavicle_right'],
        "Patella": ['Patella', 'patella', 'kneecap', 'patella_l', 'patella_r', 'patella_left', 'patella_right'],
        "Carpals": ['Carpals', 'carpals', 'wrist_bones', 'carpal_l', 'carpal_r', 'carpal_left', 'carpal_right'],
        "Metatarsals": ['Metatarsals', 'metatarsals', 'foot_bones', 'metatarsal_l', 'metatarsal_r', 'metatarsal_left', 'metatarsal_right'],
        "Skeletal_System": ['Skeleton', 'skeleton', 'full_body'],
        "Tarsals": ['Tarsals', 'tarsals', 'ankle_bones', 'tarsal_l', 'tarsal_r', 'tarsal_left', 'tarsal_right'],
        "Pubis": ['Pubis', 'pubis', 'pubic_bone']
    };

    // Function to match mesh name to bone name
    function matchMeshToBone(meshName, index) {
        if (!meshName || meshName.startsWith('Bone_')) {
            return null;
        }

        const lowerName = meshName.toLowerCase();
        
        // Special handling for bones that can be easily confused
        // Check for Ulna first (pinky side) - should match before general forearm patterns
        if (lowerName.includes('ulna') || (lowerName.includes('pinky') && !lowerName.includes('radius'))) {
            return 'Ulna';
        }
        // Check for Radius (thumb side) - should match before general forearm patterns
        if (lowerName.includes('radius') || (lowerName.includes('thumb') && !lowerName.includes('ulna'))) {
            return 'Radius';
        }

        // Check for other specific patterns
        for (const [boneName, aliases] of Object.entries(meshNameMap)) {
            // Skip if we already handled it above
            if (boneName === 'Ulna' || boneName === 'Radius') {
                continue;
            }
            
            for (const alias of aliases) {
                const aliasLower = alias.toLowerCase();
                // Exact match preferred, then substring match
                if (lowerName === aliasLower) {
                    return boneName;
                }
                if (lowerName.includes(aliasLower)) {
                    return boneName;
                }
            }
        }
        return null;
    }

    const root = await new Promise((resolve, reject) => {
        loader.load(
        objPath,
        (gltf) => {
            const model = gltf.scene;
            let meshIndex = 0;

            model.traverse((child) => {
                if (child.isMesh) {
                    console.log('Original mesh name:', child.name);

                    // Try to match mesh name to a bone
                    const matchedBone = matchMeshToBone(child.name, meshIndex);
                    if (matchedBone) {
                        child.name = matchedBone;
                        console.log('Renamed to:', matchedBone);
                    } else {
                        child.name = child.name || 'Bone_' + child.id;
                        console.log('Kept as:', child.name);
                    }

                    // DO NOT replace material – preserve GLTF data
                    if (child.material) {
                    child.material.color.set(0xe3dac9);
                    child.material.roughness = 0.5;
                    }

                    boneMeshes.push(child);
                    meshIndex++;
                }
                });

                // Calculate the bounding box of the raw model
                const box = new THREE.Box3().setFromObject(model);
                const size = box.getSize(new THREE.Vector3());
                const center = box.getCenter(new THREE.Vector3());
                
                // Scale it to a target size (e.g., 150 units tall)
                // This ensures it looks the same regardless of the original file units
                const maxAxis = Math.max(size.x, size.y, size.z);
                const targetSize = 150; 
                const scaleFactor = targetSize / maxAxis;

                model.scale.set(scaleFactor, scaleFactor, scaleFactor);

                // Recalculate bounding box after scaling
                const scaledBox = new THREE.Box3().setFromObject(model);
                const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
                
                // Center the model at the origin
                model.position.sub(scaledCenter);

                // Add to scene
                scene.add(model);

                // Update camera target to look at the center (0, 0, 0)
                controls.target.set(0, 0, 0);
                controls.update();

                // Log the dimensions to debug
                console.log(`Model Original Size: ${size.y.toFixed(2)} units`);
                console.log(`Scaled to: ${targetSize} units`);
                console.log(`Model centered at origin`);

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