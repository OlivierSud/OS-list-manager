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
const btnShare = document.getElementById('btn-share');
const colorModal = document.getElementById('color-modal');
const colorGrid = document.getElementById('color-grid');
const btnColorCancel = document.getElementById('btn-color-cancel');
const headerProgress = document.getElementById('header-progress');
const headerProgressLabel = document.getElementById('header-progress-label');
const headerProgressPct = document.getElementById('header-progress-pct');
const headerProgressFill = document.getElementById('header-progress-fill');
const headerControlsRow = document.getElementById('header-controls-row');
const headerTitleRow = document.getElementById('header-title-row');
const btnCheckAll = document.getElementById('btn-check-all');
const btnUncheckAll = document.getElementById('btn-uncheck-all');
const listActionsRow = document.getElementById('list-actions-row');
const shareManageModal = document.getElementById('share-manage-modal');
const shareModalOwner = document.getElementById('share-modal-owner');
const addCollaboratorSection = document.getElementById('add-collaborator-section');
const btnShareModalAdd = document.getElementById('btn-share-modal-add');
const shareModalInput = document.getElementById('share-modal-input');
const collaboratorsList = document.getElementById('collaborators-list');
const btnShareModalClose = document.getElementById('btn-share-modal-close');

// User Profile Elements
const userProfileContainer = document.getElementById('user-profile-container');
const userAvatar = document.getElementById('user-avatar');
const userAvatarFallback = document.getElementById('user-avatar-fallback');
const userMenu = document.getElementById('user-menu');
const btnLogoutHeader = document.getElementById('btn-logout-header');
const refreshButton = document.getElementById('refresh-button');
const themeCheckbox = document.getElementById('theme-checkbox');
const soundToggle = document.getElementById('sound-toggle');
const soundIcon = document.getElementById('sound-icon');

const pwaBanner = document.getElementById('pwa-install-banner');
const btnPwaInstall = document.getElementById('btn-pwa-install');
const pwaInstallDesc = document.getElementById('pwa-install-desc');

// --- Global Variables (Drag & Drop, State, Global Config) ---
const LONG_PRESS_MS = 500;
let draggedElement = null;
let draggedIndex = null;
let touchDragging = false;
let touchStartX = 0, touchStartY = 0;
let touchLastX = 0, touchLastY = 0;
let touchGhost = null;
let touchLongPressTimer = null;
let _blankDragImage = null; // Used to hide native drag ghost on desktop

// State
let state = {
    view: 'home',
    activeListId: null,
    lists: [],
    items: {},
    selectedSectionId: null,
    isHeaderMode: false,
    filter: 'all',
    searchQuery: '',
    userEmail: null,
    userPicture: null,
    completedLists: new Set(),
    collapsedSections: new Set(), // Store key as "listId-itemId"
    soundEnabled: true,
    shares: []
};

// --- PWA LOGIC ---
window.deferredPrompt = window.deferredPrompt || null;

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isSafari = () => /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

function checkAndShowPWABanner() {
    console.log("Checking PWA Banner... standalone:", isStandalone(), "prompt:", !!window.deferredPrompt);
    if (isStandalone()) {
        if (pwaBanner) pwaBanner.classList.add('hidden');
        return;
    }

    if (pwaBanner) pwaBanner.classList.remove('hidden');
    updatePWAButtonState();

    if (isIOS()) {
        if (btnPwaInstall) {
            btnPwaInstall.innerText = "Comment ?";
            btnPwaInstall.onclick = (e) => {
                e.preventDefault();
                installPWAFromBanner();
            };
        }
    }
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.deferredPrompt = e;
    console.log('✅ PWA ready to install');
    if (btnPwaInstall) btnPwaInstall.innerText = "Installer";
});

function updatePWAButtonState() {
    if (!btnPwaInstall) return;
    if (window.deferredPrompt) {
        btnPwaInstall.innerText = "Installer";
        btnPwaInstall.style.background = "var(--accent-color)";
        btnPwaInstall.style.color = "white";
    } else if (!isIOS()) {
        btnPwaInstall.innerText = "Vérification...";
    }
}
window.updatePWAButtonState = updatePWAButtonState;

async function installPWAFromBanner() {
    if (window.deferredPrompt) {
        try {
            console.log("Triggering PWA Install prompt...");
            await window.deferredPrompt.prompt();
            const { outcome } = await window.deferredPrompt.userChoice;
            console.log(`PWA install user choice: ${outcome}`);
            if (outcome === 'accepted') {
                if (pwaBanner) pwaBanner.classList.add('hidden');
                window.deferredPrompt = null;
            }
        } catch (err) {
            console.error("Installation error:", err);
            alert("Erreur lors de l'installation : " + err.message);
        }
    } else {
        if (isIOS()) {
            alert("Installation iPhone :\n\n1. Appuyez sur Partager (□↑)\n2. Sélectionnez 'Sur l'écran d'accueil'.");
        } else {
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const isInsecure = window.location.protocol !== 'https:' && !isLocal;
            
            if (isInsecure) {
                alert("Installation bloquée : PWA nécessite une connexion sécurisée (HTTPS).\n\nVeuillez utiliser l'adresse sécurisée de votre site.");
            } else {
                alert("Le navigateur n'a pas encore validé l'installation (Événement 'beforeinstallprompt' non reçu).\n\nCauses possibles :\n- Application déjà installée\n- Navigation privée (Incognito)\n- Connexion trop lente (Service Worker en chargement)\n- Manifest non reconnu");
            }
        }
    }
}
window.installPWAFromBanner = installPWAFromBanner;

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(checkAndShowPWABanner, 500);
});

// Cache versions
// Cache versions
const JS_VERSION = "52";
console.log(`App loaded (v${JS_VERSION})`);

console.log(`Current Hash: ${window.location.hash ? '(Present: ' + window.location.hash.substring(0, 10) + '...)' : '(None)'}`);

// Diagnostic Manifest
fetch('manifest.json').then(r => {
    console.log(`Manifest check: status=${r.status}, type=${r.headers.get('content-type')}`);
}).catch(e => console.error('Manifest fetch failed:', e));

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

async function handleAuthClick() {
    console.log("Tentative de connexion cliquée...");
    if (!window.supabaseClient) {
        console.error("Erreur: supabaseClient n'est pas initialisé !");
        alert("Erreur de chargement de Supabase. Veuillez rafraîchir la page.");
        return;
    }

    const redirectUrl = window.location.origin + window.location.pathname;
    console.log("Redirection vers :", redirectUrl);

    const { data, error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: redirectUrl
        }
    });

    if (error) {
        console.error("Supabase Auth Error:", error);
        alert("Erreur d'authentification : " + error.message);
    }
}
window.handleAuthClick = handleAuthClick;

// Force l'attachement du bouton au démarrage
document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('login-button');
    if (loginBtn) {
        loginBtn.addEventListener('click', handleAuthClick);
        console.log("Événement de connexion attaché au bouton.");
    }
});

async function checkPersistentAuth() {
    console.log("--- AUTH CHECK START ---");
    if (!window.supabaseClient) {
        console.error("❌ Erreur: supabaseClient n'est pas initialisé !");
        return;
    }

    let isFetching = false;

    // 1. Subscribe to auth changes
    supabaseClient.auth.onAuthStateChange(async (event, currentSession) => {
        console.log("🔔 Auth event:", event, currentSession ? `User found: ${currentSession.user.email}` : "No user");
        
        if (currentSession && currentSession.user) {
            const hasUserChanged = state.userEmail !== currentSession.user.email;
            state.userEmail = currentSession.user.email;
            state.userPicture = currentSession.user.user_metadata?.avatar_url || null;
            
            // Only fetch if not already fetching or if user changed
            if (!isFetching) {
                if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
                    isFetching = true;
                    await fetchSupabaseData();
                    isFetching = false;
                } else if (hasUserChanged) {
                    renderHome();
                }
            }
        } else if (event === 'SIGNED_OUT') {
            console.log("🚪 User signed out");
            state.userEmail = null;
            state.userPicture = null;
            state.lists = [];
            state.items = {};
            renderHome();
        }
    });

    // 2. Initial check for existing session
    try {
        console.log("🔍 Fetching current session...");
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        
        if (error) {
            console.error("❌ Session Retrieval Error:", error.message);
            renderHome();
            return;
        }
        
        if (session && session.user) {
            console.log("✅ Session recovery success:", session.user.email);
            state.userEmail = session.user.email;
            state.userPicture = session.user.user_metadata?.avatar_url || null;
            
            if (!isFetching) {
                isFetching = true;
                await fetchSupabaseData();
                isFetching = false;
            }
        } else {
            // No session found.
            // Check if we have a hash - if so, Supabase might still be processing it (async)
            const hasHash = window.location.hash && (
                window.location.hash.includes('access_token=') || 
                window.location.hash.includes('error=')
            );
            
            if (hasHash) {
                console.log("⏳ Auth hash detected, waiting for onAuthStateChange...");
                // Don't render home yet, wait for the event listener above to catch it
            } else {
                console.log("ℹ️ No active session and no auth hash. Showing login.");
                renderHome();
            }
        }
    } catch (e) {
        console.error("❌ Session check error (fatal):", e);
        renderHome();
    }
}


async function handleLogout() {
    if (!window.supabaseClient) return;
    try {
        await supabaseClient.auth.signOut();
        goHome();
    } catch (e) {
        console.error("Logout error", e);
    }
}

// Supabase Logic
async function fetchSupabaseData() {
    if (!state.userEmail) return;

    console.log("Fetching Supabase data...");
    try {
        // 1. Fetch Lists
        // 1. Fetch My Lists
        const { data: myLists, error: listsError } = await supabaseClient
            .from('lists')
            .select('*')
            .order('created_at', { ascending: true });

        if (listsError) throw listsError;

        // --- REPARATION AUTOMATIQUE ---
        // Si je suis propriétaire d'une liste et que mon email n'est pas dedans, je le mets à jour
        if (myLists && state.userEmail) {
            myLists.forEach(async l => {
                if (!l.owner_email || l.owner_email === '') {
                    await supabaseClient.from('lists').update({ owner_email: state.userEmail }).eq('id', l.id);
                }
            });
        }

        // 2. Fetch Shares (both directions)
        const currentUserEmail = (state.userEmail || "").toLowerCase();
        const { data: incomingShares } = await supabaseClient
            .from('shares')
            .select('list_id')
            .eq('shared_with_email', currentUserEmail);

        // Fetch all shares for lists I own OR that are shared with me to have accurate counts/names
        const ownedIds = (myLists || []).map(l => l.id);
        const sharedWithMeIds = (incomingShares || []).map(s => s.list_id);
        const allVisibleIds = [...new Set([...ownedIds, ...sharedWithMeIds])];

        let allShares = [];
        if (allVisibleIds.length > 0) {
            const { data: sharesData } = await supabaseClient
                .from('shares')
                .select('list_id, shared_with_email')
                .in('list_id', allVisibleIds);
            allShares = sharesData || [];
        }

        const sharedIdSet = new Set(allShares.map(s => s.list_id));

        // 3. Combine Lists
        let lists = [...(myLists || [])];
        const incomingIds = sharedWithMeIds.filter(id => !ownedIds.includes(id));
        if (incomingIds.length > 0) {
            const { data: sharedLists } = await supabaseClient
                .from('lists')
                .select('*')
                .in('id', incomingIds);
            if (sharedLists) lists = [...lists, ...sharedLists];
        }

        state.lists = lists.map((l, index) => {
            const currentListShares = allShares.filter(s => s.list_id === l.id);
            const sharedEmails = [];
            const isOwner = l.owner_email && l.owner_email.toLowerCase() === currentUserEmail;

            // 1. Gather display emails for the modal (excluding current user)
            if (isOwner) {
                currentListShares
                    .filter(s => s.shared_with_email.toLowerCase() !== currentUserEmail)
                    .forEach(s => sharedEmails.push(s.shared_with_email));
            } else if (l.owner_email) {
                sharedEmails.push(`Propriétaire : ${l.owner_email}`);
            }

            // 2. Calculate TOTAL users (Owner + all unique guests)
            // The shares table has guests. Owner is in the lists table.
            const uniqueGuests = new Set(currentListShares.map(s => s.shared_with_email.toLowerCase()));
            const userCount = 1 + uniqueGuests.size;

            return {
                id: l.id,
                name: l.name,
                color: l.color || COLOR_PALETTE[index % COLOR_PALETTE.length],
                isShared: sharedIdSet.has(l.id),
                sharedEmails: sharedEmails,
                userCount: userCount,
                ownerId: l.owner_id,
                ownerEmail: l.owner_email,
                items: 0,
                filter: 'all'
            };
        });

        // 2. Fetch Tasks for all lists
        const { data: tasks, error: tasksError } = await supabaseClient
            .from('tasks')
            .select('*')
            .order('position', { ascending: true });

        if (tasksError) throw tasksError;

        state.items = {};
        tasks.forEach(task => {
            const lid = String(task.list_id);
            if (!state.items[lid]) state.items[lid] = [];
            state.items[lid].push({
                id: task.id,
                text: task.text,
                done: task.done,
                isHeader: task.is_header,
                isSubHeader: task.is_sub_header,
                parentId: task.parent_id,
                color: task.color,
                lastModifier: task.last_modifier
            });
        });

        console.log("[fetchSupabaseData] Items distribution:", Object.keys(state.items).map(k => `${k}: ${state.items[k].length} items`));

        // Update item count for lists (exclude headers)
        state.lists.forEach(list => {
            const listItems = state.items[String(list.id)] || [];
            list.items = listItems.filter(i => !i.isHeader).length;
        });

        console.log("Supabase sync complete:", state);
    } catch (e) {
        console.error("Supabase Data Error:", e);
    } finally {
        renderHome();
    }
}

// Create a new list
async function createListInSupabase(name) {
    if (!state.userEmail) return;

    try {
        const user = (await supabaseClient.auth.getUser()).data.user;
        const { data, error } = await supabaseClient
            .from('lists')
            .insert([{
                name: name,
                owner_id: user.id,
                owner_email: user.email,
                color: COLOR_PALETTE[state.lists.length % COLOR_PALETTE.length]
            }])
            .select();

        if (error) throw error;
        console.log("List created in Supabase:", data[0]);
        fetchSupabaseData();
    } catch (e) {
        console.error("Error creating list:", e);
    }
}

async function shareListWithUser(listId, email) {
    if (!state.userEmail) return;
    const targetEmail = email.trim().toLowerCase();

    if (!targetEmail || !targetEmail.includes('@')) {
        alert("Veuillez entrer une adresse email valide.");
        return;
    }

    try {
        const user = (await supabaseClient.auth.getUser()).data.user;
        const { error } = await supabaseClient
            .from('shares')
            .insert([{
                list_id: listId,
                shared_with_email: targetEmail,
                owner_id: user.id
            }]);

        if (error) throw error;
        alert(`Liste partagée avec ${targetEmail} !`);
        fetchSupabaseData(); // Refresh to update share icons/details
        closeOptions();
        closeShareModal();
    } catch (e) {
        console.error("Share error:", e);
        alert("Impossible de partager cette liste. Vérifiez que l'email est correct.");
    }
}

async function removeCollaborator(listId, email) {
    if (!confirm(`Retirer ${email} de cette liste ?`)) return;

    try {
        const { error } = await supabaseClient
            .from('shares')
            .delete()
            .eq('list_id', listId)
            .eq('shared_with_email', email.toLowerCase());

        if (error) throw error;
        alert("Collaborateur retiré.");
        fetchSupabaseData();
        closeShareModal();
    } catch (e) {
        console.error("Remove share error:", e);
        alert("Erreur lors de la suppression.");
    }
}

async function leaveList(listId) {
    if (!confirm("Voulez-vous vraiment quitter cette liste ? Vous ne pourrez plus y accéder.")) return;

    try {
        const currentUserEmail = (state.userEmail || "").toLowerCase();
        const { error } = await supabaseClient
            .from('shares')
            .delete()
            .eq('list_id', listId)
            .eq('shared_with_email', currentUserEmail);

        if (error) throw error;
        alert("Vous avez quitté la liste.");
        fetchSupabaseData();
        closeShareModal();
        renderHome();
    } catch (e) {
        console.error("Leave list error:", e);
        alert("Erreur lors de la sortie de la liste.");
    }
}

function showShareDetails(e, listId) {
    if (e) e.stopPropagation();
    const list = state.lists.find(l => l.id === listId);
    if (!list || !list.isShared) return;

    const currentUserEmail = (state.userEmail || "").toLowerCase();
    const isOwner = list.ownerEmail && list.ownerEmail.toLowerCase() === currentUserEmail;

    if (shareModalOwner) {
        shareModalOwner.innerText = list.ownerEmail ? `Propriétaire : ${list.ownerEmail}` : "Propriétaire inconnu";
    }

    if (addCollaboratorSection) {
        if (isOwner) {
            addCollaboratorSection.classList.remove('hidden');
            if (btnShareModalAdd) {
                btnShareModalAdd.onclick = () => {
                    const email = shareModalInput.value;
                    if (email) {
                        shareListWithUser(listId, email);
                        shareModalInput.value = '';
                    } else {
                        alert("Veuillez entrer un email.");
                    }
                };
            }
        } else {
            addCollaboratorSection.classList.add('hidden');
        }
    }

    if (collaboratorsList) {
        collaboratorsList.innerHTML = '';

        const emails = list.sharedEmails || [];

        if (isOwner) {
            if (emails.length === 0) {
                collaboratorsList.innerHTML = '<p style="text-align:center; color:var(--text-secondary); font-size:0.9rem;">Aucun collaborateur pour le moment.</p>';
            } else {
                emails.forEach(email => {
                    const div = document.createElement('div');
                    div.style = "display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.05); padding: 0.75rem; border-radius: 0.5rem; border: 1px solid var(--border-color);";
                    div.innerHTML = `
                        <span style="font-size: 0.9rem; word-break: break-all; flex: 1; margin-right: 0.5rem;">${email}</span>
                        <button class="btn-icon-small" style="color: var(--danger-color); background: rgba(239, 68, 68, 0.1); padding: 4px; border-radius: 4px;" onclick="removeCollaborator('${listId}', '${email}')">
                            <i data-lucide="user-minus" style="width: 18px; height: 18px;"></i>
                        </button>
                    `;
                    collaboratorsList.appendChild(div);
                });
            }
        } else {
            const div = document.createElement('div');
            div.style = "display: flex; flex-direction: column; gap: 1rem; align-items: center; padding: 1rem; background: rgba(255,255,255,0.03); border-radius: 0.5rem;";
            div.innerHTML = `
                <p style="font-size: 0.9rem; color: var(--text-secondary); text-align: center;">Vous avez accès à cette liste en tant qu'invité.</p>
                <button class="btn-icon" style="width: 100%; justify-content: center; background: rgba(239, 68, 68, 0.1); color: var(--danger-color); border: 1px solid rgba(239, 68, 68, 0.2); padding: 0.75rem;" onclick="leaveList('${listId}')">
                    <i data-lucide="log-out" style="width: 18px; height: 18px; margin-right: 8px;"></i> Quitter la liste
                </button>
            `;
            collaboratorsList.appendChild(div);
        }
    }

    if (shareManageModal) shareManageModal.classList.remove('hidden');
    lucide.createIcons({ scope: shareManageModal });
}

function closeShareModal() {
    if (shareManageModal) shareManageModal.classList.add('hidden');
}

if (btnShareModalClose) btnShareModalClose.onclick = closeShareModal;

window.showShareDetails = showShareDetails;
window.removeCollaborator = removeCollaborator;
window.leaveList = leaveList;

async function syncOrderToSheet(listId) {
    if (!state.userEmail) return;
    const items = state.items[listId] || [];

    const tasksToUpsert = items.map((item, index) => ({
        id: (item.id && item.id.toString().length > 10) ? item.id : undefined,
        list_id: listId,
        text: item.text,
        done: !!item.done,
        is_header: !!item.isHeader,
        is_sub_header: !!item.isSubHeader,
        parent_id: item.parentId,
        position: index,
        color: item.color,
        last_modifier: item.lastModifier || state.userEmail
    }));

    try {
        const { error } = await supabaseClient
            .from('tasks')
            .upsert(tasksToUpsert, { onConflict: 'id' });

        if (error) throw error;
    } catch (e) {
        console.error("Sync error:", e);
    }
}

async function deleteListItemInSupabase(listId, itemId) {
    try {
        const { error } = await supabaseClient
            .from('tasks')
            .delete()
            .eq('id', itemId);
        if (error) throw error;
    } catch (e) {
        console.error("Delete error:", e);
    }
}

async function deleteListInSupabase(listId) {
    if (!state.userEmail) return;
    try {
        const { error } = await supabaseClient
            .from('lists')
            .delete()
            .eq('id', listId);
        if (error) throw error;
        fetchSupabaseData();
    } catch (e) { console.error(e); }
}

async function renameListInSupabase(listId, newName) {
    if (!state.userEmail) return;
    try {
        const { error } = await supabaseClient
            .from('lists')
            .update({ name: newName })
            .eq('id', listId);
        if (error) throw error;
        fetchSupabaseData();
        return true;
    } catch (e) { console.error(e); return false; }
}

async function updateListColorInSupabase(listId, hexColor) {
    if (!state.userEmail) return;
    try {
        const { error } = await supabaseClient
            .from('lists')
            .update({ color: hexColor })
            .eq('id', listId);
        if (error) throw error;
        fetchSupabaseData();
    } catch (e) { console.error(e); }
}


async function duplicateListInSupabase(listId) {
    if (!state.userEmail) return;
    try {
        const list = state.lists.find(l => l.id === listId);
        if (!list) return;

        // 1. Create new list
        const { data: newList, error: listError } = await supabaseClient
            .from('lists')
            .insert([{
                name: list.name + " (Copie)",
                owner_id: (await supabaseClient.auth.getUser()).data.user.id,
                color: list.color
            }])
            .select();

        if (listError) throw listError;

        // 2. Clone tasks
        const tasks = state.items[listId] || [];
        const tasksToInsert = tasks.map((t, idx) => ({
            list_id: newList[0].id,
            text: t.text,
            done: t.done,
            is_header: t.isHeader,
            is_sub_header: t.isSubHeader,
            position: idx,
            color: t.color
        }));

        if (tasksToInsert.length > 0) {
            const { error: tasksError } = await supabaseClient
                .from('tasks')
                .insert(tasksToInsert);
            if (tasksError) throw tasksError;
        }

        fetchSupabaseData();
    } catch (e) { console.error(e); }
}

async function shareListInSupabase(listId, email) {
    if (!state.userEmail) return;
    try {
        const { error } = await supabaseClient
            .from('list_shares')
            .insert([{ list_id: listId, invited_email: email, permission: 'write' }]);
        if (error) throw error;
        alert(`Liste partagée avec ${email}`);
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
                updateListColorInSupabase(colorTarget.id, color);
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

// function saveListFilter(...) { /* Removed - Sheets only */ }

// --- Render Functions ---

function updateHeaderProgress(items) {
    if (!headerProgress) {
        console.warn("[ProgressBar] Element 'header-progress' not found");
        return;
    }
    const checkable = (items || []).filter(i => !i.isHeader);
    const done = checkable.filter(i => i.done).length;
    const total = checkable.length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const complete = total > 0 && pct === 100;

    console.log(`[ProgressBar] Syncing for List ID: ${state.activeListId} with ${items ? items.length : 0} items. Calc: ${done}/${total} (${pct}%)`);

    if (headerProgressLabel) headerProgressLabel.textContent = `${done} / ${total} terminé${done > 1 ? 's' : ''}`;
    if (headerProgressPct) {
        headerProgressPct.textContent = `${pct}%`;
        headerProgressPct.classList.toggle('complete', complete);
    }
    if (headerProgressFill) {
        headerProgressFill.style.width = `${pct}%`;
        headerProgressFill.classList.toggle('complete', complete);
    }

    // Celebrate at 100%
    if (complete && !state.completedLists.has(state.activeListId)) {
        fireConfetti(3500);
        playSound('finished');
        state.completedLists.add(state.activeListId);
    } else if (!complete) {
        state.completedLists.delete(state.activeListId);
    }

    // FIRE SPARKS only on movement (when updating)
    if (!complete && pct > 0) {
        fireSparks(12); // Emit a burst of sparks
    }

    // Ludic "Pop" Animation on update
    headerProgress.classList.remove('hit-animate');
    void headerProgress.offsetWidth; // Force reflow
    headerProgress.classList.add('hit-animate');

    // Robust visibility control for mobile
    headerProgress.classList.remove('hidden');
    headerProgress.classList.add('visible-row');

    // Clear any previous manual overrides that might lock visibility
    headerProgress.style.display = '';
    headerProgress.style.visibility = '';
    headerProgress.style.opacity = '';

    console.log(`[ProgressBar] Sync: ${done}/${total} (${pct}%). Visible=true`);
}

function fireSparks(count) {
    if (!headerProgressFill) return;

    // Create several random sparks at the tip
    for (let i = 0; i < count; i++) {
        const spark = document.createElement('div');
        spark.className = 'spark-particle';

        // Random direction and delay for a natural feel
        const dx = (Math.random() * 60 + 20) * (Math.random() > 0.5 ? 1 : -1);
        const dy = (Math.random() * 40 + 10) * (Math.random() > 0.5 ? 1 : -1);
        const duration = 0.5 + Math.random() * 0.5;
        const delay = Math.random() * 0.3; // Stagger sparks

        spark.style.setProperty('--dx', `${dx}px`);
        spark.style.setProperty('--dy', `${dy}px`);
        spark.style.right = '-2px';
        spark.style.top = `${20 + Math.random() * 60}%`;
        spark.style.animation = `spark-burn ${duration}s ease-out ${delay}s forwards`;

        headerProgressFill.appendChild(spark);
        setTimeout(() => spark.remove(), (duration + delay) * 1000);
    }
}

function fireConfetti(durationMs) {
    const end = Date.now() + durationMs;
    const colors = ['#eb7600', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#f59e0b', '#fff'];

    const interval = setInterval(() => {
        if (Date.now() > end) {
            clearInterval(interval);
            return;
        }

        // Spawn 3 particles per interval
        for (let i = 0; i < 3; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti-particle';

            const startX = Math.random() * window.innerWidth;
            const size = Math.random() * 8 + 6;
            const color = colors[Math.floor(Math.random() * colors.length)];
            const delay = Math.random() * 0.5;

            confetti.style.left = startX + 'px';
            confetti.style.top = '-20px';
            confetti.style.width = size + 'px';
            confetti.style.height = (size * 1.2) + 'px';
            confetti.style.backgroundColor = color;
            confetti.style.opacity = Math.random() * 0.5 + 0.5;
            confetti.style.boxShadow = `0 0 10px ${color}`;
            confetti.style.animation = `confetti-fall ${Math.random() * 2 + 1.5}s linear forwards`;
            confetti.style.animationDelay = delay + 's';

            document.body.appendChild(confetti);

            setTimeout(() => confetti.remove(), 4000);
        }
    }, 100);
}


function renderHome() {
    /* Login State Helper */
    if (!state.userEmail) {
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
    if (headerProgress) {
        headerProgress.classList.remove('visible-row');
        headerProgress.classList.add('hidden');
        headerProgress.style.display = '';
    }
    if (headerControlsRow) {
        headerControlsRow.classList.add('hidden');
        headerControlsRow.style.display = 'none';
    }

    headerTitle.innerText = "Mes Listes";

    // Clear and rebuild content
    listsContainer.innerHTML = '';

    if (state.lists.length === 0) {
        listsContainer.innerHTML = `<div style="text-align: center; color: var(--text-secondary); padding: 2rem;">Chargement...</div>`;
    }

    state.lists.forEach(list => {
        const listItems = state.items[list.id] || [];
        const itemCount = listItems.filter(i => !i.isHeader).length;

        const el = document.createElement('div');
        el.className = 'glass-panel list-item';
        // Remove global onclick, move to inner div

        el.innerHTML = `
            <div onclick="openList('${list.id}')" style="display: flex; align-items: center; flex: 1;">
                <div class="list-icon" style="background-color: ${list.color}">
                    <i data-lucide="list"></i>
                </div>
                <div>
                    <h3>${list.name}</h3>
                    <div class="list-meta">
                        ${itemCount} éléments 
                        ${list.isShared ? `<span onclick="showShareDetails(event, '${list.id}')" style="color: var(--accent-color); font-weight: bold; margin-left: 0.5rem; cursor: pointer; text-decoration: underline dotted;">• <i data-lucide="users" style="width: 12px; height: 12px; margin-right: 2px;"></i> ${list.userCount} ${list.userCount > 1 ? 'utilisateurs' : 'utilisateur'}</span>` : ''}
                    </div>
                </div>
            </div>
            <button class="btn-icon" onclick="openOptions(event, '${list.id}', '${list.name.replace(/'/g, "\\'")}')" style="margin-left: 0.5rem; color: var(--text-secondary);">
                <i data-lucide="more-vertical"></i>
            </button>
        `;
        listsContainer.appendChild(el);
    });

    lucide.createIcons();
}

function renderList(listId) {
    const list = state.lists.find(l => String(l.id) === String(listId));
    if (!list) {
        console.warn(`[renderList] List not found for ID: ${listId}`);
        return;
    }

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
    if (searchContainer) {
        searchContainer.classList.remove('hidden');
        // No longer need to constrain width, it grows to fill row
        if (searchInput) searchInput.style.width = '100%';
    }

    // Show controls row
    if (headerControlsRow) {
        headerControlsRow.classList.remove('hidden');
        headerControlsRow.style.display = 'flex';
    }

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

    const currentItems = state.items[String(listId)] || [];
    console.log(`[renderList] Rendering listId: ${listId} (Type: ${typeof listId})`);
    console.log(`[renderList] Items found: ${currentItems.length}`);
    if (currentItems.length === 0) {
        console.log("[renderList] state.items keys:", Object.keys(state.items));
    }

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
                const collapseKey = `${state.activeListId}-${item.id}`;
                sectionCollapsed = state.collapsedSections.has(collapseKey);

                // Check if ANY parent section is collapsed
                if (item.parentId) {
                    let currentPid = item.parentId;
                    while (currentPid) {
                        const ancestor = currentItems.find(i => i.isHeader && String(i.id) === String(currentPid));
                        if (!ancestor) break;
                        const ancestorIndex = currentItems.indexOf(ancestor);
                        const ancestorKey = `${state.activeListId}-${ancestor.id}`;
                        if (state.collapsedSections.has(ancestorKey)) return; // Hidden by ancestor collapse
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
                    const parentHeader = currentItems.find(i => i.isHeader && String(i.id) === String(item.parentId));
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
                        <button class="btn-delete-item" onclick="event.stopPropagation(); deleteListItem(${index}, event)">
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
                                    playSound('add');
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
                        const ancestor = currentItems.find(i => i.isHeader && String(i.id) === String(currentPid));
                        if (!ancestor) break;
                        const ancestorIndex = currentItems.indexOf(ancestor);
                        const ancestorKey = `${state.activeListId}-${ancestor.id}`;
                        if (state.collapsedSections.has(ancestorKey)) return; // Hidden by ancestor
                        currentPid = ancestor.parentId;
                    }
                }

                el.className = 'glass-panel task-item';
                let parentColor = null;
                if (item.parentId) {
                    el.classList.add('in-section');
                    // Check if parent header is a sub-header
                    const parentHeader = currentItems.find(i => i.isHeader && String(i.id) === String(item.parentId));
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
                        const grandParent = currentItems.find(i => i.isHeader && String(i.id) === String(parentHeader.parentId));
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
                    <button class="btn-delete-item" onclick="event.stopPropagation(); deleteListItem(${index}, event)">
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
    state.searchQuery = ''; // Reset search when switching lists
    if (searchInput) searchInput.value = '';
    renderList(id);
    // push history state for this list view
    pushAppState({ app: 'oslist', view: 'list', id: id });
}

// Refresh app by clearing caches and unregistering service workers, then reload.
async function refreshApp() {
    try {
        // Set flag to play sound AFTER reload
        localStorage.setItem('play_refresh_sound', 'true');

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
window.refreshApp = refreshApp;

// Push history state when navigating within the app so browser back stays inside the app
function pushAppState(stateObj) {
    try {
        history.pushState(stateObj, '');
    } catch (e) {
        // ignore
    }
}

function deleteListItem(index, e) {
    const listId = state.activeListId;
    if (!listId && listId !== 0) return;

    const items = state.items[listId];
    if (!items || !items[index]) return;

    // Center of explosion from event if available, otherwise fallback to bounding rect
    let cx, cy;
    if (e && e.clientX && e.clientY) {
        cx = e.clientX;
        cy = e.clientY;
    } else {
        const itemEl = document.querySelector(`.task-item[data-index="${index}"], .list-header[data-index="${index}"]`);
        if (itemEl) {
            const btn = itemEl.querySelector('.btn-delete-item');
            const r = btn ? btn.getBoundingClientRect() : itemEl.getBoundingClientRect();
            cx = r.left + r.width / 2;
            cy = r.top + r.height / 2;
        }
    }

    if (cx && cy) fireExplosionBurst(cx, cy);
    playSound('remove');

    // Visual feedback for item disappearance
    const itemEl = document.querySelector(`.task-item[data-index="${index}"], .list-header[data-index="${index}"]`);
    if (itemEl) {
        itemEl.classList.add('exploding');
        // Delay real deletion to show animation
        setTimeout(() => {
            // Recheck items in case state changed
            const freshItems = state.items[listId];
            if (freshItems && freshItems[index]) {
                const itemIdToDelete = freshItems[index].id;
                freshItems.splice(index, 1);
                renderList(listId);
                deleteListItemInSupabase(listId, itemIdToDelete);
                syncOrderToSheet(listId); // Still sync for position updates
            }
        }, 360);
    } else {
        const itemIdToDelete = items[index].id;
        items.splice(index, 1);
        renderList(listId);
        deleteListItemInSupabase(listId, itemIdToDelete);
        syncOrderToSheet(listId);
    }
}

function fireExplosionBurst(x, y) {
    // Mostly shades of red with some white/yellow for peak brilliance
    const colors = [
        '#ff0000', '#d32f2f', '#f44336', '#b71c1c', '#ff5252', // Red shades
        '#ffffff', // White
        '#ffeb3b', // Yellow
        '#d32f2f', '#ff0000', '#b71c1c' // More reds
    ];
    // Double particle count for better visibility
    for (let i = 0; i < 40; i++) {
        const p = document.createElement('div');
        p.className = 'explosion-particle';

        // Wider dispersion range
        const dx = (Math.random() * 240 - 120);
        const dy = (Math.random() * 260 - 130);
        const size = Math.random() * 8 + 4;
        const delay = Math.random() * 0.1; // Slight stagger

        p.style.left = x + 'px';
        p.style.top = y + 'px';
        p.style.width = size + 'px';
        p.style.height = size + 'px';
        p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        p.style.setProperty('--dx', `${dx}px`);
        p.style.setProperty('--dy', `${dy}px`);
        p.style.animation = `explosion-fly ${Math.random() * 0.4 + 0.4}s cubic-bezier(0.1, 0.8, 0.3, 1) ${delay}s forwards`;

        document.body.appendChild(p);
        setTimeout(() => p.remove(), 1000);
    }
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
    const item = items.find(i => String(i.id) === String(itemId));

    if (item) {
        item.done = !item.done;
        if (item.done) playSound('check');
        renderList(listId); // Re-render to update UI

        // Sync with Cloud
        syncOrderToSheet(listId);
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
        isSubHeader: false,
        isStandalone: isStandalone,
        parentId: parentId,
        lastModifier: state.userEmail
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
    playSound('add');

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
    if (e) e.stopPropagation();
    currentListId = id;
    currentListName = name;

    modalTitle.innerText = name;
    modalDesc.innerText = state.view === 'list' ? "Actions groupées et réglages" : "Options pour la liste";

    // Show/Hide Modal
    modal.style.display = 'flex';
    modal.classList.remove('hidden');

    // Layout Composition based on View
    if (state.view === 'list') {
        // --- VIEW: INSIDE A LIST (Settings gear click) ---
        if (listActionsRow) {
            listActionsRow.classList.remove('hidden');
            listActionsRow.style.setProperty('display', 'flex', 'important');
        }
        if (btnCheckAll) btnCheckAll.classList.remove('hidden');
        if (btnUncheckAll) btnUncheckAll.classList.remove('hidden');

        // Settings in list view usually focus on cleanup or renaming
        if (btnRename) btnRename.classList.remove('hidden');
        if (btnColor) btnColor.classList.remove('hidden');
        if (btnDelete) btnDelete.classList.remove('hidden');
        if (btnDuplicate) btnDuplicate.classList.add('hidden'); // Simplified: no duplicate from here
    } else {
        // --- VIEW: HOME SCREEN (Mes Listes) ---
        if (listActionsRow) {
            listActionsRow.classList.add('hidden');
            listActionsRow.style.setProperty('display', 'none', 'important');
        }
        if (btnCheckAll) btnCheckAll.classList.add('hidden');
        if (btnUncheckAll) btnUncheckAll.classList.add('hidden');

        if (btnRename) btnRename.classList.remove('hidden');
        if (btnDuplicate) btnDuplicate.classList.remove('hidden');
        if (btnColor) btnColor.classList.remove('hidden');
        if (btnDelete) btnDelete.classList.remove('hidden');
    }

    if (btnShare) {
        btnShare.classList.remove('hidden');
        btnShare.onclick = () => {
            const email = prompt("Email de la personne avec qui partager cette liste :");
            if (email) shareListWithUser(id, email);
        };
    }

    // Always reset logout for regular options (only shown in Logout button click)
    if (btnLogout) btnLogout.classList.add('hidden');

    // Re-bind onclick because id/name changed
    if (btnCheckAll) {
        btnCheckAll.onclick = (ev) => {
            ev.stopPropagation();
            checkAllItems(id, true);
        };
    }
    if (btnUncheckAll) {
        btnUncheckAll.onclick = (ev) => {
            ev.stopPropagation();
            checkAllItems(id, false);
        };
    }
}

function checkAllItems(listId, status) {
    const list = state.lists.find(l => l.id === listId);
    const listName = list ? list.name : "cette liste";
    const action = status ? "cocher" : "décocher";

    if (confirm(`Voulez-vous ${action} tous les éléments de "${listName}" ? L'état actuel sera réinitialisé.`)) {
        const items = state.items[listId] || [];
        items.forEach(item => {
            if (!item.isHeader) {
                item.done = status;
            }
        });

        if (status) playSound('check');
        renderList(listId);
        syncOrderToSheet(listId);
        closeOptions();
    }
}

function closeOptions() {
    modal.classList.add('hidden');
    modal.style.display = ''; // Reset to css rule
    currentListId = null;
    currentListName = "";
}

function toggleSection(sectionIndex) {
    const listId = state.activeListId;
    const item = state.items[listId] ? state.items[listId][sectionIndex] : null;
    if (!item) return;

    const collapseKey = `${listId}-${item.id}`;
    if (state.collapsedSections.has(collapseKey)) {
        state.collapsedSections.delete(collapseKey);
    } else {
        state.collapsedSections.add(collapseKey);
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
    if (btnDuplicate) btnDuplicate.classList.add('hidden');
    if (btnLogout) btnLogout.classList.add('hidden');
    if (listActionsRow) {
        listActionsRow.classList.add('hidden');
        listActionsRow.style.setProperty('display', 'none', 'important');
    }

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
                    const collapseKey = `${listId}-${item.id}`;
                    state.collapsedSections.add(collapseKey);
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

// function syncOrderToSheet(listId) { /* Removed logic handled by Supabase syncOrderToSheet above */ }

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
        playSound('add');
        createListInSupabase(name);
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
        renameListInSupabase(currentListId, newName);
        closeOptions();
    }
};

if (btnDuplicate) btnDuplicate.onclick = () => {
    if (confirm("Dupliquer cette liste ?")) {
        duplicateListInSupabase(currentListId);
        closeOptions();
    }
};

if (btnDelete) btnDelete.onclick = () => {
    if (confirm("Voulez-vous vraiment supprimer cette liste ? Cette action est irréversible.")) {
        deleteListInSupabase(currentListId);
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

    // Local memory only for list filters
    const list = state.lists.find(l => l.id === state.activeListId);
    if (list) {
        list.filter = state.filter;
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

if (themeCheckbox) {
    themeCheckbox.addEventListener('change', () => {
        const isLight = themeCheckbox.checked;
        document.body.classList.toggle('light-theme', isLight);
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
    });
}

if (soundToggle) {
    soundToggle.addEventListener('click', () => {
        state.soundEnabled = !state.soundEnabled;
        localStorage.setItem('soundEnabled', state.soundEnabled);
        updateSoundIcon();
    });
}

function updateSoundIcon() {
    if (!soundIcon) return;
    if (state.soundEnabled) {
        soundIcon.setAttribute('data-lucide', 'volume-2');
        soundToggle.style.color = 'var(--accent-color)';
    } else {
        soundIcon.setAttribute('data-lucide', 'volume-x');
        soundToggle.style.color = 'var(--text-secondary)';
    }
    lucide.createIcons();
}

// --- Init ---
window.onload = async function () {

    // Initialize Theme
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        if (themeCheckbox) themeCheckbox.checked = true;
    }

    // Initialize Sound
    const savedSound = localStorage.getItem('soundEnabled');
    state.soundEnabled = savedSound === null ? true : savedSound === 'true';
    updateSoundIcon();

    // Check if we should play refresh sound (after a manual refreshApp call)
    if (localStorage.getItem('play_refresh_sound') === 'true') {
        localStorage.removeItem('play_refresh_sound');
        // Small delay to ensure Audio context is ready
        setTimeout(() => playSound('refresh'), 300);
    }

    // Supabase Auth Init
    await checkPersistentAuth();
    // renderHome is called inside checkPersistentAuth or fetchSupabaseData
    initColorPicker();


    // Trigger page reveal animation
    if (app) {
        app.classList.remove('page-reveal');
        void app.offsetWidth; // Force reflow
        app.classList.add('page-reveal');
    }

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
    // CRITICAL: Do not clear hash if it contains auth tokens!
    try {
        const hash = window.location.hash || "";
        const hasAuthHash = hash.includes('access_token=') || 
                            hash.includes('error=') || 
                            hash.includes('type=recovery') ||
                            hash.includes('type=signup') ||
                            hash.includes('refresh_token=');
                            
        if (!hasAuthHash) {
            history.replaceState({ app: 'oslist', view: 'home' }, '');
        } else {
            console.log("Auth hash detected in URL, blocking history.replaceState to preserve tokens.");
        }
    } catch (e) { }

    window.addEventListener('popstate', (e) => {
        const s = e.state;
        if (!s || s.app !== 'oslist') {
            // If popstate is not ours, just ignore it on load to preserve auth hash!
            if (state.userEmail) {
                goHome();
                try { history.pushState({ app: 'oslist', view: 'home' }, ''); } catch (err) { }
            }
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

// --- Service Worker Registration with Force Update Detection ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').then(registration => {
            console.log('Service Worker Registered (v51)');

            registration.onupdatefound = () => {
                const installingWorker = registration.installing;
                installingWorker.onstatechange = () => {
                    if (installingWorker.state === 'installed') {
                        if (navigator.serviceWorker.controller) {
                            console.log('Nouveau contenu disponible. Veuillez rafraîchir la page.');
                            // Optionnel: on peut forcer le refresh ici si on est sûr de soi
                        } else {
                            console.log('Contenu mis en cache pour une utilisation hors ligne.');
                        }
                    }
                };
            };
        }).catch(err => {
            console.error('Service Worker registration failed:', err);
        });
    });
}
