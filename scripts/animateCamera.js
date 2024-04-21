import * as THREE from 'https://unpkg.com/three@0.127.0/build/three.module.js';
import {scene, camera} from './sceneSetup.js';
import {controls, isUpdatingControls} from './interactions.js';

function resetCamera() {
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, 0);
    // controls.update();
}

function getSpiralPoint(t, height, turns, radius) {
    const angle = Math.PI * 2 * turns * t;
    const x = radius * Math.cos(angle);
    const y = height * t;
    const z = radius * Math.sin(angle);
    return new THREE.Vector3(x, y, z);
}

let t = 0;
let isAnimating = false;
let lastTime = 0; // Keep track of the last frame time

function animateCameraAlongSpiral(timestamp) {
    // isUpdatingControls = false;
    timestamp = timestamp || performance.now();  // Ensure timestamp is a number
    if (!isAnimating) {
        t = 0; // Ensure t starts at 0
        isAnimating = true;
        lastTime = timestamp;  // Initialize lastTime with the current timestamp
    }

    const deltaTime = (timestamp - lastTime) / 1000;  // deltaTime calculation
    lastTime = timestamp;

    const speed = 0.1; // This is the speed factor
    t += deltaTime * speed;
    t = Math.min(t, 1); // Clamp t to a maximum of 1

    if (t >= 1) {
        isAnimating = false; // Stop the animation when t reaches 1
    }

    const height = 50;
    const turns = 1;
    const radius = 18;

    const newPosition = getSpiralPoint(t, height, turns, radius);
    camera.position.set(newPosition.x, newPosition.y, newPosition.z);
    // camera.lookAt(0, 0, 0);
    // console.log(`t: ${t}, deltaTime: ${deltaTime}, position: ${newPosition.x}, ${newPosition.y}, ${newPosition.z}`);

    if (isAnimating) {
        requestAnimationFrame(animateCameraAlongSpiral);
    } else {
        // isUpdatingControls = true;
    }
}


let stairsMesh;
function rotateStairsDown(turns, speed, height) {
    if (!stairsMesh) {
        // Replace 'yourStairsMeshName' with the actual name of your stairs mesh
        stairsMesh = scene.getObjectByName('spiralStairs');
    }

    if (stairsMesh) {
        const angleStep = (Math.PI * 2 * turns) / (height / speed);
        let currentAngle = 0;
        let currentHeight = 0;

        const rotateStairs = () => {
            if (currentAngle <= Math.PI * 2 * turns) {
                stairsMesh.rotation.z = currentAngle;
                currentAngle += angleStep;

                // Calculate the height step based on speed
                const heightStep = speed;
                currentHeight += heightStep;

                // Move the stairs mesh down along the y-axis
                stairsMesh.position.y -= heightStep;

                requestAnimationFrame(rotateStairs);
            } else {
                // Reset the stairs position after the animation
                resetStairsPos();
            }
        };

        rotateStairs();
    }
}

function resetStairsPos() {
    if (!stairsMesh) {
        // Replace 'yourStairsMeshName' with the actual name of your stairs mesh
        stairsMesh = scene.getObjectByName('spiralStairs');
    }

    if (stairsMesh) {
        stairsMesh.rotation.z = 0;
        stairsMesh.position.y = 0;
        stairsMesh.position.z = 0;
    }

}

export { resetCamera, animateCameraAlongSpiral, rotateStairsDown, isAnimating };
