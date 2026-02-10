import React, { useState, useEffect } from 'react';
import { User, Settings, ArrowRight, Play, Lock, X, GraduationCap, ChevronRight, Key } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function AliasEntry({ onEnter, onAdmin, onTeacher }) {
    const [view, setView] = useState('role_selection'); // role_selection, admin_login, teacher_login, student_alias, project_selection, project_pass
    const [alias, setAlias] = useState('');
    const [pass, setPass] = useState('');
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [projectPass, setProjectPass] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        const { data } = await supabase.from('projects').select('*').order('name');
        setProjects(data || []);
    };

    const handleAdminSubmit = (e) => {
        e.preventDefault();
        if (pass === '3232**') {
            onAdmin();
        } else {
            alert('Contraseña de Administrador incorrecta');
        }
    };

    const handleTeacherSubmit = (e) => {
        e.preventDefault();
        if (pass === '2323**') {
            setView('project_selection');
            // Role will be set when selecting project
        } else {
            alert('Contraseña de Teacher incorrecta');
        }
    };

    const handleStudentStart = (e) => {
        e.preventDefault();
        if (alias.trim()) {
            setView('project_selection');
        }
    };

    const handleProjectSelect = (project) => {
        if (view === 'role_selection') return; // Should not happen

        setSelectedProject(project);
        if (view === 'project_selection' && !alias) {
            // Teacher mode
            onTeacher(project);
        } else {
            // Student mode - needs project pass
            setView('project_pass');
        }
    };

    const handleProjectPassSubmit = (e) => {
        e.preventDefault();
        if (projectPass === selectedProject.access_code || !selectedProject.access_code) {
            onEnter(alias, selectedProject);
        } else {
            alert('Clase de acceso incorrecta para este programa');
        }
    };

    const renderRoleSelection = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                <div style={{ width: '90px', height: '90px', margin: '0 auto 15px' }}>
                    <img src="/logo.png" style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Logo" />
                </div>
                <h1 style={{ fontSize: '2.2rem', fontWeight: 900, marginBottom: '4px', letterSpacing: '-1px', color: 'white' }}>Central TK</h1>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Selecciona tu rol para continuar</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px' }}>
                <button
                    onClick={() => setView('student_alias')}
                    className="glass"
                    style={{ padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', textAlign: 'left', transition: '0.2s', width: '100%' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                    <div style={{ width: '55px', height: '55px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', flexShrink: 0 }}>
                        <User size={28} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white', margin: 0 }}>Student</h3>
                    </div>
                    <ChevronRight size={22} color="#3b82f6" />
                </button>

                <button
                    onClick={() => { setView('teacher_login'); setPass(''); }}
                    className="glass"
                    style={{ padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', textAlign: 'left', transition: '0.2s', width: '100%' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                    <div style={{ width: '55px', height: '55px', background: 'rgba(124, 58, 237, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a78bfa', flexShrink: 0 }}>
                        <GraduationCap size={28} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white', margin: 0 }}>Teacher</h3>
                    </div>
                    <ChevronRight size={22} color="#a78bfa" />
                </button>

                <button
                    onClick={() => { setView('admin_login'); setPass(''); }}
                    className="glass"
                    style={{ padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', textAlign: 'left', transition: '0.2s', width: '100%' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                    <div style={{ width: '55px', height: '55px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', flexShrink: 0 }}>
                        <Settings size={28} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white', margin: 0 }}>Admin</h3>
                    </div>
                    <ChevronRight size={22} color="#10b981" />
                </button>
            </div>
        </div>
    );

    const renderProjectSelection = () => {
        const activeProjects = projects.filter(p => p.is_active || !alias); // Teachers see all, students only active

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button onClick={() => setView(alias ? 'student_alias' : 'role_selection')} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><ChevronRight size={20} style={{ transform: 'rotate(180deg)' }} /></button>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'white' }}>Selecciona Programa</h2>
                </div>

                <div style={{ display: 'grid', gap: '10px', maxHeight: '400px', overflowY: 'auto', paddingRight: '5px' }}>
                    {activeProjects.length === 0 ? (
                        <p style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>No hay programas activos en este momento.</p>
                    ) : (
                        activeProjects.map(project => (
                            <button
                                key={project.id}
                                onClick={() => handleProjectSelect(project)}
                                className="glass"
                                style={{
                                    padding: '16px',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    transition: '0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                                <span style={{ fontWeight: 700, color: 'white' }}>{project.name}</span>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    {project.access_code && alias && <Lock size={14} color="#64748b" />}
                                    <ArrowRight size={18} color="#7c3aed" />
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>
        );
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
                width: '90%',
                maxWidth: '450px',
                padding: '40px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px'
            }}>
                {view === 'role_selection' && renderRoleSelection()}

                {view === 'admin_login' && (
                    <form onSubmit={handleAdminSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <button type="button" onClick={() => setView('role_selection')} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><ChevronRight size={20} style={{ transform: 'rotate(180deg)' }} /></button>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'white' }}>Administrador</h2>
                        </div>
                        <input
                            className="premium-input"
                            type="password"
                            placeholder="Contraseña Administrador"
                            value={pass}
                            onChange={(e) => setPass(e.target.value)}
                            autoFocus
                            required
                            style={{ pointerEvents: 'auto', position: 'relative', zIndex: 10 }}
                        />
                        <button type="submit" className="btn-premium" style={{ padding: '18px' }}>
                            Acceder al Panel
                            <Lock size={20} />
                        </button>
                    </form>
                )}

                {view === 'teacher_login' && (
                    <form onSubmit={handleTeacherSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <button type="button" onClick={() => setView('role_selection')} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><ChevronRight size={20} style={{ transform: 'rotate(180deg)' }} /></button>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'white' }}>Teacher Mode</h2>
                        </div>
                        <input
                            className="premium-input"
                            type="password"
                            placeholder="Contraseña Teacher"
                            value={pass}
                            onChange={(e) => setPass(e.target.value)}
                            autoFocus
                            required
                            style={{ pointerEvents: 'auto', position: 'relative', zIndex: 10 }}
                        />
                        <button type="submit" className="btn-premium" style={{ padding: '18px' }}>
                            Acceder como Teacher
                            <GraduationCap size={20} />
                        </button>
                    </form>
                )}

                {view === 'student_alias' && (
                    <form onSubmit={handleStudentStart} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <button type="button" onClick={() => setView('role_selection')} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><ChevronRight size={20} style={{ transform: 'rotate(180deg)' }} /></button>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'white' }}>Bienvenido Student</h2>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>TU NOMBRE / ALIAS</label>
                            <input
                                className="premium-input"
                                type="text"
                                placeholder="Ej. Juan Pérez"
                                value={alias}
                                onChange={(e) => setAlias(e.target.value)}
                                autoFocus
                                required
                                style={{ pointerEvents: 'auto', position: 'relative', zIndex: 10 }}
                            />
                        </div>
                        <button type="submit" className="btn-premium" style={{ padding: '18px' }}>
                            Ver Programas
                            <ArrowRight size={20} />
                        </button>
                    </form>
                )}

                {view === 'project_selection' && renderProjectSelection()}

                {view === 'project_pass' && (
                    <form onSubmit={handleProjectPassSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <button type="button" onClick={() => setView('project_selection')} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><ChevronRight size={20} style={{ transform: 'rotate(180deg)' }} /></button>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 900, color: 'white' }}>Acceso: {selectedProject.name}</h2>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Este programa requiere una clave específica para ingresar.</p>
                        <input
                            className="premium-input"
                            type="password"
                            placeholder="Ingresa la clave del programa"
                            value={projectPass}
                            onChange={(e) => setProjectPass(e.target.value)}
                            autoFocus
                            required
                            style={{ pointerEvents: 'auto', position: 'relative', zIndex: 10 }}
                        />
                        <button type="submit" className="btn-premium" style={{ padding: '18px' }}>
                            Entrar a la Clase
                            <Key size={20} />
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
