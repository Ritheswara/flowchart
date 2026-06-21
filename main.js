// Three.js Background Setup
const canvas = document.querySelector('#canvas-bg');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Create Particles (Starfield/Nodes)
const particlesGeometry = new THREE.BufferGeometry();
const count = 2000;
const positions = new Float32Array(count * 3);
const colors = new Float32Array(count * 3);

for (let i = 0; i < count * 3; i++) {
    positions[i] = (Math.random() - 0.5) * 10;
    colors[i] = Math.random();
}

particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

const particlesMaterial = new THREE.PointsMaterial({
    size: 0.015,
    sizeAttenuation: true,
    transparent: true,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
});

const particles = new THREE.Points(particlesGeometry, particlesMaterial);
scene.add(particles);

// Floating Geometric Shapes
const shapesGroup = new THREE.Group();
const geometry = new THREE.IcosahedronGeometry(1, 0);
const material = new THREE.MeshPhongMaterial({
    color: 0x00f2ff,
    wireframe: true,
    transparent: true,
    opacity: 0.1
});

for (let i = 0; i < 5; i++) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10
    );
    mesh.rotation.set(Math.random(), Math.random(), Math.random());
    shapesGroup.add(mesh);
}
scene.add(shapesGroup);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0x7000ff, 2);
pointLight.position.set(5, 5, 5);
scene.add(pointLight);

camera.position.z = 3;

// Animation Loop
const clock = new THREE.Clock();

const animate = () => {
    const elapsedTime = clock.getElapsedTime();

    particles.rotation.y = elapsedTime * 0.05;
    particles.rotation.x = elapsedTime * 0.02;

    shapesGroup.children.forEach((mesh, i) => {
        mesh.rotation.x += 0.005;
        mesh.rotation.y += 0.005;
        mesh.position.y += Math.sin(elapsedTime + i) * 0.002;
    });

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
};

animate();

// Handle Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- 3D Login Card Tilt Logic ---
const card = document.getElementById('login-card');
const container = document.querySelector('.login-container');

container.addEventListener('mousemove', (e) => {
    const xAxis = (window.innerWidth / 2 - e.pageX) / 25;
    const yAxis = (window.innerHeight / 2 - e.pageY) / 25;
    card.style.transform = `rotateY(${xAxis}deg) rotateX(${yAxis}deg)`;
});

container.addEventListener('mouseenter', () => {
    card.style.transition = 'none';
});

container.addEventListener('mouseleave', () => {
    card.style.transition = 'transform 0.5s ease';
    card.style.transform = `rotateY(0deg) rotateX(0deg)`;
});

// --- Entrance Animations (GSAP) ---
window.addEventListener('DOMContentLoaded', () => {
    const tl = gsap.timeline();

    tl.from('.context-label', {
        x: -100,
        opacity: 0,
        duration: 1,
        ease: 'power4.out'
    })
    .from('.login-card', {
        scale: 0.8,
        opacity: 0,
        duration: 1.2,
        ease: 'back.out(1.7)'
    }, '-=0.5')
    .from('.card-header > *', {
        y: 20,
        opacity: 0,
        stagger: 0.2,
        duration: 0.8,
        ease: 'power3.out'
    }, '-=0.8')
    .from('.input-group', {
        x: -20,
        opacity: 0,
        stagger: 0.1,
        duration: 0.6,
        ease: 'power3.out'
    }, '-=0.4')
    .from('.options, .login-btn, .card-footer', {
        y: 20,
        opacity: 0,
        stagger: 0.1,
        duration: 0.6,
        ease: 'power3.out'
    }, '-=0.3');
});

// Form Interaction — Redirect to Dashboard
const loginBtn = document.querySelector('.login-btn');
loginBtn.addEventListener('click', (e) => {
    e.preventDefault();

    // Button press animation
    gsap.to(loginBtn, { scale: 0.95, duration: 0.1, yoyo: true, repeat: 1 });

    // Show syncing state
    const btnText = loginBtn.querySelector('span');
    btnText.innerText = 'SYNCING...';
    loginBtn.disabled = true;

    // After a brief delay, fade out the page and navigate to the dashboard
    setTimeout(() => {
        btnText.innerText = 'LINKED ✓';

        // Smooth fade-out transition
        gsap.to('body', {
            opacity: 0,
            duration: 0.6,
            ease: 'power2.inOut',
            onComplete: () => {
                window.location.href = 'dashboard.html';
            }
        });
    }, 1200);
});

// --- Flowchart Pathways Logic ---

// Initialize Mermaid
mermaid.initialize({ startOnLoad: true, theme: 'dark', securityLevel: 'loose' });

let generatedGraphCodes = [];
let currentRenderIndex = 0;

/**
 * Updates the UI status of a specific pathway tab
 * @param {number} pathwayIndex - The index of the pathway (0, 1, 2)
 * @param {string} status - The status text to display
 * @param {string} statusClass - CSS class ('loading', 'ready', '')
 */
function updatePathwayStatus(pathwayIndex, status, statusClass = '') {
    const tabs = document.querySelectorAll('.pathway-tab');
    if (tabs[pathwayIndex]) {
        const statusEl = tabs[pathwayIndex].querySelector('.tab-status');
        statusEl.textContent = status;
        statusEl.className = `tab-status ${statusClass}`;
        
        if (statusClass === 'loading') {
            tabs[pathwayIndex].classList.add('active');
        } else if (statusClass === 'ready') {
            tabs[pathwayIndex].classList.add('active');
        }
    }
}

/**
 * Renders a Mermaid flowchart inside a designated container using mermaid.render()
 * @param {string} elementId - The ID of the container element (must be pure white canvas)
 * @param {string} graphCode - The Mermaid graph code string (e.g., "graph LR\n A --> B")
 */
async function renderMermaidChart(elementId, graphCode) {
    const container = document.getElementById(elementId);
    
    if (!container) {
        console.error(`Container with ID "${elementId}" not found.`);
        return;
    }

    // Clear the container
    container.innerHTML = '';

    try {
        // Generate a unique ID for this render
        const diagramId = `mermaid-diagram-${Date.now()}`;

        // Use mermaid.render() to parse and generate SVG
        const { svg } = await mermaid.render(diagramId, graphCode);

        // Create a wrapper div for the SVG
        const svgWrapper = document.createElement('div');
        svgWrapper.style.display = 'flex';
        svgWrapper.style.justifyContent = 'center';
        svgWrapper.style.alignItems = 'center';
        svgWrapper.style.width = '100%';
        svgWrapper.style.height = '100%';
        svgWrapper.innerHTML = svg;

        // Inject the SVG directly into the container
        container.appendChild(svgWrapper);

        console.log(`Flowchart rendered successfully in container: ${elementId}`);
    } catch (error) {
        console.error('Mermaid rendering error:', error);

        // Display a themed error message on the canvas
        const errorContainer = document.createElement('div');
        errorContainer.style.display = 'flex';
        errorContainer.style.flexDirection = 'column';
        errorContainer.style.justifyContent = 'center';
        errorContainer.style.alignItems = 'center';
        errorContainer.style.width = '100%';
        errorContainer.style.height = '100%';
        errorContainer.style.color = '#e74c3c';
        errorContainer.style.fontSize = '1.1rem';
        errorContainer.style.fontFamily = "'Outfit', sans-serif";
        errorContainer.style.fontWeight = '600';
        errorContainer.style.textAlign = 'center';
        errorContainer.style.gap = '15px';

        const errorIcon = document.createElement('div');
        errorIcon.textContent = '⚠';
        errorIcon.style.fontSize = '3rem';
        errorIcon.style.opacity = '0.7';

        const errorMessage = document.createElement('div');
        errorMessage.textContent = 'Path alignment failed.';
        errorMessage.style.marginBottom = '8px';

        const errorSubtext = document.createElement('div');
        errorSubtext.textContent = 'Please re-generate.';
        errorSubtext.style.fontSize = '0.9rem';
        errorSubtext.style.opacity = '0.8';

        errorContainer.appendChild(errorIcon);
        errorContainer.appendChild(errorMessage);
        errorContainer.appendChild(errorSubtext);

        container.appendChild(errorContainer);
    }
}

/**
 * Main async function to generate flowchart pathways
 * @param {string} userPrompt - The user's input prompt for the flowchart
 */
async function generateFlowchartPathways(userPrompt) {
    const generateBtn = document.getElementById('generate-btn');
    const pathwayTabs = document.querySelectorAll('.pathway-tab');
    
    // Reset state
    generatedGraphCodes = [];
    currentRenderIndex = 0;
    
    // Disable button and reset tabs
    generateBtn.disabled = true;
    pathwayTabs.forEach((tab, index) => {
        tab.classList.remove('active');
        updatePathwayStatus(index, 'Idle', '');
    });

    const pathwayNames = ['A', 'B', 'C'];
    const API_URL = 'http://127.0.0.1:8000/api/generate-pathway';

    // Loop exactly 3 times
    for (let i = 0; i < 3; i++) {
        try {
            // Update UI to show loading state for this pathway
            updatePathwayStatus(i, `Synthesizing Pathway ${pathwayNames[i]}...`, 'loading');

            // Prepare request body
            const requestBody = {
                prompt: userPrompt,
                pathway_number: i,
                previous_pathways: generatedGraphCodes
            };

            // Make sequential API call
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.statusText}`);
            }

            const data = await response.json();

            // Store the graph code
            if (data.graph_code) {
                generatedGraphCodes.push(data.graph_code);

                // Update tab status to "Ready"
                updatePathwayStatus(i, 'Ready', 'ready');

                // Render the first available flowchart immediately
                if (currentRenderIndex === 0) {
                    renderMermaidChart('flowchart-canvas', data.graph_code);
                    currentRenderIndex++;
                }
            } else {
                throw new Error('No graph_code in response');
            }
        } catch (error) {
            console.error(`Error generating pathway ${i}:`, error);
            updatePathwayStatus(i, `Error: ${error.message}`, '');
        }
    }

    // Re-enable button when all pathways are done
    generateBtn.disabled = false;
}

/**
 * Setup event listeners for pathways UI
 */
function setupPathwaysUI() {
    const generateBtn = document.getElementById('generate-btn');
    const closeBtn = document.getElementById('close-pathways');
    const userPromptInput = document.getElementById('user-prompt');
    const pathwayTabs = document.querySelectorAll('.pathway-tab');

    // Generate button click
    generateBtn.addEventListener('click', () => {
        const prompt = userPromptInput.value.trim();
        if (prompt) {
            generateFlowchartPathways(prompt);
        } else {
            alert('Please enter a query first.');
        }
    });

    // Close button click
    closeBtn.addEventListener('click', () => {
        const pathwaysContainer = document.getElementById('pathways-container');
        pathwaysContainer.classList.add('pathways-hidden');
    });

    // Tab click to render flowchart
    pathwayTabs.forEach((tab, index) => {
        tab.addEventListener('click', () => {
            if (generatedGraphCodes[index]) {
                renderMermaidChart('flowchart-canvas', generatedGraphCodes[index]);
            }
        });
    });
}

// Initialize pathways UI on DOM load
window.addEventListener('DOMContentLoaded', setupPathwaysUI, { once: true });
