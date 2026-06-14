// Faint scattered-nebula backdrop for the essays pages — the same black
// particles-on-cream identity as the landing, drifting slowly behind the text
// so the reading experience feels like part of the nebula site, not a separate
// website. Purely decorative; no interaction.
import * as THREE from 'three';

let scene, camera, renderer, points, clock;

function init() {
    const container = document.getElementById('nebula-bg');
    if (!container) return;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 30;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const COUNT = 1300;
    for (let i = 0; i < COUNT; i++) {
        const r = 8 + Math.random() * 40;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        vertices.push(
            r * Math.sin(phi) * Math.cos(theta),
            r * Math.sin(phi) * Math.sin(theta),
            r * Math.cos(phi)
        );
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

    const material = new THREE.PointsMaterial({
        color: 0x000000,
        size: 0.05,
        transparent: true,
        opacity: 0.35,
        blending: THREE.NormalBlending,
        depthWrite: false,
        map: new THREE.TextureLoader().load('https://threejs.org/examples/textures/sprites/disc.png')
    });

    points = new THREE.Points(geometry, material);
    scene.add(points);

    clock = new THREE.Clock();
    window.addEventListener('resize', onResize);
    animate();
}

function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    points.rotation.y += delta * 0.02;
    points.rotation.x += delta * 0.004;
    renderer.render(scene, camera);
}

init();
