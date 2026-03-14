import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, List, Share2, Download, ArrowLeft, Calendar, Mail, ShieldCheck, Lock, KeyRound, ChevronRight, X, SortAsc, Clock } from 'lucide-react'

export default function StatsDashboard() {
    const [isAuthorized, setIsAuthorized] = useState(false)
    const [passcode, setPasscode] = useState('')
    const [error, setError] = useState(false)
    const [activeTab, setActiveTab] = useState('users')
    const [sortBy, setSortBy] = useState('date') // 'date' or 'alpha'
    const [stats, setStats] = useState({
        users: [],
        lists: []
    })
    const [loading, setLoading] = useState(true)
    const [deferredPrompt, setDeferredPrompt] = useState(null)
    const [showAlreadyInstalled, setShowAlreadyInstalled] = useState(false)
    const [isInstalled, setIsInstalled] = useState(false)

    const checkStandalone = () =>
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true

    useEffect(() => {
        setIsInstalled(checkStandalone())
        if (isAuthorized) {
            fetchStats()
        }

        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault()
            setDeferredPrompt(e)
        }
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }, [isAuthorized])

    const handlePasscodeSubmit = (e) => {
        e.preventDefault()
        if (passcode.toLowerCase() === 'aqwse') {
            setIsAuthorized(true)
            setError(false)
        } else {
            setError(true)
            setPasscode('')
        }
    }

    const fetchStats = async () => {
        setLoading(true)
        console.log('Fetching stats started...')
        try {
            const supabase = window.supabaseClient
            if (!supabase) {
                console.error('Supabase client not found on window.')
                setLoading(false)
                return
            }

            const [listsRes, tasksRes, detailsRes] = await Promise.all([
                supabase.from('lists').select('*'),
                supabase.from('tasks').select('last_modifier, created_at, is_header, list_id'),
                supabase.from('vue_details_listes').select('email') // Assuming 'email' is the column name
            ])

            const lists = listsRes.data || []
            const tasks = tasksRes.data || []
            const details = detailsRes.data || []

            // Aggregate Users from all sources
            const userMap = new Map() // email -> lastActivity (Date)

            // 1. From Tasks
            tasks.forEach(task => {
                const email = task.last_modifier?.toLowerCase()
                if (email) {
                    const date = new Date(task.created_at)
                    if (!userMap.has(email) || date > userMap.get(email)) {
                        userMap.set(email, date)
                    }
                }
            })

            // 2. From Lists (Owners)
            lists.forEach(list => {
                const email = list.owner_email?.toLowerCase()
                if (email && !userMap.has(email)) {
                    userMap.set(email, new Date(0)) // Default to epoch if no activity
                }
            })

            // 3. From vue_details_listes
            details.forEach(item => {
                const email = item.email?.toLowerCase()
                if (email && !userMap.has(email)) {
                    userMap.set(email, new Date(0))
                }
            })

            const users = Array.from(userMap.entries()).map(([email, lastMod]) => ({
                email,
                lastModDate: lastMod,
                lastModText: lastMod.getTime() === 0 ? 'Aucune activité' : lastMod.toLocaleDateString('fr-FR', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                })
            }))

            const taskCounts = new Map()
            tasks.forEach(task => {
                if (!task.is_header) {
                    taskCounts.set(task.list_id, (taskCounts.get(task.list_id) || 0) + 1)
                }
            })

            setStats({
                users,
                lists: lists.map(l => ({ ...l, itemCount: taskCounts.get(l.id) || 0 }))
            })
        } catch (error) {
            console.error('Critical error in fetchStats:', error)
        }
        setLoading(false)
    }

    const sortedUsers = [...stats.users].sort((a, b) => {
        if (sortBy === 'alpha') return a.email.localeCompare(b.email)
        return b.lastModDate - a.lastModDate
    })

    const handleInstall = async () => {
        if (isInstalled || !deferredPrompt) {
            setShowAlreadyInstalled(true)
            return
        }
        if (deferredPrompt) {
            deferredPrompt.prompt()
            const { outcome } = await deferredPrompt.userChoice
            if (outcome === 'accepted') {
                setDeferredPrompt(null)
                setIsInstalled(true)
            }
        }
    }

    const tabs = [
        { id: 'users', label: 'Emails', icon: Users, count: stats.users.length },
        { id: 'lists', label: 'Listes', icon: List, count: stats.lists.length }
    ]

    if (!isAuthorized) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'radial-gradient(circle at center, #070e27 0%, #020617 100%)' }}>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ width: '100%', maxWidth: '400px', padding: '2.5rem', background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(20px)', borderRadius: '2rem', border: '1px solid rgba(59, 130, 246, 0.2)', textAlign: 'center', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleInstall} className="btn" style={{ padding: '0.6rem 1rem', fontSize: '0.85rem', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid rgba(59, 130, 246, 0.2)', color: '#3b82f6', borderRadius: '0.75rem', cursor: 'pointer' }}>
                            <Download size={16} /> Installer
                        </motion.button>
                    </div>
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem', border: '1px solid rgba(59, 130, 246, 0.2)', color: '#3b82f6' }}>
                        <Lock size={40} />
                    </div>
                    <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem', color: '#f8fafc' }}>Accès Réservé</h1>
                    <form onSubmit={handlePasscodeSubmit}>
                        <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                            <div style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
                                <KeyRound size={20} />
                            </div>
                            <input type="password" value={passcode} onChange={(e) => { setPasscode(e.target.value); setError(false); }} placeholder="Code d'accès" style={{ width: '100%', padding: '1.25rem 1.25rem 1.25rem 3.5rem', borderRadius: '1rem', background: 'rgba(2, 6, 23, 0.6)', border: `1px solid ${error ? '#ef4444' : 'rgba(255,255,255,0.1)'}`, color: 'white', boxSizing: 'border-box', outline: 'none' }} />
                        </div>
                        {error && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '1rem' }}>Code incorrect.</motion.p>}
                        <motion.button type="submit" className="btn" style={{ width: '100%', padding: '1.25rem', borderRadius: '1rem', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', border: 'none', cursor: 'pointer', color: 'white' }}>
                            Déverrouiller <ChevronRight size={20} />
                        </motion.button>
                    </form>
                    <div style={{ marginTop: '2.5rem' }}>
                        <a href="./index.html" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                            <ArrowLeft size={16} /> Retour
                        </a>
                    </div>
                </motion.div>
                <AnimatePresence>
                    {showAlreadyInstalled && (
                        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAlreadyInstalled(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(2, 6, 23, 0.8)', backdropFilter: 'blur(8px)' }} />
                            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} style={{ position: 'relative', width: '100%', maxWidth: '340px', background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '1.5rem', padding: '2rem', textAlign: 'center' }}>
                                <ShieldCheck size={32} color="#10b981" style={{ margin: '0 auto 1rem' }} />
                                <h2 style={{ fontSize: '1.25rem', color: '#f8fafc' }}>Déjà installée !</h2>
                                <button onClick={() => setShowAlreadyInstalled(false)} style={{ marginTop: '1.5rem', width: '100%', padding: '0.8rem', borderRadius: '0.75rem', background: 'rgba(59, 130, 246, 0.1)', border: 'none', color: '#3b82f6', fontWeight: 600, cursor: 'pointer' }}>OK</button>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        )
    }

    return (
        <div style={{ minHeight: '100vh', padding: '1rem', maxWidth: '800px', margin: '0 auto' }}>
            <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem', marginBottom: '2rem', background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(12px)', borderRadius: '1.25rem', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <a href="./index.html" style={{ color: 'var(--text-secondary)' }}><ArrowLeft size={24} /></a>
                    <h1 style={{ fontSize: '1.5rem', margin: 0, background: 'linear-gradient(135deg, #3b82f6, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Stats Dashboard</h1>
                </div>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleInstall} className="btn" style={{ padding: '0.6rem 1rem', fontSize: '0.85rem', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', display: 'flex', alignItems: 'center', gap: '0.5rem', border: 'none', color: 'white', borderRadius: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                    <Download size={16} /> Installer
                </motion.button>
            </header>

            <nav style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: 'rgba(15, 23, 42, 0.5)', padding: '0.5rem', borderRadius: '1rem' }}>
                {tabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', padding: '0.75rem', borderRadius: '0.75rem', border: 'none', background: activeTab === tab.id ? 'rgba(59, 130, 246, 0.15)' : 'transparent', color: activeTab === tab.id ? '#3b82f6' : 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer' }}>
                        <tab.icon size={20} />
                        <span style={{ fontSize: '0.8rem' }}>{tab.label} ({tab.count})</span>
                    </button>
                ))}
            </nav>

            <main>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>Chargement...</div>
                ) : (
                    <AnimatePresence mode="wait">
                        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ display: 'grid', gap: '1rem' }}>
                            {activeTab === 'users' && (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                        <button onClick={() => setSortBy('alpha')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', borderRadius: '0.5rem', background: sortBy === 'alpha' ? 'rgba(59, 130, 246, 0.2)' : 'transparent', border: '1px solid rgba(59, 130, 246, 0.2)', color: sortBy === 'alpha' ? '#3b82f6' : 'var(--text-secondary)', fontSize: '0.75rem', cursor: 'pointer' }}>
                                            <SortAsc size={14} /> Nom
                                        </button>
                                        <button onClick={() => setSortBy('date')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', borderRadius: '0.5rem', background: sortBy === 'date' ? 'rgba(59, 130, 246, 0.2)' : 'transparent', border: '1px solid rgba(59, 130, 246, 0.2)', color: sortBy === 'date' ? '#3b82f6' : 'var(--text-secondary)', fontSize: '0.75rem', cursor: 'pointer' }}>
                                            <Clock size={14} /> Date
                                        </button>
                                    </div>
                                    {sortedUsers.map((user, i) => (
                                        <div key={i} className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{ padding: '0.75rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '0.75rem', color: '#3b82f6' }}><Mail size={20} /></div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 600 }}>{user.email}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                    <Calendar size={12} /> {user.lastModText}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}

                            {activeTab === 'lists' && stats.lists.map((list, i) => (
                                <div key={i} className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: list.color || '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}><List size={20} /></div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600 }}>{list.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Propriétaire : {list.owner_email}</div>
                                    </div>
                                    <div style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>{list.itemCount} éléments</div>
                                </div>
                            ))}

                        </motion.div>
                    </AnimatePresence>
                )}
            </main>
            <AnimatePresence>
                {showAlreadyInstalled && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAlreadyInstalled(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(2, 6, 23, 0.8)', backdropFilter: 'blur(8px)' }} />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} style={{ position: 'relative', width: '100%', maxWidth: '340px', background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '1.5rem', padding: '2rem', textAlign: 'center' }}>
                            <ShieldCheck size={32} color={deferredPrompt ? "#10b981" : "#3b82f6"} style={{ margin: '0 auto 1rem' }} />
                            <h2 style={{ fontSize: '1.25rem', color: '#f8fafc' }}>{deferredPrompt ? "Déjà installée !" : "Installation Manuelle"}</h2>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                                {deferredPrompt 
                                    ? "L'application de statistiques est déjà installée sur votre appareil." 
                                    : "L'installation automatique n'est pas disponible. Vous pouvez ajouter cette page à l'écran d'accueil via le menu de votre navigateur."}
                            </p>
                            <button onClick={() => setShowAlreadyInstalled(false)} style={{ marginTop: '1.5rem', width: '100%', padding: '0.8rem', borderRadius: '0.75rem', background: 'rgba(59, 130, 246, 0.1)', border: 'none', color: '#3b82f6', fontWeight: 600, cursor: 'pointer' }}>D'accord</button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
