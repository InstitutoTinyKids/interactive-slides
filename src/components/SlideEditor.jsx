import React, { useState, useEffect, useRef } from 'react';
import {
    Plus, Image as ImageIcon, Music, Type, Move, Target, Paintbrush,
    Save, Trash2, X, Play, Pause, Upload, Eye, ChevronLeft, LayoutGrid,
    Settings as SettingsIcon, ShieldCheck
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

    useEffect(() => {
        loadProjects();
    }, []);

    useEffect(() => {
        if (initialProject) {
            setLocalSlides(slides);
            setCurrentProject(initialProject);
            setShowGallery(false);
        }
    }, [initialProject, slides]);

    const loadProjects = async () => {
        const { data } = await supabase.from('projects').select('*').order('name');
        setProjects(data || []);
    };

    const handleCreateProject = async () => {
        const name = prompt('Nombre del nuevo programa (ej. Baby Program):');
        if (!name) return;

        const newProject = {
            id: name.toLowerCase().replace(/\s+/g, '-'),
            name: name,
            is_active: false,
            access_code: '123'
        };

        const { error } = await supabase.from('projects').insert(newProject);
        if (error) {
            alert('Error al crear proyecto: ' + error.message);
        } else {
            loadProjects();
        }
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

            const fileName = `${Date.now()}-${file.name}`;
            const { data, error } = await supabase.storage.from('media').upload(fileName, file);
            if (error) throw error;
            const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(fileName);

            const newSlides = [...localSlides];
            if (type === 'bg') newSlides[slideIdx].image_url = publicUrl;
            else if (type === 'audio') newSlides[slideIdx].audio_url = publicUrl;
            else if (type === 'drag_img') newSlides[slideIdx].elements[elementIdx].url = publicUrl;
            setLocalSlides([...newSlides]);
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
            <div className="flex flex-col h-screen w-full bg-[#050510] overflow-hidden p-10">
                <div className="flex justify-between items-center mb-10">
                    <div>
                        <h1 className="text-3xl font-black text-white">Galería de Programas</h1>
                        <p className="text-slate-400">Selecciona o crea un programa educativo</p>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={onExit} className="btn-outline">Volver al Inicio</button>
                        <button onClick={handleCreateProject} className="btn-premium"><Plus size={20} /> Nuevo Programa</button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-y-auto pr-4">
                    {projects.map(p => (
                        <div key={p.id} className="glass p-6 rounded-2xl border border-white/5 hover:border-purple-500/50 transition-all group flex flex-col gap-4">
                            <div className="flex justify-between items-start">
                                <div className={`p-3 rounded-xl ${p.is_active ? 'bg-emerald-500/20 text-emerald-500' : 'bg-slate-800 text-slate-500'}`}>
                                    <ShieldCheck size={24} />
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${p.is_active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-800 text-slate-500'}`}>
                                    {p.is_active ? 'ACTIVO' : 'PAUSADO'}
                                </span>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">{p.name}</h3>
                                <p className="text-xs text-slate-500 font-mono">ID: {p.id}</p>
                            </div>
                            <div className="flex gap-2 items-center text-xs text-slate-400">
                                <Key size={12} /> Clave: <span className="text-white font-bold">{p.access_code || 'No requerida'}</span>
                            </div>
                            <button onClick={() => handleSelectProject(p)} className="btn-premium w-full !py-3 !text-sm">Editar Laminas</button>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const currentSlide = localSlides[selectedIdx] || null;

    return (
        <div className="flex h-screen w-full bg-[#050510] overflow-hidden" onMouseMove={handleCanvasMouseMove} onMouseUp={() => { setDraggingElementId(null); setResizingElementId(null); }} onTouchEnd={() => { setDraggingElementId(null); setResizingElementId(null); }}>
            <aside style={{ width: '180px', borderRight: '1px solid rgba(255,255,255,0.1)', background: '#0a0a1a', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b' }}>DIAPOSITIVAS</span>
                    <button onClick={addSlide} style={{ background: 'rgba(124, 58, 237, 0.1)', border: 'none', color: '#a78bfa', padding: '4px', borderRadius: '6px', cursor: 'pointer' }}><Plus size={14} /></button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {localSlides.map((slide, idx) => (
                        <div key={slide.id} onClick={() => setSelectedIdx(idx)} style={{ position: 'relative', borderRadius: '8px', border: `2px solid ${selectedIdx === idx ? '#7c3aed' : 'transparent'}`, background: '#111', aspectRatio: '16/9', overflow: 'hidden', cursor: 'pointer', transition: '0.2s' }}>
                            <span style={{ position: 'absolute', top: '3px', left: '3px', zIndex: 10, fontSize: '9px', background: 'rgba(0,0,0,0.6)', padding: '1px 4px', borderRadius: '3px', color: 'white' }}>{idx + 1}</span>
                            {slide.image_url ? <img src={slide.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div className="h-full flex items-center justify-center opacity-10"><ImageIcon size={20} color="#fff" /></div>}
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteSlide(idx); }} style={{ position: 'absolute', top: '3px', right: '3px', zIndex: 10, background: 'rgba(239, 68, 68, 0.8)', border: 'none', color: 'white', padding: '3px', borderRadius: '3px' }}><Trash2 size={10} /></button>
                        </div>
                    ))}
                </div>
            </aside>

            <main className="flex-1 flex flex-col">
                <header className="h-[60px] px-6 flex items-center justify-between border-b border-white/5 bg-slate-950/50 backdrop-blur-xl">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setShowGallery(true)} className="p-2 hover:bg-white/5 rounded-lg text-slate-400"><LayoutGrid size={20} /></button>
                        <div>
                            <h2 className="text-white font-bold leading-none">{currentProject?.name}</h2>
                            <span className="text-[10px] text-slate-500 font-mono">ID: {currentProject?.id}</span>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onViewResults} className="btn-outline !py-2 !text-xs"><Eye size={14} /> Resultados</button>
                        <button onClick={onToggleActive} className={`btn-outline !py-2 !text-xs ${isActive ? 'text-red-500' : 'text-emerald-500'}`}>
                            {isActive ? <Pause size={14} /> : <Play size={14} />} {isActive ? 'Parar' : 'Iniciar'}
                        </button>
                        <button onClick={handleSaveAll} className="btn-premium !py-2 !text-xs"><Save size={14} /> Guardar Todo</button>
                    </div>
                </header>

                <div className="flex-1 flex overflow-hidden">
                    <div className="flex-1 p-10 flex flex-col items-center overflow-auto">
                        <div ref={canvasContainerRef} style={{ width: '100%', maxWidth: currentSlide?.format === '1/1' ? '700px' : '900px', aspectRatio: currentSlide?.format === '1/1' ? '1/1' : '16/9', background: '#000', borderRadius: '16px', position: 'relative', overflow: 'hidden', boxShadow: '0 50px 100px -20px black' }}>
                            {currentSlide?.image_url ? (
                                <img src={currentSlide.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-600">
                                    <ImageIcon size={48} />
                                    <label className="btn-premium !py-2 !px-4 text-xs cursor-pointer">Subir Fondo <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'bg', selectedIdx)} /></label>
                                </div>
                            )}

                            {currentSlide?.elements.map(el => (
                                <div key={el.id} onMouseDown={() => setDraggingElementId(el.id)} style={{ position: 'absolute', left: `${el.x}%`, top: `${el.y}%`, transform: 'translate(-50%, -50%)', zIndex: 100, cursor: 'move', padding: '10px', border: draggingElementId === el.id ? '2px solid #7c3aed' : '2px dashed white/20', borderRadius: '12px', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', width: el.width ? `${(el.width / 9) * 1}%` : 'auto' }}>
                                    {el.type === 'text' && (
                                        <textarea value={el.text} onChange={(e) => { const copy = [...localSlides]; copy[selectedIdx].elements.find(item => item.id === el.id).text = e.target.value; setLocalSlides(copy); }} className="bg-transparent border-none text-white text-center w-full focus:outline-none font-bold resize-none" />
                                    )}
                                    {el.type === 'drag' && (
                                        <div className="w-10 h-10 flex items-center justify-center">
                                            {el.url ? <img src={el.url} className="max-w-full max-h-full object-contain" /> : <Move size={20} color="#3b82f6" />}
                                        </div>
                                    )}
                                    <div onMouseDown={(e) => { e.stopPropagation(); setResizingElementId(el.id); }} className="absolute bottom-1 right-1 w-3 h-3 cursor-nwse-resize border-r-2 border-b-2 border-purple-500 rounded-sm" />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="w-[320px] bg-slate-950/50 border-l border-white/5 p-6 flex flex-col gap-8">
                        <div>
                            <h3 className="text-white font-bold flex items-center gap-2 mb-4"><SettingsIcon size={18} /> Ajustes del Programa</h3>
                            <div className="flex flex-col gap-4">
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Nombre</label>
                                    <input type="text" value={currentProject?.name || ''} onChange={(e) => setCurrentProject({ ...currentProject, name: e.target.value })} className="bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-purple-500" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Clave de Acceso</label>
                                    <input type="text" value={currentProject?.access_code || ''} onChange={(e) => setCurrentProject({ ...currentProject, access_code: e.target.value })} className="bg-white/5 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-purple-500" />
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-white font-bold mb-4">Herramientas</h3>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { type: 'draw', icon: Paintbrush, color: 'text-purple-500' },
                                    { type: 'drag', icon: Move, color: 'text-blue-500' },
                                    { type: 'stamp', icon: Target, color: 'text-red-500' },
                                    { type: 'text', icon: Type, color: 'text-emerald-500' }
                                ].map(t => (
                                    <button key={t.type} onClick={() => addElement(t.type)} className="glass p-4 rounded-xl border border-white/5 hover:border-white/20 flex flex-col items-center gap-2 transition-all">
                                        <div className={t.color}><t.icon size={20} /></div>
                                        <span className="text-[10px] font-bold uppercase text-white">{t.type}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mt-auto glass p-4 rounded-xl border border-emerald-500/20">
                            <h4 className="text-xs font-black text-emerald-500 mb-2">SOPORTE MULTI-PROGRAMA</h4>
                            <p className="text-[10px] text-slate-400">Ahora puedes crear programas individuales. Recuerda guardar antes de cambiar de programa.</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
