// DOM Elements
const app = document.getElementById('app');
const listsContainer = document.getElementById('lists-container');
const tasksContainer = document.getElementById('tasks-container');
const headerTitle = document.getElementById('header-title');
const backButton = document.getElementById('back-button');
const fab = document.getElementById('fab');
const taskInputContainer = document.getElementById('task-input-container');
const newTaskInput = document.getElementById('new-task-input');
const addTaskButton = document.getElementById('add-task-button');
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

let currentListId = null;
let currentListName = "";

// State
let state = {
    view: 'home', // 'home' | 'list'
    activeListId: null,
    lists: [],
    items: {},
    isHeaderMode: false
};

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

                // Add to Lists
                const newList = {
                    id: sheetId, // Keep as number for ID
                    name: title,
                    color: getRandomColor(index),
                    items: 0
                };

                // 3. Fetch Items
                const dataResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(title)}!A:B`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });
                const data = await dataResponse.json();

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

            console.log("Data sync complete:", state);
            renderHome();
        }
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
            fetchSheetData();
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

function getRandomColor(index) {
    const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#f59e0b', '#ec4899'];
    return colors[index % colors.length];
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

    headerTitle.innerText = list.name;

    // Clear and rebuild content
    tasksContainer.innerHTML = '';

    const currentItems = state.items[listId] || [];

    if (currentItems.length === 0) {
        tasksContainer.innerHTML = `<div style="text-align: center; color: var(--text-secondary); padding: 2rem;">Aucun élément. Ajoutez-en un !</div>`;
    } else {
        currentItems.forEach(item => {
            const el = document.createElement('div');

            if (item.isHeader) {
                el.className = 'list-header';
                el.innerHTML = `<span>${item.text}</span>`;
            } else {
                el.className = 'glass-panel task-item';
                if (item.done) el.className += ' done';
                el.onclick = () => toggleItem(item.id);

                // Check icon logic
                const checkIcon = item.done ? '<i data-lucide="check" style="width:16px; color: white;"></i>' : '';

                el.innerHTML = `
                    <div class="task-checkbox">
                        ${checkIcon}
                    </div>
                    <span style="flex: 1">${item.text}</span>
                `;
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

function goHome() {
    state.activeListId = null;
    state.view = 'home';
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

// --- Init ---
window.onload = function () {
    // Wait for Google Script to load then init
    // Or just call renderHome to show Login button
    initTokenClient();
    renderHome();
};
