// === THREE.JS BACKGROUND SETUP ===
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

// === FLOWCHART PATHWAYS LOGIC ===

// Initialize Mermaid
mermaid.initialize({ startOnLoad: true, theme: 'dark', securityLevel: 'loose' });

let generatedGraphCodes = [];
let currentRenderIndex = 0;

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
 * Updates the UI status of a specific pathway badge
 * @param {number} pathwayIndex - The index of the pathway (0, 1, 2)
 * @param {string} statusClass - CSS class ('loading', 'active', or '')
 */
function updatePathwayBadge(pathwayIndex, statusClass = '') {
    const badges = document.querySelectorAll('.pathway-badge');
    if (badges[pathwayIndex]) {
        badges[pathwayIndex].className = `pathway-badge ${statusClass}`;
    }
}

/**
 * Main async function to generate flowchart pathways
 * @param {string} userPrompt - The user's input prompt for the flowchart
 */
async function generateFlowchartPathways(userPrompt) {
    const generateBtn = document.getElementById('generate-pathways-btn');
    const badges = document.querySelectorAll('.pathway-badge');

    // Reset state
    generatedGraphCodes = [];
    currentRenderIndex = 0;

    // Disable button and reset badges
    generateBtn.disabled = true;
    badges.forEach((badge) => {
        badge.className = 'pathway-badge';
    });

    const pathwayNames = ['A', 'B', 'C'];
    const API_URL = 'http://127.0.0.1:8000/api/generate-pathway';

    // Loop exactly 3 times
    for (let i = 0; i < 3; i++) {
        try {
            // Update UI to show loading state for this pathway
            updatePathwayBadge(i, 'loading');

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

                // Update badge to active/ready
                updatePathwayBadge(i, 'active');

                // Render the first available flowchart immediately
                if (currentRenderIndex === 0) {
                    renderMermaidChart('flowchart-canvas', data.graph_code);
                    currentRenderIndex++;
                }
            } else {
                throw new Error('No graph_code in response');
            }
        } catch (error) {
            console.error(`Error generating pathway ${pathwayNames[i]}:`, error);
            updatePathwayBadge(i, '');
        }
    }

    // Re-enable button when all pathways are done
    generateBtn.disabled = false;
}

/**
 * Setup event listeners for workspace UI
 */
function setupWorkspaceUI() {
    const generateBtn = document.getElementById('generate-pathways-btn');
    const promptInput = document.getElementById('flowchart-prompt');
    const badges = document.querySelectorAll('.pathway-badge');

    // Generate button click
    generateBtn.addEventListener('click', () => {
        const prompt = promptInput.value.trim();
        if (prompt) {
            generateFlowchartPathways(prompt);
        } else {
            alert('Please enter a flowchart concept first.');
        }
    });

    // Badge click to render flowchart
    badges.forEach((badge, index) => {
        badge.addEventListener('click', () => {
            if (generatedGraphCodes[index]) {
                renderMermaidChart('flowchart-canvas', generatedGraphCodes[index]);
            }
        });
    });

    // Allow Enter+Shift to submit prompt
    promptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.shiftKey) {
            generateBtn.click();
        }
    });
}

// Initialize workspace on DOM load
window.addEventListener('DOMContentLoaded', setupWorkspaceUI);
