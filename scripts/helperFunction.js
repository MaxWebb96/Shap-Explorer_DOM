import * as THREE from 'https://unpkg.com/three@0.127.0/build/three.module.js';

let camera, scene, renderer;

function getCameraPosition(camera) {
    return camera.position;
}

function setCameraPosition(camera, position) {
    camera.position.set(position.x, position.y, position.z);
}

function getCameraDirection(camera) {
    const vector = new THREE.Vector3();
    camera.getWorldDirection(vector);
    return vector;
}

function setCameraDirection(camera, direction) {
    camera.lookAt(direction);
}

function printCameraPosDir(camera) {
    console.log('Camera position:', camera.position);
    console.log('Camera direction:', getCameraDirection(camera));
}

export { getCameraPosition, setCameraPosition, getCameraDirection, setCameraDirection, printCameraPosDir };