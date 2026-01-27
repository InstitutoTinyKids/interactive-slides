import React, { useState, useEffect, useRef } from 'react';
import {
    Plus,
    Image as ImageIcon,
    Music,
    Type,
    Move,
    Target,
    Paintbrush,
    Save,
    Trash2,
    X,
    Play,
    Pause,
    Upload,
    Eye,
    ChevronLeft,
    MoreVertical
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function SlideEditor({ slides, onSave, onExit, isActive, onToggleActive, onViewResults }) {
    const [localSlides, setLocalSlides] = useState(slides || []);
    const [selectedIdx, setSelectedIdx] = useState(0);
    const [loading, setLoading] = useState(false);

    // For dragging and resizing in editor
    const canvasContainerRef = useRef(null);
    const [draggingElementId, setDraggingElementId] = useState(null);
    const [resizingElementId, setResizingElementId] = useState(null);

    useEffect(() => {
        if (localSlides.length === 0) {
            addSlide();
        }
    }, []);

    const currentSlide = localSlides[selectedIdx] || null;

    const handleFileUpload = async (event, type, slideIdx, elementIdx = null) => {
        const file = event.target.files[0];
        if (!file) return;

        setLoading(true);
        try {
            const fileName = `${Date.now()}-${file.name}`;
            const { data, error } = await supabase.storage.from('media').upload(fileName, file);
            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(fileName);
            console.log('Upload success. Public URL:', publicUrl);

            const newSlides = [...localSlides];
            if (type === 'bg') {
                newSlides[slideIdx].image_url = publicUrl;
            } else if (type === 'audio') {
                newSlides[slideIdx].audio_url = publicUrl;
            } else if (type === 'drag_img') {
                newSlides[slideIdx].elements[elementIdx].url = publicUrl;
            }

            setLocalSlides([...newSlides]);
        } catch (error) {
            alert('Error al subir: ' + error.message);
        }
        setLoading(false);
    };

    const addSlide = () => {
        const newSlide = {
            id: crypto.randomUUID(),
            image_url: '',
            audio_url: '',
            elements: [],
            order_index: localSlides.length
        };
        const updated = [...localSlides, newSlide];
        setLocalSlides(updated);
        setSelectedIdx(updated.length - 1);
    };

    const deleteSlide = (idx) => {
        if (localSlides.length <= 1) return;
        if (confirm('¿Eliminar esta diapositiva?')) {
            const updated = localSlides.filter((_, i) => i !== idx);
            setLocalSlides(updated);
            setSelectedIdx(Math.max(0, idx - 1));
        }
    };

    const addElement = (type) => {
        if (!currentSlide) return;
        const newSlides = [...localSlides];
        const newEl = {
            id: crypto.randomUUID(),
            type,
            x: 50,
            y: 50,
            width: type === 'text' ? 300 : null,
            height: type === 'text' ? 150 : null,
            text: type === 'text' ? 'Escribe aquí...' : '',
            url: ''
        };
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
                const elementY = (element.y / 100) * rect.height;
                const mouseX = (x / 100) * rect.width;
                const mouseY = (y / 100) * rect.height;

                element.width = Math.max(50, (mouseX - elementX) * 2);
                element.height = Math.max(30, (mouseY - elementY) * 2);
                setLocalSlides(newSlides);
            }
        }
    };

    const handleMouseUp = () => {
        setDraggingElementId(null);
        setResizingElementId(null);
    };

    return (
        <div
            className="flex h-screen w-full bg-[#050510] overflow-hidden"
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleMouseUp}
            onTouchMove={handleCanvasMouseMove}
            onTouchEnd={handleMouseUp}
        >
            {/* Sidebar Slide Navigation - COMPACT */}
            <aside style={{ width: '180px', borderRight: '1px solid rgba(255,255,255,0.1)', background: '#0a0a1a', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b' }}>DIAPOSITIVAS</span>
                    <button onClick={addSlide} style={{ background: 'rgba(124, 58, 237, 0.1)', border: 'none', color: '#a78bfa', padding: '4px', borderRadius: '6px', cursor: 'pointer' }}>
                        <Plus size={14} />
                    </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {localSlides.map((slide, idx) => (
                        <div
                            key={slide.id}
                            onClick={() => setSelectedIdx(idx)}
                            style={{
                                position: 'relative',
                                borderRadius: '8px',
                                border: `2px solid ${selectedIdx === idx ? '#7c3aed' : 'transparent'}`,
                                background: '#111',
                                aspectRatio: '16/9',
                                overflow: 'hidden',
                                cursor: 'pointer',
                                transition: '0.2s',
                                boxShadow: selectedIdx === idx ? '0 0 10px rgba(124, 58, 237, 0.2)' : 'none'
                            }}
                        >
                            <span style={{ position: 'absolute', top: '3px', left: '3px', zIndex: 10, fontSize: '9px', background: 'rgba(0,0,0,0.6)', padding: '1px 4px', borderRadius: '3px', color: 'white' }}>{idx + 1}</span>
                            {slide.image_url ? <img src={slide.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.1 }}><ImageIcon size={20} color="#fff" /></div>}
                            <button onClick={(e) => { e.stopPropagation(); deleteSlide(idx); }} style={{ position: 'absolute', top: '3px', right: '3px', zIndex: 10, background: 'rgba(239, 68, 68, 0.8)', border: 'none', color: 'white', padding: '3px', borderRadius: '3px', cursor: 'pointer' }}><Trash2 size={10} /></button>
                        </div>
                    ))}
                </div>
            </aside>

            {/* Main Stage */}
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'radial-gradient(circle at top right, #111, #050510)' }}>
                {/* Editor Header */}
                <header style={{ height: '60px', padding: '0 25px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(15,15,25,0.8)', backdropFilter: 'blur(10px)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <button onClick={onExit} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><ChevronLeft size={20} /></button>
                        <h2 style={{ fontSize: '1rem', color: 'white' }}>Editor de Lección</h2>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={onViewResults} className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '8px 16px' }}><Eye size={16} /> Resultados</button>
                        <button onClick={onToggleActive} className={`btn-outline ${isActive ? 'btn-danger' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '8px 16px', color: isActive ? '#ef4444' : '#10b981', borderColor: isActive ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)' }}>
                            {isActive ? <Pause size={16} /> : <Play size={16} />}
                            {isActive ? 'Parar Sesión' : 'Iniciar Sesión'}
                        </button>
                        <button onClick={() => onSave(localSlides)} className="btn-premium" style={{ height: '40px', padding: '0 20px', fontSize: '0.9rem' }}><Save size={16} /> Guardar Cambios</button>
                    </div>
                </header>

                {/* Working Area - SHIFTED UP */}
                <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                    {/* The Canvas */}
                    <div style={{ flex: 1, padding: '20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflow: 'auto' }}>
                        <div
                            ref={canvasContainerRef}
                            style={{ width: '100%', maxWidth: '1000px', marginTop: '20px', aspectRatio: '16/9', background: '#000', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 40px 100px rgba(0,0,0,0.5)', position: 'relative', overflow: 'hidden' }}
                        >
                            {currentSlide?.image_url ? (
                                <img
                                    src={currentSlide.image_url}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
                                    onError={(e) => {
                                        console.error('Image load error:', e);
                                        e.target.style.display = 'none';
                                        e.target.parentElement.innerHTML += '<div style="color:red; font-size:10px; padding:20px;">Error cargando imagen. Verifica que el bucket "media" sea público en Supabase.</div>';
                                    }}
                                />
                            ) : (
                                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
                                    <div style={{ width: '60px', height: '60px', background: 'rgba(255,255,255,0.05)', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageIcon size={30} color="#444" /></div>
                                    <label className="btn-premium" style={{ padding: '12px 20px', fontSize: '0.8rem' }}>
                                        Cargar Fondo (1920x1080)
                                        <input type="file" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'bg', selectedIdx)} />
                                    </label>
                                </div>
                            )}

                            {/* Render interactive elements to position them */}
                            {currentSlide?.elements.map((el) => (
                                <div
                                    key={el.id}
                                    onMouseDown={(e) => { e.stopPropagation(); setDraggingElementId(el.id); }}
                                    onTouchStart={(e) => { e.stopPropagation(); setDraggingElementId(el.id); }}
                                    style={{
                                        position: 'absolute',
                                        left: `${el.x}%`,
                                        top: `${el.y}%`,
                                        transform: 'translate(-50%, -50%)',
                                        zIndex: 100,
                                        cursor: 'move',
                                        padding: '10px',
                                        border: draggingElementId === el.id ? '2px solid #7c3aed' : '2px dashed rgba(255,255,255,0.2)',
                                        borderRadius: '12px',
                                        background: 'rgba(0,0,0,0.4)',
                                        backdropFilter: 'blur(5px)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: el.width ? `${(el.width / 900) * 100}%` : 'auto',
                                        height: el.height ? `${(el.height / (900 * 9 / 16)) * 100}%` : 'auto'
                                    }}
                                >
                                    {el.type === 'text' && (
                                        <>
                                            <textarea
                                                value={el.text}
                                                onChange={(e) => {
                                                    const newSlides = [...localSlides];
                                                    newSlides[selectedIdx].elements.find(item => item.id === el.id).text = e.target.value;
                                                    setLocalSlides(newSlides);
                                                }}
                                                onMouseDown={(e) => e.stopPropagation()}
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: 'white',
                                                    fontSize: '18px',
                                                    textAlign: 'center',
                                                    width: '100%',
                                                    height: '100%',
                                                    resize: 'none',
                                                    outline: 'none',
                                                    fontWeight: 700,
                                                    display: 'block'
                                                }}
                                                placeholder="Escribe la consigna..."
                                            />
                                            {/* Dedicated Resize Handle */}
                                            <div
                                                onMouseDown={(e) => { e.stopPropagation(); setResizingElementId(el.id); }}
                                                onTouchStart={(e) => { e.stopPropagation(); setResizingElementId(el.id); }}
                                                style={{
                                                    position: 'absolute',
                                                    bottom: '5px',
                                                    right: '5px',
                                                    width: '15px',
                                                    height: '15px',
                                                    cursor: 'nwse-resize',
                                                    borderRight: '2px solid #7c3aed',
                                                    borderBottom: '2px solid #7c3aed',
                                                    borderRadius: '2px'
                                                }}
                                            />
                                        </>
                                    )}
                                    {el.type === 'drag' && (
                                        <div style={{ width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {el.url ? <img src={el.url} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /> : <Move size={24} color="#3b82f6" />}
                                        </div>
                                    )}
                                </div>
                            ))}

                        </div>
                    </div>

                    {/* Tools Sidebar */}
                    <div style={{ width: '320px', background: 'rgba(15,15,25,0.8)', borderLeft: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '30px' }}>
                            <h3 style={{ fontSize: '1.2rem', marginBottom: '4px', color: 'white' }}>Herramientas</h3>
                            <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Añade interacciones a esta lámina</p>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', padding: '0 30px 30px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '30px' }}>
                                {[
                                    { type: 'draw', icon: Paintbrush, label: 'Dibujar', color: '#7c3aed' },
                                    { type: 'drag', icon: Move, label: 'Arrastrar', color: '#3b82f6' },
                                    { type: 'stamp', icon: Target, label: 'Marcar', color: '#ef4444' },
                                    { type: 'text', icon: Type, label: 'Texto', color: '#10b981' }
                                ].map(tool => (
                                    <button
                                        key={tool.type}
                                        onClick={() => addElement(tool.type)}
                                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', cursor: 'pointer', transition: '0.2s' }}
                                        onMouseEnter={(e) => e.currentTarget.style.borderColor = tool.color}
                                        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                                    >
                                        <div style={{ color: tool.color }}><tool.icon size={24} /></div>
                                        <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'white' }}>{tool.label}</span>
                                    </button>
                                ))}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#475569' }}>Configuración</span>

                                <div className="glass" style={{ padding: '15px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageIcon size={18} color="#fff" /></div>
                                        <div>
                                            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'white' }}>Imagen de Fondo</p>
                                            <p style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{currentSlide?.image_url ? 'Imagen cargada' : 'No cargada'}</p>
                                        </div>
                                    </div>
                                    <label style={{ cursor: 'pointer' }}>
                                        <Upload size={18} color="#94a3b8" />
                                        <input type="file" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'bg', selectedIdx)} />
                                    </label>
                                </div>

                                <div className="glass" style={{ padding: '15px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '36px', height: '36px', background: currentSlide?.audio_url ? 'rgba(124, 58, 237, 0.2)' : 'rgba(255,255,255,0.05)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Music size={18} color={currentSlide?.audio_url ? '#a78bfa' : '#fff'} /></div>
                                        <div>
                                            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'white' }}>Audio (Opcional)</p>
                                            <p style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{currentSlide?.audio_url ? 'Voz cargada' : 'Sin audio'}</p>
                                        </div>
                                    </div>
                                    <label style={{ cursor: 'pointer' }}>
                                        <Upload size={18} color="#94a3b8" />
                                        <input type="file" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'audio', selectedIdx)} />
                                    </label>
                                </div>

                                {currentSlide?.elements.map((el, eIdx) => (
                                    <div key={el.id} className="glass" style={{ padding: '15px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#a78bfa' }}>ELEMENTO: {el.type}</span>
                                            <Trash2 size={14} style={{ cursor: 'pointer', color: '#ef4444' }} onClick={() => {
                                                const copy = [...localSlides];
                                                copy[selectedIdx].elements.splice(eIdx, 1);
                                                setLocalSlides(copy);
                                            }} />
                                        </div>

                                        {el.type === 'drag' && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '40px', height: '40px', background: 'black', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {el.url ? <img src={el.url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <ImageIcon size={16} opacity={0.2} color="#fff" />}
                                                </div>
                                                <label className="btn-outline" style={{ padding: '6px 12px', fontSize: '10px' }}>
                                                    Subir Icono
                                                    <input type="file" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'drag_img', selectedIdx, eIdx)} />
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Loading Overlay */}
            {loading && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
                    <div style={{ width: '40px', height: '40px', border: '3px solid #7c3aed', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                    <p style={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.7rem', color: 'white' }}>Sincronizando con Supabase...</p>
                </div>
            )}

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
