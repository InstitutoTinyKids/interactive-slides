import React, { useState } from 'react';
import { User, Settings, ArrowRight, Play, Lock, X } from 'lucide-react';

export default function AliasEntry({ onEnter, onAdmin, isActive }) {
    const [alias, setAlias] = useState('');
    const [showAdminPass, setShowAdminPass] = useState(false);
    const [pass, setPass] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (alias.trim()) onEnter(alias);
    };

    const handleAdminSubmit = (e) => {
        e.preventDefault();
        if (pass === '3232**') {
            setShowAdminPass(false);
            setPass('');
            onAdmin();
        } else {
            alert('Contraseña incorrecta');
        }
    };

    return (
        <div style={{
            height: '100vh',
            width: '100vw',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle at center, #1e1b4b, #050510)',
            position: 'fixed',
            top: 0,
            left: 0
        }}>
            {/* Background blur effects */}
            <div style={{ position: 'absolute', top: '10%', left: '10%', width: '300px', height: '300px', background: '#4f46e5', filter: 'blur(150px)', opacity: 0.2, pointerEvents: 'none' }}></div>
            <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: '300px', height: '300px', background: '#7c3aed', filter: 'blur(150px)', opacity: 0.2, pointerEvents: 'none' }}></div>

            <div className="glass anim-up" style={{
                width: '100%',
                maxWidth: '450px',
                padding: '40px',
                display: 'flex',
                flexDirection: 'column',
                gap: '30px'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '90px',
                        height: '90px',
                        background: 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 10px',
                    }}>
                        <img src="/logo.png" style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Logo" />
                    </div>
                    <h1 style={{ fontSize: '2.2rem', fontWeight: 900, marginBottom: '4px', letterSpacing: '-1px' }}>Guía Tiny Kids</h1>
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Ingresa para comenzar la lección</p>
                </div>

                <div style={{ textAlign: 'center' }}>
                    <span style={{
                        padding: '6px 16px',
                        borderRadius: '100px',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        border: '1px solid',
                        background: isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        borderColor: isActive ? '#10b981' : '#ef4444',
                        color: isActive ? '#10b981' : '#ef4444'
                    }}>
                        {isActive ? '● Sesión Activa' : '○ Esperando al profesor'}
                    </span>
                </div>

                {!showAdminPass ? (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', paddingLeft: '5px' }}>TU NOMBRE / ALIAS</label>
                            <input
                                className="premium-input"
                                type="text"
                                placeholder="Ej. Juan Pérez"
                                value={alias}
                                onChange={(e) => setAlias(e.target.value)}
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="btn-premium"
                            disabled={!isActive}
                            style={{ padding: '18px' }}
                        >
                            {isActive ? 'Unirse a la Clase' : 'Sesión Pausada'}
                            <ArrowRight size={20} />
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleAdminSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', paddingLeft: '5px' }}>MODO ADMINISTRADOR</label>
                                <X size={20} style={{ cursor: 'pointer', color: '#64748b' }} onClick={() => setShowAdminPass(false)} />
                            </div>
                            <input
                                className="premium-input"
                                type="password"
                                placeholder="Ingresa la contraseña"
                                value={pass}
                                onChange={(e) => setPass(e.target.value)}
                                autoFocus
                                required
                            />
                        </div>
                        <button type="submit" className="btn-premium" style={{ padding: '18px' }}>
                            Acceder al Editor
                            <Lock size={20} />
                        </button>
                    </form>
                )}

                <div style={{ textAlign: 'center', marginTop: '10px' }}>
                    <button
                        onClick={() => setShowAdminPass(!showAdminPass)}
                        style={{ background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', padding: '10px' }}
                    >
                        <Settings size={22} />
                    </button>
                </div>
            </div>
        </div>
    );
}
