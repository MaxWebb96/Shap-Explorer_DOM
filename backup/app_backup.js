import * as THREE from 'https://unpkg.com/three@0.127.0/build/three.module.js';
// import { OBJLoader } from 'https://unpkg.com/three@0.127.0/examples/jsm/loaders/OBJLoader.js';
import { PLYLoader } from 'https://unpkg.com/three@0.127.0/examples/jsm/loaders/PLYLoader.js';
import { OrbitControls } from 'https://unpkg.com/three@0.127.0/examples/jsm/controls/OrbitControls.js';
import axios from 'https://cdn.skypack.dev/axios';

import { initScene, animate} from './scripts/sceneSetup.js';

// const scene = new THREE.Scene();
// scene.background = new THREE.Color(0xaaaaaa);

// const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);

// const renderer = new THREE.WebGLRenderer();
// renderer.setSize(window.innerWidth, window.innerHeight);
// document.body.appendChild(renderer.domElement);

// // Orbit Controls
// const controls = new OrbitControls(camera, renderer.domElement);
// controls.enableDamping = true; // Optional, but makes the control smoother
// controls.dampingFactor = 0.05;

// // light settings
// const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
// scene.add(ambientLight);

// const light = new THREE.DirectionalLight(0xffffff, 3);
// light.position.set(1, 1, 1);
// scene.add(light);

// camera.position.z = 5;

// function animate() {
//     requestAnimationFrame(animate);
//     renderer.render(scene, camera);
// }

animate();

initScene(); // Initialize the scene with a selection plane

document.addEventListener('DOMContentLoaded', function() {
    const btnGenerate = document.getElementById('btn-generate');

    btnGenerate?.addEventListener('click', function(event) {
        event.preventDefault();
        const promptText = document.getElementById('prompt-text').value;
        loadPLYFromAPI(promptText);
    });
});

async function loadPLYFromAPI(promptText, callback) {
    try {
        const response = await axios.post('http://localhost:5000/convert', { text: promptText }, { responseType: 'blob' });
        console.log('File received from server.');

        const blob = response.data;
        const url = URL.createObjectURL(blob);

        loadLocalPLY(url, callback);
    } catch (error) {
        console.error('Error during file generation:', error);
    }
}

function loadLocalPLY(blobUrl, callback) {
    const loader = new PLYLoader();
    loader.load(
        blobUrl,
        (geometry) => {
            geometry.computeVertexNormals();
            const material = new THREE.MeshStandardMaterial({ vertexColors: true });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.rotateX(-Math.PI / 2);
            scene.add(mesh);

            console.log("Model loaded and added to the scene");

            if (callback) callback(mesh);
        },
        (xhr) => console.log((xhr.loaded / xhr.total * 100) + '% loaded'),
        (error) => console.error('An error happened:', error)
    );
}

let isSelectionModeActive = false;
let isSelecting = false;
let startPoint = { x: 0, y: 0 };
let endPoint = { x: 0, y: 0 };

// Button click just activates the selection mode, does not toggle it
document.getElementById('btn-area-generating').addEventListener('click', function() {
    isSelectionModeActive = true;
    controls.enabled = false; // Disable orbit controls to prevent conflict
    enableSelectionListeners();
});

function onSelectionStart(event) {
    if (!isSelectionModeActive) return;

    isSelecting = true;
    startPoint = { x: event.clientX, y: event.clientY };

    const selectionBox = document.getElementById('selection-box');
    selectionBox.style.left = `${startPoint.x}px`;
    selectionBox.style.top = `${startPoint.y}px`;
    selectionBox.style.width = '0px';
    selectionBox.style.height = '0px';
    selectionBox.style.display = 'block';
}

function onSelectionMove(event) {
    if (!isSelectionModeActive || !isSelecting) return;

    endPoint = { x: event.clientX, y: event.clientY };
    
    const selectionBox = document.getElementById('selection-box');
    const width = Math.abs(endPoint.x - startPoint.x);
    const height = Math.abs(endPoint.y - startPoint.y);
    const left = Math.min(endPoint.x, startPoint.x);
    const top = Math.min(endPoint.y, startPoint.y);

    selectionBox.style.width = `${width}px`;
    selectionBox.style.height = `${height}px`;
    selectionBox.style.left = `${left}px`;
    selectionBox.style.top = `${top}px`;
}

function onSelectionEnd(event) {
    if (!isSelecting) return;

    isSelecting = false;
    endPoint = { x: event.clientX, y: event.clientY };

    document.getElementById('selection-box').style.display = 'none';
    console.log('Selection ended:', startPoint, endPoint);

    const selectedArea = getSelectedArea(startPoint, endPoint);
    if (selectedArea) {
        generateMeshForArea(selectedArea);
        console.log('Generating mesh for selected area:', selectedArea);
    } else {
        console.log('No valid area selected.');
    }

    // Reset the selection mode
    isSelectionModeActive = false;
    controls.enabled = true; // Re-enable orbit controls after selection
    disableSelectionListeners();
}

function enableSelectionListeners() {
    renderer.domElement.addEventListener('mousedown', onSelectionStart, false);
    renderer.domElement.addEventListener('mousemove', onSelectionMove, false);
    renderer.domElement.addEventListener('mouseup', onSelectionEnd, false);
}

function disableSelectionListeners() {
    renderer.domElement.removeEventListener('mousedown', onSelectionStart, false);
    renderer.domElement.removeEventListener('mousemove', onSelectionMove, false);
    renderer.domElement.removeEventListener('mouseup', onSelectionEnd, false);
}

function getSelectedArea(start, end) {
    const rect = renderer.domElement.getBoundingClientRect();
    const startNormalized = {
        x: ((start.x - rect.left) / rect.width) * 2 - 1,
        y: -((start.y - rect.top) / rect.height) * 2 + 1
    };
    const endNormalized = {
        x: ((end.x - rect.left) / rect.width) * 2 - 1,
        y: -((end.y - rect.top) / rect.height) * 2 + 1
    };

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(startNormalized, camera);
    const startIntersect = raycaster.intersectObjects(scene.children, true);
    raycaster.setFromCamera(endNormalized, camera);
    const endIntersect = raycaster.intersectObjects(scene.children, true);

    if (startIntersect.length > 0 && endIntersect.length > 0) {
        const startPoint = startIntersect[0].point;
        const endPoint = endIntersect[0].point;
        const center = new THREE.Vector3().addVectors(startPoint, endPoint).multiplyScalar(0.5);
        const size = startPoint.distanceTo(endPoint);

        return { center, size };
    }

    return null; // Return null if no valid area is selected
}

async function generateMeshForArea(area) {
    if (!area) {
        console.error('No valid area selected.');
        return;
    }

    const promptText = document.getElementById('prompt-text').value;

    loadPLYFromAPI(promptText, (mesh) => {
        // Assuming the mesh needs to be scaled uniformly in all directions
        const meshBoundingBox = new THREE.Box3().setFromObject(mesh);
        const meshSize = meshBoundingBox.getSize(new THREE.Vector3());
        const maxMeshSize = Math.max(meshSize.x, meshSize.y, meshSize.z);
        const areaSizeFactor = 0.8;
        const scale = areaSizeFactor * area.size / maxMeshSize;
        
        mesh.scale.set(scale, scale, scale);
        mesh.position.copy(area.center);

        console.log('Mesh loaded, adjusted scale and position based on the selected area:', area);
    });

    console.log('Area for generating mesh:', area);
}

// function initScene() {
//     // Other scene setup like camera, lights, etc.

//     // Create a large plane
//     const planeGeometry = new THREE.PlaneGeometry(1000, 1000); // Adjust size as needed
//     const planeMaterial = new THREE.MeshBasicMaterial({
//         color: 0x000000, // Color doesn't matter if the plane is invisible
//         visible: false // Make the plane invisible
//     });
//     const selectionPlane = new THREE.Mesh(planeGeometry, planeMaterial);

//     // Rotate the plane to align it with the ground or the selection area
//     selectionPlane.rotation.x = -Math.PI / 2;

//     // Add the plane to the scene
//     scene.add(selectionPlane);
// }