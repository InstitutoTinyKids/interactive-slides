import React, { useState, useEffect } from 'react';
import { User, Settings, ArrowRight, Play, Lock, X, GraduationCap, ChevronRight, Key, Folder, ChevronLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function AliasEntry({ onEnter, onAdmin, onTeacher }) {
    const [view, setView] = useState('role_selection'); // role_selection, admin_login, teacher_login, student_alias, project_selection, project_pass
    const [alias, setAlias] = useState('');
    const [pass, setPass] = useState('');
    const [projects, setProjects] = useState([]);
    const [folders, setFolders] = useState([]);
    const [currentFolderId, setCurrentFolderId] = useState(null);
    const [selectedProject, setSelectedProject] = useState(null);
    const [projectPass, setProjectPass] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        try {
            const { data: folderData, error: fError } = await supabase.from('folders').select('*').order('order_index');
            if (!fError) setFolders(folderData || []);

            let { data: projectData, error: pError } = await supabase.from('projects').select('*').order('order_index');

            if (pError) {
                const { data: fallbackData } = await supabase.from('projects').select('*').order('name');
                projectData = fallbackData;
            }

            setProjects(projectData || []);
        } catch (err) {
            console.error('Error loading selection projects:', err);
        }
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
        <div className="role-selection-grid">
            <div className="role-header">
                <div className="logo-container">
                    <img src="/logo.png" style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Logo" />
                </div>
                <h1 className="role-title">Central TK</h1>
                <p className="role-subtitle">Selecciona tu rol para continuar</p>
            </div>

            <div className="role-buttons">
                <button
                    onClick={() => setView('student_alias')}
                    className="role-btn glass"
                >
                    <div className="role-btn-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                        <User size={28} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <h3 style={{ fontWeight: 800, color: 'white', margin: 0 }}>Student</h3>
                    </div>
                    <ChevronRight size={22} color="#3b82f6" />
                </button>

                <button
                    onClick={() => { setView('teacher_login'); setPass(''); }}
                    className="role-btn glass"
                >
                    <div className="role-btn-icon" style={{ background: 'rgba(124, 58, 237, 0.1)', color: '#a78bfa' }}>
                        <GraduationCap size={28} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <h3 style={{ fontWeight: 800, color: 'white', margin: 0 }}>Teacher</h3>
                    </div>
                    <ChevronRight size={22} color="#a78bfa" />
                </button>

                <button
                    onClick={() => { setView('admin_login'); setPass(''); }}
                    className="role-btn glass"
                >
                    <div className="role-btn-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                        <Settings size={28} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <h3 style={{ fontWeight: 800, color: 'white', margin: 0 }}>Admin</h3>
                    </div>
                    <ChevronRight size={22} color="#10b981" />
                </button>
            </div>
        </div>
    );

    const renderProjectSelection = () => {
        const activeProjects = projects.filter(p => (p.is_active || !alias) && p.folder_id === currentFolderId);
        const currentFolders = !currentFolderId ? folders : []; // No nested folders allowed based on requirements

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                        onClick={() => {
                            if (currentFolderId) setCurrentFolderId(null);
                            else setView(alias ? 'student_alias' : 'role_selection');
                        }}
                        style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'white' }}>
                        {currentFolderId ? folders.find(f => f.id === currentFolderId)?.name : 'Selecciona Programa'}
                    </h2>
                </div>

                <div className="project-list-container" style={{ display: 'grid', gap: '10px', maxHeight: '400px', overflowY: 'auto', paddingRight: '5px' }}>
                    {currentFolders.map(folder => (
                        <button
                            key={folder.id}
                            onClick={() => setCurrentFolderId(folder.id)}
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
                                transition: '0.2s',
                                background: 'rgba(16, 185, 129, 0.05)'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Folder size={20} color="#10b981" />
                                <span style={{ fontWeight: 700, color: 'white' }}>{folder.name}</span>
                            </div>
                            <ArrowRight size={18} color="#10b981" />
                        </button>
                    ))}

                    {activeProjects.length === 0 && currentFolders.length === 0 ? (
                        <p style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>No hay programas disponibles aquí.</p>
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
                                    transition: '0.2s',
                                    background: 'transparent'
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
            left: 0,
            overflow: 'hidden'
        }}>
            {/* Background blur effects */}
            <div style={{ position: 'absolute', top: '10%', left: '10%', width: '300px', height: '300px', background: '#4f46e5', filter: 'blur(150px)', opacity: 0.2, pointerEvents: 'none' }}></div>
            <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: '300px', height: '300px', background: '#7c3aed', filter: 'blur(150px)', opacity: 0.2, pointerEvents: 'none' }}></div>

            <div className="entry-card glass anim-up">
                {view === 'role_selection' && renderRoleSelection()}

                {view === 'admin_login' && (
                    <div className="responsive-grid">
                        <div className="responsive-header" style={{ marginBottom: '15px' }}>
                            <div className="logo-container" style={{ width: '100px', height: '100px', marginBottom: '20px' }}>
                                <img src="/logo.png" style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Logo" />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <button type="button" onClick={() => setView('role_selection')} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '8px', borderRadius: '10px' }}><ChevronLeft size={20} /></button>
                                <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: 'white', margin: 0 }}>Administrador</h2>
                            </div>
                            <p className="role-subtitle" style={{ fontSize: '0.9rem', marginTop: '5px' }}>Control total del sistema</p>
                        </div>
                        <form onSubmit={handleAdminSubmit} className="responsive-content" style={{ gap: '20px', width: '100%' }}>
                            <input
                                className="premium-input text-center"
                                type="password"
                                placeholder="Ingresa Contraseña..."
                                value={pass}
                                onChange={(e) => setPass(e.target.value)}
                                autoFocus
                                required
                                style={{ pointerEvents: 'auto', position: 'relative', zIndex: 10, height: '65px', fontSize: '1.1rem', background: 'rgba(255,255,255,0.03)' }}
                            />
                            <button type="submit" className="btn-premium" style={{ padding: '20px', fontSize: '1rem', borderRadius: '16px', width: '100%' }}>
                                Acceder al Panel
                                <Lock size={20} />
                            </button>
                        </form>
                    </div>
                )}

                {view === 'teacher_login' && (
                    <div className="responsive-grid">
                        <div className="responsive-header" style={{ marginBottom: '15px' }}>
                            <div className="logo-container" style={{ width: '100px', height: '100px', marginBottom: '20px' }}>
                                <img src="/logo.png" style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Logo" />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <button type="button" onClick={() => setView('role_selection')} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#a78bfa', cursor: 'pointer', padding: '8px', borderRadius: '10px' }}><ChevronLeft size={20} /></button>
                                <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: 'white', margin: 0 }}>Teacher Mode</h2>
                            </div>
                            <p className="role-subtitle" style={{ fontSize: '0.9rem', marginTop: '5px' }}>Inicia sesión para moderar</p>
                        </div>
                        <form onSubmit={handleTeacherSubmit} className="responsive-content" style={{ gap: '20px', width: '100%' }}>
                            <input
                                className="premium-input text-center"
                                type="password"
                                placeholder="Ingresa Contraseña..."
                                value={pass}
                                onChange={(e) => setPass(e.target.value)}
                                autoFocus
                                required
                                style={{ pointerEvents: 'auto', position: 'relative', zIndex: 10, height: '65px', fontSize: '1.1rem', background: 'rgba(255,255,255,0.03)' }}
                            />
                            <button type="submit" className="btn-premium" style={{ padding: '20px', fontSize: '1rem', borderRadius: '16px', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', width: '100%' }}>
                                Acceder como Teacher
                                <GraduationCap size={20} />
                            </button>
                        </form>
                    </div>
                )}

                {view === 'student_alias' && (
                    <div className="responsive-grid">
                        <div className="responsive-header" style={{ marginBottom: '15px' }}>
                            <div className="logo-container" style={{ width: '100px', height: '100px', marginBottom: '20px' }}>
                                <img src="/logo.png" style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Logo" />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <button type="button" onClick={() => setView('role_selection')} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '8px', borderRadius: '10px' }}><ChevronLeft size={20} /></button>
                                <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: 'white', margin: 0 }}>Estudiante</h2>
                            </div>
                            <p className="role-subtitle" style={{ fontSize: '0.9rem', marginTop: '5px' }}>Comienza tu aventura</p>
                        </div>
                        <form onSubmit={handleStudentStart} className="responsive-content" style={{ gap: '20px', width: '100%' }}>
                            <input
                                className="premium-input text-center"
                                type="text"
                                placeholder="Tu nombre o apodo..."
                                value={alias}
                                onChange={(e) => setAlias(e.target.value)}
                                autoFocus
                                required
                                style={{ pointerEvents: 'auto', position: 'relative', zIndex: 10, height: '65px', fontSize: '1.1rem', background: 'rgba(255,255,255,0.03)' }}
                            />
                            <button type="submit" className="btn-premium" style={{ padding: '20px', fontSize: '1rem', borderRadius: '16px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', width: '100%' }}>
                                Ver Programas
                                <ArrowRight size={20} />
                            </button>
                        </form>
                    </div>
                )}

                {view === 'project_selection' && (
                    <div className="responsive-grid">
                        <div className="responsive-header">
                            <div className="logo-container">
                                <img src="/logo.png" style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Logo" />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <button onClick={() => setView(alias ? 'student_alias' : 'role_selection')} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><ChevronRight size={20} style={{ transform: 'rotate(180deg)' }} /></button>
                                <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'white' }}>Programas</h2>
                            </div>
                            <p className="role-subtitle">Selecciona la lección que vas a realizar hoy</p>
                        </div>
                        <div className="responsive-content" style={{ width: '100%' }}>
                            {renderProjectSelection()}
                        </div>
                    </div>
                )}

                {view === 'project_pass' && (
                    <div className="responsive-grid">
                        <div className="responsive-header" style={{ marginBottom: '15px' }}>
                            <div className="logo-container" style={{ width: '100px', height: '100px', marginBottom: '20px' }}>
                                <img src="/logo.png" style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Logo" />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <button type="button" onClick={() => setView('project_selection')} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#a78bfa', cursor: 'pointer', padding: '8px', borderRadius: '10px' }}><ChevronLeft size={20} /></button>
                                <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'white', margin: 0 }}>Acceso</h2>
                            </div>
                            <h3 style={{ fontSize: '1.1rem', color: '#a78bfa', marginTop: '8px', fontWeight: 800 }}>{selectedProject.name}</h3>
                            <p className="role-subtitle" style={{ fontSize: '0.85rem' }}>Clave para entrar</p>
                        </div>
                        <form onSubmit={handleProjectPassSubmit} className="responsive-content" style={{ gap: '20px', width: '100%' }}>
                            <input
                                className="premium-input text-center"
                                type="password"
                                placeholder="Clave del programa..."
                                value={projectPass}
                                onChange={(e) => setProjectPass(e.target.value)}
                                autoFocus
                                required
                                style={{ pointerEvents: 'auto', position: 'relative', zIndex: 10, height: '65px', fontSize: '1.1rem', background: 'rgba(255,255,255,0.03)' }}
                            />
                            <button type="submit" className="btn-premium" style={{ padding: '20px', fontSize: '1rem', borderRadius: '16px', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', width: '100%' }}>
                                Entrar a la Clase
                                <Key size={20} />
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
