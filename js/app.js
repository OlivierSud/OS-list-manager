// DOM Elements
const app = document.getElementById('app');
const listsContainer = document.getElementById('lists-container');
const tasksContainer = document.getElementById('tasks-container');
const headerTitle = document.getElementById('header-title');
const backButton = document.getElementById('back-button');
const settingsButton = document.getElementById('settings-button');
const fab = document.getElementById('fab');
const taskInputContainer = document.getElementById('task-input-container');
const newTaskInput = document.getElementById('new-task-input');
const addTaskButton = document.getElementById('add-task-button');
const filterButton = document.getElementById('filter-button');
const searchContainer = document.getElementById('search-container');
const searchInput = document.getElementById('search-input');
const toggleHeaderMode = document.getElementById('toggle-header-mode');
const loginContainer = document.getElementById('login-container');
const loginButton = document.getElementById('login-button');
const modal = document.getElementById('action-modal');
const modalTitle = document.getElementById('modal-title');
const modalDesc = document.getElementById('modal-desc');
const btnRename = document.getElementById('btn-rename');
const btnDuplicate = document.getElementById('btn-duplicate');
const btnDelete = document.getElementById('btn-delete');
const btnLogout = document.getElementById('btn-logout');
const btnCancel = document.getElementById('btn-cancel');
const btnColor = document.getElementById('btn-color');
const colorModal = document.getElementById('color-modal');
const colorGrid = document.getElementById('color-grid');
const btnColorCancel = document.getElementById('btn-color-cancel');
const headerProgress = document.getElementById('header-progress');
const headerProgressLabel = document.getElementById('header-progress-label');
const headerProgressPct = document.getElementById('header-progress-pct');
const headerProgressFill = document.getElementById('header-progress-fill');

// User Profile Elements
const userProfileContainer = document.getElementById('user-profile-container');
const userAvatar = document.getElementById('user-avatar');
const userAvatarFallback = document.getElementById('user-avatar-fallback');
const userMenu = document.getElementById('user-menu');
const btnLogoutHeader = document.getElementById('btn-logout-header');
const refreshButton = document.getElementById('refresh-button');

let currentListId = null;
let currentListName = "";
let collapsedSections = new Set(); // Track collapsed section indices
let draggedElement = null;
let draggedIndex = null;
const LONG_PRESS_MS = 280;
let touchDragging = false;
let touchStartX = 0, touchStartY = 0;
let touchLastX = 0, touchLastY = 0;
let touchGhost = null; // visual floating clone
let touchLongPressTimer = null;

// Drag / Auto-scroll configuration (adjust these values to tune behavior)
// You can change them directly in code or at runtime via `window.DRAG_CONFIG`.
// By default we use a ratio of the container height for activation (e.g. 0.25 = 1/4 of screen).
const DRAG_CONFIG = {
    // If set to a number between 0 and 1, uses this fraction of the container height.
    AUTO_SCROLL_THRESHOLD_RATIO: 0.25,
    // Backwards-compatible pixel fallback (if ratio is null):
    AUTO_SCROLL_THRESHOLD: null,
    AUTO_SCROLL_STEP: 24 // px per tick
};
window.DRAG_CONFIG = DRAG_CONFIG;

// Minimal transparent image used to suppress the browser's native drag image
const _blankDragImage = (() => {
    try {
        const img = new Image();
        img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABAQMAAAAl21bKAAAAA1BMVEUAAACnej3aAAAAAXRSTlMAQObYZgAAAApJREFUCNdjYAAAAAIAAeIhvDMAAAAASUVORK5CYII=';
        return img;
    } catch (e) { return null; }
})();

let autoScrollInterval = null;
let autoScrollDirection = 0;

function startAutoScroll(container, direction) {
    if (!container) return;
    if (autoScrollInterval && autoScrollDirection === direction) return;
    stopAutoScroll();
    autoScrollDirection = direction;
    const step = (window.DRAG_CONFIG && window.DRAG_CONFIG.AUTO_SCROLL_STEP) || DRAG_CONFIG.AUTO_SCROLL_STEP;
    autoScrollInterval = setInterval(() => {
        try {
            container.scrollBy({ top: direction * step, left: 0, behavior: 'auto' });
        } catch (e) {
            // fallback
            container.scrollTop += direction * step;
        }
    }, 50);
}

function stopAutoScroll() {
    if (autoScrollInterval) {
        clearInterval(autoScrollInterval);
        autoScrollInterval = null;
        autoScrollDirection = 0;
    }
}

function handleAutoScrollDuringDrag(e) {
    if (!tasksContainer) return;
    const rect = tasksContainer.getBoundingClientRect();
    const y = e.clientY;
    // Determine threshold: prefer ratio-based threshold (fraction of container height).
    const cfg = window.DRAG_CONFIG || DRAG_CONFIG;
    let threshold = null;
    if (typeof cfg.AUTO_SCROLL_THRESHOLD_RATIO === 'number' && cfg.AUTO_SCROLL_THRESHOLD_RATIO > 0 && cfg.AUTO_SCROLL_THRESHOLD_RATIO < 1) {
        threshold = rect.height * cfg.AUTO_SCROLL_THRESHOLD_RATIO;
    } else if (typeof cfg.AUTO_SCROLL_THRESHOLD === 'number') {
        threshold = cfg.AUTO_SCROLL_THRESHOLD;
    } else {
        threshold = rect.height * 0.25; // default to 25% if nothing set
    }

    if (y < rect.top + threshold) {
        startAutoScroll(tasksContainer, -1);
    } else if (y > rect.bottom - threshold) {
        startAutoScroll(tasksContainer, 1);
    } else {
        stopAutoScroll();
    }
}

// Color palette for lists
const COLOR_PALETTE = [
    '#eb7600', // Blender Orange
    '#3b82f6', // Blue
    '#10b981', // Green
    '#8b5cf6', // Purple
    '#ef4444', // Red
    '#f59e0b', // Amber
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#84cc16', // Lime
    '#f97316', // Orange
    '#6366f1', // Indigo
    '#14b8a6'  // Teal
];

// State
let state = {
    view: 'home', // 'home' | 'list'
    activeListId: null,
    lists: [],
    items: {},
    selectedSectionId: null, // Track currently selected section
    isHeaderMode: false,
    filter: 'all',
    searchQuery: '',
    userEmail: null,
    userPicture: null
};

// PWA Install Prompt
let deferredPrompt;
const pwaBanner = document.getElementById('pwa-install-banner');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('PWA persistent prompt ready');

    // Show banner only if we are in Home view AND not already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (state.view === 'home' && !isStandalone) {
        if (pwaBanner) pwaBanner.classList.remove('hidden');
    }
});

// Function to trigger PWA install manually if needed
function installPWAFromBanner() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the PWA install');
                if (pwaBanner) pwaBanner.classList.add('hidden');
            }
            deferredPrompt = null;
        });
    }
}


// Map to store per-list filters
let listFilters = {};


// --- Utilities ---
function generateId() {
    return Math.random().toString(36).substring(2, 9);
}

// --- Google Sheets & Auth Integration ---
// TODO: User must replace this with their own OAuth 2.0 Client ID from Google Cloud Console
const CLIENT_ID = '356152485310-ofia0pr8hcig7s906tfu1c9v1us7s4gb.apps.googleusercontent.com';
const API_KEY = 'AIzaSyBA2lV9mm9_tNIpErOd9yO5lMjlIYtlCwM';
const SPREADSHEET_ID = '17nkELFwjGJrOjCBHTunDsAdg1GE6ylIZYc6jblAB-ps';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile openid';

let tokenClient;
let accessToken = null;

// Initialize Google Identity Services
function initTokenClient() {
    if (window.google) {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: (tokenResponse) => {
                if (tokenResponse.error) {
                    console.error("Erreur d'authentification: " + tokenResponse.error);
                    console.error("Auth Error:", tokenResponse);
                    return;
                }
                accessToken = tokenResponse.access_token;
                // Save token and expiry
                const expiry = Date.now() + (tokenResponse.expires_in * 1000);
                localStorage.setItem('google_access_token', accessToken);
                localStorage.setItem('google_token_expiry', expiry);

                console.log("Access Token received and saved");
                fetchUserEmail().then(() => {
                    renderHome();
                    fetchSheetData();
                });
            },
            error_callback: (error) => {
                console.error("Erreur de connexion Google: " + error.message);
                console.error("Google Auth Error:", error);
            }
        });

        // Try to recover session
        checkPersistentAuth();
    }
}

function checkPersistentAuth() {
    const savedToken = localStorage.getItem('google_access_token');
    const expiry = localStorage.getItem('google_token_expiry');

    if (savedToken && expiry && Date.now() < parseInt(expiry)) {
        accessToken = savedToken;
        console.log("Restored session from localStorage");
        fetchUserEmail();
        fetchSheetData(); // Fetch data immediately
        renderHome();
    }
}

async function fetchUserEmail() {
    if (!accessToken) return;
    try {
        const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const data = await response.json();
        state.userEmail = data.email;
        state.userPicture = data.picture;
        console.log("Logged in as:", state.userEmail);
    } catch (e) {
        console.error("Failed to fetch user email", e);
    }
}

function handleLogout() {
    // Revoke token with Google if possible
    if (window.google && accessToken) {
        google.accounts.oauth2.revoke(accessToken, () => {
            console.log('Token revoked');
        });
    }

    accessToken = null;
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_token_expiry');

    goHome(); // This will trigger renderHome and show login since accessToken is null
    closeOptions();
}

function handleAuthClick() {
    if (tokenClient) {
        tokenClient.requestAccessToken();
    } else {
        console.error("Google API not loaded yet. Check internet connection.");
    }
}

async function fetchSheetData() {
    if (!accessToken) return;

    console.log("Fetching Google Sheets data...");
    try {
        // 1. Get all Sheets (Tabs) to build the Lists
        const metaResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?fields=sheets.properties`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (metaResponse.status === 403) {
            console.error("Accès refusé. Vérifiez les permissions et le partage de la feuille Google.");
            return;
        }

        const metaData = await metaResponse.json();

        if (metaData.error) {
            console.error('Google Sheets Meta Error:', metaData.error);
            console.error("Erreur Google Sheets: " + metaData.error.message);
            return;
        }

        // Reset state with real data
        state.lists = [];
        // Reset state with base list info (fast render)
        state.lists = [];
        state.items = {};

        if (metaData.sheets && metaData.sheets.length) {
            // Build lightweight list entries so UI can render quickly
            metaData.sheets.forEach((sheet, index) => {
                const title = sheet.properties.title;
                const sheetId = sheet.properties.sheetId;
                state.lists.push({
                    id: sheetId,
                    name: title,
                    color: COLOR_PALETTE[index % COLOR_PALETTE.length],
                    items: 0,
                    filter: 'all'
                });
            });

            // Render home early so user sees lists immediately
            renderHome();

            // Prepare ranges for batchGet to reduce network roundtrips
            const ranges = metaData.sheets.map(s => `${s.properties.title}!A:D`);
            const params = ranges.map(r => `ranges=${encodeURIComponent(r)}`).join('&');

            const batchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values:batchGet?${params}`;
            const batchResponse = await fetch(batchUrl, { headers: { 'Authorization': `Bearer ${accessToken}` } });
            const batchData = await batchResponse.json();

            // Map results back to state.lists order
            const valueRanges = (batchData && batchData.valueRanges) || [];
            valueRanges.forEach((vr, idx) => {
                const list = state.lists[idx];
                const title = list.name;
                const sheetId = list.id;

                const dataValues = vr && vr.values ? vr.values : [];

                // Parse filter if present in first row
                let savedFilter = list.filter || 'all';
                if (dataValues[0] && dataValues[0][2]) {
                    const firstRowParts = dataValues[0][2].split('|');
                    const filterPart = firstRowParts.find(p => p.startsWith('FILTER:'));
                    if (filterPart) savedFilter = filterPart.replace('FILTER:', '');
                }

                const items = [];
                let lastHeaderUid = null;
                dataValues.forEach((row, rowIndex) => {
                    const colC = row[2] || "";
                    const isHeader = row[1] === "HEADER";

                    const parts = colC.split('|');
                    let uid = parts.find(p => p.startsWith('UID:'))?.replace('UID:', '');
                    let pid = parts.find(p => p.startsWith('PID:'))?.replace('PID:', '');
                    let color = parts.find(p => p.startsWith('COLOR:'))?.replace('COLOR:', '');
                    let sectionName = parts.find(p => p.startsWith('SECTION:'))?.replace('SECTION:', '');
                    let isStandalone = parts.includes('STANDALONE');
                    let isSubHeader = parts.includes('SUBHEADER');

                    if (isHeader) {
                        if (!uid) uid = generateId();
                        lastHeaderUid = uid;
                        isSubHeader = false;
                    } else {
                        // Respect explicit metadata first: if STANDALONE flag is present, honor it.
                        if (isStandalone) {
                            // explicit standalone - leave pid null
                            pid = null;
                        } else if (pid) {
                            // explicit PID provided in metadata - use it
                            // keep pid as parsed
                        } else if (lastHeaderUid) {
                            // No explicit metadata: fall back to nearest previous header
                            pid = lastHeaderUid;
                        } else {
                            // No header above and no metadata -> standalone
                            isStandalone = true;
                            pid = null;
                        }
                        // Ensure isSubHeader false for non-headers
                        isSubHeader = false;
                    }

                    if (rowIndex === 0) {
                        const filterPart = parts.find(p => p.startsWith('FILTER:'));
                        if (filterPart) savedFilter = filterPart.replace('FILTER:', '');
                    }

                    items.push({
                        id: uid || `${sheetId}-${rowIndex}-${generateId()}`,
                        text: row[0],
                        done: row[1] === "TRUE",
                        isHeader: isHeader,
                        isSubHeader: isSubHeader,
                        isStandalone: isStandalone,
                        parentId: isStandalone ? null : pid,
                        color: color || null,
                        sectionName: sectionName || null,
                        lastModifier: row[3] || ""
                    });
                });

                list.items = items.length;
                list.filter = savedFilter;
                state.items[sheetId] = items;
            });

            // Update colors from metadata and re-render with full data
            await loadListColors();
            renderHome();
        } else {
            // No sheets
            renderHome();
        }

        console.log("Data sync complete:", state);
    } catch (e) {
        console.error("Network or API Error", e);
    }
}

// Create a new sheet (list)
async function createListInSheet(name) {
    if (!accessToken) return;

    try {
        const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                requests: [{
                    addSheet: {
                        properties: { title: name }
                    }
                }]
            })
        });
        const data = await response.json();
        if (!data.error) {
            console.log("List created:", name);
            fetchSheetData(); // Refresh all data
        } else {
            console.error(data.error);
            console.error("Erreur création liste: " + data.error.message);
        }
    } catch (e) {
        console.error(e);
    }
}

// addItemToSheet is kept for reference but all writes now go through syncOrderToSheet
// to guarantee metadata (UID, PID, STANDALONE, FILTER) is always saved correctly.
async function addItemToSheet(listId, text, isHeader = false) {
    // Delegate to full sync so all metadata is preserved
    await syncOrderToSheet(listId);
}

async function toggleItemInSheet(listId, itemId, newStatus) {
    // Update local state modifier
    const items = state.items[listId];
    const item = items ? items.find(i => i.id === itemId) : null;
    if (item) item.lastModifier = state.userEmail || "";

    // Use full sheet sync to avoid stale row-index issues
    await syncOrderToSheet(listId);
}

async function renameSheet(sheetId, newName) {
    if (!accessToken) return;
    try {
        const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                requests: [{
                    updateSheetProperties: {
                        properties: { sheetId: sheetId, title: newName },
                        fields: "title"
                    }
                }]
            })
        });
        const data = await response.json();
        if (!data.error) {
            // Update local state
            const list = state.lists.find(l => l.id === sheetId);
            if (list) list.name = newName;

            // If we're currently viewing this list, stay in it
            if (state.view === 'list' && state.activeListId === sheetId) {
                renderList(sheetId);
            } else {
                fetchSheetData();
            }
            return true;
        } else {
            console.error("Erreur: " + data.error.message);
            return false;
        }
    } catch (e) { console.error(e); return false; }
}

async function duplicateSheet(sheetId) {
    if (!accessToken) return;
    try {
        const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                requests: [{
                    duplicateSheet: {
                        sourceSheetId: sheetId,
                        newSheetName: currentListName + " (Copie)"
                    }
                }]
            })
        });
        const data = await response.json();
        if (!data.error) fetchSheetData();
        else console.error("Erreur: " + data.error.message);
    } catch (e) { console.error(e); }
}

async function deleteSheet(sheetId) {
    if (!accessToken) return;
    try {
        const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                requests: [{
                    deleteSheet: {
                        sheetId: sheetId
                    }
                }]
            })
        });
        const data = await response.json();
        if (!data.error) fetchSheetData();
        else console.error("Erreur: " + data.error.message);
    } catch (e) { console.error(e); }
}

async function loadListColors() {
    if (!accessToken) return;

    try {
        const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?fields=sheets.properties`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const data = await response.json();

        if (data.sheets) {
            data.sheets.forEach(sheet => {
                const sheetId = sheet.properties.sheetId;
                const tabColor = sheet.properties.tabColor;

                if (tabColor) {
                    const list = state.lists.find(l => l.id === sheetId);
                    if (list) {
                        // Convert RGB to hex
                        const r = Math.round((tabColor.red || 0) * 255);
                        const g = Math.round((tabColor.green || 0) * 255);
                        const b = Math.round((tabColor.blue || 0) * 255);
                        list.color = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
                    }
                }
            });
        }
    } catch (e) {
        console.error('Failed to load colors:', e);
    }
}

async function updateSheetColor(sheetId, hexColor) {
    if (!accessToken) return;

    // Convert hex to RGB (0-1 range)
    const r = parseInt(hexColor.slice(1, 3), 16) / 255;
    const g = parseInt(hexColor.slice(3, 5), 16) / 255;
    const b = parseInt(hexColor.slice(5, 7), 16) / 255;

    try {
        const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                requests: [{
                    updateSheetProperties: {
                        properties: {
                            sheetId: sheetId,
                            tabColor: { red: r, green: g, blue: b }
                        },
                        fields: "tabColor"
                    }
                }]
            })
        });

        const data = await response.json();
        if (!data.error) {
            // Update local state
            const list = state.lists.find(l => l.id === sheetId);
            if (list) list.color = hexColor;

            // If we're currently viewing this list, stay in it
            if (state.view === 'list' && state.activeListId === sheetId) {
                renderList(sheetId);
            } else {
                renderHome();
            }
        } else {
            console.error("Erreur: " + data.error.message);
        }
    } catch (e) {
        console.error(e);
    }
}

async function deleteSheet(sheetId) {
    if (!accessToken) return;
    try {
        const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                requests: [{
                    deleteSheet: {
                        sheetId: sheetId
                    }
                }]
            })
        });
        const data = await response.json();
        if (!data.error) fetchSheetData();
        else console.error("Erreur: " + data.error.message);
    } catch (e) { console.error(e); }
}

function getRandomColor(index) {
    return COLOR_PALETTE[index % COLOR_PALETTE.length];
}


let colorTarget = { type: 'list', id: null }; // 'list' or 'section'

window.openSectionColor = function (index) {
    colorTarget = { type: 'section', index: index };
    openColorModal();
}


function initColorPicker() {
    colorGrid.innerHTML = '';
    COLOR_PALETTE.forEach(color => {
        const colorBtn = document.createElement('button');
        colorBtn.style.cssText = `
            width: 40px;
            height: 40px;
            border-radius: 6px;
            background: ${color};
            border: 2px solid var(--border-color);
            cursor: pointer;
            transition: all 0.2s;
        `;
        colorBtn.onmouseover = () => colorBtn.style.transform = 'scale(1.1)';
        colorBtn.onmouseout = () => colorBtn.style.transform = 'scale(1)';
        colorBtn.onclick = () => {
            if (colorTarget.type === 'list') {
                updateSheetColor(colorTarget.id, color);
            } else {
                updateSectionColor(colorTarget.index, color);
            }
            closeColorModal();
            closeOptions();
        };
        colorGrid.appendChild(colorBtn);
    });
}

function openColorModal() {
    if (!colorTarget || colorTarget.type === 'list') {
        colorTarget = { type: 'list', id: currentListId };
    }
    colorModal.classList.remove('hidden');
}

function closeColorModal() {
    colorModal.classList.add('hidden');
    colorModal.style.display = '';
}

function updateFilterButtonUI() {
    if (!filterButton) return;

    let iconName = 'list';
    let label = 'Tout';
    let color = 'var(--text-secondary)';

    if (state.filter === 'active') {
        iconName = 'square';
        label = 'À faire';
        color = 'var(--accent-color)';
    } else if (state.filter === 'completed') {
        iconName = 'check-square';
        label = 'Fait';
        color = 'var(--success-color)';
    }

    filterButton.innerHTML = `<i data-lucide="${iconName}"></i>`;
    filterButton.style.color = color;
    filterButton.title = `Filtre: ${label}`;
    lucide.createIcons();
}

async function saveListFilter(sheetTitle, filterValue) {
    if (!accessToken) return;
    try {
        // Write filter state to cell C1
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(sheetTitle)}!C1?valueInputOption=RAW`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                values: [[`FILTER:${filterValue}`]]
            })
        });
    } catch (e) {
        console.error('Failed to save filter:', e);
    }
}

// --- Render Functions ---

function updateHeaderProgress(items) {
    if (!headerProgress) return;
    const allCheckable = (items || []).filter(i => !i.isHeader);
    const doneCount = allCheckable.filter(i => i.done).length;
    const totalCount = allCheckable.length;
    const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
    const isComplete = totalCount > 0 && pct === 100;

    if (headerProgressLabel) headerProgressLabel.textContent = `${doneCount} / ${totalCount} terminé${doneCount > 1 ? 's' : ''}`;
    if (headerProgressPct) {
        headerProgressPct.textContent = `${pct}%`;
        headerProgressPct.style.color = isComplete ? 'var(--success-color)' : 'var(--accent-color)';
    }
    if (headerProgressFill) {
        headerProgressFill.style.width = `${pct}%`;
        headerProgressFill.style.background = isComplete
            ? 'linear-gradient(90deg, var(--success-color), #6ee76f)'
            : 'linear-gradient(90deg, var(--accent-color), var(--accent-hover))';
    }
    headerProgress.classList.remove('hidden');
}


function renderHome() {
    /* Login State Helper */
    if (!accessToken) {
        // Show Login Screen
        app.classList.add('hidden');
        loginContainer.classList.remove('hidden');
        lucide.createIcons();
        return;
    }

    // Show Main App
    // Show Main App
    app.classList.remove('hidden');
    loginContainer.classList.add('hidden');

    // Update Avatar Logic
    if (userProfileContainer) {
        if (state.userPicture) {
            // Show Image
            if (userAvatar) {
                userAvatar.src = state.userPicture;
                userAvatar.classList.remove('hidden');
            }
            if (userAvatarFallback) userAvatarFallback.classList.add('hidden');
            userProfileContainer.classList.remove('hidden');
            if (refreshButton) refreshButton.classList.remove('hidden');
        } else if (state.userEmail) {
            // Show Fallback
            if (userAvatar) userAvatar.classList.add('hidden');
            if (userAvatarFallback) userAvatarFallback.classList.remove('hidden');
            userProfileContainer.classList.remove('hidden');
            if (refreshButton) refreshButton.classList.remove('hidden');
        } else {
            // Hide all
            userProfileContainer.classList.add('hidden');
            if (refreshButton) refreshButton.classList.add('hidden');
        }
    }

    // Hide/Show elements for Home View
    listsContainer.classList.remove('hidden');
    listsContainer.classList.add('fade-in');

    tasksContainer.classList.add('hidden');
    backButton.classList.add('hidden');
    taskInputContainer.classList.add('hidden');
    fab.classList.remove('hidden'); // Show FAB to add new list
    if (settingsButton) settingsButton.classList.add('hidden'); // Hide settings in home view
    if (filterButton) filterButton.classList.add('hidden'); // Hide filter in home view
    if (searchContainer) searchContainer.classList.add('hidden'); // Hide search in home view
    if (headerProgress) headerProgress.classList.add('hidden'); // Hide progress bar in home view

    // Show PWA banner if available
    if (deferredPrompt && pwaBanner) {
        pwaBanner.classList.remove('hidden');
    }

    headerTitle.innerText = "Mes Listes";

    // Clear and rebuild content
    listsContainer.innerHTML = '';

    if (state.lists.length === 0) {
        listsContainer.innerHTML = `<div style="text-align: center; color: var(--text-secondary); padding: 2rem;">Chargement...</div>`;
    }

    state.lists.forEach(list => {
        const itemCount = state.items[list.id] ? state.items[list.id].length : 0;

        const el = document.createElement('div');
        el.className = 'glass-panel list-item';
        // Remove global onclick, move to inner div

        el.innerHTML = `
            <div onclick="openList(${list.id})" style="display: flex; align-items: center; flex: 1;">
                <div class="list-icon" style="background-color: ${list.color}">
                    <i data-lucide="list"></i>
                </div>
                <div>
                    <h3>${list.name}</h3>
                    <div class="list-meta">${itemCount} éléments</div>
                </div>
            </div>
            <button class="btn-icon" onclick="openOptions(event, ${list.id}, '${list.name.replace(/'/g, "\\'")}')" style="margin-left: 0.5rem; color: var(--text-secondary);">
                <i data-lucide="more-vertical"></i>
            </button>
        `;
        listsContainer.appendChild(el);
    });

    lucide.createIcons();
}

function renderList(listId) {
    const list = state.lists.find(l => l.id === listId);
    if (!list) return;

    // Hide/Show elements
    listsContainer.classList.add('hidden');

    tasksContainer.classList.remove('hidden');
    tasksContainer.classList.remove('slide-in-right'); // reset animation
    void tasksContainer.offsetWidth; // trigger reflow
    tasksContainer.classList.add('slide-in-right');

    backButton.classList.remove('hidden');
    taskInputContainer.classList.remove('hidden');
    fab.classList.add('hidden'); // Hide FAB, we use the input bar instead
    if (settingsButton) settingsButton.classList.remove('hidden'); // Show settings button in list view
    if (filterButton) filterButton.classList.remove('hidden'); // Show filter button in list view
    if (searchContainer) searchContainer.classList.remove('hidden'); // Show search in list view

    // Hide PWA banner in list view
    if (pwaBanner) pwaBanner.classList.add('hidden');

    // Set current filter from list state
    state.filter = list.filter || 'all';

    // Update filter button icon/style based on current mode
    updateFilterButtonUI();

    // Update title with color badge
    const colorBadge = `<span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: ${list.color}; margin-right: 0.5rem; border: 1px solid rgba(255,255,255,0.2);"></span>`;
    headerTitle.innerHTML = colorBadge + list.name;

    // Ensure refresh button stays visible in list view when user is signed in
    if (refreshButton) {
        if (state.userPicture || state.userEmail) refreshButton.classList.remove('hidden');
        else refreshButton.classList.add('hidden');
    }

    // Clear and rebuild content
    tasksContainer.innerHTML = '';

    const currentItems = state.items[listId] || [];

    // --- Completion Progress Bar (header) ---
    updateHeaderProgress(currentItems);

    if (currentItems.length === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.style = 'text-align: center; color: var(--text-secondary); padding: 2rem;';
        emptyMsg.textContent = 'Aucun élément. Ajoutez-en un !';
        tasksContainer.appendChild(emptyMsg);
    } else {
        // Find if there are any headers
        const hasHeaders = currentItems.some(i => i.isHeader);

        // ALWAYS add a top drop zone to allow moving items out of sections to the top
        const topDropZone = document.createElement('div');
        topDropZone.className = 'drop-zone-spacer';
        topDropZone.dataset.dropTargetIndex = 0;
        topDropZone.innerText = "Placer l'élément ici";
        setupBoundaryDragHandlers(topDropZone, 'top');
        tasksContainer.appendChild(topDropZone);

        let mainSectionId = null;
        let activeSectionCollapsed = false;
        let sectionCollapsed = false;

        currentItems.forEach((item, index) => {
            // Check if we need to add a spacer BEFORE a main header (to allow exiting sections)
            // No spacer before a sub-header to prevent root items between a section and its sub-section
            if (item.isHeader && !item.isSubHeader && index > 0) {
                const zone = document.createElement('div');
                zone.className = 'drop-zone-spacer';
                zone.dataset.dropTargetIndex = index;
                zone.innerText = "Placer l'élément ici";
                setupBoundaryDragHandlers(zone, 'middle');
                tasksContainer.appendChild(zone);
            }

            // Track Section Context
            if (item.isHeader && !item.isSubHeader) {
                mainSectionId = item.id;
            }

            // Apply filtering logic
            if (!item.isHeader) {
                // Filter by checkbox status
                if (state.filter === 'active' && item.done) return;
                if (state.filter === 'completed' && !item.done) return;

                // Filter by search query
                if (state.searchQuery && !item.text.toLowerCase().includes(state.searchQuery.toLowerCase())) {
                    return;
                }
            }

            const el = document.createElement('div');

            if (item.isHeader) {
                const isSub = item.isSubHeader;
                sectionCollapsed = collapsedSections.has(index);

                // Check if ANY parent section is collapsed
                if (item.parentId) {
                    let currentPid = item.parentId;
                    while (currentPid) {
                        const ancestor = currentItems.find(i => i.isHeader && i.id === currentPid);
                        if (!ancestor) break;
                        if (collapsedSections.has(currentItems.indexOf(ancestor))) return; // Hidden by ancestor collapse
                        currentPid = ancestor.parentId;
                    }
                }

                // Robust counting with explicit depth tracking
                let itemCount = 0;
                // depth 0 = Main Section, depth 1 = Sub Section
                const currentDepth = (isSub) ? 1 : 0;

                for (let i = index + 1; i < currentItems.length; i++) {
                    const subItem = currentItems[i];

                    // 1. Check for Standalone Divider (Items that break sections)
                    if (!subItem.isHeader) {
                        // If an item is standalone (no parent), it breaks ANY section scope
                        if (subItem.isStandalone || !subItem.parentId) {
                            break;
                        }
                    }

                    // 2. Check for Header Boundaries
                    if (subItem.isHeader) {
                        const subIsSub = subItem.isSubHeader || !!subItem.parentId;

                        if (currentDepth === 0) {
                            // We are Main Section
                            if (subIsSub) {
                                // It's a Sub-Header. Nesting. Continue loop.
                                continue;
                            } else {
                                // It's another Main Header. Stop.
                                break;
                            }
                        } else {
                            // We are Sub Section
                            // Any header (Main or Sub) stops us.
                            break;
                        }
                    }

                    // Content Check (Search)
                    if (state.searchQuery && !subItem.text.toLowerCase().includes(state.searchQuery.toLowerCase())) {
                        continue;
                    }

                    // Filter Check
                    const isDone = subItem.done === true || subItem.done === 'TRUE';
                    if (state.filter === 'active' && isDone) continue;
                    if (state.filter === 'completed' && !isDone) continue;

                    itemCount++;
                }


                el.className = 'list-header';
                if (isSub) el.classList.add('sub-header');
                el.draggable = true;
                el.dataset.index = index;
                el.dataset.isHeader = 'true';

                const arrowClass = sectionCollapsed ? 'collapsed' : '';

                // Effective color: item color OR parent color if null
                let effectiveColor = item.color;
                if (!effectiveColor && item.parentId) {
                    const parentHeader = currentItems.find(i => i.isHeader && i.id === item.parentId);
                    if (parentHeader) effectiveColor = parentHeader.color;
                }

                const bulletColor = effectiveColor || '#555';
                const colorBullet = `<span class="section-bullet" style="background: ${bulletColor};" onclick="event.stopPropagation(); window.openSectionColor(${index});"></span>`;

                const isSelected = state.selectedSectionId === item.id;
                const lockIcon = isSelected ? 'lock' : 'unlock';
                const lockTitle = isSelected ? 'Désélectionner la section' : 'Sélectionner pour ajouter ici';
                const lockColor = isSelected ? 'var(--accent-color)' : 'var(--text-secondary)';

                el.innerHTML = `
                    <div style="display: flex; align-items: center; flex: 1;">
                            <span class="drag-handle" onclick="event.stopPropagation();"></span>
                            <span class="collapse-arrow ${arrowClass}" data-section-index="${index}">
                                <i data-lucide="chevron-down" style="width: 20px; height: 20px;"></i>
                            </span>
                            ${colorBullet}
                            <span class="item-text">${item.text}</span>
                            <span class="section-count" style="margin-left: 0.5rem; font-size: 0.8rem; opacity: 0.8; font-weight: bold; color: var(--text-secondary);">(${itemCount})</span>
                            <button class="btn-icon-small btn-lock-section" title="${lockTitle}" style="margin-left: 0.5rem; color: ${lockColor};" onclick="event.stopPropagation();">
                                <i data-lucide="${lockIcon}" style="width: 18px; height: 18px;"></i>
                            </button>
                            <button class="btn-icon-small" title="Éditer le titre" onclick="event.stopPropagation(); startInlineEdit(this.closest('.list-header').querySelector('.item-text'), ${index})">
                                <i data-lucide="edit-3" style="width: 18px; height: 18px;"></i>
                            </button>
                    </div>
                    <div style="display: flex; gap: 0.25rem;">
                        <button class="btn-delete-item" onclick="event.stopPropagation(); deleteListItem(${index})">
                            <i data-lucide="x" style="width: 18px; height: 18px;"></i>
                        </button>
                    </div>
                `;

                // Add collapse/toggle event listeners
                const arrow = el.querySelector('.collapse-arrow');
                if (arrow) {
                    arrow.onclick = (e) => {
                        e.stopPropagation();
                        toggleSection(index);
                    };
                }

                // Make the entire header row toggle the section on click,
                // but ignore clicks that originate from the drag-handle, inline text edit, or buttons.
                try {
                    const headerRow = el.querySelector(':scope > div');
                    if (headerRow) {
                        // Apply selection class if this is the selected section
                        if (state.selectedSectionId === item.id) {
                            el.classList.add('selected-section');
                        }

                        headerRow.addEventListener('click', (e) => {
                            // Ignore clicks on interactive controls
                            if (e.target.closest('.item-text') || e.target.closest('.drag-handle') || e.target.closest('button') || e.target.closest('.collapse-arrow') || e.target.closest('.section-bullet')) return;
                            // If a drag is in progress, do not toggle
                            if (touchDragging || draggedElement) return;
                            e.stopPropagation();
                            toggleSection(index);
                        });

                        // New lock button logic
                        const lockBtn = headerRow.querySelector('.btn-lock-section');
                        if (lockBtn) {
                            lockBtn.addEventListener('click', (e) => {
                                e.stopPropagation();
                                if (state.selectedSectionId === item.id) {
                                    state.selectedSectionId = null;
                                } else {
                                    state.selectedSectionId = item.id;
                                }
                                renderList(state.activeListId);
                            });
                        }
                    }
                } catch (e) { }

                setupDragHandlers(el, index, true);
            } else {
                // Task Item
                // Check if hidden by ANY parent collapse
                if (item.parentId) {
                    let currentPid = item.parentId;
                    while (currentPid) {
                        const ancestor = currentItems.find(i => i.isHeader && i.id === currentPid);
                        if (!ancestor) break;
                        if (collapsedSections.has(currentItems.indexOf(ancestor))) return; // Hidden by ancestor
                        currentPid = ancestor.parentId;
                    }
                }

                el.className = 'glass-panel task-item';
                let parentColor = null;
                if (item.parentId) {
                    el.classList.add('in-section');
                    // Check if parent header is a sub-header
                    const parentHeader = currentItems.find(i => i.isHeader && i.id === item.parentId);
                    if (parentHeader) {
                        if (parentHeader.isSubHeader) el.classList.add('in-sub-section');
                        if (parentHeader.color) parentColor = parentHeader.color;
                    }
                }

                // Apply tint if parent or ancestor has color
                if (parentColor) {
                    el.style.backgroundColor = `${parentColor}10`; // 0x10 is ~6% opacity
                    el.style.borderLeftColor = parentColor;
                } else if (item.parentId) {
                    // Check grandparent color if parent is a subheader without color
                    const parentHeader = currentItems.find(i => i.isHeader && i.id === item.parentId);
                    if (parentHeader && parentHeader.parentId) {
                        const grandParent = currentItems.find(i => i.isHeader && i.id === parentHeader.parentId);
                        if (grandParent && grandParent.color) {
                            el.style.backgroundColor = `${grandParent.color}10`;
                            el.style.borderLeftColor = grandParent.color;
                        }
                    }
                }
                if (item.done) el.className += ' done';
                el.draggable = true;
                el.dataset.index = index;
                el.dataset.isHeader = 'false';

                const checkIcon = item.done ? '<i data-lucide="check" style="width:24px; color: white;"></i>' : '';

                el.innerHTML = `
                    <span class="drag-handle"></span>
                    <div class="task-checkbox" onclick="event.stopPropagation(); toggleItem('${item.id}')">
                        ${checkIcon}
                    </div>
                    <span class="item-text" style="flex: 1" onclick="event.stopPropagation(); startInlineEdit(this, ${index})">${item.text}</span>
                    <button class="btn-delete-item" onclick="event.stopPropagation(); deleteListItem(${index})">
                        <i data-lucide="x" style="width: 18px; height: 18px;"></i>
                    </button>
                `;

                setupDragHandlers(el, index, false);
            }

            tasksContainer.appendChild(el);
        });

        // Always add a spacer at the very end
        const bottomZone = document.createElement('div');
        bottomZone.className = 'drop-zone-spacer';
        bottomZone.dataset.dropTargetIndex = currentItems.length;
        bottomZone.innerText = "Placer l'élément ici";
        setupBoundaryDragHandlers(bottomZone, 'bottom');
        tasksContainer.appendChild(bottomZone);
    }

    lucide.createIcons();
}

// --- Logic Functions ---

function openList(id) {
    state.activeListId = id;
    state.view = 'list';
    state.selectedSectionId = null; // Reset selection on list change
    renderList(id);
    // push history state for this list view
    pushAppState({ app: 'oslist', view: 'list', id: id });
}

// Refresh app by clearing caches and unregistering service workers, then reload.
async function refreshApp() {
    try {
        // Clear Cache Storage entries
        if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map(k => caches.delete(k)));
            console.log('Cleared CacheStorage entries:', keys);
        }

        // Unregister service workers
        if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
            const regs = await navigator.serviceWorker.getRegistrations();
            await Promise.all(regs.map(r => r.unregister()));
            console.log('Unregistered service workers');
        }

        // Optionally clear some local caches used by app (not removing auth tokens)
        // localStorage.clear(); // <-- commented out to avoid logging user out

        // Force reload
        location.reload();
    } catch (e) {
        console.error('Failed to refresh app:', e);
        try { location.reload(); } catch (err) { }
    }
}

// Push history state when navigating within the app so browser back stays inside the app
function pushAppState(stateObj) {
    try {
        history.pushState(stateObj, '', '');
    } catch (e) {
        // ignore
    }
}

function deleteListItem(index) {
    const listId = state.activeListId;
    if (!listId && listId !== 0) return;

    const items = state.items[listId];
    if (!items || !items[index]) return;

    items.splice(index, 1);
    renderList(listId);
    syncOrderToSheet(listId);
}

function startInlineEdit(element, index) {
    // Prevent re-triggering if already editing
    if (element.querySelector('input')) return;

    const originalText = element.innerText;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = originalText;
    input.className = 'inline-edit-input';

    // Stop propagation of clicks on the input so they don't trigger the parent span's onclick
    input.onclick = (e) => e.stopPropagation();
    input.onmousedown = (e) => e.stopPropagation();

    // Save function
    const save = () => {
        const newText = input.value.trim();
        if (newText && newText !== originalText) {
            const listId = state.activeListId;
            state.items[listId][index].text = newText;
            syncOrderToSheet(listId);
        }
        renderList(state.activeListId);
    };

    input.onkeydown = (e) => {
        if (e.key === 'Enter') save();
        if (e.key === 'Escape') renderList(state.activeListId);
    };

    input.onblur = save;

    element.innerHTML = '';
    element.appendChild(input);
    input.focus();
    // Removed input.select() to allow users to click and place the cursor where they want
}

function goHome() {
    state.activeListId = null;
    state.view = 'home';
    state.searchQuery = '';
    state.selectedSectionId = null; // Reset selection
    if (searchInput) {
        searchInput.value = '';
        searchInput.style.width = '100px';
    }
    renderHome();
    // push home state so browser back returns here first
    pushAppState({ app: 'oslist', view: 'home' });
}

function toggleItem(itemId) {
    const listId = state.activeListId;
    const items = state.items[listId];
    const item = items.find(i => i.id === itemId);

    if (item) {
        item.done = !item.done;
        renderList(listId); // Re-render to update UI

        // Sync with Cloud
        toggleItemInSheet(listId, itemId, item.done);
    }
}

function addItem() {
    const text = newTaskInput.value.trim();
    if (!text) return;

    const listId = state.activeListId;
    const isHeader = state.isHeaderMode;

    let parentId = null;
    let isStandalone = true;
    const items = state.items[listId] || [];

    if (!isHeader) {
        if (state.selectedSectionId) {
            // Add to selected section
            parentId = state.selectedSectionId;
            isStandalone = false;
        } else {
            // Standalone (at the bottom)
            parentId = null;
            isStandalone = true;
        }
    }

    const newItem = {
        id: generateId(),
        text: text,
        done: false,
        isHeader: isHeader,
        isStandalone: isStandalone,
        parentId: parentId
    };

    if (!state.items[listId]) state.items[listId] = [];

    // Insertion Logic — always use syncOrderToSheet to persist full metadata
    if (parentId) {
        // Find the selected section and insert after all its current children
        const sectionIndex = items.findIndex(i => i.id === parentId);
        if (sectionIndex !== -1) {
            let insertIndex = sectionIndex + 1;
            while (insertIndex < items.length) {
                const current = items[insertIndex];
                if (current.isHeader || current.isStandalone) break;
                insertIndex++;
            }
            state.items[listId].splice(insertIndex, 0, newItem);
        } else {
            state.items[listId].push(newItem);
        }
    } else {
        // Bottom of list
        state.items[listId].push(newItem);
    }
    // Single sync call handles all cases with proper metadata
    syncOrderToSheet(listId);

    newTaskInput.value = '';
    if (state.isHeaderMode) toggleHeaderModeState();

    renderList(listId);
}

function toggleHeaderModeState() {
    state.isHeaderMode = !state.isHeaderMode;
    if (state.isHeaderMode) {
        toggleHeaderMode.style.color = 'var(--accent-color)';
        toggleHeaderMode.style.background = 'rgba(59, 130, 246, 0.1)';
        newTaskInput.placeholder = "Titre de section...";
    } else {
        toggleHeaderMode.style.color = 'var(--text-secondary)';
        toggleHeaderMode.style.background = 'transparent';
        newTaskInput.placeholder = "Ajouter un élément...";
    }
}

function openOptions(e, id, name) {
    if (e) e.stopPropagation(); // Prevent opening the list
    currentListId = id;
    currentListName = name;

    modalTitle.innerText = name;
    modalDesc.innerText = "Options pour la liste";

    // Explicitly unhide if it was hidden
    modal.style.display = 'flex'; // Ensure flex layout
    modal.classList.remove('hidden');
}

function closeOptions() {
    modal.classList.add('hidden');
    modal.style.display = ''; // Reset to css rule
    currentListId = null;
    currentListName = "";
}

function toggleSection(sectionIndex) {
    if (collapsedSections.has(sectionIndex)) {
        collapsedSections.delete(sectionIndex);
    } else {
        collapsedSections.add(sectionIndex);
    }
    renderList(state.activeListId);
}

function openSectionOptions(index) {
    const item = state.items[state.activeListId][index];
    currentListId = state.activeListId;

    modalTitle.innerText = item.text;
    modalDesc.innerText = "Options pour la section";

    // Customize modal for section
    btnRename.onclick = () => {
        const newName = prompt("Nouveau nom :", item.text);
        if (newName && newName !== item.text) {
            item.text = newName;
            renderList(state.activeListId);
            syncOrderToSheet(state.activeListId);
        }
        closeOptions();
    };

    btnColor.onclick = () => {
        colorTarget = { type: 'section', index: index };
        openColorModal();
    };

    btnDelete.onclick = () => {
        if (confirm("Supprimer cette section et tout son contenu ?")) {
            deleteListItem(index);
            closeOptions();
        }
    };

    // Hide duplicate for section
    btnDuplicate.classList.add('hidden');
    btnLogout.classList.add('hidden');

    modal.style.display = 'flex';
    modal.classList.remove('hidden');
}

function updateSectionColor(index, color) {
    const listId = state.activeListId;
    const item = state.items[listId][index];
    if (item) {
        item.color = color;
        renderList(listId);
        syncOrderToSheet(listId);
    }
}

function setupDragHandlers(element, index, isHeader) {
    element.addEventListener('dragstart', (e) => {
        // Ensure any existing touch ghost from prior touch interactions is cleared
        try { clearTouchGhost(); } catch (err) { }
        touchDragging = false;
        draggedElement = element;
        draggedIndex = index;
        element.classList.add('dragging');
        tasksContainer.classList.add('dragging-active'); // Show all spacers
        e.dataTransfer.effectAllowed = 'move';

        // Prevent native touch scrolling while dragging so our auto-scroll can run
        try {
            if (tasksContainer) tasksContainer.style.touchAction = 'none';
            // Avoid toggling document.body overflow globally — leave body scrolling untouched
        } catch (err) { }

        // If dragging a header, collapse ALL sections to prevent dropping inside them
        // This simplifies the structure to a flat list of headers + collapsed items
        if (isHeader) {
            // Find all indices of headers
            const listId = state.activeListId;
            const items = state.items[listId];

            // Loop through all items and ADD to collapsed set if it's a header
            items.forEach((item, idx) => {
                if (item.isHeader && !item.isSubHeader) {
                    collapsedSections.add(idx);
                }
            });

            // Visually hide children tasks to prevent dropping inside
            // We select all task-items and hide them, simulating a full collapse view
            // This does NOT break the drag of the header itself.
            requestAnimationFrame(() => {
                // Select all tasks that are NOT headers
                const allTasks = tasksContainer.querySelectorAll('.task-item:not([data-is-header="true"])');
                allTasks.forEach(t => t.classList.add('hidden'));

                // Rotate all arrows
                const allArrows = tasksContainer.querySelectorAll('.collapse-arrow');
                allArrows.forEach(a => a.classList.add('collapsed'));
            });
        }
        // Suppress the browser's native drag image which can linger visually
        try {
            if (e && e.dataTransfer && _blankDragImage) {
                e.dataTransfer.setDragImage(_blankDragImage, 0, 0);
            }
        } catch (err) { }
    });

    element.addEventListener('dragend', (e) => {
        element.classList.remove('dragging');
        tasksContainer.classList.remove('dragging-active');
        document.querySelectorAll('.drag-over, .drag-over-header, .drag-over-boundary, .drag-over-top, .drag-over-bottom').forEach(el => {
            el.classList.remove('drag-over');
            el.classList.remove('drag-over-header');
            el.classList.remove('drag-over-boundary');
            el.classList.remove('drag-over-top');
            el.classList.remove('drag-over-bottom');
        });
        stopAutoScroll();
        try {
            if (tasksContainer) tasksContainer.style.touchAction = 'auto';
            document.body.style.overflow = '';
        } catch (err) { }
        // Ensure any touch ghost from mobile interaction is removed
        try { clearTouchGhost(); } catch (e) { }
        // Reset drag state to avoid lingering ghosts or references
        touchDragging = false;
        if (draggedElement) draggedElement.classList.remove('dragging');
        draggedElement = null;
        draggedIndex = null;
    });

    element.addEventListener('dragover', (e) => {
        const draggingHeader = draggedElement && draggedElement.dataset && draggedElement.dataset.isHeader === 'true';

        // Always handle auto-scroll while dragging (both items and headers)
        handleAutoScrollDuringDrag(e);

        // If a section (header) is being dragged, do not show placement lines
        if (draggingHeader) {
            return; // only boundary spacers accept section drops; auto-scroll handled above
        }

        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        if (draggedElement !== element) {
            const rect = element.getBoundingClientRect();
            const relY = e.clientY - rect.top;
            const isTop = relY < (rect.height / 2);

            // Clean up strictly
            element.classList.remove('drag-over-top', 'drag-over-bottom', 'drag-over-header');

            if (element.dataset.isHeader === 'true' && draggedElement.dataset.isHeader === 'false') {
                // Dragging Item ON Header
                if (isTop) {
                    element.classList.add('drag-over-top');
                } else {
                    element.classList.add('drag-over-bottom');
                }
            } else {
                // Item/Item or Header/Header
                if (isTop) {
                    element.classList.add('drag-over-top');
                } else {
                    element.classList.add('drag-over-bottom');
                }
            }
        }
    });

    element.addEventListener('dragleave', (e) => {
        element.classList.remove('drag-over', 'drag-over-header', 'drag-over-top', 'drag-over-bottom');
        stopAutoScroll();
    });

    element.addEventListener('drop', (e) => {
        e.preventDefault();
        element.classList.remove('drag-over', 'drag-over-header', 'drag-over-top', 'drag-over-bottom');

        if (draggedElement === element) return;

        const rect = element.getBoundingClientRect();
        const relY = e.clientY - rect.top;
        const insertAfter = relY >= (rect.height / 2);

        const dropIndex = parseInt(element.dataset.index);
        const dragIndex = draggedIndex;

        // Visual check: if we drop exactly where we are, do nothing
        // (Logic below handles indices, but this saves processing)
        if (dragIndex === dropIndex && !insertAfter) return; // Drop on self top
        if (dragIndex === dropIndex && insertAfter) return;  // Drop on self bottom

        const listId = state.activeListId;
        const items = [...state.items[listId]];
        const movedItem = items[dragIndex];

        // 1. Determine Target Index
        let targetIndex = dropIndex;
        if (insertAfter) targetIndex++;

        // 2. Adjust for Removal of dragged item
        // If we remove the item from a position BEFORE the target, the target index shifts down
        if (dragIndex < targetIndex) {
            targetIndex--;
        }

        // Logic split: Moving Section vs Moving Item
        if (movedItem.isHeader) {
            // -- SECTION MOVE --
            // Collect the header and its contiguous children as a block.
            const sectionToMove = [];
            let i = dragIndex;

            // First item is the header itself
            const movingHeader = items[i++];
            sectionToMove.push(movingHeader);

            // Collect children depending on header depth.
            if (!movingHeader.isSubHeader) {
                // Main header: include everything until the next main header or a standalone item.
                while (i < items.length) {
                    const current = items[i];
                    if ((current.isHeader && !current.isSubHeader) || current.isStandalone) break;
                    sectionToMove.push(items[i++]);
                }
            } else {
                // Sub-header: include until the next header (sub or main).
                while (i < items.length) {
                    const current = items[i];
                    if (current.isHeader) break;
                    sectionToMove.push(items[i++]);
                }
            }

            // Safety: Don't drop inside yourself
            if (dropIndex >= dragIndex && dropIndex < dragIndex + sectionToMove.length) return;

            // Remove the block from the array
            items.splice(dragIndex, sectionToMove.length);

            // Recalculate real target index and insert the whole block intact
            let realTargetIndex = dropIndex;
            if (insertAfter) realTargetIndex++;
            if (dragIndex < realTargetIndex) {
                realTargetIndex -= sectionToMove.length;
            }
            items.splice(realTargetIndex, 0, ...sectionToMove);

            // Do NOT forcibly change header/subheader flags or parentId here; keep original structure

        } else {
            // -- ITEM MOVE --
            const targetEl = items[dropIndex]; // The element we dropped ON

            // Remove
            items.splice(dragIndex, 1);

            // Insert
            items.splice(targetIndex, 0, movedItem);

            // Update Parent ID based on Drop Target
            if (targetEl.isHeader && insertAfter) {
                // Dropped explicitly BELOW a header -> Enters that section
                movedItem.parentId = targetEl.id;
                movedItem.isStandalone = false;
            } else if (targetEl.isHeader && !insertAfter) {
                // Dropped explicitly ABOVE a header -> Joins previous section
                movedItem.parentId = targetEl.parentId; // Header's parent (null if main)
                movedItem.isStandalone = !movedItem.parentId;
            } else {
                // Dropped on an Item (Top or Bottom) -> Adopts that Item's parent
                movedItem.parentId = targetEl.parentId;
                movedItem.isStandalone = targetEl.isStandalone;
            }
        }

        state.items[listId] = items;
        renderList(listId);
        syncOrderToSheet(listId);
        stopAutoScroll();
    });

    // Touch: allow immediate drag start when touching the drag handle (six dots)
    try {
        const handle = element.querySelector && element.querySelector('.drag-handle');
        if (handle) {
            handle.addEventListener('touchstart', (e) => {
                // start drag immediately from handle on touch
                if (!e.touches || !e.touches[0]) return;
                const t = e.touches[0];
                touchStartX = t.clientX; touchStartY = t.clientY;
                e.stopPropagation();
                e.preventDefault();
                if ("vibrate" in navigator) navigator.vibrate(50);
                beginDragFromTarget(handle);
            }, { passive: false });

            handle.addEventListener('pointerdown', (e) => {
                if (e.pointerType === 'touch') {
                    touchStartX = e.clientX; touchStartY = e.clientY;
                    e.stopPropagation();
                    if ("vibrate" in navigator) navigator.vibrate(50);
                    beginDragFromTarget(handle);
                }
            }, { passive: false });
        }
    } catch (e) { }
}

function setupBoundaryDragHandlers(element, position) {
    if (!element) return;

    element.addEventListener('dragover', (e) => {
        if (!draggedElement) return;
        // Auto-scroll while dragging
        handleAutoScrollDuringDrag(e);
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        element.classList.add('drag-over-boundary');
    });

    element.addEventListener('dragleave', () => {
        element.classList.remove('drag-over-boundary');
        stopAutoScroll();
    });

    element.addEventListener('drop', (e) => {
        if (!draggedElement) return;
        e.preventDefault();
        element.classList.remove('drag-over-boundary');

        stopAutoScroll();

        const listId = state.activeListId;
        const dragIndex = draggedIndex;
        const items = [...state.items[listId]];

        // Handle moving entire section OR single item
        const isHeaderMove = draggedElement.dataset.isHeader === 'true';
        let itemsToMove = [];

        if (isHeaderMove) {
            let i = dragIndex;
            const movingHeader = items[i++];
            itemsToMove.push(movingHeader);

            if (!movingHeader.isSubHeader) {
                // Main header: include everything until the next main header or standalone
                while (i < items.length) {
                    const current = items[i];
                    if ((current.isHeader && !current.isSubHeader) || current.isStandalone) break;
                    itemsToMove.push(items[i++]);
                }
            } else {
                // Sub-header: include until the next header
                while (i < items.length) {
                    const current = items[i];
                    if (current.isHeader) break;
                    itemsToMove.push(items[i++]);
                }
            }

            items.splice(dragIndex, itemsToMove.length);
            // Preserve original header/subheader flags and parent relationships; do not force flattening
        } else {
            const [item] = items.splice(dragIndex, 1);
            item.isStandalone = true;
            item.parentId = null;
            item.isSubHeader = false;
            itemsToMove = [item];
        }

        const targetIndexAttr = element.dataset.dropTargetIndex;
        let targetIndex = targetIndexAttr !== undefined ? parseInt(targetIndexAttr) : items.length;
        console.log(`Dropping ${isHeaderMove ? 'section' : 'item'} onto spacer at index ${targetIndex}`);

        // Adjust for removal
        if (isHeaderMove) {
            if (dragIndex < targetIndex) {
                targetIndex -= itemsToMove.length;
            }
        } else {
            if (dragIndex < targetIndex) targetIndex--;
        }

        console.log(`- Final target position: ${targetIndex}`);
        items.splice(targetIndex, 0, ...itemsToMove);

        state.items[listId] = items;
        renderList(listId);
        syncOrderToSheet(listId);
    });
}

async function syncOrderToSheet(listId) {
    if (!accessToken) return;

    const list = state.lists.find(l => l.id === listId);
    if (!list) return;

    const items = state.items[listId];
    const values = items.map((item, idx) => {
        let meta = [];

        // Always save UID for every item (header or not) so IDs are stable across reloads
        if (item.id) meta.push(`UID:${item.id}`);

        if (item.isStandalone) meta.push("STANDALONE");

        // Recalculate closest preceding header for PID/SECTION
        let currentHeaderId = null;
        for (let i = idx - 1; i >= 0; i--) {
            if (items[i].isHeader) {
                currentHeaderId = items[i].id;
                break;
            }
        }

        if (!item.isHeader) {
            if (!item.isStandalone) {
                item.parentId = currentHeaderId;
            } else {
                item.parentId = null;
            }
            if (item.parentId) meta.push(`PID:${item.parentId}`);

            // Add explicit SECTION name metadata to make ownership clear in Sheets
            const parentHeader = items.find(h => h.isHeader && h.id === item.parentId);
            if (parentHeader && parentHeader.text) {
                // Replace any pipe chars to avoid breaking our meta format
                const safeName = parentHeader.text.replace(/\|/g, ' ');
                meta.push(`SECTION:${safeName}`);
            }
        } else {
            item.parentId = null;
        }

        if (item.color) meta.push(`COLOR:${item.color}`);

        let colC = meta.join("|");
        if (idx === 0) {
            colC = `FILTER:${list.filter}${colC ? "|" + colC : ""}`;
        }
        return [
            item.text,
            item.isHeader ? 'HEADER' : (item.done ? 'TRUE' : 'FALSE'),
            colC,
            item.lastModifier || ""
        ];
    });

    try {
        // Clear and rewrite the entire sheet A:D
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(list.name)}!A:D:clear`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(list.name)}!A:D?valueInputOption=USER_ENTERED`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ values })
        });

        console.log('Order synced to sheet');
    } catch (e) {
        console.error('Failed to sync order:', e);
    }
}

// --- Event Listeners ---

if (backButton) backButton.addEventListener('click', (e) => { if (e && e.preventDefault) e.preventDefault(); e.stopPropagation(); goHome(); });

if (addTaskButton) addTaskButton.addEventListener('click', (e) => {
    e.preventDefault();
    addItem();
});

if (toggleHeaderMode) toggleHeaderMode.addEventListener('click', toggleHeaderModeState);

if (newTaskInput) newTaskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addItem();
    }
});

if (fab) fab.addEventListener('click', () => {
    const name = prompt("Nom de la nouvelle liste ?");
    if (name) {
        // Construct local optimistic list
        // Note: Real ID comes from sheet, but we need one now.
        // We'll just trigger the API create and wait for refresh actually, 
        // because we need the SheetID for everything else.
        createListInSheet(name);
    }
});

if (loginButton) loginButton.addEventListener('click', handleAuthClick);

// Modal Listeners
if (btnCancel) btnCancel.onclick = closeOptions;
if (modal) modal.onclick = (e) => {
    if (e.target === modal) closeOptions();
};

if (btnRename) btnRename.onclick = () => {
    const newName = prompt("Nouveau nom :", currentListName);
    if (newName && newName !== currentListName) {
        renameSheet(currentListId, newName);
        closeOptions();
    }
};

if (btnDuplicate) btnDuplicate.onclick = () => {
    if (confirm("Dupliquer cette liste ?")) {
        duplicateSheet(currentListId);
        closeOptions();
    }
};

if (btnDelete) btnDelete.onclick = () => {
    if (confirm("Voulez-vous vraiment supprimer cette liste ? Cette action est irréversible.")) {
        deleteSheet(currentListId);
        closeOptions();
    }
};

if (btnColor) btnColor.onclick = () => {
    openColorModal();
};

if (btnLogout) btnLogout.onclick = handleLogout;
if (btnLogoutHeader) btnLogoutHeader.onclick = handleLogout;

// Avatar / Menu Logic
if (userAvatar) {
    userAvatar.addEventListener('click', (e) => {
        e.stopPropagation();
        if (userMenu) userMenu.classList.toggle('hidden');
    });
}
if (userAvatarFallback) {
    userAvatarFallback.addEventListener('click', (e) => {
        e.stopPropagation();
        if (userMenu) userMenu.classList.toggle('hidden');
    });
}
// Close menu when clicking outside
document.addEventListener('click', (e) => {
    if (userMenu && !userMenu.classList.contains('hidden')) {
        if (!userAvatar.contains(e.target) && !userMenu.contains(e.target) && !userAvatarFallback.contains(e.target)) {
            userMenu.classList.add('hidden');
        }
    }
});

if (btnColorCancel) btnColorCancel.onclick = closeColorModal;
if (colorModal) colorModal.onclick = (e) => {
    if (e.target === colorModal) closeColorModal();
};

if (filterButton) filterButton.addEventListener('click', () => {
    if (state.filter === 'all') state.filter = 'active';
    else if (state.filter === 'active') state.filter = 'completed';
    else state.filter = 'all';

    // Save to local logic
    const list = state.lists.find(l => l.id === state.activeListId);
    if (list) {
        list.filter = state.filter;
        saveListFilter(list.name, state.filter);
    }

    renderList(state.activeListId);
});

if (settingsButton) settingsButton.addEventListener('click', () => {
    console.log('Settings clicked, state:', state.view, state.activeListId);
    // Only open options if we're in a list view
    // Check for null/undefined explicitly because ID can be 0
    if (state.view === 'list' && state.activeListId !== null && state.activeListId !== undefined) {
        const list = state.lists.find(l => l.id === state.activeListId);
        console.log('Found list:', list);
        if (list) {
            openOptions(null, list.id, list.name);
        }
    } else {
        console.log('Not in list view or no active list');
    }
});

if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        renderList(state.activeListId);
    });

    // Focus effect
    searchInput.addEventListener('focus', () => {
        searchInput.style.width = '160px';
    });
    searchInput.addEventListener('blur', () => {
        if (!searchInput.value) {
            searchInput.style.width = '100px';
        }
    });
}

// --- Init ---
window.onload = function () {
    // Wait for Google Script to load then init
    // Or just call renderHome to show Login button
    initTokenClient();
    renderHome();
    initColorPicker();

    // Initialize settings button as hidden
    if (settingsButton) {
        settingsButton.classList.add('hidden');
    }

    // --- Global drag listeners to support auto-scroll on desktop (PC) ---
    if (tasksContainer) {
        // While dragging, ensure container-level dragover triggers auto-scroll even when not over an item
        tasksContainer.addEventListener('dragover', (e) => {
            if (!draggedElement) return;
            handleAutoScrollDuringDrag(e);
        });

        tasksContainer.addEventListener('dragleave', (e) => {
            stopAutoScroll();
        });

        tasksContainer.addEventListener('drop', (e) => {
            stopAutoScroll();
            try { clearTouchGhost(); } catch (e) { }
            touchDragging = false;
            draggedElement = null;
            draggedIndex = null;
        });
    }

    // Document-level handlers to catch drag movements outside item elements on PC
    document.addEventListener('dragover', (e) => {
        if (!draggedElement) return;
        handleAutoScrollDuringDrag(e);
    });
    document.addEventListener('dragleave', () => stopAutoScroll());
    document.addEventListener('drop', (e) => { stopAutoScroll(); try { clearTouchGhost(); } catch (err) { } touchDragging = false; draggedElement = null; draggedIndex = null; });
    document.addEventListener('dragend', (e) => { try { clearTouchGhost(); } catch (err) { } touchDragging = false; draggedElement = null; draggedIndex = null; stopAutoScroll(); });

    // Extra safeguard: if a mousemove happens on desktop and a touch ghost remains (from hybrid flow), clear it.
    document.addEventListener('mousemove', (e) => {
        try {
            if (typeof touchDragging === 'undefined' || touchDragging) return;
            if (touchGhost) {
                clearTouchGhost();
            }
        } catch (err) { }
    });

    // Initialize history state for in-app navigation
    try {
        history.replaceState({ app: 'oslist', view: 'home' }, '', '');
    } catch (e) { }

    window.addEventListener('popstate', (e) => {
        const s = e.state;
        if (!s || s.app !== 'oslist') {
            // If popstate is not ours, force app to home and push an app state to keep user inside
            goHome();
            try { history.pushState({ app: 'oslist', view: 'home' }, '', ''); } catch (err) { }
            return;
        }

        if (s.view === 'home') goHome();
        else if (s.view === 'list') {
            // avoid double-push since openList also pushes
            state.activeListId = s.id;
            state.view = 'list';
            renderList(s.id);
        }
    });

    // Initialize touch variables (already declared globally)
    touchDragging = false;
    touchStartX = 0; touchStartY = 0;
    touchLastX = 0; touchLastY = 0;
    touchGhost = null;
    touchLongPressTimer = null;

    // Simple toast helper (disabled in production to avoid debug popups)
    function showToast(msg, duration = 2000) {
        // intentionally no-op to remove debug popups; use console.log for debugging if needed
        // console.log('Toast:', msg);
    }

    // persistent drop result panel removed (debug overlay)

    function beginDragFromTarget(target) {
        try {
            const el = target.closest && target.closest('[draggable]');
            if (!el) return;
            draggedElement = el;
            draggedIndex = parseInt(el.dataset.index);
            touchDragging = true;
            el.classList.add('dragging');
            if (tasksContainer) tasksContainer.classList.add('dragging-active');
            try { if (tasksContainer) tasksContainer.style.touchAction = 'none'; } catch (err) { }
            // create floating ghost to follow finger for better UX on mobile
            try { createTouchGhost(el, touchStartX, touchStartY); } catch (e) { }

        } catch (err) { }
    }

    function createTouchGhost(el, clientX, clientY) {
        clearTouchGhost();
        try {
            const rect = el.getBoundingClientRect();
            const ghost = el.cloneNode(true);
            ghost.classList.add('touch-ghost');
            ghost.style.position = 'fixed';
            ghost.style.left = (clientX - rect.width / 2) + 'px';
            ghost.style.top = (clientY - rect.height / 2) + 'px'; // Centered under finger
            ghost.style.width = rect.width + 'px';
            ghost.style.height = rect.height + 'px';
            ghost.style.pointerEvents = 'none';
            ghost.style.zIndex = 9999;
            // Removed inline opacity/transform to let CSS class handle it
            document.body.appendChild(ghost);
            touchGhost = { el: ghost, w: rect.width, h: rect.height };
        } catch (e) { touchGhost = null; }
    }

    function moveTouchGhost(clientX, clientY) {
        if (!touchGhost || !touchGhost.el) return;
        try {
            const left = (clientX - touchGhost.w / 2);
            const top = (clientY - touchGhost.h / 2); // Centered under finger
            touchGhost.el.style.left = left + 'px';
            touchGhost.el.style.top = top + 'px';
        } catch (e) { }
    }

    function clearTouchGhost() {
        if (!touchGhost) return;
        try { if (touchGhost.el && touchGhost.el.parentNode) touchGhost.el.parentNode.removeChild(touchGhost.el); } catch (e) { }
        touchGhost = null;
    }

    // Touch drop indicator state
    let currentTouchDrop = null;

    function findDropAtPoint(x, y) {
        const el = document.elementFromPoint(x, y);
        if (!el) return null;
        const spacer = el.closest && el.closest('.drop-zone-spacer');
        if (spacer && spacer.dataset && spacer.dataset.dropTargetIndex !== undefined) {
            return { type: 'spacer', index: parseInt(spacer.dataset.dropTargetIndex), element: spacer };
        }
        const itemEl = el.closest && el.closest('[data-index]');
        if (itemEl) {
            const rect = itemEl.getBoundingClientRect();
            const relY = y - rect.top;
            const insertAfter = relY >= (rect.height / 2);
            return { type: 'item', index: parseInt(itemEl.dataset.index), element: itemEl, insertAfter };
        }
        return null;
    }

    function clearTouchIndicator() {
        if (!currentTouchDrop) return;
        try {
            if (currentTouchDrop.type === 'spacer') currentTouchDrop.element.classList.remove('drag-over-boundary');
            else if (currentTouchDrop.type === 'item') {
                currentTouchDrop.element.classList.remove('drag-over-top');
                currentTouchDrop.element.classList.remove('drag-over-bottom');
            }
        } catch (e) { }
        currentTouchDrop = null;
    }

    function showTouchIndicator(info) {
        clearTouchIndicator();
        if (!info) return;
        try {
            if (info.type === 'spacer') info.element.classList.add('drag-over-boundary');
            else if (info.type === 'item') {
                if (info.insertAfter) info.element.classList.add('drag-over-bottom');
                else info.element.classList.add('drag-over-top');
            }
            currentTouchDrop = info;
        } catch (e) { }
    }

    async function performTouchDrop() {
        // Ensure we have a drop target; try fallbacks when missing so releases still drop
        if (!currentTouchDrop) {
            // Try last known touch coordinates
            if (typeof touchLastX === 'number' && typeof touchLastY === 'number') {
                const fallback = findDropAtPoint(touchLastX, touchLastY);
                if (fallback) currentTouchDrop = fallback;
            }
        }

        if (!currentTouchDrop && draggedElement) {
            // As a last resort, try center of dragged element
            try {
                const r = draggedElement.getBoundingClientRect();
                const fx = r.left + (r.width / 2);
                const fy = r.top + (r.height / 2);
                const fallback = findDropAtPoint(fx, fy);
                if (fallback) currentTouchDrop = fallback;
            } catch (e) { }
        }

        if (!currentTouchDrop) {
            // final fallback: drop at end of list
            const listId = state.activeListId;
            if (listId === null || listId === undefined) return;
            currentTouchDrop = { type: 'spacer', index: (state.items[listId] || []).length, element: null };
        }

        try { console.log('performTouchDrop resolved target', currentTouchDrop, 'draggedIndex=', draggedIndex); } catch (e) { }
        try { showToast(`Cible: ${currentTouchDrop.type} @ ${currentTouchDrop.index}`); } catch (e) { }
        const listId = state.activeListId;
        if (listId === null || listId === undefined) return;
        const originalItems = [...state.items[listId]];
        const items = [...originalItems];
        const dragIndex = draggedIndex;
        if (dragIndex === null || dragIndex === undefined) return;

        const movedItem = items[dragIndex];

        if (movedItem.isHeader) {
            // Only allow header moves on spacers
            if (currentTouchDrop.type !== 'spacer') {
                clearTouchIndicator();
                return;
            }

            // collect header block
            const sectionToMove = [];
            let i = dragIndex;
            const movingHeader = items[i++];
            sectionToMove.push(movingHeader);
            if (!movingHeader.isSubHeader) {
                while (i < items.length) {
                    const current = items[i];
                    if ((current.isHeader && !current.isSubHeader) || current.isStandalone) break;
                    sectionToMove.push(items[i++]);
                }
            } else {
                while (i < items.length) {
                    const current = items[i];
                    if (current.isHeader) break;
                    sectionToMove.push(items[i++]);
                }
            }

            // Remove block
            items.splice(dragIndex, sectionToMove.length);

            let targetIndex = currentTouchDrop.index;
            if (dragIndex < targetIndex) targetIndex -= sectionToMove.length;
            items.splice(targetIndex, 0, ...sectionToMove);

        } else {
            // item move
            // Determine parent candidate from ORIGINAL items (before mutation)
            let parentCandidate = null;
            if (currentTouchDrop.type === 'item') {
                parentCandidate = originalItems[currentTouchDrop.index];
            } else if (currentTouchDrop.type === 'spacer') {
                let look = currentTouchDrop.index - 1;
                while (look >= 0) {
                    const candidate = originalItems[look];
                    if (candidate && candidate.isHeader) { parentCandidate = candidate; break; }
                    look--;
                }
            }

            // show candidate info before mutation
            try {
                const candText = parentCandidate ? (parentCandidate.text || '[header]') : 'NONE';
                const candId = parentCandidate ? parentCandidate.id : 'null';
                showToast(`Parent ciblé: ${candText}`);
                // debug overlay removed; keep lightweight toast
                console.log('parentCandidate before move', { id: candId, text: candText });
            } catch (e) { }

            // If parentCandidate points to the moved item itself (dropping around itself), find previous header
            if (parentCandidate && parentCandidate.id === movedItem.id) {
                let look = currentTouchDrop.index - 1;
                while (look >= 0) {
                    const candidate = originalItems[look];
                    if (candidate && candidate.isHeader && candidate.id !== movedItem.id) { parentCandidate = candidate; break; }
                    look--;
                }
                if (look < 0) parentCandidate = null;
            }

            // compute insertion index in the mutated items array
            let targetIndex = currentTouchDrop.index;
            if (currentTouchDrop.type === 'item') {
                if (currentTouchDrop.insertAfter) targetIndex++;
            }
            if (dragIndex < targetIndex) targetIndex--;

            // remove and insert
            items.splice(dragIndex, 1);
            items.splice(targetIndex, 0, movedItem);

            // Apply parent from candidate
            if (parentCandidate) {
                if (parentCandidate.isHeader) movedItem.parentId = parentCandidate.id;
                else movedItem.parentId = parentCandidate.parentId || null;
            } else {
                movedItem.parentId = null;
            }
            movedItem.isStandalone = !movedItem.parentId;
            movedItem.color = null; // allow inheritance
            // debug show moved item parent state
            try { showToast(`Après: parentId=${movedItem.parentId ? movedItem.parentId : 'null'}`); console.log('movedItem after parent set', { id: movedItem.id, parentId: movedItem.parentId, isStandalone: movedItem.isStandalone }); } catch (e) { }
        }

        state.items[listId] = items;
        try { console.log('performTouchDrop after move, new order:', items.map(i => i.text)); } catch (e) { }
        try { showToast('Relâché — mise à jour appliquée', 1600); } catch (e) { }
        clearTouchIndicator();
        renderList(listId);
        syncOrderToSheet(listId);
        // Clean up any possible touch ghost left from hybrid interactions
        try { clearTouchGhost(); } catch (e) { }
        touchDragging = false;
        draggedElement = null;
        draggedIndex = null;
    }

    document.addEventListener('touchstart', (e) => {
        if (!e.touches || !e.touches[0]) return;
        const t = e.touches[0];
        touchStartX = t.clientX; touchStartY = t.clientY;
        const target = e.target;


    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
        if (!e.touches || !e.touches[0]) return;
        const touch = e.touches[0];

        if (touchLongPressTimer) {
            const dx = Math.abs(touch.clientX - touchStartX);
            const dy = Math.abs(touch.clientY - touchStartY);
            if (dx > 10 || dy > 10) {
                clearTimeout(touchLongPressTimer);
                touchLongPressTimer = null;
            }
        }

        if (!touchDragging) return;

        // remember last coordinates for fallback on drop
        touchLastX = touch.clientX; touchLastY = touch.clientY;
        if (e.cancelable) e.preventDefault();
        handleAutoScrollDuringDrag({ clientY: touch.clientY });
        // Move ghost and show drop target
        try { moveTouchGhost(touch.clientX, touch.clientY); } catch (err) { }
        const info = findDropAtPoint(touch.clientX, touch.clientY);
        showTouchIndicator(info);

    }, { passive: false });

    function endTouchDrag() {
        if (!touchDragging) return;
        touchDragging = false;
        stopAutoScroll();
        if (draggedElement) draggedElement.classList.remove('dragging');
        if (tasksContainer) tasksContainer.classList.remove('dragging-active');
        try { if (tasksContainer) tasksContainer.style.touchAction = 'auto'; } catch (err) { }
        try { clearTouchGhost(); } catch (e) { }
        draggedElement = null;
        draggedIndex = null;

    }

    document.addEventListener('touchend', async (e) => {
        if (touchLongPressTimer) clearTimeout(touchLongPressTimer);
        touchLongPressTimer = null;
        await performTouchDrop();
        endTouchDrag();
    }, { passive: false });
    document.addEventListener('touchcancel', (e) => {
        if (touchLongPressTimer) clearTimeout(touchLongPressTimer);
        touchLongPressTimer = null;
        endTouchDrag();
    }, { passive: true });

    // Pointer fallback for environments without touch support. On Android we prefer native touch long-press.
    if (!('ontouchstart' in window)) {
        let pointerLongPressTimer = null;
        let pointerStartX = 0, pointerStartY = 0;

        document.addEventListener('pointerdown', (e) => {
            if (e.pointerType !== 'touch' && e.pointerType !== 'pen' && e.pointerType !== 'mouse') return;
            pointerStartX = e.clientX; pointerStartY = e.clientY;
            // Sync with global touch coordinates for beginDragFromTarget
            touchStartX = e.clientX; touchStartY = e.clientY;
            const target = e.target;
            pointerLongPressTimer = setTimeout(() => {
                const el = target.closest && target.closest('[draggable]');
                if (el) {
                    // if ("vibrate" in navigator) navigator.vibrate(50);
                    beginDragFromTarget(target);
                }
            }, LONG_PRESS_MS);
        }, { passive: false });

        document.addEventListener('pointermove', (e) => {
            if (pointerLongPressTimer) {
                const dx = Math.abs(e.clientX - pointerStartX);
                const dy = Math.abs(e.clientY - pointerStartY);
                if (dx > 10 || dy > 10) { clearTimeout(pointerLongPressTimer); pointerLongPressTimer = null; }
            }
            if (!touchDragging) return;
            handleAutoScrollDuringDrag(e);
            try { moveTouchGhost(e.clientX, e.clientY); } catch (err) { }
            touchLastX = e.clientX; touchLastY = e.clientY;
        }, { passive: false });

        document.addEventListener('pointerup', (e) => {
            if (pointerLongPressTimer) { clearTimeout(pointerLongPressTimer); pointerLongPressTimer = null; }
            (async () => { await performTouchDrop(); endTouchDrag(); })();
        });
    }
};
