import * as THREE from 'three';
import { FlyControls } from 'three/addons/controls/FlyControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { cvData } from './data.js';

// --- Configuration ---
// --- Configuration ---
const CONFIG = {
    particleCount: 10000, // Increased for final version
    particleSize: 0.03, // Slightly smaller for higher density
    bloomStrength: 1.5,
    bloomRadius: 0.4,
    bloomThreshold: 0.1,
    cameraSpeed: 2.0,
    cameraRollSpeed: 0.2,
    sectionRadius: 15, // Distance of section buttons from center
};

// --- Global Variables ---
let scene, camera, renderer, composer, controls;
let clock = new THREE.Clock();
let particles, particleSystem;
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let sectionObjects = []; // Stores the interactive section particles
let textPoints, bioPoints;

// --- Helper Functions ---
function getShapePositions(type, count) {
    const positions = [];
    const scale = 9; // Increased scale for larger nebula (3/4 height)

    let shapeIndex = 0; // Counter for particles that form the shape (excluding scattered stars)

    for (let i = 0; i < count; i++) {
        let x = 0, y = 0, z = 0;

        // 10% of particles are scattered to mimic surrounding stars
        if (Math.random() < 0.1) {
            const r = scale * 3 * Math.cbrt(Math.random()); // Cubic root for uniform sphere distribution
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            x = r * Math.sin(phi) * Math.cos(theta);
            y = r * Math.sin(phi) * Math.sin(theta);
            z = Math.cos(phi);
        } else {
            shapeIndex++; // Increment only for shape particles

            // The rest form the specific shape
            switch (type) {
                case 'Education': // Cube (Structured Knowledge)
                    const side = Math.cbrt(count);
                    const half = scale * 0.6;
                    x = (Math.random() - 0.5) * 2 * half;
                    y = (Math.random() - 0.5) * 2 * half;
                    z = (Math.random() - 0.5) * 2 * half;

                    // Snap to surface for wireframe look? Or volume? Volume is easier for now.
                    // Let's do surface cube
                    const face = Math.floor(Math.random() * 6);
                    if (face === 0) x = half;
                    else if (face === 1) x = -half;
                    else if (face === 2) y = half;
                    else if (face === 3) y = -half;
                    else if (face === 4) z = half;
                    else if (face === 5) z = -half;
                    break;

                case 'Work Experience': // Palantir Logo (Ring + Chevron)
                    const branch = Math.random();
                    const spread = scale * 0.12; // Scaled fuzziness

                    if (branch < 0.7) {
                        // 1. THE MAIN RING (The 'O')
                        const angle = Math.random() * Math.PI * 2;
                        // Scale the radius: 0.8 -> scale * 0.5 (Reduced size)
                        const radius = scale * (0.5 + (Math.random() - 0.5) * 0.15);
                        x = Math.cos(angle) * radius;
                        y = Math.sin(angle) * radius + (scale * 0.3); // Offset up
                        z = 0;
                    } else {
                        // 2. THE CHEVRON (The 'v' shape)
                        const side = Math.random() > 0.5 ? 1 : -1;
                        const t = Math.random(); // Progress along the line
                        x = t * (scale * 0.7) * side;
                        y = (t * (scale * 0.4)) - (scale * 0.8); // Angle it downwards
                        z = 0;
                    }

                    // Add "Nebula Gas" fuzziness
                    x += (Math.random() - 0.5) * spread;
                    y += (Math.random() - 0.5) * spread;
                    z += (Math.random() - 0.5) * spread;
                    break;

                case 'Research': // Torus (Cyclical/Deep)
                    const u = Math.random() * Math.PI * 2;
                    const v = Math.random() * Math.PI * 2;
                    const R = scale * 0.8;
                    const rTorus = scale * 0.3;
                    x = (R + rTorus * Math.cos(v)) * Math.cos(u);
                    y = (R + rTorus * Math.cos(v)) * Math.sin(u);
                    z = rTorus * Math.sin(v);

                    // Rotate to face camera better
                    const tempY = y;
                    y = y * Math.cos(Math.PI / 4) - z * Math.sin(Math.PI / 4);
                    z = tempY * Math.sin(Math.PI / 4) + z * Math.cos(Math.PI / 4);
                    break;

                case 'Projects': // Pyramid (Building/Creation)
                    // Tetrahedron
                    // Random barycentric coordinates
                    let a = Math.random();
                    let b = Math.random();
                    if (a + b > 1) { a = 1 - a; b = 1 - b; }
                    const c = Math.random(); // Height?

                    // Vertices
                    const v1 = { x: 0, y: scale, z: 0 };
                    const v2 = { x: scale, y: -scale, z: scale };
                    const v3 = { x: -scale, y: -scale, z: -scale }; // Corrected v3 z-coordinate
                    const v4 = { x: -scale, y: -scale, z: scale }; // Corrected v4 x-coordinate

                    // Pick a face randomly
                    const f = Math.random();
                    let p1, p2, p3;
                    if (f < 0.25) { p1 = v1; p2 = v2; p3 = v3; }
                    else if (f < 0.5) { p1 = v1; p2 = v3; p3 = v4; }
                    else if (f < 0.75) { p1 = v1; p2 = v4; p3 = v2; }
                    else { p1 = v2; p2 = v3; p3 = v4; }

                    // Point on triangle
                    const r1 = Math.random();
                    const r2 = Math.random();
                    const sqrtR1 = Math.sqrt(r1);

                    x = (1 - sqrtR1) * p1.x + (sqrtR1 * (1 - r2)) * p2.x + (sqrtR1 * r2) * p3.x;
                    y = (1 - sqrtR1) * p1.y + (sqrtR1 * (1 - r2)) * p2.y + (sqrtR1 * r2) * p3.y;
                    z = (1 - sqrtR1) * p1.z + (sqrtR1 * (1 - r2)) * p2.z + (sqrtR1 * r2) * p3.z;
                    break;

                case 'Readings': // Book Shape (Two planes angled)
                    const pageSide = Math.random() > 0.5 ? 1 : -1; // Left or Right page
                    const uBook = Math.random();
                    const vBook = Math.random();

                    // Plane dimensions
                    const width = scale * 0.8;
                    const height = scale * 1.2;

                    // Angle of open book (e.g., 30 degrees from flat)
                    const bookAngle = Math.PI / 6;

                    x = uBook * width * pageSide;
                    y = (vBook - 0.5) * height;

                    // Rotate pages up
                    const zBase = 0;
                    const xRotated = x * Math.cos(bookAngle) - 0 * Math.sin(bookAngle); // Simple rotation around Y-axis? No, around Z-axis (spine)
                    // Spine is at x=0. Rotate points up based on x distance?
                    // Actually, let's just define two planes:
                    // Right page: Normal (sin(angle), cos(angle), 0)

                    x = uBook * width; // 0 to width
                    if (pageSide === -1) x *= -1;

                    // Lift the outer edges
                    z = Math.abs(x) * Math.sin(bookAngle * 2); // Curve it slightly?
                    // Let's just do angled planes
                    z = Math.abs(x) * 0.5;

                    break;

                case 'Awards': // Scientific 3D Plot (Grid Wave)
                    // Use shapeIndex to ensure continuous grid despite scattered stars
                    // Estimate effective count for grid (90% of total)
                    const effectiveCount = count * 0.9;
                    const gridSize = Math.floor(Math.sqrt(effectiveCount));
                    const spacing = (scale * 3) / gridSize;

                    // Grid indices
                    const row = Math.floor(i / gridSize);
                    const col = i % gridSize;

                    // Center the grid
                    x = (col - gridSize / 2) * spacing;
                    z = (row - gridSize / 2) * spacing;

                    // Wave function: y = sin(x) * cos(z)
                    // Lower frequency for smoother wave, higher amplitude
                    const waveFreq = 0.5;
                    const waveAmp = scale * 0.3;
                    y = Math.sin(x * waveFreq) * Math.cos(z * waveFreq) * waveAmp;
                    break;

                default: // Saturn (Planet + Rings)
                    // 30% particles for Planet, 70% for Rings
                    if (Math.random() < 0.3) {
                        // Planet (Sphere)
                        const radius = scale * 0.4;
                        const u = Math.random();
                        const v = Math.random();
                        const theta = 2 * Math.PI * u;
                        const phi = Math.acos(2 * v - 1);

                        x = radius * Math.sin(phi) * Math.cos(theta);
                        y = radius * Math.sin(phi) * Math.sin(theta);
                        z = radius * Math.cos(phi);
                    } else {
                        // Rings (Disk)
                        const innerRadius = scale * 0.6;
                        const outerRadius = scale * 1.2;
                        const angle = Math.random() * Math.PI * 2;
                        // Distribute by area: r = sqrt(random * (R_out^2 - R_in^2) + R_in^2)
                        const r = Math.sqrt(Math.random() * (outerRadius * outerRadius - innerRadius * innerRadius) + innerRadius * innerRadius);

                        x = r * Math.cos(angle);
                        z = r * Math.sin(angle);
                        y = (Math.random() - 0.5) * scale * 0.02; // Very thin
                    }

                    // Apply Tilt (~27 degrees)
                    const tilt = -0.47; // Radians
                    const xTilt = x * Math.cos(tilt) - y * Math.sin(tilt);
                    const yTilt = x * Math.sin(tilt) + y * Math.cos(tilt);
                    x = xTilt;
                    y = yTilt;
            }
        }
        positions.push(x, y, z);
    }
    return positions;
}

// --- Initialization ---
function init() {
    try {
        console.log("Initializing...");
        // 1. Scene Setup
        scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x000000, 0.02); // Black fog

        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const isMobile = window.innerWidth < 768;
        camera.position.set(isMobile ? 0 : 2, 0, 20); // Center on mobile, offset on desktop

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); // Alpha for potential transparency
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        // renderer.toneMapping = THREE.ReinhardToneMapping; // Disable tone mapping for cleaner look
        document.getElementById('canvas-container').appendChild(renderer.domElement);

        // 2. Post-Processing (Bloom) - DISABLED for Paper Theme
        // const renderScene = new RenderPass(scene, camera);
        // const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
        // bloomPass.threshold = CONFIG.bloomThreshold;
        // bloomPass.strength = CONFIG.bloomStrength;
        // bloomPass.radius = CONFIG.bloomRadius;

        // composer = new EffectComposer(renderer);
        // composer.addPass(renderScene);
        // composer.addPass(bloomPass); 

        // Use renderer directly instead of composer
        window.addEventListener('resize', onWindowResize);

        // 3. Controls
        // controls = new FlyControls(camera, renderer.domElement);
        // controls.movementSpeed = CONFIG.cameraSpeed;
        // controls.domElement = renderer.domElement;
        // controls.rollSpeed = CONFIG.cameraRollSpeed;
        // controls.autoForward = false;
        // controls.dragToLook = true;

        // Static Camera Interaction (Mouse Parallax)
        // We'll implement simple parallax in animate loop instead of FlyControls

        // 4. Content Generation
        createStarfield();
        createCentralNebula(); // Creates particle system (hidden by default)

        // 5. Event Listeners
        setupEventListeners();

        // Remove loading screen
        setTimeout(() => {
            document.getElementById('loading-screen').style.opacity = 0;
            setTimeout(() => document.getElementById('loading-screen').remove(), 1000);
        }, 1500);

        animate();
    } catch (error) {
        console.error("Initialization Error:", error);
    }
}

// --- Content Creation ---

function createStarfield() {
    // 1. Background Stars (Fine dust, far away)
    const bgGeometry = new THREE.BufferGeometry();
    const bgMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.015, transparent: true, opacity: 0.6 });
    const bgVertices = [];
    for (let i = 0; i < 10000; i++) {
        const x = (Math.random() - 0.5) * 400;
        const y = (Math.random() - 0.5) * 400;
        const z = (Math.random() - 0.5) * 400;
        bgVertices.push(x, y, z);
    }
    bgGeometry.setAttribute('position', new THREE.Float32BufferAttribute(bgVertices, 3));
    const bgStars = new THREE.Points(bgGeometry, bgMaterial);
    scene.add(bgStars);

    // 2. Foreground Stars (Brighter, larger, closer)
    const fgGeometry = new THREE.BufferGeometry();
    const fgMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.05, transparent: true, opacity: 1.0 });
    const fgVertices = [];
    for (let i = 0; i < 2500; i++) {
        const x = (Math.random() - 0.5) * 300;
        const y = (Math.random() - 0.5) * 300;
        const z = (Math.random() - 0.5) * 300;
        fgVertices.push(x, y, z);
    }
    fgGeometry.setAttribute('position', new THREE.Float32BufferAttribute(fgVertices, 3));
    const fgStars = new THREE.Points(fgGeometry, fgMaterial);
    scene.add(fgStars);
}

function createCentralNebula() {
    // Custom Particle System
    const particleCount = CONFIG.particleCount;
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const velocities = [];

    // Use the 'default' (Saturn) shape for initial positions
    const initialPositions = getShapePositions('default', particleCount);

    for (let i = 0; i < particleCount; i++) {
        positions.push(initialPositions[i * 3], initialPositions[i * 3 + 1], initialPositions[i * 3 + 2]);

        // Random velocity for animation
        velocities.push(
            (Math.random() - 0.5) * 0.02,
            (Math.random() - 0.5) * 0.02,
            (Math.random() - 0.5) * 0.02
        );
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.Float32BufferAttribute(velocities, 3));

    const material = new THREE.PointsMaterial({
        color: 0xffffff, // Pure White
        size: CONFIG.particleSize * 1.5, // Slightly larger for visibility
        transparent: true,
        opacity: 0.8, // More opaque
        blending: THREE.NormalBlending,
        map: new THREE.TextureLoader().load('https://threejs.org/examples/textures/sprites/disc.png')
    });

    particleSystem = new THREE.Points(geometry, material);
    scene.add(particleSystem);
}

// Removed createSectionButtons and sectionObjects to clean up the scene

// --- Interaction ---

function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

// --- Event Listeners ---
function setupEventListeners() {
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('mousemove', onMouseMove);

    // Navigation Links
    document.querySelectorAll('#main-nav a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = e.target.dataset.section;
            openSection(section);

            // Update active state
            document.querySelectorAll('#main-nav a').forEach(l => l.classList.remove('active'));
            e.target.classList.add('active');
        });
    });

    // Back Button
    document.getElementById('back-btn').addEventListener('click', () => {
        resetView();
    });

    // Home Link (Name in top left)
    document.getElementById('home-link').addEventListener('click', (e) => {
        e.preventDefault();
        resetView();
    });
}

function openSection(sectionName) {
    console.log("Opening section:", sectionName);
    const data = cvData[sectionName];

    // 1. Morph Particles
    if (particleSystem) {
        const targetPositions = getShapePositions(sectionName, CONFIG.particleCount);
        morphParticles(targetPositions);
    }

    // 2. UI Updates
    const mainTitle = document.getElementById('main-title');
    const subtitle = document.getElementById('subtitle');
    const bioText = document.getElementById('bio-text');
    const dynamicContent = document.getElementById('dynamic-content');
    const backBtn = document.getElementById('back-btn');

    // Hide Homepage Elements
    mainTitle.style.display = 'none';
    subtitle.style.display = 'none';
    bioText.style.display = 'none';

    // Show Dynamic Content
    dynamicContent.innerHTML = '';

    const title = document.createElement('h1'); // Use H1 for section title
    title.textContent = data.title;
    title.style.marginBottom = '2rem';
    title.style.fontSize = '3.5rem'; // Match main title style roughly
    title.style.fontFamily = 'var(--font-serif)';
    dynamicContent.appendChild(title);

    if (sectionName === 'Projects' || sectionName === 'Readings') {
        const container = document.createElement('div');
        container.className = 'card-container';

        data.items.forEach(item => {
            const card = document.createElement('a'); // Use anchor tag
            card.className = 'card clickable-card';
            card.href = item.link || '#';
            card.target = '_blank'; // Open in new tab
            card.innerHTML = `
                <div class="card-header">
                    <div>
                        <div class="card-title">${item.title}</div>
                        <div class="card-subtitle">${item.subtitle}</div>
                    </div>
                    <div class="card-arrow">↗</div>
                </div>
                <div class="card-details-visible">
                    <ul style="padding-left:1.5rem; color:#ccc; line-height:1.5; margin-top:1rem">
                        ${item.details.map(d => `<li>${d}</li>`).join('')}
                    </ul>
                </div>
            `;

            container.appendChild(card);
        });
        dynamicContent.appendChild(container);
    } else if (sectionName === 'Awards') {
        const container = document.createElement('div');
        container.className = 'awards-list';

        data.items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'award-item';
            div.innerHTML = `
                <div class="award-content">
                    <h3>${item.title}</h3>
                    <p class="award-subtitle">${item.subtitle}</p>
                    <ul class="award-details">
                         ${item.details.map(d => `<li>${d}</li>`).join('')}
                    </ul>
                </div>
            `;
            container.appendChild(div);
        });
        dynamicContent.appendChild(container);
    } else {
        // Default List View (Education, Work, Research)
        data.items.forEach(item => {
            const div = document.createElement('div');
            div.style.marginBottom = '2rem';
            div.innerHTML = `
                <h3 style="margin-bottom:0.5rem">${item.title}</h3>
                <p style="color:#888; margin-bottom:0.5rem"><em>${item.subtitle}</em></p>
                <ul style="padding-left:1.5rem; color:#ccc; line-height:1.5">
                    ${item.details.map(d => `<li>${d}</li>`).join('')}
                </ul>
            `;
            dynamicContent.appendChild(div);
        });
    }

    dynamicContent.style.display = 'block'; // Ensure it's visible (overriding inline display: none from resetView)
    dynamicContent.classList.remove('hidden');
    dynamicContent.classList.add('visible');
    backBtn.classList.remove('hidden');
}

function resetView() {
    // Reform Nebula
    if (particleSystem) {
        const targetPositions = getShapePositions('default', CONFIG.particleCount);
        morphParticles(targetPositions);
    }

    // UI Updates
    document.getElementById('main-title').style.display = 'block';
    document.getElementById('subtitle').style.display = 'block';
    document.getElementById('bio-text').style.display = 'block';
    document.getElementById('dynamic-content').classList.remove('visible');
    document.getElementById('dynamic-content').style.display = 'none'; // Ensure hidden
    document.getElementById('dynamic-content').classList.add('hidden');
    document.getElementById('back-btn').classList.add('hidden');

    // Reset active link
    document.querySelectorAll('#main-nav a').forEach(l => l.classList.remove('active'));
}

function morphParticles(targetPositions) {
    const currentPositions = particleSystem.geometry.attributes.position.array;
    const animationObj = { t: 0 };
    const startPositions = Float32Array.from(currentPositions);

    gsap.to(animationObj, {
        t: 1,
        duration: 1.5,
        ease: "power2.inOut",
        onUpdate: () => {
            for (let i = 0; i < CONFIG.particleCount; i++) {
                const idx = i * 3;
                currentPositions[idx] = startPositions[idx] + (targetPositions[idx] - startPositions[idx]) * animationObj.t;
                currentPositions[idx + 1] = startPositions[idx + 1] + (targetPositions[idx + 1] - startPositions[idx + 1]) * animationObj.t;
                currentPositions[idx + 2] = startPositions[idx + 2] + (targetPositions[idx + 2] - startPositions[idx + 2]) * animationObj.t;
            }
            particleSystem.geometry.attributes.position.needsUpdate = true;
        }
    });
}

// --- Animation Loop ---

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    // controls.update(delta);

    // Mouse Parallax
    const isMobile = window.innerWidth < 768;
    // Target position:
    // Desktop: Offset slightly right (2) to overlap text
    // Mobile: Center (0) as text is full width
    const baseX = isMobile ? 0 : 2;

    const targetX = baseX + (mouse.x * 2);
    const targetY = (mouse.y * 2);

    camera.position.x += (targetX - camera.position.x) * 0.05;
    camera.position.y += (targetY - camera.position.y) * 0.05;
    camera.lookAt(baseX, 0, 0); // Look at the new offset center

    if (particleSystem && particleSystem.geometry && particleSystem.geometry.attributes.position) {
        // Only rotate if not morphing? Or always rotate?
        // Let's keep rotation but remove the position clamping that causes flickering
        particleSystem.rotation.y += delta * 0.05;
    }

    renderer.render(scene, camera);
}

init();
