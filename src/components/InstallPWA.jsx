import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Download, CheckCircle2, Smartphone, ShieldCheck } from 'lucide-react'

// Détecte si l'app est déjà installée en mode standalone
const isStandalone = () =>
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true

export default function InstallPWA() {
    const [deferredPrompt, setDeferredPrompt] = useState(null)
    const [showAlreadyInstalled, setShowAlreadyInstalled] = useState(false)
    const [isInstalled, setIsInstalled] = useState(false)

    useEffect(() => {
        setIsInstalled(isStandalone())

        const handleBeforeInstallPrompt = (e) => {
            // Empêche Chrome d'afficher automatiquement la bannière
            e.preventDefault()
            // Stocke l'événement pour plus tard
            setDeferredPrompt(e)
        }

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
        }
    }, [])

    const handleInstallClick = async () => {
        if (isInstalled) {
            setShowAlreadyInstalled(true)
            return
        }

        if (!deferredPrompt) {
            // Si pas d'event (ex: déjà installé mais pas détecté ou pas Chrome Android)
            setShowAlreadyInstalled(true)
            return
        }

        // Affiche le prompt natif
        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        
        if (outcome === 'accepted') {
            setDeferredPrompt(null)
            setIsInstalled(true)
        }
    }

    return (
        <>
            {/* Bouton d'installation Premium */}
            <motion.button
                whileHover={{ scale: 1.05, boxShadow: '0 0 20px var(--accent-glow)' }}
                whileTap={{ scale: 0.95 }}
                onClick={handleInstallClick}
                className="btn"
                style={{
                    background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                    padding: '0.75rem 1.25rem',
                    borderRadius: '1rem',
                    boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer'
                }}
            >
                <Download size={18} />
                Installer l'application
            </motion.button>

            {/* Popup "Déjà installé" Premium */}
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
                        {/* Overlay */}
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

                        {/* Modal Content */}
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
                                L'application est déjà sur votre appareil. Vous profitez déjà de l'expérience complète et optimisée.
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
        </>
    )
}
