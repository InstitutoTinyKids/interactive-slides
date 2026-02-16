import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
    Plus, Folder, ChevronLeft, LayoutGrid, HelpCircle,
    ShieldCheck, Key, Copy, Move, Trash2, GripVertical,
    Edit2, FolderPlus, Save, Play, Eye
} from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import confetti from 'canvas-confetti';

export default function GaleriaView({ onOpenGuide, onOpenQuiz, onExit, onPreview }) {
    const [projects, setProjects] = useState([]);
    const [folders, setFolders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentFolderId, setCurrentFolderId] = useState(null);
    const [galleryTab, setGalleryTab] = useState('all'); // 'all', 'guias', 'quiz'
    const [isSortMode, setIsSortMode] = useState(false);
    const [selectedProjects, setSelectedProjects] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [addType, setAddType] = useState('guias'); // 'guias', 'quiz', 'folder'
    const [newProjectName, setNewProjectName] = useState('');
    const [editingFolderId, setEditingFolderId] = useState(null);
    const [showTypeDropdown, setShowTypeDropdown] = useState(false);
    const [showMoveModal, setShowMoveModal] = useState(false);
    const [targetFolderForMove, setTargetFolderForMove] = useState('');
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);

    const [tempFolders, setTempFolders] = useState([]);
    const [tempProjects, setTempProjects] = useState([]);
    const [draggingProjectId, setDraggingProjectId] = useState(null);
    const [hoveredFolderId, setHoveredFolderId] = useState(null);
    const folderRefs = useRef({});

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
            setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
        };
        window.addEventListener('resize', handleResize);
        loadProjects();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleDrag = (event, info) => {
        if (!isSortMode) return;
        const x = info.point.x;
        const y = info.point.y;
        let foundFolderId = null;
        Object.entries(folderRefs.current).forEach(([id, ref]) => {
            if (ref) {
                const rect = ref.getBoundingClientRect();
                if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
                    foundFolderId = id;
                }
            }
        });
        setHoveredFolderId(foundFolderId);
    };

    const handleDragEnd = async (projectId) => {
        if (hoveredFolderId) {
            setTempProjects(prev => prev.map(p =>
                p.id === projectId ? { ...p, folder_id: hoveredFolderId } : p
            ));
        }
        setDraggingProjectId(null);
        setHoveredFolderId(null);
    };

    const loadProjects = async () => {
        setLoading(true);
        try {
            const { data: folderData, error: fError } = await supabase.from('folders').select('*').order('order_index', { ascending: true });
            if (!fError) setFolders(folderData || []);

            let { data: projectData, error: pError } = await supabase.from('projects').select('*').order('order_index', { ascending: true });
            if (pError) {
                const { data: fallbackData } = await supabase.from('projects').select('*').order('name');
                projectData = fallbackData;
            }
            if (projectData) setProjects(projectData);
        } catch (err) {
            console.error('Error loading projects:', err);
        }
        setSelectedProjects([]);
        setLoading(false);
    };

    const handleCreateProject = async () => {
        if (!newProjectName.trim()) return;

        if (addType === 'folder') {
            if (editingFolderId) {
                await supabase.from('folders').update({ name: newProjectName.trim() }).eq('id', editingFolderId);
            } else {
                await supabase.from('folders').insert({
                    name: newProjectName.trim(),
                    order_index: folders.length + projects.filter(p => !p.folder_id).length
                });
            }
            setNewProjectName('');
            setEditingFolderId(null);
            setShowAddModal(false);
            loadProjects();
            return;
        }

        const accessCode = prompt(`Define la Clave de Acceso para ${newProjectName}:`, '123');
        if (!accessCode) return;

        const projectType = addType;
        const newProject = {
            id: projectType === 'quiz' ? `quiz-${crypto.randomUUID()}` : crypto.randomUUID(),
            name: newProjectName.trim(),
            is_active: false,
            access_code: accessCode,
            questions: [],
            folder_id: currentFolderId,
            order_index: projects.filter(p => p.folder_id === currentFolderId).length
        };

        const { error } = await supabase.from('projects').insert(newProject);
        if (error) {
            alert('Error al agregar: ' + error.message);
        } else {
            setNewProjectName('');
            setShowAddModal(false);
            loadProjects();
        }
    };

    const toggleSortMode = async () => {
        if (isSortMode) {
            setLoading(true);
            try {
                for (let i = 0; i < tempFolders.length; i++) {
                    await supabase.from('folders').update({ order_index: i }).eq('id', tempFolders[i].id);
                }
                for (let i = 0; i < tempProjects.length; i++) {
                    await supabase.from('projects').update({
                        order_index: i,
                        folder_id: tempProjects[i].folder_id
                    }).eq('id', tempProjects[i].id);
                }
                await loadProjects();
                confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
            } catch (err) {
                alert('Error al guardar orden: ' + err.message);
            }
            setLoading(false);
        } else {
            setTempFolders([...folders].sort((a, b) => (a.order_index || 0) - (b.order_index || 0)));
            setTempProjects([...projects].sort((a, b) => (a.order_index || 0) - (b.order_index || 0)));
        }
        setIsSortMode(!isSortMode);
    };

    const handleDuplicateProject = async (project, targetFolderId = null, silent = false) => {
        if (!silent) setLoading(true);
        try {
            const isQuiz = project.id.startsWith('quiz-');
            const newId = isQuiz ? `quiz-${crypto.randomUUID()}` : crypto.randomUUID();
            const newName = `${project.name} (Copia)`;

            if (!isQuiz) {
                const { data: slidesToClone } = await supabase.from('slides').select('*').eq('project_id', project.id);
                if (slidesToClone) {
                    const clonedSlides = slidesToClone.map(s => ({
                        ...s,
                        id: crypto.randomUUID(),
                        project_id: newId
                    }));
                    if (clonedSlides.length > 0) {
                        await supabase.from('slides').insert(clonedSlides);
                    }
                }
            }

            const { error: pError } = await supabase.from('projects').insert({
                ...project,
                id: newId,
                name: newName,
                is_active: false,
                folder_id: targetFolderId || project.folder_id,
                order_index: projects.filter(p => p.folder_id === (targetFolderId || project.folder_id)).length
            });
            if (pError) throw pError;

            if (!silent) {
                loadProjects();
                alert('✅ Proyecto duplicado correctamente');
            }
        } catch (err) {
            if (!silent) alert('Error al duplicar: ' + err.message);
            else throw err;
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const handleMoveSelected = async () => {
        if (selectedProjects.length === 0 || !targetFolderForMove) return;
        setLoading(true);
        try {
            const folderId = targetFolderForMove === 'root' ? null : targetFolderForMove;
            for (const id of selectedProjects) {
                const targetProjects = projects.filter(p => p.folder_id === folderId);
                await supabase.from('projects').update({
                    folder_id: folderId,
                    order_index: targetProjects.length
                }).eq('id', id);
            }
            setSelectedProjects([]);
            setShowMoveModal(false);
            setTargetFolderForMove('');
            loadProjects();
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        } catch (err) {
            alert('Error al mover selección: ' + err.message);
        }
        setLoading(false);
    };

    const handleDuplicateSelected = async () => {
        if (selectedProjects.length === 0) return;
        setLoading(true);
        try {
            for (const id of selectedProjects) {
                const project = projects.find(p => p.id === id);
                if (project) await handleDuplicateProject(project, project.folder_id, true);
            }
            setSelectedProjects([]);
            loadProjects();
            alert(`✅ ${selectedProjects.length} proyectos duplicados`);
        } catch (err) {
            alert('Error al duplicar: ' + err.message);
        }
        setLoading(false);
    };

    const handleDeleteSelected = async () => {
        if (selectedProjects.length === 0) return;
        if (!confirm(`¿Eliminar ${selectedProjects.length} proyectos permanentemente?`)) return;
        setLoading(true);
        try {
            for (const id of selectedProjects) {
                await supabase.from('projects').delete().eq('id', id);
            }
            loadProjects();
        } catch (err) {
            alert('Error: ' + err.message);
        }
        setLoading(false);
    };

    const toggleProjectSelection = (projectId) => {
        setSelectedProjects(prev =>
            prev.includes(projectId) ? prev.filter(id => id !== projectId) : [...prev, projectId]
        );
    };

    return (
        <div style={{ height: '100vh', width: '100vw', background: '#050510', display: 'flex', flexDirection: 'column', overflow: 'auto', padding: isMobile ? '20px' : isTablet ? '30px' : '40px' }}>
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: isMobile ? '20px' : '30px', gap: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    {currentFolderId && (
                        <button onClick={() => setCurrentFolderId(null)} className="btn-outline" style={{ padding: '8px' }}>
                            <ChevronLeft size={20} />
                        </button>
                    )}
                    <div>
                        <h1 style={{ fontSize: isMobile ? '1.5rem' : isTablet ? '1.8rem' : '2rem', fontWeight: 900, color: 'white', marginBottom: '2px' }}>
                            {currentFolderId ? folders.find(f => f.id === currentFolderId)?.name : 'Galería'}
                        </h1>
                        <div style={{ display: 'flex', gap: '15px', marginTop: '5px' }}>
                            {['all', 'guias', 'quiz'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setGalleryTab(tab)}
                                    style={{
                                        background: 'none', border: 'none',
                                        color: galleryTab === tab ? (tab === 'quiz' ? '#3b82f6' : tab === 'guias' ? '#a78bfa' : '#7c3aed') : '#475569',
                                        fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer',
                                        borderBottom: galleryTab === tab ? `2px solid ${tab === 'quiz' ? '#3b82f6' : tab === 'guias' ? '#a78bfa' : '#7c3aed'}` : '2px solid transparent',
                                        paddingBottom: '3px'
                                    }}
                                >
                                    {tab.toUpperCase() === 'ALL' ? 'TODAS' : tab.toUpperCase() === 'GUIAS' ? 'GUIAS' : 'QUIZZES'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto', alignItems: 'center' }}>
                    {selectedProjects.length > 0 && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={handleDuplicateSelected} className="btn-outline" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderColor: 'rgba(59, 130, 246, 0.2)', padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '0.8rem' }}><Copy size={16} /> Duplicar</button>
                            <button onClick={() => setShowMoveModal(true)} className="btn-outline" style={{ background: 'rgba(167, 139, 250, 0.1)', color: '#a78bfa', borderColor: 'rgba(167, 139, 250, 0.2)', padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '0.8rem' }}><Move size={16} /> Mover</button>
                            <button onClick={handleDeleteSelected} className="btn-outline" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)', padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '0.8rem' }}><Trash2 size={16} /> Eliminar</button>
                        </div>
                    )}
                    <button onClick={onExit} className="btn-outline" style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}><ChevronLeft size={16} /> Home</button>
                    <button onClick={toggleSortMode} className="btn-outline" style={{ padding: '10px 18px', background: isSortMode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)', color: isSortMode ? '#10b981' : 'white', borderColor: isSortMode ? '#10b981' : 'rgba(255,255,255,0.1)', fontWeight: 800, fontSize: '0.8rem' }}>{isSortMode ? 'Listo' : 'Ordenar'}</button>
                    <div style={{ position: 'relative' }}>
                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowTypeDropdown(!showTypeDropdown); }} className="btn-premium" style={{ padding: '10px 18px', fontSize: '0.8rem' }}><Plus size={16} /> Agregar</button>
                        {showTypeDropdown && (
                            <div className="glass" style={{ position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: '180px', zIndex: 9999, padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(15, 15, 30, 0.95)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                                <button onClick={(e) => { e.stopPropagation(); setAddType('guias'); setShowAddModal(true); setShowTypeDropdown(false); }} className="btn-outline" style={{ width: '100%', textAlign: 'left', border: 'none', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', borderRadius: '10px', fontSize: '0.8rem' }}><LayoutGrid size={16} color="#a78bfa" /> <span>Guía</span></button>
                                <button onClick={(e) => { e.stopPropagation(); setAddType('quiz'); setShowAddModal(true); setShowTypeDropdown(false); }} className="btn-outline" style={{ width: '100%', textAlign: 'left', border: 'none', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', borderRadius: '10px', fontSize: '0.8rem' }}><HelpCircle size={16} color="#3b82f6" /> <span>Quiz</span></button>
                                <button onClick={(e) => { e.stopPropagation(); setAddType('folder'); setShowAddModal(true); setShowTypeDropdown(false); }} className="btn-outline" style={{ width: '100%', textAlign: 'left', border: 'none', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', borderRadius: '10px', fontSize: '0.8rem' }}><FolderPlus size={16} color="#10b981" /> <span>Carpeta</span></button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div style={{ flex: 1 }}>
                {loading && <div style={{ textAlign: 'center', color: '#a78bfa', padding: '40px', fontWeight: 900 }}>Cargando proyectos...</div>}

                <AnimatePresence>
                    <Reorder.Group
                        axis="y"
                        values={isSortMode ? tempFolders : folders}
                        onReorder={setTempFolders}
                        style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? '100%' : '280px'}, 1fr))`, gap: '20px', listStyle: 'none', padding: 0 }}
                    >
                        {!currentFolderId && (isSortMode ? tempFolders : folders).map(f => (
                            <Reorder.Item
                                key={f.id}
                                value={f}
                                drag={isSortMode}
                                className={`glass project-card ${hoveredFolderId === f.id ? 'folder-highlight' : ''}`}
                                style={{
                                    padding: '20px',
                                    cursor: isSortMode ? 'grab' : 'pointer',
                                    border: hoveredFolderId === f.id ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.05)',
                                    position: 'relative',
                                    backgroundColor: hoveredFolderId === f.id ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                                    boxShadow: hoveredFolderId === f.id ? '0 0 20px rgba(16, 185, 129, 0.2)' : 'none'
                                }}
                                onClick={() => !isSortMode && setCurrentFolderId(f.id)}
                                ref={el => folderRefs.current[f.id] = el}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                    <div style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '14px' }}>
                                        {isSortMode ? <GripVertical size={24} /> : <Folder size={30} fill="currentColor" />}
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <button onClick={(e) => { e.stopPropagation(); setAddType('folder'); setEditingFolderId(f.id); setNewProjectName(f.name); setShowAddModal(true); }} className="btn-outline" style={{ padding: '6px' }}><Edit2 size={12} /></button>
                                        <button onClick={async (e) => { e.stopPropagation(); if (confirm("¿Eliminar carpeta? Los proyectos quedarán sin carpeta.")) await supabase.from('folders').delete().eq('id', f.id); loadProjects(); }} className="btn-outline" style={{ padding: '6px', color: '#ef4444' }}><Trash2 size={12} /></button>
                                    </div>
                                </div>
                                <h3 style={{ fontSize: '1.3rem', color: 'white', fontWeight: 900 }}>{f.name}</h3>
                                <p style={{ color: '#94a3b8', marginTop: '6px', fontSize: '0.8rem' }}>{projects.filter(p => p.folder_id === f.id).length} elementos</p>
                            </Reorder.Item>
                        ))}
                    </Reorder.Group>

                    <Reorder.Group
                        axis="y"
                        values={(isSortMode ? tempProjects : projects).filter(p => p.folder_id === currentFolderId)}
                        onReorder={(newOrder) => {
                            const otherProjects = (isSortMode ? tempProjects : projects).filter(p => p.folder_id !== currentFolderId);
                            if (isSortMode) setTempProjects([...otherProjects, ...newOrder]);
                        }}
                        style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? '100%' : '280px'}, 1fr))`, gap: '20px', listStyle: 'none', padding: 0, marginTop: '20px' }}
                    >
                        {(isSortMode ? tempProjects : projects)
                            .filter(p => {
                                if (p.folder_id !== currentFolderId) return false;
                                if (isSortMode) return true;
                                if (galleryTab === 'guias') return !p.id.startsWith('quiz-');
                                if (galleryTab === 'quiz') return p.id.startsWith('quiz-');
                                return true;
                            })
                            .map(p => {
                                const isQuiz = p.id.startsWith('quiz-');
                                return (
                                    <Reorder.Item
                                        key={p.id}
                                        value={p}
                                        drag={isSortMode}
                                        onDragStart={() => setDraggingProjectId(p.id)}
                                        onDrag={handleDrag}
                                        onDragEnd={() => handleDragEnd(p.id)}
                                        className={`glass project-card ${selectedProjects.includes(p.id) ? 'selected' : ''}`}
                                        style={{
                                            padding: '20px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '15px',
                                            border: selectedProjects.includes(p.id) ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.05)',
                                            position: 'relative',
                                            cursor: isSortMode ? 'grab' : 'default',
                                            zIndex: draggingProjectId === p.id ? 1000 : 1
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                            <div style={{ padding: '12px', background: isQuiz ? 'rgba(59, 130, 246, 0.12)' : 'rgba(124, 58, 237, 0.12)', borderRadius: '14px', color: isQuiz ? '#3b82f6' : '#a78bfa' }}>
                                                {isSortMode ? <GripVertical size={24} /> : (isQuiz ? <HelpCircle size={28} /> : <ShieldCheck size={28} />)}
                                            </div>
                                            {!isSortMode && (
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <div style={{ fontSize: '0.65rem', fontWeight: 900, padding: '4px 12px', borderRadius: '100px', background: isQuiz ? '#1e3a8a' : '#3b1e8a', color: 'white', textTransform: 'uppercase' }}>{isQuiz ? 'QUIZ' : 'GUIA'}</div>
                                                        <input type="checkbox" checked={selectedProjects.includes(p.id)} onChange={() => toggleProjectSelection(p.id)} style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: p.is_active ? '#10b981' : '#64748b' }}>{p.is_active ? 'Activo' : 'Pausado'}</div>
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <h3 style={{ fontSize: '1.3rem', color: 'white', marginBottom: '12px', fontWeight: 900 }}>{p.name}</h3>
                                            {!isSortMode && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', background: 'rgba(0,0,0,0.4)', padding: '10px 16px', borderRadius: '14px', width: 'fit-content', fontSize: '0.8rem' }}><Key size={16} /><span>Clave: <strong style={{ color: 'white' }}>{p.access_code || '---'}</strong></span></div>
                                            )}
                                        </div>
                                        {!isSortMode && (
                                            <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                                                <button onClick={() => isQuiz ? onOpenQuiz(p) : onOpenGuide(p)} className="btn-premium" style={{ flex: 1, padding: '12px', fontSize: '1rem', fontWeight: 900, borderRadius: '15px' }}>Editar</button>
                                                <button onClick={() => onPreview(p, true)} className="btn-outline" style={{ flex: 1, padding: '12px', color: '#3b82f6', borderColor: 'rgba(59, 130, 246, 0.2)', fontSize: '1rem', fontWeight: 700, borderRadius: '15px' }}>Preview</button>
                                            </div>
                                        )}
                                    </Reorder.Item>
                                );
                            })}
                    </Reorder.Group>
                </AnimatePresence>
            </div>

            {showAddModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
                    <div className="glass anim-up" style={{ width: '450px', padding: '40px', background: '#0a0a1a', border: '1px solid rgba(167, 139, 250, 0.2)' }}>
                        <h2 style={{ fontSize: '1.8rem', color: 'white', marginBottom: '10px', fontWeight: 900 }}>{editingFolderId ? 'Renombrar Carpeta' : `Nuevo ${addType === 'folder' ? 'Carpeta' : addType === 'quiz' ? 'Quiz' : 'Guía'}`}</h2>
                        <input className="premium-input" placeholder="Nombre..." value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} autoFocus style={{ marginBottom: '25px', width: '100%' }} />
                        <div style={{ display: 'flex', gap: '15px' }}>
                            <button onClick={() => { setShowAddModal(false); setNewProjectName(''); setEditingFolderId(null); }} className="btn-outline" style={{ flex: 1, height: '55px' }}>Cancelar</button>
                            <button onClick={handleCreateProject} className="btn-premium" style={{ flex: 2, height: '55px' }}>{editingFolderId ? 'Actualizar' : 'Crear Ahora'}</button>
                        </div>
                    </div>
                </div>
            )}

            {showMoveModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
                    <div className="glass" style={{ width: '450px', padding: '40px', background: '#0a0a1a' }}>
                        <h2 style={{ fontSize: '1.5rem', color: 'white', marginBottom: '20px' }}>Mover {selectedProjects.length} Proyectos</h2>
                        <select className="premium-input" style={{ width: '100%', marginBottom: '20px', background: 'rgba(255,255,255,0.05)', color: 'white' }} value={targetFolderForMove} onChange={(e) => setTargetFolderForMove(e.target.value)}>
                            <option value="">Selecciona destino...</option>
                            <option value="root">Raíz (Principal)</option>
                            {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                        <div style={{ display: 'flex', gap: '15px' }}>
                            <button onClick={() => setShowMoveModal(false)} className="btn-outline" style={{ flex: 1 }}>Cancelar</button>
                            <button onClick={handleMoveSelected} className="btn-premium" style={{ flex: 2 }}>Mover Ahora</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
