// manage previewer for 3D model
import * as THREE from 'https://unpkg.com/three@0.127.0/build/three.module.js';
import { PLYLoader } from 'https://unpkg.com/three@0.127.0/examples/jsm/loaders/PLYLoader.js';
import { OBJLoader } from 'https://unpkg.com/three@0.127.0/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'https://unpkg.com/three@0.127.0/examples/jsm/loaders/MTLLoader.js';

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
    // loadOBJFileToPreviewer(0);
}

let angle = 0; // Initialize angle for rotation
let isAnimating = false;
let lastTime = 0;

function animatePreviewer(timestamp) {
    let deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    if (!isAnimating) {
        isAnimating = true;
        console.log('Animation started');
    }
    requestAnimationFrame(animatePreviewer);

    if (currentMesh && currentMesh.geometry) {
        // Compute the bounding box only if it hasn't been computed or if the mesh changes
        if (!currentMesh.geometry.boundingBox) {
            currentMesh.geometry.computeBoundingBox();
        }
        
        const boundingBox = currentMesh.geometry.boundingBox;
        const center = boundingBox.getCenter(new THREE.Vector3());

        // Adjust the angle for rotation
        if(deltaTime) {angle += 0.008 * deltaTime / (1000/60);}

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
        previewCamera.position.set(3, 0, 0); // Reset the camera position
        previewCamera.lookAt(0, 0, 0); // Reset the camera lookAt
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

function loadOBJFileToPreviewer(index = 0) {
    if (currentMesh) {
        previewScene.remove(currentMesh);
        if (currentMesh.geometry) currentMesh.geometry.dispose();
        if (currentMesh.material) currentMesh.material.dispose();
    }

    const objPath = {
        0: './model/spot.obj',
        1: './model/mesh.obj',
        2: './model/chair hand.obj',
    };

    const mtlPath = {
        0: './model/spot.mtl',
        1: './model/mesh.mtl',
        2: './model/chair hand.mtl',
    };

    let objFilePath = objPath[index] || './model/spot.obj'; // Default path if index is out of defined keys
    let mtlFilePath = mtlPath[index] || './model/spot.mtl'; // Default material file path

    const mtlLoader = new MTLLoader();
    mtlLoader.load(mtlFilePath, (materials) => {
        materials.preload();
        const objLoader = new OBJLoader();
        objLoader.setMaterials(materials);
        objLoader.load(
            objFilePath,
            (object) => {
                console.log('Model loaded successfully:', objFilePath);
                object.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        // Check if materials exist, else assign a default
                        if (!child.material) {
                            child.material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
                        }
                        if (!child.geometry.attributes.normal) {
                            child.geometry.computeVertexNormals();
                        }
                    }
                });
                
                object.name = 'default';
                object.position.set(0, 0, 0);
                previewScene.add(object);
                currentMesh = object;
                if (!isAnimating) animatePreviewer();
            },
            undefined,
            (error) => console.error('An error happened loading the OBJ:', error)
        );
    }, (error) => console.error('An error happened loading the MTL:', error));
}

function LoadMeshToPreviewer(mesh) {
    if (!mesh) {
        console.error('No mesh to load.');
        return;
    }
    clearCurrentMesh();
    previewScene.add(mesh);
    currentMesh = mesh;
    animatePreviewer();
        
};

function clearCurrentMesh() {
    if (currentMesh) {
        if (currentMesh.geometry) currentMesh.geometry.dispose();
        if (currentMesh.material) {
            if (Array.isArray(currentMesh.material)) {
                currentMesh.material.forEach(material => material.dispose());
            } else {
                currentMesh.material.dispose();
            }
        }
        previewScene.remove(currentMesh);
    }
}

function onWindowResize() {
    previewCamera.aspect = previewerElement.clientWidth / previewerElement.clientHeight;
    previewCamera.updateProjectionMatrix();
    previewRenderer.setSize(previewerElement.clientWidth, previewerElement.clientHeight);
}

window.addEventListener('resize', onWindowResize);



export { setupPreviewer, LoadMeshToPreviewer, loadPLYFileToPreviewer, loadOBJFileToPreviewer, currentMesh };
