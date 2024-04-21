// manage previewer for 3D model
import * as THREE from 'https://unpkg.com/three@0.127.0/build/three.module.js';
import { PLYLoader } from 'https://unpkg.com/three@0.127.0/examples/jsm/loaders/PLYLoader.js';

let previewScene, previewCamera, previewRenderer;
let currentMesh;
const previewerElement = document.getElementById('previewer');

function setupPreviewer() {
    previewScene = new THREE.Scene();
    previewScene.background = new THREE.Color(0xaaaaaa);

    previewCamera = new THREE.PerspectiveCamera(75, previewerElement.clientWidth / previewerElement.clientHeight, 0.1, 1000);
    previewCamera.position.set(3, 0, 0); // Set initial position of the camera

    previewRenderer = new THREE.WebGLRenderer({ antialias: true });
    previewRenderer.setSize(previewerElement.clientWidth, previewerElement.clientHeight);

    previewerElement.appendChild(previewRenderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    previewScene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1);
    previewScene.add(directionalLight);

    loadPLYFileToPreviewer(); // Load the PLY file
}

let angle = 0; // Initialize angle for rotation
let isAnimating = false;
function animatePreviewer() {
    if (!isAnimating) {
        isAnimating = true;
        console.log('Animation started');
    }
    requestAnimationFrame(animatePreviewer);

    if (currentMesh) {
        // Compute the bounding box only if it hasn't been computed or if the mesh changes
        if (!currentMesh.geometry.boundingBox) {
            currentMesh.geometry.computeBoundingBox();
        }
        
        const boundingBox = currentMesh.geometry.boundingBox;
        const center = boundingBox.getCenter(new THREE.Vector3());

        // Adjust the angle for rotation
        angle += 0.005;

        // Calculate the camera distance
        const size = boundingBox.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = previewCamera.fov * (Math.PI / 180);
        let cameraDistance = 0.8 * (maxDim / Math.tan(fov / 2));

        // Update camera position
        previewCamera.position.x = center.x + cameraDistance * Math.cos(angle);
        previewCamera.position.y = center.y;
        previewCamera.position.z = center.z + cameraDistance * Math.sin(angle);
        previewCamera.lookAt(center); // Camera now looks at the center of the bounding box
    } else {
        console.log('No mesh to rotate.');
    }

    previewRenderer.render(previewScene, previewCamera);
}

function loadPLYFileToPreviewer(index = 0) {
    if (currentMesh) {
        previewScene.remove(currentMesh);
        if (currentMesh.geometry) currentMesh.geometry.dispose();
        if (currentMesh.material) currentMesh.material.dispose();
    }
   
    const paths = {
        10: './model/a chair_2.ply',
        20: './model/a chair_4.ply',
        30: './model/a chair_8.ply',
        40: './model/a chair_16.ply',
        50: './model/a chair_64.ply',
        60: './model/a chair_128.ply'
    };

    let path = paths[index] || './model/a chair_16.ply'; // Default path if index is out of defined keys

    const loader = new PLYLoader();
    loader.load(
        path,
        
        (geometry) => {
            console.log('Model loaded successfully:', path);
            geometry.computeVertexNormals();
            const material = new THREE.MeshStandardMaterial({ vertexColors: true });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.rotateX(-Math.PI / 2);
            mesh.name = 'default'; // Set a name for the mesh
            mesh.position.set(0, 0, 0); // Set the initial position of the mesh
            previewScene.add(mesh);
            currentMesh = mesh;
            if (!isAnimating) animatePreviewer();
        },
        undefined,
        (error) => console.error('An error happened:', error)
    );
};

function LoadMeshToPreviewer(mesh) {
    if (currentMesh) {
        previewScene.remove(currentMesh);
    }
    if (currentMesh.geometry) {
        currentMesh.geometry.dispose();
    }
    if (currentMesh.material) {
        currentMesh.material.dispose();
    }
    previewScene.add(mesh);
    currentMesh = mesh;
    animatePreviewer();
    
};

function onWindowResize() {
    previewCamera.aspect = previewerElement.clientWidth / previewerElement.clientHeight;
    previewCamera.updateProjectionMatrix();
    previewRenderer.setSize(previewerElement.clientWidth, previewerElement.clientHeight);
}

window.addEventListener('resize', onWindowResize);



export { setupPreviewer, LoadMeshToPreviewer, loadPLYFileToPreviewer, currentMesh };
