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

// === FLOWCHART GENERATION LOGIC ===

// --- Mermaid Initialization ---
// Ensure Mermaid is loaded (it's already in the HTML via CDN, but guard against edge cases)
(function ensureMermaid() {
    const config = {
        startOnLoad: false,
        theme: 'base',
        securityLevel: 'loose',
        themeVariables: {
            primaryColor: '#ffffff',
            primaryTextColor: '#111827',
            primaryBorderColor: '#d1d5db',
            lineColor: '#6b7280',
            textColor: '#111827',
            mainBkg: '#ffffff'
        }
    };

    if (typeof mermaid !== 'undefined') {
        mermaid.initialize(config);
        console.log('Mermaid initialized with startOnLoad: false');
    } else {
        // Dynamically inject the Mermaid CDN script if it wasn't found
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
        script.onload = () => {
            mermaid.initialize(config);
            console.log('Mermaid loaded dynamically and initialized');
        };
        document.head.appendChild(script);
    }
})();

// --- State ---
let generatedSolutions = []; // Array of { graphCode: string, label: string } | null
let activeSolutionIndex = -1;

// --- DOM References ---
const CANVAS_ID = 'flowchart-canvas';
const TABS_BAR_ID = 'solution-tabs-bar';
const API_URL = 'http://127.0.0.1:8000/api/generate-flowchart';

// --- History Management Helpers ---

/**
 * Loads flowchart prompt history from localStorage.
 * Key: 'flowchartHistory'
 * @returns {string[]} Array of saved prompt strings
 */
function loadHistory() {
    try {
        const stored = localStorage.getItem('flowchartHistory');
        if (!stored) return [];
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
            return parsed.filter(item => typeof item === 'string');
        }
        return [];
    } catch (e) {
        console.error('Error loading history from localStorage:', e);
        return [];
    }
}

/**
 * Saves flowchart prompt history array to localStorage.
 * Key: 'flowchartHistory'
 * @param {string[]} history - Array of prompt strings
 */
function saveHistory(history) {
    try {
        localStorage.setItem('flowchartHistory', JSON.stringify(history));
    } catch (e) {
        console.error('Error saving history to localStorage:', e);
    }
}

/**
 * Renders the prompt history items in the sidebar.
 */
function renderHistory() {
    const historyList = document.querySelector('.history-list');
    if (!historyList) return;

    historyList.innerHTML = '';
    const history = loadHistory();

    history.forEach(promptText => {
        const item = document.createElement('a');
        item.href = '#';
        item.className = 'history-item';

        const arrow = document.createElement('span');
        arrow.className = 'history-arrow';
        arrow.textContent = '↳';

        const text = document.createElement('span');
        text.className = 'history-text';
        text.textContent = promptText;

        item.appendChild(arrow);
        item.appendChild(text);

        historyList.appendChild(item);
    });
}

/**
 * Adds a new prompt to history, moving it to the top if duplicate.
 * @param {string} prompt - The user prompt to save
 */
function addPromptToHistory(prompt) {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) return;

    let history = loadHistory();
    // Remove duplicate entry if it exists to move it to the top
    history = history.filter(item => item !== trimmedPrompt);
    // Add to the front
    history.unshift(trimmedPrompt);

    saveHistory(history);
    renderHistory();
}

/**
 * Renders a Mermaid flowchart SVG inside the canvas container.
 * Clears the container first, then uses mermaid.render() to produce the SVG.
 * On error, displays a user-friendly message on the canvas.
 *
 * @param {string} graphCode - Valid Mermaid graph syntax
 */
async function renderCanvas(graphCode) {
    const container = document.getElementById(CANVAS_ID);
    if (!container) {
        console.error(`Canvas container "#${CANVAS_ID}" not found.`);
        return;
    }

    // 1. Inside renderCanvas(graphCode), completely clear out the canvas element innerHTML before processing.
    container.innerHTML = '';

    // 3. Add a fallback configuration to clear any stuck internal parser states by assigning
    // an empty function or simple console warning to window.mermaid.parseError if the global mermaid object exists.
    if (typeof mermaid !== 'undefined') {
        if (typeof window !== 'undefined') {
            window.mermaid.parseError = (err, hash) => {
                console.warn('Mermaid parser error:', err);
            };
        } else {
            mermaid.parseError = (err, hash) => {
                console.warn('Mermaid parser error:', err);
            };
        }
    }

    try {
        // 2. Generate a unique ID string for each render pass (e.g., combining a prefix with Math.random())
        // so that Mermaid evaluates each layout as a completely fresh instance.
        const diagramId = `mermaid-render-${Math.random().toString(36).substring(2, 9)}`;

        // 4. Wrap the await mermaid.render() call in a strong try/catch block.
        const { svg } = await mermaid.render(diagramId, graphCode);

        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'display:flex;justify-content:center;align-items:center;width:100%;height:100%;';
        wrapper.innerHTML = svg;
        container.appendChild(wrapper);

        console.log('Flowchart rendered successfully.');
    } catch (error) {
        console.error('Mermaid rendering error:', error);
        // If an error is caught, cleanly display an inline error message inside the canvas container
        // to the user instead of letting the exception bubble up and freeze future generation requests.
        showCanvasError(
            container,
            'Unable to render this flowchart.',
            'The generated diagram may contain syntax errors. Please try generating again.'
        );
    }
}

// Keep renderFlowchart alias for backwards compatibility
const renderFlowchart = renderCanvas;

/**
 * Shows a styled error message inside the canvas container.
 *
 * @param {HTMLElement} container - The canvas container element
 * @param {string} title - The primary error message
 * @param {string} subtitle - A helpful secondary message
 */
function showCanvasError(container, title, subtitle) {
    container.innerHTML = '';

    const errorEl = document.createElement('div');
    errorEl.style.cssText = `
        display:flex;flex-direction:column;justify-content:center;align-items:center;
        width:100%;height:100%;color:#e74c3c;font-family:'Outfit',sans-serif;
        text-align:center;gap:12px;padding:2rem;
    `;

    errorEl.innerHTML = `
        <div style="font-size:2.5rem;opacity:0.7">⚠</div>
        <div style="font-size:1rem;font-weight:600">${title}</div>
        <div style="font-size:0.85rem;opacity:0.8">${subtitle}</div>
    `;

    container.appendChild(errorEl);
}

/**
 * Creates a dynamic tab badge in the tab bar.
 * Initially shows a loading state with a spinner icon.
 *
 * @param {number} solutionNumber - 1-indexed solution number
 * @returns {HTMLElement} The created badge element
 */
function createSolutionTab(solutionNumber) {
    const tabsBar = document.getElementById(TABS_BAR_ID);
    if (!tabsBar) return null;

    const badge = document.createElement('div');
    badge.className = 'pathway-badge loading';
    badge.dataset.solution = String(solutionNumber - 1); // 0-indexed for array lookup

    const statusDot = document.createElement('span');
    statusDot.className = 'pathway-status-dot';

    const label = document.createElement('span');
    label.textContent = `⏳ Solution ${solutionNumber} Processing...`;

    badge.appendChild(statusDot);
    badge.appendChild(label);
    tabsBar.appendChild(badge);

    return badge;
}

/**
 * Updates a tab badge to its completed "ready" state.
 *
 * @param {HTMLElement} badge - The badge DOM element
 * @param {number} solutionNumber - 1-indexed solution number
 */
function markTabReady(badge, solutionNumber) {
    if (!badge) return;
    badge.className = 'pathway-badge active';
    const label = badge.querySelector('span:last-child');
    if (label) {
        label.textContent = `Solution ${solutionNumber}`;
    }
}

/**
 * Updates a tab badge to show an error state.
 *
 * @param {HTMLElement} badge - The badge DOM element
 * @param {number} solutionNumber - 1-indexed solution number
 */
function markTabError(badge, solutionNumber) {
    if (!badge) return;
    badge.className = 'pathway-badge';
    const label = badge.querySelector('span:last-child');
    if (label) {
        label.textContent = `Solution ${solutionNumber} — Failed`;
    }
}

/**
 * Highlights the active tab and de-highlights the rest.
 *
 * @param {number} index - 0-indexed solution index to highlight
 */
function setActiveTab(index) {
    const badges = document.querySelectorAll(`#${TABS_BAR_ID} .pathway-badge`);
    badges.forEach((b, i) => {
        b.classList.toggle('active', i === index);
    });
    activeSolutionIndex = index;
}

/**
 * Main function: sequentially generates 3 flowchart solutions from the backend.
 * For each iteration it:
 *   1. Creates a loading tab badge
 *   2. POSTs to the API with the correct payload
 *   3. On success, stores the graph code, updates the tab, and renders the first result immediately
 *
 * @param {string} userPrompt - The user's flowchart description
 */
async function generateFlowcharts(userPrompt) {
    const generateBtn = document.getElementById('generate-pathways-btn');
    const tabsBar = document.getElementById(TABS_BAR_ID);

    // --- Reset state ---
    generatedSolutions = [];
    activeSolutionIndex = -1;
    if (tabsBar) tabsBar.innerHTML = '';

    // Reset canvas to default
    const canvasEl = document.getElementById(CANVAS_ID);
    if (canvasEl) {
        canvasEl.innerHTML = '<div class="canvas-empty">Generating flowcharts...</div>';
    }

    // Disable button while generating
    generateBtn.disabled = true;
    const originalBtnText = generateBtn.textContent;
    generateBtn.textContent = 'Generating...';

    const previousSolutions = [];

    // Sequential loop — exactly 3 iterations
    for (let i = 0; i < 3; i++) {
        const solutionNumber = i + 1;

        // 1. Create a loading tab badge
        const badge = createSolutionTab(solutionNumber);

        try {
            // 2. POST to backend API
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_prompt: userPrompt,
                    solution_number: solutionNumber,
                    previous_solutions: [...previousSolutions]
                })
            });

            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (!data.graph_code) {
                throw new Error('Response missing "graph_code" field');
            }

            // 3. Store the solution
            const graphCode = data.graph_code;
            generatedSolutions.push({ graphCode, label: `Solution ${solutionNumber}` });
            previousSolutions.push(graphCode);

            // 4. Update tab to ready state
            markTabReady(badge, solutionNumber);

            // 5. Render the FIRST successful solution immediately
            if (generatedSolutions.filter(s => s !== null).length === 1) {
                setActiveTab(i);
                await renderCanvas(graphCode);
            }

        } catch (error) {
            console.error(`Error generating Solution ${solutionNumber}:`, error);
            markTabError(badge, solutionNumber);

            // Push null so indices stay aligned with tab positions
            generatedSolutions.push(null);
        }
    }

    // Re-enable button
    generateBtn.disabled = false;
    generateBtn.textContent = originalBtnText;

    // Save prompt to history if at least one flowchart solution generated successfully
    const hasSuccessfulSolution = generatedSolutions.some(s => s !== null);
    if (hasSuccessfulSolution) {
        addPromptToHistory(userPrompt);
    }
}

// === EVENT LISTENERS ===

/**
 * Sets up all dashboard UI event listeners.
 */
function setupDashboardUI() {
    const generateBtn = document.getElementById('generate-pathways-btn');
    const promptInput = document.getElementById('flowchart-prompt');
    const clearBtn = document.querySelector('.prompt-btn.secondary');
    const tabsBar = document.getElementById(TABS_BAR_ID);

    // Load and render existing history
    renderHistory();

    // --- History list click event delegation ---
    const historyList = document.querySelector('.history-list');
    if (historyList) {
        historyList.addEventListener('click', (e) => {
            e.preventDefault();
            const item = e.target.closest('.history-item');
            if (!item) return;
            const textSpan = item.querySelector('.history-text');
            if (textSpan && promptInput) {
                promptInput.value = textSpan.textContent;
            }
        });
    }

    // --- Generate button ---
    generateBtn.addEventListener('click', () => {
        const prompt = promptInput.value.trim();
        if (prompt) {
            generateFlowcharts(prompt);
        } else {
            alert('Please describe the flowchart you want to generate.');
        }
    });

    // --- Clear button ---
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            promptInput.value = '';
            promptInput.focus();
        });
    }

    // --- Tab click (event delegation for dynamic tabs) ---
    if (tabsBar) {
        tabsBar.addEventListener('click', (e) => {
            const badge = e.target.closest('.pathway-badge');
            if (!badge) return;

            const index = parseInt(badge.dataset.solution, 10);
            if (isNaN(index)) return;

            const solution = generatedSolutions[index];
            if (!solution || !solution.graphCode) {
                console.warn(`Solution ${index + 1} is not available.`);
                return;
            }

            // Highlight this tab and render its flowchart
            setActiveTab(index);
            renderCanvas(solution.graphCode);
        });
    }

    // --- Shift+Enter to submit ---
    promptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.shiftKey) {
            e.preventDefault();
            generateBtn.click();
        }
    });

    // --- Logout confirmation ---
    const logoutLink = document.querySelector('.logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Are you sure you want to log out?')) {
                window.location.href = 'index.html';
            }
        });
    }
}

// Initialize on DOM ready
window.addEventListener('DOMContentLoaded', setupDashboardUI);
