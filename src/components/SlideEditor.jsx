import React, { useState, useEffect, useRef } from 'react';
import {
    Plus, Image as ImageIcon, Music, Type, Move, Target, Paintbrush,
    Save, Trash2, X, Play, Pause, Upload, Eye, ChevronLeft, LayoutGrid,
    Settings as SettingsIcon, ShieldCheck, Key
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { optimizeImage } from '../lib/imageOptimizer';
import confetti from 'canvas-confetti';

export default function SlideEditor({ slides, onSave, onExit, isActive, onToggleActive, onViewResults, selectedProject: initialProject, onSelectProject }) {
    const [localSlides, setLocalSlides] = useState(slides || []);
    const [selectedIdx, setSelectedIdx] = useState(0);
    const [loading, setLoading] = useState(false);
    const [showGallery, setShowGallery] = useState(!initialProject);
    const [projects, setProjects] = useState([]);
    const [currentProject, setCurrentProject] = useState(initialProject);

    // For dragging and resizing in editor
    const canvasContainerRef = useRef(null);
    const [draggingElementId, setDraggingElementId] = useState(null);
    const [resizingElementId, setResizingElementId] = useState(null);

    const [selectedProjects, setSelectedProjects] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);

    const PROGRAM_ORDER = [
        'Baby Program', 'Mini Program', 'Tiny Program', 'Big Program',
        'Junior Program', 'Reading Club', 'Conversation Club'
    ];

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
            setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        loadProjects();
    }, []);

    // Sync slides and project when they change in parent App
    useEffect(() => {
        if (initialProject) {
            setCurrentProject(initialProject);
            setShowGallery(false);
        }
    }, [initialProject]);

    useEffect(() => {
        setLocalSlides(slides || []);
    }, [slides]);

    const loadProjects = async () => {
        const { data } = await supabase.from('projects').select('*');
        if (data) {
            const sorted = data.sort((a, b) => {
                const idxA = PROGRAM_ORDER.indexOf(a.name);
                const idxB = PROGRAM_ORDER.indexOf(b.name);
                if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                if (idxA !== -1) return -1;
                if (idxB !== -1) return 1;
                return a.name.localeCompare(b.name);
            });
            setProjects(sorted);
        }
        setSelectedProjects([]);
    };

    const handleCreateProject = async (name) => {
        const accessCode = prompt(`Define la Clave de Acceso para ${name}:`, '123');
        if (!accessCode) return;

        const newProject = {
            id: name.toLowerCase().replace(/\s+/g, '-'),
            name: name,
            is_active: false,
            access_code: accessCode
        };

        const { error } = await supabase.from('projects').insert(newProject);
        if (error) {
            alert('Error al agregar programa: ' + error.message);
        } else {
            setShowAddModal(false);
            loadProjects();
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedProjects.length === 0) return;
        if (!confirm(`¿Estás seguro de eliminar ${selectedProjects.length} programas? Esto borrará todas las láminas y archivos asociados de forma permanente.`)) return;

        setLoading(true);
        try {
            const { error } = await supabase.from('projects').delete().in('id', selectedProjects);
            if (error) throw error;
            loadProjects();
            alert('Programas eliminados correctamente.');
        } catch (err) {
            alert('Error al eliminar: ' + err.message);
        }
        setLoading(false);
    };

    const toggleProjectSelection = (projectId) => {
        setSelectedProjects(prev =>
            prev.includes(projectId)
                ? prev.filter(id => id !== projectId)
                : [...prev, projectId]
        );
    };

    const handleSelectProject = (project) => {
        setCurrentProject(project);
        onSelectProject(project);
        setShowGallery(false);
    };

    const handleSaveAll = async () => {
        if (!currentProject) return;
        setLoading(true);
        try {
            // 1. Update project settings (name, access_code)
            await supabase.from('projects').update({
                name: currentProject.name,
                access_code: currentProject.access_code
            }).eq('id', currentProject.id);

            // 2. Clear and Insert Slides
            await supabase.from('slides').delete().eq('project_id', currentProject.id);

            const toInsert = localSlides.map((s, idx) => ({
                id: s.id || crypto.randomUUID(),
                project_id: currentProject.id,
                image_url: s.image_url,
                audio_url: s.audio_url,
                elements: [
                    ...s.elements.filter(e => e.type !== 'format_metadata'),
                    { id: 'fmt-meta', type: 'format_metadata', value: s.format || '16/9' }
                ],
                order_index: idx
            }));

            if (toInsert.length > 0) {
                await supabase.from('slides').insert(toInsert);
            }

            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            alert('✅ Proyecto guardado correctamente');
        } catch (err) {
            alert('Error al guardar: ' + err.message);
        }
        setLoading(false);
    };

    const deleteFileFromStorage = async (url) => {
        if (!url) return;
        try {
            // Extract filename from Supabase URL
            const parts = url.split('/storage/v1/object/public/media/');
            if (parts.length > 1) {
                const fileName = parts[1];
                await supabase.storage.from('media').remove([fileName]);
                console.log('File deleted from storage:', fileName);
            }
        } catch (err) {
            console.warn('Error deleting file from storage:', err);
        }
    };

    const handleFileUpload = async (event, type, slideIdx, elementIdx = null) => {
        let file = event.target.files[0];
        if (!file) return;
        setLoading(true);
        try {
            if (type === 'bg' || type === 'drag_img') file = await optimizeImage(file);

            // Cleanup OLD file if replacing
            const oldSlide = localSlides[slideIdx];
            if (type === 'bg' && oldSlide.image_url) await deleteFileFromStorage(oldSlide.image_url);
            if (type === 'audio' && oldSlide.audio_url) await deleteFileFromStorage(oldSlide.audio_url);
            if (type === 'drag_img' && elementIdx !== null && oldSlide.elements[elementIdx].url) {
                await deleteFileFromStorage(oldSlide.elements[elementIdx].url);
            }

            const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
            const { data, error } = await supabase.storage.from('media').upload(fileName, file);
            if (error) throw error;
            const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(fileName);

            const newSlides = [...localSlides];
            if (type === 'bg') newSlides[slideIdx].image_url = publicUrl;
            else if (type === 'audio') newSlides[slideIdx].audio_url = publicUrl;
            else if (type === 'drag_img') newSlides[slideIdx].elements[elementIdx].url = publicUrl;
            setLocalSlides(newSlides);
        } catch (error) {
            alert('Error al subir: ' + error.message);
        }
        setLoading(false);
    };

    const handleDeleteSlide = async (idx) => {
        if (!confirm('¿Eliminar esta lámina y todos sus archivos asociados permanentemente de la nube?')) return;

        const slideToDelete = localSlides[idx];
        setLoading(true);

        try {
            // 1. Delete background image
            if (slideToDelete.image_url) await deleteFileFromStorage(slideToDelete.image_url);

            // 2. Delete audio file
            if (slideToDelete.audio_url) await deleteFileFromStorage(slideToDelete.audio_url);

            // 3. Delete element icons
            for (const el of slideToDelete.elements) {
                if (el.url) await deleteFileFromStorage(el.url);
            }

            // Update local state
            const updated = localSlides.filter((_, i) => i !== idx);
            setLocalSlides(updated);
            if (selectedIdx >= updated.length) setSelectedIdx(Math.max(0, updated.length - 1));

            alert('Lámina y archivos eliminados de Supabase.');
        } catch (err) {
            console.error('Error in deletion:', err);
        }
        setLoading(false);
    };

    const addSlide = () => {
        const newSlide = { id: crypto.randomUUID(), image_url: '', audio_url: '', format: '16/9', elements: [], order_index: localSlides.length };
        setLocalSlides([...localSlides, newSlide]);
        setSelectedIdx(localSlides.length);
    };

    const addElement = (type) => {
        const newSlides = [...localSlides];
        const newEl = { id: crypto.randomUUID(), type, x: 50, y: 50, width: type === 'text' ? 300 : null, height: type === 'text' ? 150 : null, text: type === 'text' ? 'Escribe aquí...' : '', url: '' };
        newSlides[selectedIdx].elements.push(newEl);
        setLocalSlides(newSlides);
    };

    const handleCanvasMouseMove = (e) => {
        if (!canvasContainerRef.current) return;
        const rect = canvasContainerRef.current.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const x = ((clientX - rect.left) / rect.width) * 100;
        const y = ((clientY - rect.top) / rect.height) * 100;

        if (draggingElementId) {
            const newSlides = [...localSlides];
            const element = newSlides[selectedIdx].elements.find(el => el.id === draggingElementId);
            if (element) {
                element.x = Math.max(0, Math.min(100, x));
                element.y = Math.max(0, Math.min(100, y));
                setLocalSlides(newSlides);
            }
        } else if (resizingElementId) {
            const newSlides = [...localSlides];
            const element = newSlides[selectedIdx].elements.find(el => el.id === resizingElementId);
            if (element) {
                const elementX = (element.x / 100) * rect.width;
                const mouseX = (x / 100) * rect.width;
                element.width = Math.max(50, (mouseX - elementX) * 2);
                element.height = element.width * 0.5; // Maintain some ratio
                setLocalSlides(newSlides);
            }
        }
    };

    if (showGallery) {
        return (
            <div style={{ height: '100vh', width: '100vw', background: '#050510', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: isMobile ? '20px' : isTablet ? '30px' : '40px' }}>
                {/* Header Gallery */}
                <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: isMobile ? '20px' : '40px', gap: '15px' }}>
                    <div>
                        <h1 style={{ fontSize: isMobile ? '1.8rem' : isTablet ? '2.2rem' : '2.5rem', fontWeight: 900, color: 'white', marginBottom: '8px' }}>Gestión de Programas</h1>
                        <p style={{ color: '#94a3b8', fontSize: isMobile ? '0.85rem' : '1rem' }}>Administra los niveles educativos y sus claves de acceso</p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
                        {selectedProjects.length > 0 && (
                            <button onClick={handleDeleteSelected} className="btn-outline" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)', padding: isMobile ? '10px 15px' : '12px 25px', fontSize: isMobile ? '0.8rem' : '1rem', flex: isMobile ? '1' : 'none' }}>
                                <Trash2 size={isMobile ? 16 : 20} /> {isMobile ? `Eliminar (${selectedProjects.length})` : `Eliminar Seleccionados (${selectedProjects.length})`}
                            </button>
                        )}
                        <button onClick={onExit} className="btn-outline" style={{ padding: isMobile ? '10px 15px' : '12px 25px', fontSize: isMobile ? '0.8rem' : '1rem', flex: isMobile ? '1' : 'none' }}>Volver</button>
                        <button onClick={() => setShowAddModal(true)} className="btn-premium" style={{ padding: isMobile ? '10px 15px' : '12px 25px', fontSize: isMobile ? '0.8rem' : '1rem', flex: isMobile ? '1' : 'none' }}>
                            <Plus size={isMobile ? 16 : 20} /> Agregar
                        </button>
                    </div>
                </div>

                {/* Custom Modal for Selection */}
                {showAddModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '20px' : '0' }}>
                        <div className="glass anim-up" style={{ width: isMobile ? '100%' : '400px', maxWidth: '400px', padding: isMobile ? '20px' : '30px', display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: isMobile ? '90vh' : 'auto', overflowY: 'auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h2 style={{ fontSize: isMobile ? '1rem' : '1.2rem', color: 'white' }}>Seleccionar Programa</h2>
                                <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer' }}><X size={20} /></button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {PROGRAM_ORDER.map(prog => (
                                    <button
                                        key={prog}
                                        onClick={() => handleCreateProject(prog)}
                                        className="btn-outline"
                                        style={{ justifyContent: 'start', padding: isMobile ? '12px' : '15px', fontSize: isMobile ? '0.85rem' : '1rem' }}
                                        disabled={projects.some(p => p.name === prog)}
                                    >
                                        {prog} {projects.some(p => p.name === prog) && '(Ya existe)'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <div style={{ flex: 1, overflowY: 'auto', paddingRight: isMobile ? '0' : '10px' }}>
                    {projects.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', textAlign: 'center', padding: isMobile ? '20px' : '0' }}>
                            <div style={{ width: isMobile ? '70px' : '100px', height: isMobile ? '70px' : '100px', background: 'rgba(255,255,255,0.03)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', marginBottom: '20px' }}>
                                <LayoutGrid size={isMobile ? 35 : 50} />
                            </div>
                            <h2 style={{ fontSize: isMobile ? '1.2rem' : '1.5rem', color: 'white', marginBottom: '10px' }}>No hay programas configurados</h2>
                            <p style={{ color: '#64748b', maxWidth: '400px', marginBottom: '25px', fontSize: isMobile ? '0.85rem' : '1rem' }}>Comienza agregando los programas educativos de tu institución.</p>
                            <button onClick={() => setShowAddModal(true)} className="btn-premium" style={{ width: 'fit-content', fontSize: isMobile ? '0.85rem' : '1rem' }}>
                                <Plus size={isMobile ? 16 : 20} /> Agregar Programa
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: isMobile ? '15px' : '25px' }}>
                            {projects.map(p => (
                                <div
                                    key={p.id}
                                    className="glass"
                                    style={{
                                        padding: '25px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '20px',
                                        transition: '0.3s',
                                        border: `1px solid ${selectedProjects.includes(p.id) ? '#ef4444' : 'rgba(255,255,255,0.05)'}`,
                                        position: 'relative'
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedProjects.includes(p.id)}
                                        onChange={() => toggleProjectSelection(p.id)}
                                        style={{ position: 'absolute', top: '15px', right: '15px', width: '20px', height: '20px', accentColor: '#ef4444', cursor: 'pointer' }}
                                    />

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                        <div style={{ padding: '12px', background: p.is_active ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.03)', borderRadius: '12px', color: p.is_active ? '#10b981' : '#64748b' }}>
                                            <ShieldCheck size={28} />
                                        </div>
                                        <div style={{
                                            fontSize: '0.65rem',
                                            fontWeight: 900,
                                            padding: '4px 12px',
                                            borderRadius: '100px',
                                            background: p.is_active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.05)',
                                            color: p.is_active ? '#10b981' : '#64748b',
                                            textTransform: 'uppercase',
                                            letterSpacing: '1px',
                                            marginRight: '30px'
                                        }}>
                                            {p.is_active ? '● ACTIVO' : '○ PAUSADO'}
                                        </div>
                                    </div>

                                    <div>
                                        <h3 style={{ fontSize: '1.4rem', color: 'white', marginBottom: '4px' }}>{p.name}</h3>
                                        <p style={{ fontSize: '0.7rem', color: '#475569', fontFamily: 'monospace' }}>ID: {p.id}</p>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: '#94a3b8', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '12px' }}>
                                        <Key size={16} />
                                        <span>Clave: <strong style={{ color: 'white' }}>{p.access_code || '---'}</strong></span>
                                    </div>

                                    <button onClick={() => handleSelectProject(p)} className="btn-premium" style={{ width: '100%', marginTop: 'auto' }}>
                                        Editar
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    const currentSlide = localSlides[selectedIdx] || null;

    return (
        <div style={{ height: '100vh', width: '100vw', display: 'flex', background: '#050510', overflow: 'hidden' }} onMouseMove={handleCanvasMouseMove} onMouseUp={() => { setDraggingElementId(null); setResizingElementId(null); }} onTouchEnd={() => { setDraggingElementId(null); setResizingElementId(null); }}>
            <aside style={{ width: '200px', borderRight: '1px solid rgba(255,255,255,0.05)', background: '#0a0a1a', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#475569' }}>Diapositivas</span>
                    <button onClick={addSlide} style={{ background: 'rgba(124, 58, 237, 0.1)', border: 'none', color: '#a78bfa', padding: '6px', borderRadius: '8px', cursor: 'pointer' }}><Plus size={16} /></button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '15px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {localSlides.map((slide, idx) => (
                        <div key={slide.id} onClick={() => setSelectedIdx(idx)} style={{ position: 'relative', borderRadius: '12px', border: `2px solid ${selectedIdx === idx ? '#7c3aed' : 'transparent'}`, background: '#000', aspectRatio: '16/9', overflow: 'hidden', cursor: 'pointer', transition: '0.2s', boxShadow: selectedIdx === idx ? '0 0 15px rgba(124, 58, 237, 0.3)' : 'none' }}>
                            <span style={{ position: 'absolute', top: '5px', left: '5px', zIndex: 10, fontSize: '10px', fontWeight: 900, background: 'rgba(0,0,0,0.7)', width: '20px', height: '20px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>{idx + 1}</span>
                            {slide.image_url ? <img src={slide.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.1 }}><ImageIcon size={24} color="white" /></div>}
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteSlide(idx); }} style={{ position: 'absolute', top: '5px', right: '5px', zIndex: 10, background: 'rgba(239, 68, 68, 0.9)', border: 'none', color: 'white', padding: '5px', borderRadius: '6px', cursor: 'pointer' }}><Trash2 size={12} /></button>
                        </div>
                    ))}
                </div>
            </aside>

            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'radial-gradient(circle at top right, #111, #050510)' }}>
                <header style={{ height: '70px', padding: '0 30px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(10,10,20,0.8)', backdropFilter: 'blur(15px)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <button onClick={() => setShowGallery(true)} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '10px', borderRadius: '12px', color: '#94a3b8', cursor: 'pointer' }}><LayoutGrid size={22} /></button>
                        <div>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white', lineHeight: 1.2 }}>{currentProject?.name}</h2>
                            <span style={{ fontSize: '0.65rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Editor de Programa</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button onClick={onViewResults} className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontSize: '0.85rem' }}><Eye size={18} /> Resultados</button>
                        <button onClick={onToggleActive} className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontSize: '0.85rem', color: isActive ? '#ef4444' : '#10b981', borderColor: isActive ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)' }}>
                            {isActive ? <Pause size={18} /> : <Play size={18} />} {isActive ? 'Suspender' : 'Activar Clase'}
                        </button>
                        <button onClick={handleSaveAll} className="btn-premium" style={{ padding: '10px 25px', fontSize: '0.85rem' }}><Save size={18} /> Guardar Cambios</button>
                    </div>
                </header>

                <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                    <div style={{ flex: 1, padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'auto' }}>
                        <div ref={canvasContainerRef} style={{ width: '100%', maxWidth: currentSlide?.format === '1/1' ? '700px' : '900px', aspectRatio: currentSlide?.format === '1/1' ? '1/1' : '16/9', background: '#000', borderRadius: '24px', position: 'relative', overflow: 'hidden', boxShadow: '0 50px 100px -20px black', border: '1px solid rgba(255,255,255,0.1)' }}>
                            {currentSlide?.image_url ? (
                                <img src={currentSlide.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />
                            ) : (
                                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '15px', color: '#475569' }}>
                                    <ImageIcon size={60} />
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <label className="btn-premium" style={{ padding: '10px 20px', fontSize: '0.8rem', cursor: 'pointer' }}>
                                            Subir Fondo HD
                                            <input type="file" style={{ display: 'none' }} onChange={(e) => {
                                                const copy = [...localSlides];
                                                copy[selectedIdx].format = '16/9';
                                                setLocalSlides(copy);
                                                handleFileUpload(e, 'bg', selectedIdx);
                                            }} />
                                        </label>
                                        <label className="btn-outline" style={{ padding: '10px 20px', fontSize: '0.8rem', cursor: 'pointer' }}>
                                            Subir Fondo Square
                                            <input type="file" style={{ display: 'none' }} onChange={(e) => {
                                                const copy = [...localSlides];
                                                copy[selectedIdx].format = '1/1';
                                                setLocalSlides(copy);
                                                handleFileUpload(e, 'bg', selectedIdx);
                                            }} />
                                        </label>
                                    </div>
                                </div>
                            )}

                            {currentSlide?.audio_url && (
                                <div style={{ position: 'absolute', bottom: '20px', left: '20px', zIndex: 110, background: 'rgba(16, 185, 129, 0.2)', padding: '10px 15px', borderRadius: '12px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '10px', backdropFilter: 'blur(10px)' }}>
                                    <Music size={18} />
                                    <span style={{ fontSize: '10px', fontWeight: 900 }}>AUDIO CARGADO</span>
                                    <button onClick={() => { const copy = [...localSlides]; copy[selectedIdx].audio_url = ''; setLocalSlides(copy); }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={14} /></button>
                                </div>
                            )}

                            {currentSlide?.elements.map(el => (
                                <div key={el.id} onMouseDown={() => setDraggingElementId(el.id)} style={{ position: 'absolute', left: `${el.x}%`, top: `${el.y}%`, transform: 'translate(-50%, -50%)', zIndex: 100, cursor: 'move', padding: '10px', border: draggingElementId === el.id ? '2px solid var(--primary)' : '1px dashed rgba(255,255,255,0.3)', borderRadius: '12px', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', width: el.width ? `${(el.width / 900) * 100}%` : 'auto' }}>
                                    {el.type === 'text' && (
                                        <textarea value={el.text} onChange={(e) => { const copy = [...localSlides]; copy[selectedIdx].elements.find(item => item.id === el.id).text = e.target.value; setLocalSlides(copy); }} style={{ background: 'transparent', border: 'none', color: 'white', textAlign: 'center', width: '100%', outline: 'none', fontWeight: 800, resize: 'none', fontFamily: 'Outfit', fontSize: '1.2rem' }} />
                                    )}
                                    {el.type === 'drag' && (
                                        <div style={{ width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {el.url ? <img src={el.url} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /> : <Move size={24} color="#3b82f6" />}
                                        </div>
                                    )}
                                    <div onMouseDown={(e) => { e.stopPropagation(); setResizingElementId(el.id); }} style={{ position: 'absolute', bottom: '0', right: '0', width: '15px', height: '15px', cursor: 'nwse-resize', borderRight: '2px solid var(--primary)', borderBottom: '2px solid var(--primary)' }} />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ width: '320px', background: 'rgba(10, 10, 20, 0.9)', borderLeft: '1px solid var(--border)', padding: '30px', display: 'flex', flexDirection: 'column', gap: '40px' }}>
                        <div>
                            <h3 style={{ color: 'white', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '2px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px' }}><SettingsIcon size={18} /> Ajustes</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Nombre del Programa</label>
                                    <input className="premium-input" type="text" value={currentProject?.name || ''} onChange={(e) => setCurrentProject({ ...currentProject, name: e.target.value })} style={{ padding: '12px' }} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Clave de Acceso</label>
                                    <input className="premium-input" type="text" value={currentProject?.access_code || ''} onChange={(e) => setCurrentProject({ ...currentProject, access_code: e.target.value })} style={{ padding: '12px' }} />
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 style={{ color: 'white', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '25px' }}>Herramientas</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                {[
                                    { type: 'draw', icon: Paintbrush, color: '#7c3aed' },
                                    { type: 'drag', icon: Move, color: '#3b82f6' },
                                    { type: 'stamp', icon: Target, color: '#ef4444' },
                                    { type: 'text', icon: Type, color: '#10b981' }
                                ].map(t => (
                                    <button key={t.type} onClick={() => addElement(t.type)} className="glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', transition: '0.2s', border: '1px solid var(--border)', borderRadius: '16px' }} onMouseEnter={e => e.currentTarget.style.borderColor = t.color} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                                        <div style={{ color: t.color }}><t.icon size={22} /></div>
                                        <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'white' }}>{t.type}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* Element Specific Tools */}
                            {draggingElementId && (
                                <div className="anim-up" style={{ background: 'rgba(124, 58, 237, 0.1)', padding: '20px', borderRadius: '20px', border: '1px solid rgba(124, 58, 237, 0.2)' }}>
                                    <h4 style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--primary-light)', marginBottom: '15px', textTransform: 'uppercase' }}>Opciones del Elemento</h4>
                                    {localSlides[selectedIdx].elements.find(e => e.id === draggingElementId)?.type === 'drag' && (
                                        <label className="btn-premium" style={{ width: '100%', padding: '10px', fontSize: '0.75rem', cursor: 'pointer' }}>
                                            <Upload size={16} /> Subir Imagen
                                            <input type="file" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'drag_img', selectedIdx, localSlides[selectedIdx].elements.findIndex(item => item.id === draggingElementId))} />
                                        </label>
                                    )}
                                    <button onClick={() => { const copy = [...localSlides]; copy[selectedIdx].elements = copy[selectedIdx].elements.filter(e => e.id !== draggingElementId); setLocalSlides(copy); setDraggingElementId(null); }} className="btn-outline" style={{ width: '100%', marginTop: '10px', color: '#ef4444', padding: '10px', fontSize: '0.75rem' }}>
                                        <Trash2 size={16} /> Eliminar Elemento
                                    </button>
                                </div>
                            )}

                            <div>
                                <h3 style={{ color: 'white', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '15px' }}>Audio de Lámina</h3>
                                <label className="btn-outline" style={{ width: '100%', padding: '15px', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', gap: '10px' }}>
                                    <Music size={18} /> {currentSlide?.audio_url ? 'Cambiar Audio' : 'Subir Audio'}
                                    <input type="file" style={{ display: 'none' }} accept="audio/*" onChange={(e) => handleFileUpload(e, 'audio', selectedIdx)} />
                                </label>
                            </div>

                            <div style={{ background: 'rgba(124, 58, 237, 0.05)', padding: '20px', borderRadius: '20px', border: '1px solid rgba(124, 58, 237, 0.1)' }}>
                                <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary-light)', marginBottom: '8px' }}>Tip de Edición</h4>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>Selecciona un elemento para ver sus opciones. Usa el botón "Guardar" para sincronizar con la nube.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
