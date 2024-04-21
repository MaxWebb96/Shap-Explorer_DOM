// interaction.js
import { OrbitControls } from 'https://unpkg.com/three@0.127.0/examples/jsm/controls/OrbitControls.js';

let controls;
let isUpdatingControls = true;

function initControls(camera, renderer) {
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
}

function updateControls() {
    if (isUpdatingControls) {
        controls.update();
    }
}

export { initControls, updateControls, controls, isUpdatingControls };
