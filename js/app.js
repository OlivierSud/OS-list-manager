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
    searchQuery: ''
};

// Map to store per-list filters
let listFilters = {};


// --- Google Sheets & Auth Integration ---
// TODO: User must replace this with their own OAuth 2.0 Client ID from Google Cloud Console
const CLIENT_ID = '356152485310-ofia0pr8hcig7s906tfu1c9v1us7s4gb.apps.googleusercontent.com';
const API_KEY = 'AIzaSyBA2lV9mm9_tNIpErOd9yO5lMjlIYtlCwM';
const SPREADSHEET_ID = '17nkELFwjGJrOjCBHTunDsAdg1GE6ylIZYc6jblAB-ps';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

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
                console.log("Access Token received");
                renderHome(); // Re-render to show app instead of login
                fetchSheetData(); // Fetch data now that we are logged in
            },
        });
    }
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

                // 3. Fetch Items (include Column C for config)
                const dataResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(title)}!A:C`, {
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
                    data.values.forEach((row, rowIndex) => {
                        if (!row[0]) return;

                        const isHeader = row[1] === "HEADER";

                        items.push({
                            id: `${sheetId}-${rowIndex}`,
                            text: row[0],
                            done: row[1] === "TRUE",
                            isHeader: isHeader
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
        const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(list.name)}!A:B:append?valueInputOption=USER_ENTERED`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                values: [[text, statusValue]]
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

    // Extract row index (mock implementation)
    const rowIndex = parseInt(itemId.split('-')[1]);
    const list = state.lists.find(l => l.id === listId);

    // Row index in sheet is 1-based usually for A1 notation, but values array is 0-based.
    // A1 notation: Sheet!B{rowIndex+1}
    const range = `${list.name}!B${rowIndex + 1}`;

    try {
        // Prevent toggling headers if somehow triggered
        // Headers have distinct value so toggling true/false would be bad if we lose "HEADER" status
        // But UI prevents clicking headers.

        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                values: [[newStatus ? "TRUE" : "FALSE"]]
            })
        });
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
            updateSheetColor(currentListId, color);
            closeColorModal();
            closeOptions();
        };
        colorGrid.appendChild(colorBtn);
    });
}

function openColorModal() {
    initColorPicker();
    colorModal.style.display = 'flex';
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
        let currentSectionIndex = -1;
        let sectionCollapsed = false;

        currentItems.forEach((item, index) => {
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
                currentSectionIndex = index;
                sectionCollapsed = collapsedSections.has(index);

                // Count items in this section (respecting search and filter)
                let itemCount = 0;
                for (let i = index + 1; i < currentItems.length; i++) {
                    const subItem = currentItems[i];
                    if (subItem.isHeader) break;

                    const matchesSearch = !state.searchQuery || subItem.text.toLowerCase().includes(state.searchQuery.toLowerCase());
                    if (!matchesSearch) continue;

                    if (state.filter === 'all') itemCount++;
                    else if (state.filter === 'active' && !subItem.done) itemCount++;
                    else if (state.filter === 'completed' && subItem.done) itemCount++;
                }

                // If search is active, don't show empty sections if they don't contain matching search items
                // UNLESS the header itself matches the search
                const headerMatchesSearch = !state.searchQuery || item.text.toLowerCase().includes(state.searchQuery.toLowerCase());
                if (state.searchQuery && itemCount === 0 && !headerMatchesSearch) {
                    return;
                }

                el.className = 'list-header';
                el.draggable = true;
                el.dataset.index = index;
                el.dataset.isHeader = 'true';

                const arrowClass = sectionCollapsed ? 'collapsed' : '';
                el.innerHTML = `
                    <div style="display: flex; align-items: center; flex: 1;">
                        <span class="drag-handle"><i data-lucide="grip-vertical" style="width: 16px; height: 16px;"></i></span>
                        <span class="collapse-arrow ${arrowClass}" data-section-index="${index}">
                            <i data-lucide="chevron-down" style="width: 16px; height: 16px;"></i>
                        </span>
                        <span class="item-text" onclick="event.stopPropagation(); startInlineEdit(this, ${index})">${item.text}</span>
                        <span style="margin-left: 0.5rem; font-size: 0.75rem; opacity: 0.5; font-weight: 400;">(${itemCount})</span>
                    </div>
                    <button class="btn-delete-item" onclick="event.stopPropagation(); deleteListItem(${index})">
                        <i data-lucide="x" style="width: 14px; height: 14px;"></i>
                    </button>
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
                // Hide items if section is collapsed
                if (sectionCollapsed && currentSectionIndex >= 0) {
                    return; // Skip rendering
                }

                el.className = 'glass-panel task-item';
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
    const originalText = element.innerText;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = originalText;
    input.className = 'inline-edit-input';

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
    input.select();
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
    const newItem = {
        id: `${listId}-${Date.now()}`, // Temporary ID
        text: text,
        done: false,
        isHeader: isHeader
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

function setupDragHandlers(element, index, isHeader) {
    element.addEventListener('dragstart', (e) => {
        draggedElement = element;
        draggedIndex = index;
        element.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    });

    element.addEventListener('dragend', (e) => {
        element.classList.remove('dragging');
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    });

    element.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        if (draggedElement !== element) {
            element.classList.add('drag-over');
        }
    });

    element.addEventListener('dragleave', (e) => {
        element.classList.remove('drag-over');
    });

    element.addEventListener('drop', (e) => {
        e.preventDefault();
        element.classList.remove('drag-over');

        if (draggedElement === element) return;

        const dropIndex = parseInt(element.dataset.index);
        const dragIndex = draggedIndex;

        if (dragIndex === dropIndex) return;

        // Reorder items
        const listId = state.activeListId;
        const items = [...state.items[listId]];
        const [movedItem] = items.splice(dragIndex, 1);

        // If moving a header, move all items in that section
        if (movedItem.isHeader) {
            const sectionItems = [];
            let i = dragIndex;
            while (i < items.length && !items[i].isHeader) {
                sectionItems.push(items.splice(dragIndex, 1)[0]);
            }

            // Insert header and section items
            const insertIndex = dropIndex > dragIndex ? dropIndex - 1 : dropIndex;
            items.splice(insertIndex, 0, movedItem, ...sectionItems);
        } else {
            items.splice(dropIndex > dragIndex ? dropIndex : dropIndex, 0, movedItem);
        }

        state.items[listId] = items;
        renderList(listId);

        // Sync to Google Sheets
        syncOrderToSheet(listId);
    });
}

async function syncOrderToSheet(listId) {
    if (!accessToken) return;

    const list = state.lists.find(l => l.id === listId);
    if (!list) return;

    const items = state.items[listId];
    const values = items.map(item => [
        item.text,
        item.isHeader ? 'HEADER' : (item.done ? 'TRUE' : 'FALSE')
    ]);

    try {
        // Clear and rewrite the entire sheet
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(list.name)}!A:B:clear`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(list.name)}!A:B?valueInputOption=USER_ENTERED`, {
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
