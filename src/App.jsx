import { useState, useEffect } from 'react'
import { Plus, List, CheckSquare, Settings, ArrowLeft, RefreshCw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { fetchSheetData } from './utils/googleSheets'
import './index.css'

// Mock Data for initial dev (Fallback)
const INITIAL_LISTS = [
    { id: 1, name: 'Courses', color: '#3b82f6', items: 3 },
    { id: 2, name: 'Work Project', color: '#10b981', items: 5 },
    { id: 3, name: 'Ideas', color: '#8b5cf6', items: 12 }
]

const INITIAL_ITEMS = {
    1: [
        { id: 101, text: 'Milk', done: false },
        { id: 102, text: 'Bread', done: true },
        { id: 103, text: 'Eggs', done: false },
    ],
    2: [],
    3: []
}

function App() {
    const [view, setView] = useState('home') // 'home' | 'list'
    const [activeListId, setActiveListId] = useState(null)
    const [lists, setLists] = useState(INITIAL_LISTS)
    const [items, setItems] = useState(INITIAL_ITEMS)
    const [newItemText, setNewItemText] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        loadData();
    }, [])

    const loadData = async () => {
        setLoading(true);
        // TODO: Connect this to state once data structure is confirmed
        const data = await fetchSheetData();
        if (data && data.length > 0) {
            console.log('Fetched data from Sheets:', data);
            // Alert just for demo purposes so user knows it connected
            // alert('Connected to Google Sheets! Check console for data.');
        }
        setLoading(false);
    }

    // Navigation
    const openList = (id) => {
        setActiveListId(id)
        setView('list')
    }

    const goHome = () => {
        setView('home')
        setActiveListId(null)
    }

    // Actions
    const toggleItem = (listId, itemId) => {
        setItems(prev => ({
            ...prev,
            [listId]: prev[listId].map(item =>
                item.id === itemId ? { ...item, done: !item.done } : item
            )
        }))
    }

    const addItem = (e) => {
        e.preventDefault()
        if (!newItemText.trim()) return

        const newItem = {
            id: Date.now(),
            text: newItemText,
            done: false
        }

        setItems(prev => ({
            ...prev,
            [activeListId]: [...(prev[activeListId] || []), newItem]
        }))
        setNewItemText('')
    }

    const activeListData = lists.find(l => l.id === activeListId)

    return (
        <div className="app-container">
            {/* Header */}
            <header className="glass-panel" style={{
                position: 'sticky', top: '1rem', zIndex: 10, padding: '1rem',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: '1rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {view === 'list' && (
                        <button
                            onClick={goHome}
                            style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: 0 }}
                        >
                            <ArrowLeft size={24} />
                        </button>
                    )}
                    <h1 style={{ fontSize: '1.25rem' }}>
                        {view === 'home' ? 'My Lists' : activeListData?.name}
                    </h1>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        onClick={loadData}
                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                        className={loading ? 'spin' : ''}
                    >
                        <RefreshCw size={20} />
                    </button>
                    <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)' }}>
                        <Settings size={20} />
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main style={{ paddingBottom: '5rem' }}>
                <AnimatePresence mode="wait">
                    {view === 'home' ? (
                        <motion.div
                            key="home"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="list-grid"
                            style={{ display: 'grid', gap: '1rem' }}
                        >
                            {lists.map(list => (
                                <div
                                    key={list.id}
                                    className="glass-panel"
                                    onClick={() => openList(list.id)}
                                    style={{
                                        padding: '1.25rem', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{
                                            width: '40px', height: '40px', borderRadius: '10px',
                                            background: list.color, display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            <List size={20} color="white" />
                                        </div>
                                        <div>
                                            <h3 style={{ fontSize: '1.1rem' }}>{list.name}</h3>
                                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                                                {items[list.id]?.length || 0} items
                                            </p>
                                        </div>
                                    </div>
                                    <div style={{ color: 'var(--text-secondary)' }}>→</div>
                                </div>
                            ))}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="list"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {items[activeListId]?.map(item => (
                                    <div
                                        key={item.id}
                                        className="glass-panel"
                                        onClick={() => toggleItem(activeListId, item.id)}
                                        style={{
                                            padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer',
                                            background: item.done ? 'rgba(30, 41, 59, 0.4)' : 'var(--bg-glass)'
                                        }}
                                    >
                                        <div style={{
                                            width: '24px', height: '24px', borderRadius: '6px',
                                            border: `2px solid ${item.done ? 'var(--success-color)' : 'var(--border-color)'}`,
                                            background: item.done ? 'var(--success-color)' : 'transparent',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            transition: 'all 0.2s'
                                        }}>
                                            {item.done && <CheckSquare size={16} color="white" />}
                                        </div>
                                        <span style={{
                                            flex: 1,
                                            textDecoration: item.done ? 'line-through' : 'none',
                                            color: item.done ? 'var(--text-secondary)' : 'var(--text-primary)'
                                        }}>
                                            {item.text}
                                        </span>
                                    </div>
                                ))}

                                {(!items[activeListId] || items[activeListId].length === 0) && (
                                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                                        No items yet. Add one!
                                    </div>
                                )}
                            </div>

                            {/* Add Item Form */}
                            <form
                                onSubmit={addItem}
                                style={{
                                    position: 'fixed', bottom: '1.5rem', left: '1rem', right: '1rem', maxWidth: '600px', margin: '0 auto',
                                    display: 'flex', gap: '0.5rem'
                                }}
                            >
                                <input
                                    type="text"
                                    value={newItemText}
                                    onChange={(e) => setNewItemText(e.target.value)}
                                    placeholder="New item..."
                                    className="glass-panel"
                                    style={{
                                        flex: 1, padding: '1rem', borderRadius: 'var(--radius-lg)',
                                        border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15, 23, 42, 0.9)'
                                    }}
                                />
                                <button
                                    type="submit"
                                    className="btn"
                                    style={{
                                        width: '56px', height: '56px', borderRadius: '50%', padding: 0,
                                        boxShadow: '0 4px 15px var(--accent-glow)'
                                    }}
                                >
                                    <Plus size={24} />
                                </button>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* FAB for New List (Home view only) */}
            {view === 'home' && (
                <button
                    className="btn"
                    style={{
                        position: 'fixed', bottom: '2rem', right: '2rem',
                        width: '64px', height: '64px', borderRadius: '50%', padding: 0,
                        boxShadow: '0 4px 20px var(--accent-glow)',
                        zIndex: 20
                    }}
                >
                    <Plus size={32} />
                </button>
            )}
        </div>
    )
}

export default App
