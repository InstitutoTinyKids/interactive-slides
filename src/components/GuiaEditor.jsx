import React, { useState, useEffect, useRef } from 'react';
import { User, Settings as SettingsIcon, ArrowRight, Play, Lock, X, GraduationCap, ChevronRight, Key, Plus, LayoutGrid, Eye, HelpCircle, Save, Layers, Image as ImageIcon, Trash2, Edit2, Copy, Move, Target, Pause, ShieldCheck, Folder, FolderPlus, ArrowUp, ArrowDown, ChevronLeft, GripVertical, Music, Paintbrush, Type, Upload, ZoomIn, ZoomOut } from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { optimizeImage } from '../lib/imageOptimizer';
import confetti from 'canvas-confetti';

export default function SlideEditor({ slides, onSave, onExit, isActive, onToggleActive, onViewResults, selectedProject, onPreview, onGoToGallery }) {
    const [localSlides, setLocalSlides] = useState(slides || []);
    const [selectedIdx, setSelectedIdx] = useState(0);
    const [loading, setLoading] = useState(false);
    const [currentProject, setCurrentProject] = useState(selectedProject);

    // For dragging and resizing in editor
    const canvasContainerRef = useRef(null);
    const [draggingElementId, setDraggingElementId] = useState(null);
    const [resizingElementId, setResizingElementId] = useState(null);
    const [selectedElementId, setSelectedElementId] = useState(null);

    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth <= 1024);
    const [isCompact, setIsCompact] = useState(window.innerWidth < 1200);
    const [showSlidesPanel, setShowSlidesPanel] = useState(window.innerWidth >= 1200);
    const [showSettingsPanel, setShowSettingsPanel] = useState(false);

    // Estados para edición controlada en Ajustes
    const [isEditingProjectName, setIsEditingProjectName] = useState(false);
    const [isEditingAccessCode, setIsEditingAccessCode] = useState(false);
    const [canvasZoom, setCanvasZoom] = useState(1);
    const [showMoreSettings, setShowMoreSettings] = useState(false);
    const nameInputRef = useRef(null);

    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            setIsMobile(width < 768);
            setIsTablet(width >= 768 && width <= 1024);
            setIsCompact(width < 1200);
            if (width >= 1200) {
                setShowSlidesPanel(true);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        setLocalSlides(slides || []);
    }, [slides]);

    useEffect(() => {
        setCurrentProject(selectedProject);
    }, [selectedProject]);

    const handleSaveAll = async (isSilent = false) => {
        if (!currentProject) return;
        if (!isSilent) setLoading(true);
        try {
            const { error: pError } = await supabase.from('projects').update({
                name: currentProject.name,
                access_code: currentProject.access_code
            }).eq('id', currentProject.id);
            if (pError) throw pError;

            // Delete existing slides safely
            const { error: dError } = await supabase.from('slides').delete().eq('project_id', currentProject.id);
            if (dError) throw dError;

            const toInsert = localSlides.map((s, idx) => ({
                id: s.id || crypto.randomUUID(),
                project_id: currentProject.id,
                image_url: s.image_url,
                audio_url: s.audio_url,
                elements: [
                    ...(s.elements || []).filter(e => e.type !== 'format_metadata'),
                    { id: 'fmt-meta', type: 'format_metadata', value: s.format || '16/9' }
                ],
                order_index: idx
            }));

            if (toInsert.length > 0) {
                const { error: sError } = await supabase.from('slides').insert(toInsert);
                if (sError) throw sError;
            }

            if (!isSilent) {
                if (onSave) onSave(); // Sync with parent
                confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
                window.dispatchEvent(new CustomEvent('show-toast', {
                    detail: { message: '✅ ¡Guardado!', type: 'success' }
                }));
            }
            return true;
        } catch (err) {
            console.error('Error saving:', err);
            window.dispatchEvent(new CustomEvent('show-toast', {
                detail: { message: '❌ Error al guardar: ' + err.message, type: 'error' }
            }));
            return false;
        } finally {
            if (!isSilent) setLoading(false);
        }
    };

    const autoSaveTimerRef = useRef(null);
    useEffect(() => {
        if (!currentProject) return;
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = setTimeout(() => {
            handleSaveAll(true);
        }, 3000);
        return () => {
            if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        };
    }, [localSlides, currentProject?.name, currentProject?.access_code]);

    const deleteFileFromStorage = async (url) => {
        if (!url) return;
        try {
            const parts = url.split('/storage/v1/object/public/media/');
            if (parts.length > 1) {
                const fileName = parts[1];
                await supabase.storage.from('media').remove([fileName]);
            }
        } catch (err) {
            console.warn('Error deleting file:', err);
        }
    };

    const handleFileUpload = async (event, type, slideIdx, elementIdx = null) => {
        let file = event.target.files[0];
        if (!file) return;
        setLoading(true);
        try {
            if (type === 'bg' || type === 'drag_img') file = await optimizeImage(file);
            const oldSlide = localSlides[slideIdx];
            if (type === 'bg' && oldSlide.image_url) await deleteFileFromStorage(oldSlide.image_url);
            if (type === 'audio' && oldSlide.audio_url) await deleteFileFromStorage(oldSlide.audio_url);
            if (type === 'drag_img' && elementIdx !== null && oldSlide.elements[elementIdx].url) {
                await deleteFileFromStorage(oldSlide.elements[elementIdx].url);
            }

            const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
            const { error } = await supabase.storage.from('media').upload(fileName, file);
            if (error) throw error;
            const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(fileName);

            setLocalSlides(prev => prev.map((s, idx) => {
                if (idx !== slideIdx) return s;
                const updated = { ...s };
                if (type === 'bg') updated.image_url = publicUrl;
                else if (type === 'audio') updated.audio_url = publicUrl;
                else if (type === 'drag_img') {
                    updated.elements = s.elements.map((el, ei) => ei === elementIdx ? { ...el, url: publicUrl } : el);
                }
                return updated;
            }));
        } catch (error) {
            alert('Error al subir: ' + error.message);
        }
        setLoading(false);
    };

    const handleDeleteSlide = async (idx) => {
        if (!confirm('¿Eliminar esta lámina permanentemente?')) return;
        const slideToDelete = localSlides[idx];
        setLoading(true);
        try {
            if (slideToDelete.image_url) await deleteFileFromStorage(slideToDelete.image_url);
            if (slideToDelete.audio_url) await deleteFileFromStorage(slideToDelete.audio_url);
            for (const el of slideToDelete.elements) { if (el.url) await deleteFileFromStorage(el.url); }
            const updated = localSlides.filter((_, i) => i !== idx);
            setLocalSlides(updated);
            if (selectedIdx >= updated.length) setSelectedIdx(Math.max(0, updated.length - 1));
        } catch (err) {
            console.error('Error in deletion:', err);
        }
        setLoading(false);
    };

    const addSlide = () => {
        const newSlide = { id: crypto.randomUUID(), image_url: '', audio_url: '', format: '16/9', elements: [], order_index: localSlides.length };
        setLocalSlides(prev => [...prev, newSlide]);
        setSelectedIdx(localSlides.length);
    };

    const addElement = (type) => {
        if (!localSlides[selectedIdx]) return;

        // DRAW is a special toggle tool, not a multiple object tool
        if (type === 'draw') {
            const hasDraw = localSlides[selectedIdx].elements?.some(el => el.id === 'slide-draw-tool');
            setLocalSlides(prev => prev.map((s, idx) => {
                if (idx !== selectedIdx) return s;
                const filtered = (s.elements || []).filter(el => el.id !== 'slide-draw-tool');
                return {
                    ...s,
                    elements: hasDraw ? filtered : [...filtered, { id: 'slide-draw-tool', type: 'draw', x: 50, y: 50 }]
                };
            }));
            return;
        }

        const newEl = {
            id: crypto.randomUUID(), type, x: 50, y: 50,
            width: type === 'text' ? 300 : (type === 'drag' ? 100 : 80),
            height: type === 'text' ? 150 : (type === 'drag' ? 100 : 80),
            text: type === 'text' ? 'Escribe aquí...' : '', url: '', imageSize: type === 'drag' ? 100 : undefined
        };
        setLocalSlides(prev => prev.map((s, idx) => {
            if (idx !== selectedIdx) return s;
            return {
                ...s,
                elements: [...(s.elements || []), newEl]
            };
        }));
    };

    const handleCanvasMouseMove = (e) => {
        if (!canvasContainerRef.current) return;
        const rect = canvasContainerRef.current.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const x = ((clientX - rect.left) / rect.width) * 100;
        const y = ((clientY - rect.top) / rect.height) * 100;

        if (draggingElementId && draggingElementId !== 'slide-draw-tool') {
            const newSlides = [...localSlides];
            const element = newSlides[selectedIdx]?.elements.find(el => el.id === draggingElementId);
            if (element) {
                element.x = Math.max(0, Math.min(100, x));
                element.y = Math.max(0, Math.min(100, y));
                setLocalSlides(newSlides);
            }
        } else if (resizingElementId) {
            const newSlides = [...localSlides];
            const element = newSlides[selectedIdx]?.elements.find(el => el.id === resizingElementId);
            if (element) {
                const elementX = (element.x / 100) * rect.width;
                const elementY = (element.y / 100) * rect.height;
                const mouseX = (x / 100) * rect.width;
                const mouseY = (y / 100) * rect.height;
                element.width = Math.max(50, (mouseX - elementX) * 2);
                if (element.type === 'text' || element.type === 'stamp') {
                    element.height = Math.max(30, (mouseY - elementY) * 2);
                } else {
                    element.height = element.width * 0.5;
                }
                setLocalSlides(newSlides);
            }
        }
    };

    const currentSlide = localSlides[selectedIdx] || null;

    return (
        <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', background: '#050510', overflow: 'hidden' }} onMouseMove={handleCanvasMouseMove} onMouseUp={() => { setDraggingElementId(null); setResizingElementId(null); }} onTouchEnd={() => { setDraggingElementId(null); setResizingElementId(null); }} onClick={(e) => { if (e.target === e.currentTarget) setSelectedElementId(null); }}>
            <header style={{
                height: '75px',
                padding: '0 25px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(10,10,24,0.95)',
                backdropFilter: 'blur(20px)',
                zIndex: 1000,
                gap: '15px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexShrink: 1, minWidth: 0 }}>
                    <button onClick={onGoToGallery} title="VOLVER A GALERIA" style={{ padding: '12px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '15px', color: '#3b82f6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><LayoutGrid size={24} /></button>
                    <div style={{ overflow: 'hidden' }}>
                        <h2 style={{ fontSize: isMobile ? '0.9rem' : '1.1rem', fontWeight: 900, color: 'white', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentProject?.name}</h2>
                        <span style={{ fontSize: '0.65rem', color: '#444455', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Editor de Programa</span>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                    {isCompact && (
                        <button
                            onClick={() => setShowSlidesPanel(!showSlidesPanel)}
                            style={{
                                padding: '10px',
                                background: showSlidesPanel ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)',
                                borderRadius: '12px',
                                border: '1px solid rgba(16, 185, 129, 0.2)',
                                color: '#10b981',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            title="Diapositivas"
                        >
                            <Layers size={18} />
                        </button>
                    )}
                    <button
                        onClick={() => setShowSettingsPanel(!showSettingsPanel)}
                        className="btn-outline"
                        style={{
                            padding: '10px',
                            background: showSettingsPanel ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                            borderRadius: '12px',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        title="Ajustes"
                    >
                        <SettingsIcon size={18} />
                    </button>
                    <button onClick={onViewResults} className="btn-outline" style={{ padding: '10px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Resultados"><Eye size={18} /></button>
                    <button onClick={async () => { const saved = await handleSaveAll(false); if (saved) onPreview(currentProject, false); }} className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)' }} disabled={loading}><Play size={16} /> {!isMobile && 'Preview'}</button>
                    <button onClick={onToggleActive} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', background: isActive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: isActive ? '#ef4444' : '#10b981', border: `1px solid ${isActive ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)'}` }}>{isActive ? <Pause size={16} /> : <Play size={16} />} {!isMobile && (isActive ? 'Suspender' : 'Activar')}</button>
                    <button onClick={() => handleSaveAll(false)} className="btn-premium" style={{ padding: '10px 18px', fontSize: '0.75rem', fontWeight: 900, borderRadius: '12px' }} disabled={loading}><Save size={16} /> GUARDAR</button>
                </div>
            </header>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden', position: 'relative' }}>
                <aside style={{
                    width: showSlidesPanel ? '240px' : '0px',
                    minWidth: showSlidesPanel ? '240px' : '0px',
                    borderRight: '1px solid rgba(255,255,255,0.05)',
                    background: '#070715',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    overflow: 'hidden',
                    position: (isMobile || isTablet) ? 'absolute' : 'relative',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    zIndex: 2000,
                    boxShadow: (isMobile || isTablet) && showSlidesPanel ? '20px 0 50px rgba(0,0,0,0.5)' : 'none'
                }}>
                    <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h3 style={{ fontSize: '0.7rem', fontWeight: 900, color: 'white', textTransform: 'uppercase', letterSpacing: '1px' }}>Diapositivas</h3>
                            <p style={{ fontSize: '0.6rem', color: '#475569' }}>{localSlides.length} creadas</p>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={addSlide} style={{ background: '#7c3aed', border: 'none', color: 'white', width: '30px', height: '30px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={16} /></button>
                            {(isMobile || isTablet) && <button onClick={() => setShowSlidesPanel(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', width: '30px', height: '30px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>}
                        </div>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '15px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {localSlides.map((slide, idx) => (
                            <div key={slide.id} onClick={() => { setSelectedIdx(idx); if (isMobile) setShowSlidesPanel(false); }} style={{ position: 'relative', borderRadius: '12px', border: `3px solid ${selectedIdx === idx ? '#7c3aed' : 'transparent'} `, background: '#000', minHeight: '110px', aspectRatio: '16/9', overflow: 'hidden', cursor: 'pointer', transition: '0.2s', boxShadow: selectedIdx === idx ? '0 10px 25px rgba(124, 58, 237, 0.2)' : '0 4px 10px rgba(0,0,0,0.3)' }}>
                                <span style={{ position: 'absolute', top: '5px', left: '5px', zIndex: 10, fontSize: '10px', fontWeight: 900, background: 'rgba(0,0,0,0.8)', width: '20px', height: '20px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>{idx + 1}</span>
                                {slide.image_url ? <img src={slide.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.1 }}><ImageIcon size={22} color="white" /></div>}
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteSlide(idx); }} style={{ position: 'absolute', top: '5px', right: '5px', zIndex: 10, background: 'rgba(239, 68, 68, 0.9)', border: 'none', color: 'white', padding: '5px', borderRadius: '6px', cursor: 'pointer' }}><Trash2 size={12} /></button>
                                {slide.elements?.some(el => el.type === 'draw') && <div style={{ position: 'absolute', bottom: '5px', left: '5px', background: '#a78bfa', color: 'black', padding: '2px 6px', borderRadius: '4px', fontSize: '8px', fontWeight: 900 }}>DRAW ON</div>}
                            </div>
                        ))}
                    </div>
                </aside>

                <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle at center, #0a0a20, #050510)', overflow: 'auto', position: 'relative' }} onClick={() => setSelectedElementId(null)}>
                    {currentSlide && (
                        <div ref={canvasContainerRef} style={{ transform: `scale(${canvasZoom})`, transformOrigin: 'center', transition: 'transform 0.1s ease-out', width: currentSlide?.format === '1/1' ? (isMobile ? '300px' : '700px') : (isMobile ? '340px' : '900px'), aspectRatio: currentSlide?.format === '1/1' ? '1/1' : '16/9', background: '#000', borderRadius: '12px', position: 'relative', overflow: 'hidden', boxShadow: '0 40px 100px -20px black', border: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
                            {currentSlide.image_url ? <img src={currentSlide.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} /> : (
                                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', flexDirection: isMobile ? 'column' : 'row', padding: '20px' }}>
                                    <label className="btn-premium" style={{ padding: '10px 20px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 900, textAlign: 'center' }}>Subir Fondo HD <input type="file" style={{ display: 'none' }} onChange={(e) => { const copy = [...localSlides]; if (copy[selectedIdx]) copy[selectedIdx].format = '16/9'; setLocalSlides(copy); handleFileUpload(e, 'bg', selectedIdx); }} /></label>
                                    <label className="btn-outline" style={{ padding: '10px 20px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 900, textAlign: 'center' }}>Subir Fondo Square <input type="file" style={{ display: 'none' }} onChange={(e) => { const copy = [...localSlides]; if (copy[selectedIdx]) copy[selectedIdx].format = '1/1'; setLocalSlides(copy); handleFileUpload(e, 'bg', selectedIdx); }} /></label>
                                </div>
                            )}

                            {/* Draw Tool Visual Indicator for Teacher */}
                            {currentSlide.elements?.some(el => el.type === 'draw') && (
                                <div style={{ position: 'absolute', inset: 0, border: '4px solid rgba(167, 139, 250, 0.3)', pointerEvents: 'none', zIndex: 10 }}>
                                    <div style={{ position: 'absolute', top: '10px', left: '10px', background: '#a78bfa', color: 'black', padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '5px' }}><Paintbrush size={12} /> MODO DIBUJO ACTIVO</div>
                                </div>
                            )}

                            {(currentSlide.elements || []).filter(el => el.type !== 'draw').map(el => (
                                <div key={el.id}
                                    onMouseDown={(e) => { e.stopPropagation(); setDraggingElementId(el.id); setSelectedElementId(el.id); }}
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                        position: 'absolute',
                                        left: `${el.x}%`,
                                        top: `${el.y}%`,
                                        transform: 'translate(-50%, -50%)',
                                        zIndex: 100,
                                        cursor: 'move',
                                        border: selectedElementId === el.id ? '2px solid #7c3aed' : '1px dashed rgba(255,255,255,0.3)',
                                        borderRadius: '8px',
                                        padding: '5px',
                                        width: el.type === 'drag'
                                            ? (el.imageSize ? `${(el.imageSize / 100) * 25}%` : (el.width ? `${(el.width / 900) * 100}%` : '25%'))
                                            : (el.width ? `${(el.width / 900) * 100}%` : 'auto'),
                                        height: el.type === 'drag' ? 'auto' : (el.height ? `${(el.height / 506) * 100}%` : 'auto'),
                                        aspectRatio: el.type === 'drag' ? '1/1' : 'auto',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    {el.type === 'text' && <textarea value={el.text} onClick={(e) => e.stopPropagation()} onChange={(e) => { const copy = [...localSlides]; copy[selectedIdx].elements.find(item => item.id === el.id).text = e.target.value; setLocalSlides(copy); }} style={{ background: 'transparent', border: 'none', color: 'white', textAlign: 'center', width: '100%', height: '100%', outline: 'none', resize: 'none', fontWeight: 800, fontSize: isMobile ? '0.6rem' : '1rem' }} />}
                                    {el.type === 'drag' && (el.url ? <img src={el.url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <Move size={20} color="#3b82f6" />)}
                                    {el.type === 'stamp' && <div style={{ width: '100%', height: '100%', borderRadius: '50%', border: '2px dashed red', background: 'rgba(239, 68, 68, 0.1)' }} />}
                                    {['text', 'stamp'].includes(el.type) && <div onMouseDown={(e) => { e.stopPropagation(); setResizingElementId(el.id); }} style={{ position: 'absolute', bottom: '-5px', right: '-5px', width: '15px', height: '15px', background: '#7c3aed', borderRadius: '50%', cursor: 'nwse-resize' }} />}
                                </div>
                            ))}
                        </div>
                    )}
                </main>

                <aside style={{
                    width: showSettingsPanel ? (isMobile ? '100%' : '340px') : '0px',
                    minWidth: showSettingsPanel ? (isMobile ? '100%' : '340px') : '0px',
                    background: '#0a0a1a',
                    borderLeft: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: (isMobile || isTablet) ? 'absolute' : 'relative',
                    right: 0,
                    top: 0,
                    bottom: 0,
                    zIndex: 2000,
                    boxShadow: (isMobile || isTablet) && showSettingsPanel ? '-20px 0 50px rgba(0,0,0,0.5)' : 'none'
                }}>
                    <div style={{ padding: '25px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '0.8rem', color: 'white', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}><SettingsIcon size={18} color="#a78bfa" /> Ajustes</h3>
                        {(isMobile || isTablet) && <button onClick={() => setShowSettingsPanel(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>}
                    </div>
                    <div style={{ padding: '25px', flex: 1, display: 'flex', flexDirection: 'column', gap: '25px', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: 'rgba(255,255,255,0.04)', padding: '18px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <button onClick={() => setCanvasZoom(Math.max(0.2, canvasZoom - 0.1))} style={{ background: 'none', border: 'none', color: 'white', opacity: 0.5, cursor: 'pointer' }}><ZoomOut size={20} /></button>
                            <span style={{ flex: 1, textAlign: 'center', fontWeight: 900, fontSize: '1.2rem', color: '#a78bfa' }}>{Math.round(canvasZoom * 100)}%</span>
                            <button onClick={() => setCanvasZoom(Math.min(2, canvasZoom + 0.1))} style={{ background: 'none', border: 'none', color: 'white', opacity: 0.5, cursor: 'pointer' }}><ZoomIn size={20} /></button>
                        </div>

                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '22px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showMoreSettings ? '20px' : '0px' }}>
                                <h3 style={{ fontSize: '0.8rem', color: 'white', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}><SettingsIcon size={18} color="#a78bfa" /> Ajustes</h3>
                                <button onClick={() => setShowMoreSettings(!showMoreSettings)} className="btn-outline" style={{ fontSize: '0.65rem', padding: '6px 12px', background: showMoreSettings ? 'rgba(167, 139, 250, 0.2)' : 'none' }}>{showMoreSettings ? 'VER MENOS' : 'VER MÁS'}</button>
                            </div>
                            {showMoreSettings && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <div style={{ height: '15px' }} /> {/* Spacer */}
                                    <div>
                                        <label style={{ fontSize: '0.65rem', color: '#444455', fontWeight: 900, display: 'block', marginBottom: '8px', letterSpacing: '1px' }}>NOMBRE DEL PROYECTO</label>
                                        <div style={{ position: 'relative' }}>
                                            <input ref={nameInputRef} className="premium-input" style={{ width: '100%', paddingRight: '40px', background: 'rgba(0,0,0,0.3)', height: '45px' }} value={currentProject?.name || ''} onChange={(e) => setCurrentProject({ ...currentProject, name: e.target.value })} />
                                            <Edit2 size={16} color="#64748b" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer' }} onClick={() => nameInputRef.current?.focus()} />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.65rem', color: '#444455', fontWeight: 900, display: 'block', marginBottom: '8px', letterSpacing: '1px' }}>CLAVE DE ACCESO</label>
                                        <div style={{ position: 'relative' }}>
                                            <input className="premium-input" style={{ width: '100%', paddingRight: '40px', background: 'rgba(0,0,0,0.3)', height: '45px' }} value={currentProject?.access_code || ''} onChange={(e) => setCurrentProject({ ...currentProject, access_code: e.target.value })} />
                                            <Key size={16} color="#64748b" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '22px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <h3 style={{ fontSize: '0.8rem', color: 'white', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}><LayoutGrid size={18} color="#3b82f6" /> Herramientas</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                {[{ type: 'draw', icon: Paintbrush, label: 'DRAW', color: '#a78bfa' }, { type: 'drag', icon: Move, label: 'DRAG', color: '#3b82f6' }, { type: 'stamp', icon: Target, label: 'STAMP', color: '#ef4444' }, { type: 'text', icon: Type, label: 'TEXT', color: '#10b981' }].map(t => {
                                    const isActive = currentSlide?.elements?.some(el => el.type === t.type);
                                    return (
                                        <button
                                            key={t.type}
                                            onClick={() => { addElement(t.type); if (isMobile) setShowSettingsPanel(false); }}
                                            className="btn-outline"
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: '8px',
                                                padding: '20px',
                                                borderRadius: '18px',
                                                background: isActive ? `${t.color}22` : 'rgba(255,255,255,0.02)',
                                                border: isActive ? `1px solid ${t.color}` : '1px solid rgba(255,255,255,0.05)',
                                                position: 'relative'
                                            }}
                                        >
                                            <t.icon size={22} color={t.color} />
                                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: isActive ? 'white' : '#64748b' }}>{t.label}</span>
                                            {isActive && <div style={{ position: 'absolute', top: '8px', right: '8px', width: '6px', height: '6px', borderRadius: '50%', background: t.color }} />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {selectedElementId && (
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} style={{ background: 'rgba(124, 58, 237, 0.05)', padding: '22px', borderRadius: '24px', border: '1px solid rgba(124, 58, 237, 0.2)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                    <h3 style={{ fontSize: '0.8rem', color: 'white', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}><SettingsIcon size={18} color="#a78bfa" /> Elemento</h3>
                                    <button onClick={() => {
                                        setLocalSlides(prev => prev.map((s, idx) => idx === selectedIdx ? { ...s, elements: s.elements.filter(el => el.id !== selectedElementId) } : s));
                                        setSelectedElementId(null);
                                    }} style={{ background: 'rgba(239, 68, 68, 0.2)', border: 'none', color: '#ef4444', padding: '8px', borderRadius: '10px', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                </div>

                                {currentSlide.elements.find(el => el.id === selectedElementId)?.type === 'drag' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                        <label className="btn-outline" style={{ width: '100%', cursor: 'pointer', padding: '12px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '0.75rem' }}>
                                            <ImageIcon size={16} /> {currentSlide.elements.find(el => el.id === selectedElementId).url ? 'Cambiar Imagen' : 'Subir Imagen'}
                                            <input type="file" style={{ display: 'none' }} accept="image/*" onChange={(e) => handleFileUpload(e, 'drag_img', selectedIdx, currentSlide.elements.findIndex(el => el.id === selectedElementId))} />
                                        </label>

                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                <label style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 900 }}>TAMAÑO IMAGEN (MAX 500)</label>
                                                <span style={{ fontSize: '0.65rem', color: '#a78bfa', fontWeight: 900 }}>{currentSlide.elements.find(el => el.id === selectedElementId).imageSize || 100}%</span>
                                            </div>
                                            <input type="range" min="20" max="500" value={currentSlide.elements.find(el => el.id === selectedElementId).imageSize || 100} onChange={(e) => {
                                                const val = parseInt(e.target.value);
                                                setLocalSlides(prev => prev.map((s, idx) => idx === selectedIdx ? { ...s, elements: s.elements.map(el => el.id === selectedElementId ? { ...el, imageSize: val } : el) } : s));
                                            }} style={{ width: '100%', accentColor: '#7c3aed' }} />
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '22px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <h3 style={{ fontSize: '0.8rem', color: 'white', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}><Music size={18} color="#10b981" /> Audio</h3>
                            <label className="btn-outline" style={{ width: '100%', cursor: 'pointer', padding: '15px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '0.85rem' }}><Music size={18} /> {currentSlide?.audio_url ? 'Cambiar Audio' : 'Subir Audio'} <input type="file" style={{ display: 'none' }} accept="audio/*" onChange={(e) => handleFileUpload(e, 'audio', selectedIdx)} /></label>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}
