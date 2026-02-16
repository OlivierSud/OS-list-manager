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

let currentListId = null;
let currentListName = "";
let collapsedSections = new Set(); // Track collapsed section indices
let draggedElement = null;
let draggedIndex = null;

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
    isHeaderMode: false,
    filter: 'all', // Global default, but we'll use per-list filters
    searchQuery: '',
    userEmail: null
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
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.email openid';

let tokenClient;
let accessToken = null;

// Initialize Google Identity Services
function initTokenClient() {
    if (window.google) {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: (tokenResponse) => {
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
        alert("Google API not loaded yet. Check internet connection.");
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
        const metaData = await metaResponse.json();

        if (metaData.error) {
            console.error('Google Sheets Meta Error:', metaData.error);
            return;
        }

        // Reset state with real data
        state.lists = [];
        state.items = {};

        // 2. Process each Sheet as a List
        if (metaData.sheets) {
            const fetchPromises = metaData.sheets.map(async (sheet, index) => {
                const title = sheet.properties.title;
                const sheetId = sheet.properties.sheetId; // Number

                // 3. Fetch Items (include Column D for last modifier)
                const dataResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(title)}!A:D`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });
                const data = await dataResponse.json();

                // Load filter from Column C (cell C1)
                let savedFilter = 'all';
                if (data.values && data.values[0] && data.values[0][2]) {
                    const configStr = data.values[0][2];
                    if (configStr.startsWith('FILTER:')) {
                        savedFilter = configStr.replace('FILTER:', '');
                    }
                }

                // Add to Lists
                const newList = {
                    id: sheetId,
                    name: title,
                    color: COLOR_PALETTE[index % COLOR_PALETTE.length],
                    items: 0,
                    filter: savedFilter
                };

                const items = [];
                if (data.values) {
                    let lastHeaderUid = null;
                    data.values.forEach((row, rowIndex) => {
                        const colC = row[2] || "";
                        const isHeader = row[1] === "HEADER";

                        // Parse Column C Metadata
                        const parts = colC.split('|');
                        let uid = parts.find(p => p.startsWith('UID:'))?.replace('UID:', '');
                        let pid = parts.find(p => p.startsWith('PID:'))?.replace('PID:', '');
                        let color = parts.find(p => p.startsWith('COLOR:'))?.replace('COLOR:', '');
                        let isStandalone = parts.includes('STANDALONE');
                        let isSubHeader = parts.includes('SUBHEADER');

                        // Backward compatibility and inference
                        if (isHeader) {
                            if (!uid) uid = generateId();
                            lastHeaderUid = uid;
                            // If a header has a PID, it implies it is a subheader
                            if (pid) isSubHeader = true;
                        } else {
                            // It's a task. A task can't be a subheader.
                            isSubHeader = false;

                            // If it has no PID and is not explicitly standalone, 
                            // it likely belongs to the preceding header.
                            if (!pid && !isStandalone) {
                                if (lastHeaderUid) {
                                    pid = lastHeaderUid;
                                } else {
                                    // Only truly standalone if there is NO preceding header at all (top of list)
                                    isStandalone = true;
                                }
                            }
                        }

                        // Extract filter from row 0 if present (FILTER: All|Active|Completed)
                        const filterPart = parts.find(p => p.startsWith('FILTER:'));
                        if (rowIndex === 0 && filterPart) {
                            savedFilter = filterPart.replace('FILTER:', '');
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
                            lastModifier: row[3] || ""
                        });
                    });
                }

                newList.items = items.length;
                state.items[sheetId] = items;
                return newList;
            });

            const loadedLists = await Promise.all(fetchPromises);
            state.lists = loadedLists;
        }

        // Load colors from sheet metadata if available
        await loadListColors();

        console.log("Data sync complete:", state);
        renderHome();
    } catch (e) {
        console.error("Network or API Error", e);
    }
}

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
            alert("Erreur création liste: " + data.error.message);
        }
    } catch (e) {
        console.error(e);
    }
}

async function addItemToSheet(listId, text, isHeader = false) {
    if (!accessToken) return;

    const list = state.lists.find(l => l.id === listId);
    if (!list) return;

    const statusValue = isHeader ? "HEADER" : "FALSE";

    try {
        const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(list.name)}!A:D:append?valueInputOption=USER_ENTERED`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                values: [[text, statusValue, "", state.userEmail || ""]]
            })
        });

        const data = await response.json();
        if (!data.error) {
            console.log("Item added");
            // Optimistic update in UI is handled by addItem() but we should re-fetch to be sure of sync
            // For responsiveness we keep local update, but background fetch is good practice
            // fetchSheetData(); 
        } else {
            console.error(data.error);
            alert("Erreur ajout item: " + data.error.message);
        }
    } catch (e) {
        console.error(e);
    }
}

async function toggleItemInSheet(listId, itemId, newStatus) {
    // Determine row index from itemId which is "sheetId-rowIndex"
    // CAUTION: This simple logic assumes row index matches sheet row index.
    // Deleting rows would break this. For a robust app, we'd need permanent IDs.
    // For this prototype, we'll try to update securely.

    // Extract row index
    const rowIndex = parseInt(itemId.split('-')[1]);
    const list = state.lists.find(l => l.id === listId);
    const item = state.items[listId].find(i => i.id === itemId);

    // Row index in sheet is 1-based usually for A1 notation, but values array is 0-based.
    // A1 notation: Sheet!B{rowIndex+1}:D{rowIndex+1}
    const range = `${list.name}!B${rowIndex + 1}:D${rowIndex + 1}`;

    try {
        // Prevent toggling headers if somehow triggered
        // Headers have distinct value so toggling true/false would be bad if we lose "HEADER" status
        // But UI prevents clicking headers.

        // Preserve standalone status if present
        let colCValue = "";
        if (rowIndex === 0) {
            // For the first row (C1), preserve FILTER and STANDALONE for the item
            let filterPart = `FILTER:${list.filter}`;
            let standalonePart = item.isStandalone ? "|STANDALONE" : "";
            colCValue = `${filterPart}${standalonePart}`;
        } else {
            // For other rows, preserve STANDALONE for the item
            colCValue = item.isStandalone ? "STANDALONE" : "";
        }

        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                // Range B:D, update B (status), C (config), and D (email)
                values: [[newStatus ? "TRUE" : "FALSE", colCValue, state.userEmail || ""]]
            })
        });

        // Update local state modifier as well
        const items = state.items[listId];
        const item = items.find(i => i.id === itemId);
        if (item) item.lastModifier = state.userEmail;
    } catch (e) {
        console.error("Update failed", e);
    }
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
            alert("Erreur: " + data.error.message);
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
        else alert("Erreur: " + data.error.message);
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
        else alert("Erreur: " + data.error.message);
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
            alert("Erreur: " + data.error.message);
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
        else alert("Erreur: " + data.error.message);
    } catch (e) { console.error(e); }
}

function getRandomColor(index) {
    return COLOR_PALETTE[index % COLOR_PALETTE.length];
}

let colorTarget = { type: 'list', id: null }; // 'list' or 'section'

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
    app.classList.remove('hidden');
    loginContainer.classList.add('hidden');

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

    // Clear and rebuild content
    tasksContainer.innerHTML = '';

    const currentItems = state.items[listId] || [];

    if (currentItems.length === 0) {
        tasksContainer.innerHTML = `<div style="text-align: center; color: var(--text-secondary); padding: 2rem;">Aucun élément. Ajoutez-en un !</div>`;
    } else {
        // Find if there are any headers
        const hasHeaders = currentItems.some(i => i.isHeader);

        // ALWAYS add a top drop zone to allow moving items out of sections to the top
        const topDropZone = document.createElement('div');
        topDropZone.className = 'drop-zone-spacer';
        topDropZone.dataset.dropTargetIndex = 0;
        topDropZone.innerText = "Sortir de la section (Haut)";
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
                zone.innerText = "Sortir de la section";
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
                const colorBullet = `<span class="section-bullet" style="background: ${bulletColor};" onclick="event.stopPropagation(); colorTarget={type:'section', index:${index}}; openColorModal();"></span>`;

                el.innerHTML = `
                    <div style="display: flex; align-items: center; flex: 1;">
                        <span class="drag-handle"><i data-lucide="grip-vertical" style="width: 16px; height: 16px;"></i></span>
                        <span class="collapse-arrow ${arrowClass}" data-section-index="${index}">
                            <i data-lucide="chevron-down" style="width: 16px; height: 16px;"></i>
                        </span>
                        ${colorBullet}
                        <span class="item-text" onclick="event.stopPropagation(); startInlineEdit(this, ${index})">${item.text}</span>
                        <span class="section-count" style="margin-left: 0.5rem; font-size: 0.8rem; opacity: 0.8; font-weight: bold; color: var(--text-secondary);">(${itemCount})</span>
                    </div>
                    <div style="display: flex; gap: 0.25rem;">
                        <button class="btn-icon-small" onclick="event.stopPropagation(); openSectionOptions(${index})">
                            <i data-lucide="more-vertical" style="width: 14px; height: 14px;"></i>
                        </button>
                    </div>
                `;

                // Add collapse event listener
                const arrow = el.querySelector('.collapse-arrow');
                if (arrow) {
                    arrow.onclick = (e) => {
                        e.stopPropagation();
                        toggleSection(index);
                    };
                }

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

                const checkIcon = item.done ? '<i data-lucide="check" style="width:16px; color: white;"></i>' : '';

                el.innerHTML = `
                    <span class="drag-handle"><i data-lucide="grip-vertical" style="width: 16px; height: 16px;"></i></span>
                    <div class="task-checkbox" onclick="event.stopPropagation(); toggleItem('${item.id}')">
                        ${checkIcon}
                    </div>
                    <span class="item-text" style="flex: 1" onclick="event.stopPropagation(); startInlineEdit(this, ${index})">${item.text}</span>
                    <button class="btn-delete-item" onclick="event.stopPropagation(); deleteListItem(${index})">
                        <i data-lucide="x" style="width: 14px; height: 14px;"></i>
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
        bottomZone.innerText = "Sortir de la section (Bas)";
        setupBoundaryDragHandlers(bottomZone, 'bottom');
        tasksContainer.appendChild(bottomZone);
    }

    lucide.createIcons();
}

// --- Logic Functions ---

function openList(id) {
    state.activeListId = id;
    state.view = 'list';
    renderList(id);
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
    if (searchInput) {
        searchInput.value = '';
        searchInput.style.width = '100px';
    }
    renderHome();
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

    // Create new item locally
    // Infer parentId based on previous items if we are adding a task
    let inferredPid = null;
    let isStandalone = true;
    if (!isHeader) {
        // Look for the last header encountered in the existing list
        const items = state.items[listId] || [];
        if (items.length > 0) {
            // Find the header that currently "owns" the end of the list
            for (let i = items.length - 1; i >= 0; i--) {
                if (items[i].isHeader) {
                    inferredPid = items[i].id;
                    isStandalone = false;
                    break;
                }
            }
        }
    }

    const newItem = {
        id: `${listId}-${Date.now()}`, // Temporary ID
        text: text,
        done: false,
        isHeader: isHeader,
        isStandalone: isStandalone,
        parentId: inferredPid
    };

    if (!state.items[listId]) state.items[listId] = [];
    state.items[listId].push(newItem);

    newTaskInput.value = ''; // Clear input

    // Reset Header Mode if active
    if (state.isHeaderMode) {
        toggleHeaderModeState();
    }

    renderList(listId); // Update UI

    // Sync with Cloud
    addItemToSheet(listId, text, isHeader);
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
        draggedElement = element;
        draggedIndex = index;
        element.classList.add('dragging');
        tasksContainer.classList.add('dragging-active'); // Show all spacers
        e.dataTransfer.effectAllowed = 'move';
    });

    element.addEventListener('dragend', (e) => {
        element.classList.remove('dragging');
        tasksContainer.classList.remove('dragging-active');
        document.querySelectorAll('.drag-over, .drag-over-header, .drag-over-boundary').forEach(el => {
            el.classList.remove('drag-over');
            el.classList.remove('drag-over-header');
            el.classList.remove('drag-over-boundary');
        });
    });

    element.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        if (draggedElement !== element) {
            if (element.dataset.isHeader === 'true' && draggedElement.dataset.isHeader === 'false') {
                element.classList.add('drag-over-header');
            } else {
                element.classList.add('drag-over');
            }
        }
    });

    element.addEventListener('dragleave', (e) => {
        element.classList.remove('drag-over');
        element.classList.remove('drag-over-header');
    });

    element.addEventListener('drop', (e) => {
        e.preventDefault();
        element.classList.remove('drag-over');
        element.classList.remove('drag-over-header');

        if (draggedElement === element) return;

        const dropIndex = parseInt(element.dataset.index);
        const dragIndex = draggedIndex;

        if (dragIndex === dropIndex) return;

        const listId = state.activeListId;
        const items = [...state.items[listId]];
        const movedItem = items[dragIndex];

        // If moving a header, move all items in that section
        if (movedItem.isHeader) {
            const sectionToMove = [];
            let i = dragIndex;
            sectionToMove.push(items[i++]);
            while (i < items.length && !items[i].isHeader) {
                sectionToMove.push(items[i++]);
            }

            if (dropIndex >= dragIndex && dropIndex < dragIndex + sectionToMove.length) return;

            items.splice(dragIndex, sectionToMove.length);

            let newDropIndex = dropIndex;
            if (dropIndex > dragIndex) {
                newDropIndex -= sectionToMove.length;
            }

            // Nesting logic: become SubHeader if dropped into a main section
            let dropParentMain = null;
            for (let j = newDropIndex - 1; j >= 0; j--) {
                if (items[j].isHeader && !items[j].isSubHeader) {
                    dropParentMain = items[j];
                    break;
                }
            }

            if (dropParentMain) {
                console.log(`Nesting section "${sectionToMove[0].text}" into main section "${dropParentMain.text}"`);
                sectionToMove[0].isSubHeader = true;
                sectionToMove[0].isStandalone = false;
                sectionToMove[0].parentId = dropParentMain.id;
            } else {
                console.log(`Setting section "${sectionToMove[0].text}" as main section`);
                sectionToMove[0].isSubHeader = false;
                sectionToMove[0].parentId = null;
            }

            // Update parentId for all items in the moved section to stay with this header
            sectionToMove.forEach(it => {
                if (!it.isHeader) it.parentId = sectionToMove[0].id;
            });

            items.splice(newDropIndex, 0, ...sectionToMove);
        } else {
            // Moving a single item
            const [item] = items.splice(dragIndex, 1);
            let targetIndex = dropIndex;
            if (dropIndex > dragIndex) targetIndex--;

            const dropOnHeader = element.dataset.isHeader === 'true';

            if (dropOnHeader) {
                const targetHeader = items[targetIndex];
                item.isStandalone = false;
                item.isSubHeader = false;
                item.parentId = targetHeader.id;
                items.splice(targetIndex + 1, 0, item);
            } else if (targetIndex === 0) {
                item.isStandalone = true;
                item.parentId = null;
                items.splice(0, 0, item);
            } else if (targetIndex >= items.length) {
                item.isStandalone = true;
                item.parentId = null;
                items.push(item);
            } else {
                const targetItem = items[targetIndex];
                if (targetItem) {
                    item.isStandalone = targetItem.isStandalone;
                    item.parentId = targetItem.parentId;
                }
                items.splice(targetIndex, 0, item);
            }
        }

        state.items[listId] = items;
        renderList(listId);
        syncOrderToSheet(listId);
    });
}

function setupBoundaryDragHandlers(element, position) {
    if (!element) return;

    element.addEventListener('dragover', (e) => {
        if (!draggedElement) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        element.classList.add('drag-over-boundary');
    });

    element.addEventListener('dragleave', () => {
        element.classList.remove('drag-over-boundary');
    });

    element.addEventListener('drop', (e) => {
        if (!draggedElement) return;
        e.preventDefault();
        element.classList.remove('drag-over-boundary');

        const listId = state.activeListId;
        const dragIndex = draggedIndex;
        const items = [...state.items[listId]];

        // Handle moving entire section OR single item
        const isHeaderMove = draggedElement.dataset.isHeader === 'true';
        let itemsToMove = [];

        if (isHeaderMove) {
            let i = dragIndex;
            itemsToMove.push(items[i++]);
            while (i < items.length && !items[i].isHeader) {
                itemsToMove.push(items[i++]);
            }
            items.splice(dragIndex, itemsToMove.length);
            itemsToMove[0].isSubHeader = false;
            itemsToMove[0].isStandalone = false;
            itemsToMove[0].parentId = null;
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
        if (item.isStandalone) meta.push("STANDALONE");
        if (item.isSubHeader) meta.push("SUBHEADER");
        if (item.isHeader && item.id) meta.push(`UID:${item.id}`);
        if (item.parentId) meta.push(`PID:${item.parentId}`);
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

if (backButton) backButton.addEventListener('click', goHome);

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
};
