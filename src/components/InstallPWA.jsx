import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Download, Share, Plus } from 'lucide-react'

// Détecte si on est sur iOS (iPhone/iPad)
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent)

// Détecte si on est sur Safari (et pas Chrome sur iOS)
const isSafari = () =>
    /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

// Détecte si l'app est déjà installée en mode standalone
const isStandalone = () =>
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true

export default function InstallPWA() {
    const [installPrompt, setInstallPrompt] = useState(null)
    const [showBanner, setShowBanner] = useState(false)
    const [showIOSGuide, setShowIOSGuide] = useState(false)
    const [showAndroidGuide, setShowAndroidGuide] = useState(false)
    const [platform, setPlatform] = useState('android') // par defaut on suppose android/autre

    useEffect(() => {
        // 1. Ne pas afficher si on est déjà installé (PWA standalone)
        if (isStandalone()) return

        // 2. Ne pas afficher si l'user a dismiss récemment
        const dismissed = localStorage.getItem('pwa-install-dismissed')
        if (dismissed) {
            const daysSince = (Date.now() - parseInt(dismissed)) / (1000 * 60 * 60 * 24)
            if (daysSince < 7) return
        }

        // On détermine la configuration de l'appareil
        const isAppIOS = isIOS()
        const isAppSafari = isSafari()

        if (isAppIOS) {
            setPlatform('ios')
        }

        // 3. Capturer l'événement natif Android (s'il se déclenche)
        const handleBeforeInstall = (e) => {
            e.preventDefault()
            setInstallPrompt(e)
            setPlatform('android')
        }
        window.addEventListener('beforeinstallprompt', handleBeforeInstall)

        // 4. Afficher la bannière quoiqu'il arrive après 1 seconde (si pas standalone)
        const timer = setTimeout(() => setShowBanner(true), 1000)

        return () => {
            clearTimeout(timer)
            window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
        }
    }, [])

    const handleInstallClick = async () => {
        if (platform === 'ios') {
            setShowIOSGuide(true)
            return
        }

        // Android
        if (installPrompt) {
            await installPrompt.prompt()
            const { outcome } = await installPrompt.userChoice
            if (outcome === 'accepted') {
                setShowBanner(false)
            }
            setInstallPrompt(null)
        } else {
            // Si on n'a pas eu l'événement (navigateur non supporté, ou dev local)
            setShowAndroidGuide(true)
        }
    }

    const handleDismiss = () => {
        setShowBanner(false)
        setShowIOSGuide(false)
        setShowAndroidGuide(false)
        localStorage.setItem('pwa-install-dismissed', Date.now().toString())
    }

    return (
        <AnimatePresence>
            {showBanner && (
                <>
                    {/* ── Bannière principale ─────────────────────────────── */}
                    <motion.div
                        key="pwa-banner"
                        initial={{ y: 120, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 120, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        style={{
                            position: 'fixed',
                            bottom: '1.25rem',
                            left: '1rem',
                            right: '1rem',
                            maxWidth: '560px',
                            margin: '0 auto',
                            zIndex: 1000,
                        }}
                    >
                        <div style={{
                            background: 'rgba(15, 23, 42, 0.95)',
                            backdropFilter: 'blur(20px)',
                            WebkitBackdropFilter: 'blur(20px)',
                            border: '1px solid rgba(59, 130, 246, 0.35)',
                            borderRadius: '1.25rem',
                            padding: '1rem 1.25rem',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(59,130,246,0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                        }}>
                            {/* Icône */}
                            <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '12px',
                                background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                boxShadow: '0 4px 12px rgba(59,130,246,0.4)',
                            }}>
                                <Download size={22} color="white" />
                            </div>

                            {/* Texte */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{
                                    margin: 0,
                                    fontWeight: 600,
                                    fontSize: '0.95rem',
                                    color: '#f8fafc',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}>
                                    Installer l'application
                                </p>
                                <p style={{
                                    margin: '2px 0 0',
                                    fontSize: '0.78rem',
                                    color: '#94a3b8',
                                }}>
                                    {platform === 'ios'
                                        ? 'Accès rapide depuis votre écran d\'accueil'
                                        : 'Fonctionne hors ligne · Accès rapide'}
                                </p>
                            </div>

                            {/* Bouton d'action commun */}
                            <button
                                onClick={handleInstallClick}
                                style={{
                                    background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '0.65rem',
                                    padding: '0.55rem 1rem',
                                    fontWeight: 600,
                                    fontSize: '0.85rem',
                                    cursor: 'pointer',
                                    flexShrink: 0,
                                    boxShadow: '0 4px 12px rgba(59,130,246,0.4)',
                                    transition: 'transform 0.15s, box-shadow 0.15s',
                                }}
                                onMouseDown={e => e.currentTarget.style.transform = 'scale(0.96)'}
                                onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                {platform === 'ios' || (!installPrompt && platform !== 'ios') ? 'Comment ?' : 'Installer'}
                            </button>

                            {/* Bouton fermer */}
                            <button
                                onClick={handleDismiss}
                                style={{
                                    background: 'rgba(255,255,255,0.06)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '50%',
                                    width: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: '#94a3b8',
                                    flexShrink: 0,
                                    padding: 0,
                                }}
                            >
                                <X size={15} />
                            </button>
                        </div>
                    </motion.div>

                    {/* ── Guide iOS (modal) ───────────────────────────────── */}
                    <AnimatePresence>
                        {showIOSGuide && (
                            <motion.div
                                key="ios-guide"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={handleDismiss}
                                style={{
                                    position: 'fixed',
                                    inset: 0,
                                    background: 'rgba(0,0,0,0.7)',
                                    zIndex: 1001,
                                    display: 'flex',
                                    alignItems: 'flex-end',
                                    justifyContent: 'center',
                                    padding: '1rem',
                                }}
                            >
                                <motion.div
                                    initial={{ y: 60, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    exit={{ y: 60, opacity: 0 }}
                                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                    onClick={e => e.stopPropagation()}
                                    style={{
                                        background: 'rgba(15, 23, 42, 0.98)',
                                        backdropFilter: 'blur(24px)',
                                        border: '1px solid rgba(59,130,246,0.3)',
                                        borderRadius: '1.5rem',
                                        padding: '1.75rem',
                                        width: '100%',
                                        maxWidth: '400px',
                                        boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
                                    }}
                                >
                                    {/* Titre */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                                        <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#f8fafc' }}>
                                            Installer sur iPhone
                                        </h2>
                                        <button onClick={handleDismiss} style={{
                                            background: 'rgba(255,255,255,0.08)',
                                            border: 'none',
                                            borderRadius: '50%',
                                            width: '32px',
                                            height: '32px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            color: '#94a3b8',
                                            padding: 0,
                                        }}>
                                            <X size={15} />
                                        </button>
                                    </div>

                                    {/* Étapes */}
                                    {[
                                        {
                                            icon: <Share size={20} color="#3b82f6" />,
                                            step: '1',
                                            title: 'Appuyez sur Partager',
                                            desc: 'Le bouton □↑ en bas de Safari',
                                        },
                                        {
                                            icon: <Plus size={20} color="#3b82f6" />,
                                            step: '2',
                                            title: '"Sur l\'écran d\'accueil"',
                                            desc: 'Faites défiler le menu vers le bas',
                                        },
                                        {
                                            icon: <Download size={20} color="#3b82f6" />,
                                            step: '3',
                                            title: 'Appuyez sur "Ajouter"',
                                            desc: 'L\'app apparaît sur votre écran d\'accueil',
                                        },
                                    ].map(({ icon, step, title, desc }) => (
                                        <div key={step} style={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '1rem',
                                            marginBottom: '1.1rem',
                                        }}>
                                            <div style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '10px',
                                                background: 'rgba(59,130,246,0.12)',
                                                border: '1px solid rgba(59,130,246,0.25)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                            }}>
                                                {icon}
                                            </div>
                                            <div>
                                                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: '#f8fafc' }}>
                                                    {step}. {title}
                                                </p>
                                                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                                                    {desc}
                                                </p>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Note Safari */}
                                    <div style={{
                                        marginTop: '1.25rem',
                                        padding: '0.75rem 1rem',
                                        background: 'rgba(59,130,246,0.08)',
                                        borderRadius: '0.75rem',
                                        border: '1px solid rgba(59,130,246,0.2)',
                                    }}>
                                        <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>
                                            ⚠️ Disponible via <strong style={{ color: '#f8fafc' }}>Safari</strong>.
                                        </p>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ── Guide Android manuel (si pas d'événement) ───────── */}
                    <AnimatePresence>
                        {showAndroidGuide && (
                            <motion.div
                                key="android-guide"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={handleDismiss}
                                style={{
                                    position: 'fixed',
                                    inset: 0,
                                    background: 'rgba(0,0,0,0.7)',
                                    zIndex: 1001,
                                    display: 'flex',
                                    alignItems: 'flex-end',
                                    justifyContent: 'center',
                                    padding: '1rem',
                                }}
                            >
                                <motion.div
                                    initial={{ y: 60, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    exit={{ y: 60, opacity: 0 }}
                                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                    onClick={e => e.stopPropagation()}
                                    style={{
                                        background: 'rgba(15, 23, 42, 0.98)',
                                        backdropFilter: 'blur(24px)',
                                        border: '1px solid rgba(59,130,246,0.3)',
                                        borderRadius: '1.5rem',
                                        padding: '1.75rem',
                                        width: '100%',
                                        maxWidth: '400px',
                                        boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                                        <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#f8fafc' }}>
                                            Installer sur Android
                                        </h2>
                                        <button onClick={handleDismiss} style={{
                                            background: 'rgba(255,255,255,0.08)',
                                            border: 'none',
                                            borderRadius: '50%',
                                            width: '32px',
                                            height: '32px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            color: '#94a3b8',
                                            padding: 0,
                                        }}>
                                            <X size={15} />
                                        </button>
                                    </div>

                                    {[
                                        {
                                            icon: <span style={{ fontWeight: 'bold' }}>⋮</span>,
                                            step: '1',
                                            title: 'Ouvrez le menu',
                                            desc: 'Appuyez sur les 3 points en haut à droite',
                                        },
                                        {
                                            icon: <Download size={20} color="#3b82f6" />,
                                            step: '2',
                                            title: '"Ajouter à l\'écran d\'accueil"',
                                            desc: 'Dans la liste des options',
                                        },
                                    ].map(({ icon, step, title, desc }) => (
                                        <div key={step} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.1rem' }}>
                                            <div style={{
                                                width: '40px', height: '40px', borderRadius: '10px',
                                                background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                            }}>
                                                {icon}
                                            </div>
                                            <div>
                                                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: '#f8fafc' }}>{step}. {title}</p>
                                                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>{desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </>
            )}
        </AnimatePresence>
    )
}
