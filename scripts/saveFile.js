import { GLTFExporter } from 'https://unpkg.com/three@0.127.0/examples/jsm/exporters/GLTFExporter.js';
import { scene } from './sceneSetup.js';
const exporter = new GLTFExporter();

function saveFunction() {
    exporter.parse(scene, function (result) {
        saveBlob(result, 'scene.glb');
    }, { binary: true });
}

function saveBlob(blobData, filename) {
    const blob = new Blob([blobData], { type: 'model/gltf-binary' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}

export { saveFunction };

