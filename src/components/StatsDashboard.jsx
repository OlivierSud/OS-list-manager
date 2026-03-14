import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, List, Share2, Download, ArrowLeft, Calendar, Mail, ShieldCheck, Lock, KeyRound, ChevronRight, X } from 'lucide-react'

export default function StatsDashboard() {
    const [isAuthorized, setIsAuthorized] = useState(false)
    const [passcode, setPasscode] = useState('')
    const [error, setError] = useState(false)
    const [activeTab, setActiveTab] = useState('users')
    const [stats, setStats] = useState({
        users: [],
        lists: [],
        shares: []
    })
    const [loading, setLoading] = useState(true)
    const [deferredPrompt, setDeferredPrompt] = useState(null)
    const [showAlreadyInstalled, setShowAlreadyInstalled] = useState(false)
    const [isInstalled, setIsInstalled] = useState(false)

    // Détecte si l'app est déjà installée en mode standalone
    const checkStandalone = () =>
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true

    useEffect(() => {
        setIsInstalled(checkStandalone())
        
        // Only fetch stats if authorized
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
                console.error('Supabase client not found on window. Ensure supabase-config.js is loaded.')
                setLoading(false)
                return
            }

            // Fetch data from multiple tables in parallel
            const [listsRes, tasksRes, sharesRes] = await Promise.all([
                supabase.from('lists').select('*'),
                supabase.from('tasks').select('last_modifier, created_at, is_header, list_id'),
                supabase.from('shares').select('*')
            ])

            if (listsRes.error) console.error('Error fetching lists:', listsRes.error)
            if (tasksRes.error) console.error('Error fetching tasks:', tasksRes.error)
            if (sharesRes.error) console.error('Error fetching shares:', sharesRes.error)

            const lists = listsRes.data || []
            const tasks = tasksRes.data || []
            const shares = sharesRes.data || []

            console.log(`Stats fetched: ${lists.length} lists, ${tasks.length} tasks, ${shares.length} shares`)

            const userMap = new Map()
            tasks.forEach(task => {
                const email = task.last_modifier?.toLowerCase()
                if (email) {
                    const date = new Date(task.created_at)
                    if (!userMap.has(email) || date > userMap.get(email)) {
                        userMap.set(email, date)
                    }
                }
            })
            const users = Array.from(userMap.entries()).map(([email, lastMod]) => ({
                email,
                lastModDate: lastMod,
                lastMod: lastMod.toLocaleDateString('fr-FR', {
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
                users: users.sort((a, b) => b.lastModDate - a.lastModDate),
                lists: lists.map(l => ({ ...l, itemCount: taskCounts.get(l.id) || 0 })),
                shares: shares
            })
        } catch (error) {
            console.error('Critical error in fetchStats:', error)
        }
        setLoading(false)
    }

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
        { id: 'users', label: 'Utilisateurs', icon: Users, count: stats.users.length },
        { id: 'lists', label: 'Listes', icon: List, count: stats.lists.length },
        { id: 'shares', label: 'Partages', icon: Share2, count: stats.shares.length }
    ]

    if (!isAuthorized) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'radial-gradient(circle at center, #070e27 0%, #020617 100%)' }}>
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ 
                        width: '100%', 
                        maxWidth: '400px', 
                        padding: '2.5rem', 
                        background: 'rgba(15, 23, 42, 0.7)', 
                        backdropFilter: 'blur(20px)', 
                        borderRadius: '2rem', 
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        textAlign: 'center',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                    }}
                >
                    <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleInstall}
                            className="btn"
                            style={{ 
                                padding: '0.6rem 1rem', 
                                fontSize: '0.85rem',
                                background: 'rgba(59, 130, 246, 0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                border: '1px solid rgba(59, 130, 246, 0.2)',
                                color: '#3b82f6',
                                borderRadius: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            <Download size={16} />
                            Installer
                        </motion.button>
                    </div>

                    <div style={{ 
                        width: '80px', 
                        height: '80px', 
                        borderRadius: '50%', 
                        background: 'rgba(59, 130, 246, 0.1)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        margin: '0 auto 2rem',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        color: '#3b82f6'
                    }}>
                        <Lock size={40} />
                    </div>

                    <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem', color: '#f8fafc' }}>Accès Réservé</h1>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', fontSize: '0.95rem' }}>
                        Veuillez entrer le code d'accès pour consulter les statistiques.
                    </p>

                    <form onSubmit={handlePasscodeSubmit}>
                        <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                            <div style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
                                <KeyRound size={20} />
                            </div>
                            <input 
                                type="password" 
                                value={passcode}
                                onChange={(e) => { setPasscode(e.target.value); setError(false); }}
                                placeholder="Code d'accès"
                                style={{
                                    width: '100%',
                                    padding: '1.25rem 1.25rem 1.25rem 3.5rem',
                                    borderRadius: '1rem',
                                    background: 'rgba(2, 6, 23, 0.6)',
                                    border: `1px solid ${error ? '#ef4444' : 'rgba(255,255,255,0.1)'}`,
                                    color: 'white',
                                    fontSize: '1rem',
                                    outline: 'none',
                                    transition: 'all 0.2s',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        {error && (
                            <motion.p 
                                initial={{ opacity: 0, x: -10 }} 
                                animate={{ opacity: 1, x: 0 }} 
                                style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '1.5rem', marginTop: '-0.5rem' }}
                            >
                                Code incorrect. Veuillez réessayer.
                            </motion.p>
                        )}

                        <motion.button
                            whileHover={{ scale: 1.02, boxShadow: '0 0 20px var(--accent-glow)' }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            className="btn"
                            style={{ 
                                width: '100%', 
                                padding: '1.25rem', 
                                borderRadius: '1rem', 
                                background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                                fontSize: '1rem',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                border: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            Déverrouiller
                            <ChevronRight size={20} />
                        </motion.button>
                    </form>

                    <div style={{ marginTop: '2.5rem' }}>
                        <a href="./index.html" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                            <ArrowLeft size={16} />
                            Retour à l'application
                        </a>
                    </div>
                </motion.div>

                {/* Popup Déjà Installé (Lock Screen version) */}
                <AnimatePresence>
                    {showAlreadyInstalled && (
                        <div style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 2000,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '1rem'
                        }}>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setShowAlreadyInstalled(false)}
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    background: 'rgba(2, 6, 23, 0.8)',
                                    backdropFilter: 'blur(8px)'
                                }}
                            />
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                style={{
                                    position: 'relative',
                                    width: '100%',
                                    maxWidth: '340px',
                                    background: 'rgba(15, 23, 42, 0.95)',
                                    border: '1px solid rgba(59, 130, 246, 0.3)',
                                    borderRadius: '1.5rem',
                                    padding: '2rem',
                                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                                    textAlign: 'center'
                                }}
                            >
                                <button
                                    onClick={() => setShowAlreadyInstalled(false)}
                                    style={{
                                        position: 'absolute',
                                        top: '1rem',
                                        right: '1rem',
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--text-secondary)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <X size={20} />
                                </button>
                                <div style={{
                                    width: '64px',
                                    height: '64px',
                                    borderRadius: '50%',
                                    background: 'rgba(16, 185, 129, 0.1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto 1.5rem',
                                    border: '1px solid rgba(16, 185, 129, 0.2)'
                                }}>
                                    <ShieldCheck size={32} color="#10b981" />
                                </div>
                                <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', color: '#f8fafc' }}>
                                    Déjà installée !
                                </h2>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0, lineHeight: 1.5 }}>
                                    L'application de statistiques est déjà sur votre appareil.
                                </p>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setShowAlreadyInstalled(false)}
                                    style={{
                                        marginTop: '2rem',
                                        width: '100%',
                                        padding: '0.8rem',
                                        borderRadius: '0.75rem',
                                        background: 'rgba(59, 130, 246, 0.1)',
                                        border: '1px solid rgba(59, 130, 246, 0.2)',
                                        color: '#3b82f6',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    J'ai compris
                                </motion.button>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        )
    }

    return (
        <div style={{ minHeight: '100vh', padding: '1rem', maxWidth: '800px', margin: '0 auto' }}>
            {/* Header */}
            <header style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                padding: '1.5rem',
                marginBottom: '2rem',
                background: 'rgba(15, 23, 42, 0.7)',
                backdropFilter: 'blur(12px)',
                borderRadius: '1.25rem',
                border: '1px solid rgba(59, 130, 246, 0.2)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <a href="./index.html" style={{ color: 'var(--text-secondary)' }}>
                        <ArrowLeft size={24} />
                    </a>
                    <h1 style={{ fontSize: '1.5rem', margin: 0, background: 'linear-gradient(135deg, #3b82f6, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Dashboard Stats
                    </h1>
                </div>

                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleInstall}
                    className="btn"
                    style={{ 
                        padding: '0.6rem 1rem', 
                        fontSize: '0.85rem',
                        background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        border: 'none',
                        color: 'white',
                        borderRadius: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                    }}
                >
                    <Download size={16} />
                    Installer
                </motion.button>
            </header>

            {/* Popup Déjà Installé */}
            <AnimatePresence>
                {showAlreadyInstalled && (
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 2000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1rem'
                    }}>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowAlreadyInstalled(false)}
                            style={{
                                position: 'absolute',
                                inset: 0,
                                background: 'rgba(2, 6, 23, 0.8)',
                                backdropFilter: 'blur(8px)'
                            }}
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            style={{
                                position: 'relative',
                                width: '100%',
                                maxWidth: '340px',
                                background: 'rgba(15, 23, 42, 0.95)',
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                borderRadius: '1.5rem',
                                padding: '2rem',
                                boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                                textAlign: 'center'
                            }}
                        >
                            <button
                                onClick={() => setShowAlreadyInstalled(false)}
                                style={{
                                    position: 'absolute',
                                    top: '1rem',
                                    right: '1rem',
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-secondary)',
                                    cursor: 'pointer'
                                }}
                            >
                                <X size={20} />
                            </button>
                            <div style={{
                                width: '64px',
                                height: '64px',
                                borderRadius: '50%',
                                background: 'rgba(16, 185, 129, 0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 1.5rem',
                                border: '1px solid rgba(16, 185, 129, 0.2)'
                            }}>
                                <ShieldCheck size={32} color="#10b981" />
                            </div>
                            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', color: '#f8fafc' }}>
                                Déjà installée !
                            </h2>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0, lineHeight: 1.5 }}>
                                L'application de statistiques est déjà sur votre appareil.
                            </p>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setShowAlreadyInstalled(false)}
                                style={{
                                    marginTop: '2rem',
                                    width: '100%',
                                    padding: '0.8rem',
                                    borderRadius: '0.75rem',
                                    background: 'rgba(59, 130, 246, 0.1)',
                                    border: '1px solid rgba(59, 130, 246, 0.2)',
                                    color: '#3b82f6',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                J'ai compris
                            </motion.button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Tabs */}
            <nav style={{ 
                display: 'flex', 
                gap: '0.5rem', 
                marginBottom: '1.5rem',
                background: 'rgba(15, 23, 42, 0.5)',
                padding: '0.5rem',
                borderRadius: '1rem'
            }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.75rem',
                            borderRadius: '0.75rem',
                            border: 'none',
                            background: activeTab === tab.id ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                            color: activeTab === tab.id ? '#3b82f6' : 'var(--text-secondary)',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        <tab.icon size={20} />
                        <span style={{ fontSize: '0.8rem' }}>{tab.label} ({tab.count})</span>
                    </button>
                ))}
            </nav>

            {/* Content */}
            <main>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                        Chargement des données...
                    </div>
                ) : (
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            style={{ display: 'grid', gap: '1rem' }}
                        >
                            {activeTab === 'users' && stats.users.map((user, i) => (
                                <div key={i} className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ padding: '0.75rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '0.75rem', color: '#3b82f6' }}>
                                        <Mail size={20} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600 }}>{user.email}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                            <Calendar size={12} />
                                            Dernière modif : {user.lastMod}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {activeTab === 'lists' && stats.lists.map((list, i) => (
                                <div key={i} className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ 
                                        width: '40px', 
                                        height: '40px', 
                                        borderRadius: '10px', 
                                        background: list.color || '#3b82f6',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white'
                                    }}>
                                        <List size={20} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600 }}>{list.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Propriétaire : {list.owner_email}</div>
                                    </div>
                                    <div style={{ 
                                        background: 'rgba(59, 130, 246, 0.1)', 
                                        color: '#3b82f6', 
                                        padding: '0.25rem 0.75rem', 
                                        borderRadius: '1rem',
                                        fontSize: '0.85rem',
                                        fontWeight: 600
                                    }}>
                                        {list.itemCount} éléments
                                    </div>
                                </div>
                            ))}

                            {activeTab === 'shares' && stats.shares.map((share, i) => (
                                <div key={i} className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ padding: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '0.75rem', color: '#10b981' }}>
                                        <Share2 size={20} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600 }}>Cible : {share.shared_with_email}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>List ID : {share.list_id}</div>
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    </AnimatePresence>
                )}
            </main>
        </div>
    )
}
