import * as THREE from 'https://unpkg.com/three@0.127.0/build/three.module.js';
// import { OBJLoader } from 'https://unpkg.com/three@0.127.0/examples/jsm/loaders/OBJLoader.js';
import { PLYLoader } from 'https://unpkg.com/three@0.127.0/examples/jsm/loaders/PLYLoader.js';
import axios from 'https://cdn.skypack.dev/axios';

import { setupScene, loadTemplatePLYtoMainScene, animate, scene, renderer, camera} from './scripts/sceneSetup.js';
import {setupPreviewer, LoadMeshToPreviewer, loadPLYFileToPreviewer, loadOBJFileToPreviewer, currentMesh} from './scripts/setupPreviewer.js';
import {controls} from './scripts/interactions.js';
import {resetCamera, animateCameraAlongSpiral, rotateStairsDown, isAnimating} from './scripts/animateCamera.js';
import { saveFunction } from './scripts/saveFile.js';

// import {getCameraPosition, setCameraPosition, getCameraDirection, setCameraDirection, printCameraPosDir} from './scripts/helperFunction.js';
// Initialize the scene
setupScene(); 
setupPreviewer();
animate();
let meshStack = []; // Stack to keep track of loaded meshes --Undo function

let promptQueue = [];
let isProcessingPrompt = false;
document.addEventListener('DOMContentLoaded', function() {
    const btnGenerate = document.getElementById('btn-generate');
    const btnAreaGenerating = document.getElementById('btn-area-generating');

    btnGenerate?.addEventListener('click', function(event) {
        event.preventDefault();
        const promptText = document.getElementById('prompt-text').value;
        const guidanceScale = document.getElementById('guidance-scale').value;

        // push into the prompt queue
        const promptData = {text: promptText, guidance_scale: guidanceScale};
        promptQueue.push(promptData);
        addPromptToUI(promptData);
        // loadPLYFromAPI(promptText,guidanceScale, loadPLYtoPreviewer);

        if (!isProcessingPrompt) {
            processQueue();
        }   
    });

    btnAreaGenerating.addEventListener('click', function() {
        isSelectionModeActive = true;
        controls.enabled = false;
        enableSelectionListeners();
    });
});

function addPromptToUI(promptData) {
    const promptList = document.getElementById('prompt-list');
    const promptItem = document.createElement('li');
    const promptElementId = `prompt-${promptData.text}-${promptData.guidance_scale}`;
    promptItem.textContent = `Prompt: ${promptData.text}, Scale: ${promptData.guidance_scale}`;
    promptItem.id = promptElementId;
    promptList.appendChild(promptItem);
}

async function processQueue() {
    if (promptQueue.length > 0 && !isProcessingPrompt) {
        isProcessingPrompt = true;
        setIndeterminate(true);
        const prompt = promptQueue.shift();
        console.log('Processing prompt:', prompt);
        updatePromptStatus(prompt, 'Processing');
        // await loadPLYFromAPI(prompt.text, prompt.guidance_scale, (url) => {
        //     loadPLYtoPreviewer(url, prompt);
        // });
        try {
            await loadPLYFromAPI(prompt.text, prompt.guidance_scale, (url) => {
                loadPLYtoPreviewer(url, prompt, () => {
                    // Callback function to execute after model is loaded and previewed
                    isProcessingPrompt = false;
                    setIndeterminate(false); // Stop the indeterminate progress bar once done
                    console.log('Model loaded and displayed.');
                    updatePromptStatus(prompt, 'Completed', true);

                    // Process the next item in the queue if available
                    if (promptQueue.length > 0) {
                        processQueue();
                    }
                });
            });
        } catch (error) {
            console.error('Error during file generation/loading:', error);
            isProcessingPrompt = false;
            setIndeterminate(false); // Ensure progress bar is stopped in case of error
            updatePromptStatus(prompt, 'Error', true);
            // Process the next item in the queue if available
            if (promptQueue.length > 0) {
                processQueue();
            }
        }
    } else {
        console.log('Prompt queue is empty.');
        setIndeterminate(false); // Ensure the progress bar is stopped when no more items to process
    
    } 
}

function updatePromptStatus(promptData, status, completed = false) {
    const promptElementId = `prompt-${promptData.text}-${promptData.guidance_scale}`;
    const promptElement = document.getElementById(promptElementId);
    if (!promptElement) {
        console.error('Prompt element not found:', promptElementId);
        return;
    }
    promptElement.textContent = `${status}: Prompt: ${promptData.text}, Scale: ${promptData.guidance_scale}`;

    if (completed) {
        const placeButton = document.createElement('button');
        placeButton.textContent = 'Place';
        placeButton.className = 'created-place-button';  // Apply CSS class
        placeButton.onclick = function() {
            quickLoadandPlace(promptData.text, promptData.guidance_scale);
            
            placeButton.disabled = true; // Optionally disable button after clicking
            promptElement.remove()
        };
        promptElement.appendChild(placeButton);
    }
}

function quickLoadandPlace(promptText, guidanceScale) {
    loadPLYFromAPI(promptText, guidanceScale, (url) => {
        // Load and preview the mesh, then check if a currentMesh is available and proceed
        loadPLYtoPreviewer(url, {
            text: promptText,
            guidance_scale: guidanceScale
        }, () => {
            if (currentMesh) {  // Ensure there is a current mesh to work with
                placeMeshInMainScene(currentMesh);
                setupEventListeners();
            }
        });
    });
}
 

async function loadPLYFromAPI(promptText, guidanceScale, loadFunction) {
    try {
    
        const response = await axios.post('http://localhost:5000/convert', { 
            text: promptText, 
            guidance_scale: guidanceScale
        }, { responseType: 'blob',
            onDownloadProgress: function(progressEvent) {
                // const progressBar = document.getElementById('progressBar');
                // progressBar.value = (progressEvent.loaded / progressEvent.total) * 100;
                // console.log(`Progress: ${progressBar.value}%`); // Log progress to console
            }
            
    });
        console.log('File received from server.');

        const blob = response.data;
        const url = URL.createObjectURL(blob);

        loadFunction(url);
    } catch (error) {
        console.error('Error during file generation:', error);
    }
}

function loadPLYtoPreviewer(blobUrl, promptData, callback) {
    const loader = new PLYLoader();
    loader.load(
        blobUrl,
        (geometry) => {
            geometry.computeVertexNormals();  // Ensure the geometry is ready for rendering
            const material = new THREE.MeshStandardMaterial({ vertexColors: true });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.rotateX(-Math.PI / 2);  // Adjust the orientation to fit the scene

            LoadMeshToPreviewer(mesh);  // Assuming this function adds the mesh to the scene
            console.log("Model loaded and added to the previewer");
            updatePromptStatus(promptData, 'Completed', true);

            if (typeof callback === 'function') {
                callback();  // Execute the callback to handle any post-load operations
            }
        },
        undefined,
        (error) => {
            console.error('An error happened:', error);
            updatePromptStatus(promptData, 'Error', true);  // Update the status to reflect the error

            if (typeof callback === 'function') {
                callback();  // Still execute the callback to ensure the queue continues processing
            }
        }
    );
}

function loadPLYtoMainScene(blobUrl, adjustFunction) {
    const loader = new PLYLoader();
    loader.load(
        blobUrl,
        (geometry) => {
            geometry.computeVertexNormals();
            const material = new THREE.MeshStandardMaterial({ vertexColors: true });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.rotateX(-Math.PI / 2);
            scene.add(mesh);
            meshStack.push(mesh);
            
            if (adjustFunction) {adjustFunction(mesh);}
            console.log("Model loaded and added to the scene");
        },
        undefined,
        (error) => console.error('An error happened:', error)
    );
}

// Area selection functions
let isSelectionModeActive = false;
let isSelecting = false;
let startPoint = { x: 0, y: 0 };
let endPoint = { x: 0, y: 0 };

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
        loadPLYFromAPI(document.getElementById('prompt-text').value, document.getElementById('guidance-scale').value, (url) => {
            loadPLYtoMainScene(url, (mesh) => {
                adjustMeshToArea(mesh, selectedArea);
            });
        });
    } else {
        console.log('No valid area selected.');
    }

    // Reset the selection mode
    isSelectionModeActive = false;
    controls.enabled = true; // Re-enable orbit controls after selection
    disableSelectionListeners();
}

function adjustMeshToArea(mesh, area) {
    if (!area) {
        console.error('No valid area selected.');
        return;
    }

    const meshSize = calculateMeshSize(mesh); // Get the size of the mesh
    const scale = area.size / meshSize; // Calculate scale factor based on area size and mesh size

    mesh.scale.set(scale, scale, scale); // Scale mesh uniformly
    mesh.position.copy(area.center); // Set mesh position to the center of the selected area

    console.log('Mesh adjusted and placed in the selected area.');
}

function calculateMeshSize(mesh) {
    const boundingBox = new THREE.Box3().setFromObject(mesh);
    const size = boundingBox.getSize(new THREE.Vector3());
    return Math.max(size.x, size.y, size.z); // Return the maximum dimension
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
    const startPoint = getIntersectPoint(startNormalized);
    const endPoint = getIntersectPoint(endNormalized);

    if (startPoint && endPoint) {
        const center = new THREE.Vector3().addVectors(startPoint, endPoint).multiplyScalar(0.5);
        const size = startPoint.distanceTo(endPoint);
        return { center, size };
    }
    return null;
}

function getIntersectPoint(normalizedCoordinates) {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(normalizedCoordinates, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);
    if (intersects.length > 0) {
        return intersects[0].point;
    }
    return null;
}

// Camera functions
document.getElementById('btn-play').addEventListener('click', function() {
    if (!isAnimating) {
        // printCameraPosDir(camera);
        // setCameraDirection(camera, dir);
        rotateStairsDown(1, 0.1, 57);
    }
});

document.getElementById('btn-reset-camera').addEventListener('click', function() {
    resetCamera();
});

document.getElementById('btn-undo').addEventListener('click', function() {
    undoLastAction();
});

function undoLastAction() {
    if (meshStack.length > 0) {
        const lastMesh = meshStack.pop();
        scene.remove(lastMesh);
        console.log('Last mesh removed from the scene.');
    }
}

// Detail level slider
document.addEventListener('DOMContentLoaded', function () {
    const slider = document.getElementById('myRange-sculpting');
    slider.addEventListener('input', function () {
        updateDetailLevel(this.value);
        loadPLYFileToPreviewer(this.value);
    });
});

// Place function
document.getElementById('btn-place').addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (currentMesh) {  // Ensure there is a current mesh to work with
        placeMeshInMainScene(currentMesh);
        setupEventListeners();
    } else {
        console.error('No current mesh available for placement.');
    }
    
});

function setupEventListeners() {
    console.log("Setting up event listeners for mesh movement and placement");
    window.addEventListener('mousemove', updateMeshPosition, {once: false});
    setTimeout(() => {
        window.addEventListener('click', handleMeshPlacementClick, {once: false});
    }, 10);
}

function removeEventListeners() {
    console.log("Removing event listeners to prevent duplicate interactions");
    window.removeEventListener('mousemove', updateMeshPosition);
    window.removeEventListener('click', handleMeshPlacementClick);
}

let isSettingXY = false;
let isSettingZ = false;
let temporaryZPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

let isScaling = false;
let initialScale = 1;

let isRotating = false;
let initialRotation = 0;

let temporaryMesh = null;
let currentBoundingBoxHelper = null;

function handleMeshPlacementClick(event) {
    if (!isSettingXY && !isSettingZ && !isScaling && !isRotating) {
        // Start setting XY on the first click
        isSettingXY = true;
    } else if (isSettingXY) {
        // Confirm XY and start setting Z
        isSettingXY = false;
        isSettingZ = true;
        // Optionally set a different plane or method for picking Z
        console.log('XY position set, click again to set Z position.');
    } else if (isSettingZ) {
        // Finalize Z
        isSettingZ = false;
        isScaling = true;
    } else if (isScaling) {
        isScaling = false;
        isRotating = true;
    } else if (isRotating) {
        isRotating = false;
        finalizeMeshPlacement();
    }
}

let axesHelper;
function placeMeshInMainScene(currentMesh) {
    if (!currentMesh) {
        console.error("No mesh is currently loaded in the previewer.");
        return;
    }

    if (temporaryMesh || currentBoundingBoxHelper) {
        console.warn("Cleaning up previous mesh and bounding box before placing a new one.");
        removeEventListeners(); // Clean up any previous listeners if re-activating
        // Additional clean-up code if necessary
    }

    console.log('Placing mesh in the main scene:', currentMesh);
    temporaryMesh = currentMesh.clone();
    scene.add(temporaryMesh);
    meshStack.push(temporaryMesh);
    currentBoundingBoxHelper = new THREE.BoxHelper(temporaryMesh, 0xff0000);
    scene.add(currentBoundingBoxHelper);

    // Custom Axes Helper with both positive and negative axes
    const axesSize = 50; // Define the size of the axes
    axesHelper = new THREE.Group();

    // Red line for the X axis
    const materialX = new THREE.LineBasicMaterial({ color: 0xff0000 });
    const geometryX = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-axesSize, 0, 0), new THREE.Vector3(axesSize, 0, 0)
    ]);
    const xAxis = new THREE.Line(geometryX, materialX);
    axesHelper.add(xAxis);

    // Green line for the Y axis
    const materialY = new THREE.LineBasicMaterial({ color: 0x00ff00 });
    const geometryY = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, -axesSize, 0), new THREE.Vector3(0, axesSize, 0)
    ]);
    const yAxis = new THREE.Line(geometryY, materialY);
    axesHelper.add(yAxis);

    // Blue line for the Z axis
    const materialZ = new THREE.LineBasicMaterial({ color: 0x0000ff });
    const geometryZ = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, -axesSize), new THREE.Vector3(0, 0, axesSize)
    ]);
    const zAxis = new THREE.Line(geometryZ, materialZ);
    axesHelper.add(zAxis);

    // Add the custom axes helper to the scene instead of the mesh
    axesHelper.position.copy(temporaryMesh.position);
    axesHelper.rotation.copy(temporaryMesh.rotation);
    scene.add(axesHelper);

    isSettingXY = true;
}

function finalizeMeshPlacement(event) {
    console.log("Finalizing mesh placement in the scene");
    scene.remove(currentBoundingBoxHelper);
    scene.remove(axesHelper);

    isSettingXY = false;
    isSettingZ = false;
    isScaling = false;
    removeEventListeners();  // Clean up after placing mesh

    if (temporaryMesh && currentBoundingBoxHelper) {
        // Implement any final clean-up or state reset here
    }
}

function updateMeshPosition(event) {
    if (!isSettingXY && !isSettingZ && !isScaling && !isRotating) {
        console.log('Mesh placement is not initiated.');
        return;
    }
    if (!temporaryMesh) {
        console.error('Temporary mesh is not available.');
        return;
    }

    const rect = renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const targetPoint = new THREE.Vector3();

    if (isSettingXY) {
        // Intersect with a plane parallel to XY plane
        temporaryZPlane.set(new THREE.Vector3(0, 1, 0), 0);
        if (raycaster.ray.intersectPlane(temporaryZPlane, targetPoint)) {
            temporaryMesh.position.copy(targetPoint);
        } else {
            console.log('No intersection with XY plane.');
        }
    } else if (isSettingZ) {
        temporaryZPlane.set(new THREE.Vector3(1, 0, 0), 0);
        if (raycaster.ray.intersectPlane(temporaryZPlane, targetPoint)) {
            temporaryMesh.position.set(temporaryMesh.position.x, targetPoint.y, temporaryMesh.position.z);
        } else {
            console.log('No intersection with Z plane.');
        }
    } else if (isScaling) {
        let scaleChange = (mouse.y + 1) * 2;
        temporaryMesh.scale.set(initialScale * scaleChange, initialScale * scaleChange, initialScale * scaleChange);
    } else if (isRotating) {
        let rotationChange = (mouse.x + 1) * Math.PI;  // Rotation in radians
        temporaryMesh.rotation.z = initialRotation + rotationChange;
    }
    if (currentBoundingBoxHelper) {
        currentBoundingBoxHelper.update();
    }

    if (axesHelper && temporaryMesh) {
        axesHelper.position.copy(temporaryMesh.position);
        axesHelper.rotation.copy(temporaryMesh.rotation);
    }
}

// dropdown menu
document.addEventListener('DOMContentLoaded', function() {
    // Attach an event listener to the scene-select dropdown
    document.getElementById('scene-select').addEventListener('change', function() {
        const sceneValue = this.value;
        switch (sceneValue) {
            case 'scene1':
                loadTemplatePLYtoMainScene(0);
                break;
            case 'scene2':
                loadTemplatePLYtoMainScene(1);
                break;
            case 'scene3':
                loadTemplatePLYtoMainScene(2);
                break;
            default:
                console.error('Invalid scene selection:', sceneValue);
        }
    });
});

// SAVE functions
document.getElementById('btn-save').addEventListener('click', function() {
    saveFunction();
});

// Deform function
document.getElementById('btn-deform').addEventListener('click', function() {
    loadOBJFileToPreviewer(2);
});

// Progress bar
function setIndeterminate(isIndeterminate) {
    const progressBar = document.getElementById('progressBar');
    if (isIndeterminate) {
        progressBar.removeAttribute('value'); // Remove the 'value' attribute to make it indeterminate
    } else {
        progressBar.setAttribute('value', '0'); // Reset the progress bar when not indeterminate
    }
}