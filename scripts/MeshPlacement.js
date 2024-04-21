import * as THREE from 'https://unpkg.com/three@0.127.0/build/three.module.js';
import { scene as mainScene, camera } from './sceneSetup.js';  // Ensure 'scene' is exported from your sceneSetup module

let temporaryMesh = null;  // Holds the mesh being placed
let currentBoundingBoxHelper = null;  // Holds the current bounding box

function placeMeshInMainScene(currentMesh) {
    if (!currentMesh) {
        console.error("No mesh is currently loaded in the previewer.");
        return;
    }

    // Clone the mesh for manipulation in the main scene
    temporaryMesh = currentMesh.clone();
    temporaryMesh.position.set(0, 0, 0);  // Reset position to origin
    mainScene.add(temporaryMesh);

    // Create and add a bounding box helper
    currentBoundingBoxHelper = new THREE.BoxHelper(temporaryMesh, 0xff0000);
    mainScene.add(currentBoundingBoxHelper);

    // Attach handlers for moving and placing the mesh
    console.log("Adding event listener for mousemove");
    window.addEventListener('mousemove', updateMeshPosition);
    window.addEventListener('click', finalizeMeshPlacement);
}

function updateMeshPosition(event) {
    console.log('Updating mesh position...');
    event.preventDefault();

    // Convert mouse position to normalized device coordinates (-1 to +1) for both components.
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Project a ray from the camera through the mouse position
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    // Calculate objects intersecting the picking ray. Assume a hypothetical horizontal plane at z=0
    const planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const targetPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(planeZ, targetPoint);

    if (temporaryMesh) {
        temporaryMesh.position.copy(targetPoint);
        if (currentBoundingBoxHelper) {
            currentBoundingBoxHelper.update();
        }
    }
}

function finalizeMeshPlacement(event) {
    window.removeEventListener('mousemove', updateMeshPosition);
    window.removeEventListener('click', finalizeMeshPlacement);

    // Optional: Clean up any temporary variables or states
    if (temporaryMesh && currentBoundingBoxHelper) {
        // Implement any additional finalization logic here
    }
}

export { placeMeshInMainScene };
