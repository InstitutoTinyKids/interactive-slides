import React, { useState, useEffect, useRef } from 'react';
import {
    Plus, Edit2, ExternalLink, Gamepad2, Link as LinkIcon, Trash2, X, ChevronLeft,
    Folder, FolderPlus, GripVertical, Move, Save, Play, Pause, BookOpen
} from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useApp } from '../context/AppContext';
import { Header } from './common/Header';
import { dbService } from '../services/db';

export default function ExtrasView({ onExit, onOpenBook }) {
    const { notify, isMobile: appIsMobile } = useApp();
    const [extras, setExtras] = useState([]);
    const [folders, setFolders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentFolderId, setCurrentFolderId] = useState(null);
    const [isSortMode, setIsSortMode] = useState(false);
    const [selectedExtras, setSelectedExtras] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState(null); // 'link', 'game', 'folder'
    const [editingExtra, setEditingExtra] = useState(null);
    const [editingFolderId, setEditingFolderId] = useState(null);
    const [formData, setFormData] = useState({ title: '', content: '', is_active: true });
    const [showMoveModal, setShowMoveModal] = useState(false);
    const [targetFolderForMove, setTargetFolderForMove] = useState('');
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);

    const [tempFolders, setTempFolders] = useState([]);
    const [tempExtras, setTempExtras] = useState([]);
    const [draggingExtraId, setDraggingExtraId] = useState(null);
    const [hoveredFolderId, setHoveredFolderId] = useState(null);
    const folderRefs = useRef({});

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
            setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
        };
        window.addEventListener('resize', handleResize);
        loadExtras();
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

    const handleDragEnd = async (extraId) => {
        if (hoveredFolderId) {
            setTempExtras(prev => prev.map(e =>
                e.id === extraId ? { ...e, folder_id: hoveredFolderId } : e
            ));
        }
        setDraggingExtraId(null);
        setHoveredFolderId(null);
    };

    const loadExtras = async () => {
        setLoading(true);
        try {
            const [eData, fData] = await Promise.all([
                dbService.getExtras(),
                dbService.getExtraFolders()
            ]);
            setExtras(eData || []);
            setFolders(fData || []);
        } catch (err) {
            console.error('Error loading extras:', err);
            notify.error('Error al cargar extras');
        }
        setSelectedExtras([]);
        setLoading(false);
    };

    const handleCreate = (type) => {
        setModalType(type);
        setEditingExtra(null);
        setEditingFolderId(null);
        setFormData({
            title: type === 'book' ? 'BOOK / RC' : '',
            content: '',
            is_active: true
        });
        setShowModal(true);
    };

    const handleEdit = (extra) => {
        setModalType(extra.type);
        setEditingExtra(extra);
        setFormData({ title: extra.title, content: extra.content, is_active: extra.is_active ?? true });
        setShowModal(true);
    };

    const handleEditFolder = (folder) => {
        setModalType('folder');
        setEditingFolderId(folder.id);
        setFormData({ title: folder.name, content: '' });
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!formData.title.trim()) {
            notify.error('Por favor completa el título');
            return;
        }

        if (modalType !== 'folder' && modalType !== 'book' && !formData.content.trim()) {
            notify.error('Por favor completa todos los campos');
            return;
        }

        setLoading(true);
        try {
            if (modalType === 'folder') {
                if (editingFolderId) {
                    await dbService.updateExtraFolder(editingFolderId, { name: formData.title.trim() });
                    notify.success('Carpeta actualizada');
                } else {
                    const maxOrder = folders.length > 0 ? Math.max(...folders.map(f => f.order_index || 0)) : -1;
                    await dbService.createExtraFolder({
                        name: formData.title.trim(),
                        order_index: maxOrder + 1
                    });
                    notify.success('Carpeta creada');
                    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
                }
            } else {
                const extraData = {
                    title: formData.title.trim(),
                    type: modalType,
                    content: modalType === 'book' ? 'INTERNAL_BOOK' : formData.content.trim(),
                    folder_id: currentFolderId,
                    is_active: formData.is_active
                };

                if (editingExtra) {
                    await dbService.updateExtra(editingExtra.id, extraData);
                    notify.success('Extra actualizado');
                } else {
                    const maxOrder = extras.length > 0 ? Math.max(...extras.map(e => e.order_index || 0)) : -1;
                    await dbService.createExtra({
                        ...extraData,
                        order_index: maxOrder + 1
                    });
                    notify.success('Extra creado');
                    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
                }
            }
            setShowModal(false);
            loadExtras();
        } catch (err) {
            console.error('Error saving:', err);
            notify.error('Error al guardar');
        }
        setLoading(false);
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Eliminar este extra?')) return;
        setLoading(true);
        try {
            await dbService.deleteExtra(id);
            notify.success('Extra eliminado');
            loadExtras();
        } catch (err) {
            console.error('Error deleting:', err);
            notify.error('Error al eliminar');
        }
        setLoading(false);
    };

    const handleDeleteFolder = async (folderId) => {
        const extrasInFolder = extras.filter(e => e.folder_id === folderId);
        if (extrasInFolder.length > 0) {
            notify.error('No puedes eliminar una carpeta que contiene extras');
            return;
        }
        if (!confirm('¿Eliminar esta carpeta?')) return;
        setLoading(true);
        try {
            await dbService.deleteExtraFolder(folderId);
            notify.success('Carpeta eliminada');
            loadExtras();
        } catch (err) {
            console.error('Error deleting folder:', err);
            notify.error('Error al eliminar carpeta');
        }
        setLoading(false);
    };

    const handleOpen = (extra) => {
        if (extra.type === 'link') {
            window.open(extra.content, '_blank');
        } else if (extra.type === 'game') {
            window.open(`/games/${extra.content}`, '_blank');
        } else if (extra.type === 'book') {
            onOpenBook();
        }
    };

    const toggleActive = async (extra) => {
        try {
            const newActiveState = !extra.is_active;
            await dbService.updateExtra(extra.id, { is_active: newActiveState });
            setExtras(prev => prev.map(e =>
                e.id === extra.id ? { ...e, is_active: newActiveState } : e
            ));
            notify.success(newActiveState ? 'Extra activado' : 'Extra pausado');
        } catch (err) {
            console.error('Error toggling active:', err);
            notify.error('Error al cambiar estado');
        }
    };

    const toggleExtraSelection = (id) => {
        setSelectedExtras(prev =>
            prev.includes(id) ? prev.filter(eid => eid !== id) : [...prev, id]
        );
    };

    const handleMoveSelected = async () => {
        if (!targetFolderForMove && targetFolderForMove !== 'root') {
            notify.error('Selecciona un destino');
            return;
        }
        setLoading(true);
        try {
            const folderId = targetFolderForMove === 'root' ? null : targetFolderForMove;
            await Promise.all(
                selectedExtras.map(id => dbService.updateExtra(id, { folder_id: folderId }))
            );
            notify.success(`${selectedExtras.length} extras movidos`);
            setShowMoveModal(false);
            setSelectedExtras([]);
            loadExtras();
        } catch (err) {
            console.error('Error moving extras:', err);
            notify.error('Error al mover extras');
        }
        setLoading(false);
    };

    const enterSortMode = () => {
        setIsSortMode(true);
        setTempFolders([...folders]);
        setTempExtras([...extras]);
    };

    const cancelSortMode = () => {
        setIsSortMode(false);
        setTempFolders([]);
        setTempExtras([]);
        setHoveredFolderId(null);
    };

    const saveSortMode = async () => {
        setLoading(true);
        try {
            // Save folder order
            await Promise.all(
                tempFolders.map((folder, index) =>
                    dbService.updateExtraFolder(folder.id, { order_index: index })
                )
            );

            // Save extras order
            await Promise.all(
                tempExtras.map((extra, index) =>
                    dbService.updateExtra(extra.id, { order_index: index, folder_id: extra.folder_id })
                )
            );

            setFolders(tempFolders);
            setExtras(tempExtras);
            notify.success('Orden guardado');
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            setIsSortMode(false);
            setTempFolders([]);
            setTempExtras([]);
        } catch (err) {
            console.error('Error saving order:', err);
            notify.error('Error al guardar orden');
        }
        setLoading(false);
    };

    const currentFolders = !currentFolderId ? (isSortMode ? tempFolders : folders) : [];
    const displayExtras = (isSortMode ? tempExtras : extras).filter(e => e.folder_id === currentFolderId);
    const currentFolder = folders.find(f => f.id === currentFolderId);

    return (
        <div style={{ height: '100vh', width: '100vw', background: '#050510', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Header
                title={currentFolder ? currentFolder.name : "Extras"}
                onBack={currentFolderId ? () => setCurrentFolderId(null) : onExit}
                showBackButton={true}
            >
                {!isSortMode ? (
                    <>
                        <button onClick={() => handleCreate('folder')} className="btn-outline" style={{ padding: '10px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Nueva Carpeta">
                            <FolderPlus size={18} />
                        </button>
                        <button onClick={() => handleCreate('link')} style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', border: 'none', color: 'white', cursor: 'pointer', transition: 'all 0.2s' }}>
                            <LinkIcon size={16} /> {!isMobile && 'Link'}
                        </button>
                        <button onClick={() => handleCreate('book')} style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', border: 'none', color: 'white', cursor: 'pointer', transition: 'all 0.2s' }}>
                            <BookOpen size={16} /> {!isMobile && 'Book'}
                        </button>
                        <button onClick={() => handleCreate('game')} className="btn-premium" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>
                            <Gamepad2 size={16} /> {!isMobile && 'Juego'}
                        </button>
                    </>
                ) : (
                    <>
                        <button onClick={cancelSortMode} className="btn-outline" style={{ padding: '10px 14px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>
                            Cancelar
                        </button>
                        <button onClick={saveSortMode} className="btn-premium" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>
                            <Save size={16} /> Guardar
                        </button>
                    </>
                )}
            </Header>

            {/* Toolbar */}
            {!isSortMode && selectedExtras.length > 0 && (
                <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(59, 130, 246, 0.2)' }}>
                    <span style={{ color: '#3b82f6', fontWeight: 700, fontSize: '0.9rem' }}>
                        {selectedExtras.length} seleccionado{selectedExtras.length > 1 ? 's' : ''}
                    </span>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => setShowMoveModal(true)} className="btn-outline" style={{ padding: '8px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Move size={14} /> Mover
                        </button>
                        <button onClick={() => setSelectedExtras([])} className="btn-outline" style={{ padding: '8px 12px', fontSize: '0.8rem' }}>
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {!isSortMode && selectedExtras.length === 0 && (
                <div style={{ padding: '15px 20px', display: 'flex', justifyContent: 'flex-end', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <button onClick={enterSortMode} className="btn-outline" style={{ padding: '8px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <GripVertical size={14} /> Ordenar
                    </button>
                </div>
            )}

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '20px' : '30px' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    {loading && (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                            <p>Cargando...</p>
                        </div>
                    )}

                    {!loading && (
                        <AnimatePresence>
                            {/* Folders */}
                            {currentFolders.length > 0 && (
                                <div style={{ marginBottom: '30px' }}>
                                    <h3 style={{ fontSize: '0.9rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '15px' }}>
                                        Carpetas
                                    </h3>
                                    <Reorder.Group
                                        axis="y"
                                        values={isSortMode ? tempFolders : currentFolders}
                                        onReorder={isSortMode ? setTempFolders : () => { }}
                                        style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px', listStyle: 'none', padding: 0 }}
                                    >
                                        {(isSortMode ? tempFolders : currentFolders).map(folder => (
                                            <Reorder.Item
                                                key={folder.id}
                                                value={folder}
                                                drag={isSortMode}
                                                ref={el => folderRefs.current[folder.id] = el}
                                                className="glass"
                                                style={{
                                                    padding: '20px',
                                                    borderRadius: '16px',
                                                    border: hoveredFolderId === folder.id ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.05)',
                                                    background: hoveredFolderId === folder.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                                    cursor: isSortMode ? 'grab' : 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '12px',
                                                    transition: '0.2s'
                                                }}
                                                onClick={() => !isSortMode && setCurrentFolderId(folder.id)}
                                            >
                                                {isSortMode ? <GripVertical size={20} color="#64748b" /> : <Folder size={24} color="#10b981" />}
                                                <span style={{ flex: 1, fontWeight: 700, color: 'white' }}>{folder.name}</span>
                                                {!isSortMode && (
                                                    <div style={{ display: 'flex', gap: '5px' }} onClick={(e) => e.stopPropagation()}>
                                                        <button onClick={() => handleEditFolder(folder)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#94a3b8', padding: '6px', borderRadius: '8px', cursor: 'pointer' }}>
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button onClick={() => handleDeleteFolder(folder.id)} style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', padding: '6px', borderRadius: '8px', cursor: 'pointer' }}>
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                )}
                                            </Reorder.Item>
                                        ))}
                                    </Reorder.Group>
                                </div>
                            )}

                            {/* Extras */}
                            {displayExtras.length > 0 && (
                                <div>
                                    <h3 style={{ fontSize: '0.9rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '15px' }}>
                                        {currentFolder ? 'Contenido' : 'Extras'}
                                    </h3>
                                    <Reorder.Group
                                        axis="y"
                                        values={displayExtras}
                                        onReorder={(newOrder) => {
                                            if (isSortMode) {
                                                setTempExtras(prev => {
                                                    const others = prev.filter(e => e.folder_id !== currentFolderId);
                                                    return [...others, ...newOrder];
                                                });
                                            }
                                        }}
                                        style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px', listStyle: 'none', padding: 0 }}
                                    >
                                        {displayExtras.map(extra => (
                                            <Reorder.Item
                                                key={extra.id}
                                                value={extra}
                                                drag={isSortMode}
                                                onDragStart={() => setDraggingExtraId(extra.id)}
                                                onDrag={handleDrag}
                                                onDragEnd={() => handleDragEnd(extra.id)}
                                                className={`glass ${selectedExtras.includes(extra.id) ? 'selected' : ''}`}
                                                style={{
                                                    padding: '20px',
                                                    borderRadius: '16px',
                                                    border: selectedExtras.includes(extra.id) ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.05)',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '15px',
                                                    cursor: isSortMode ? 'grab' : 'default',
                                                    position: 'relative',
                                                    zIndex: draggingExtraId === extra.id ? 1000 : 1,
                                                    opacity: !extra.is_active ? 0.5 : 1,
                                                    transition: 'opacity 0.3s'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    {isSortMode ? (
                                                        <GripVertical size={24} color="#64748b" />
                                                    ) : (
                                                        <div style={{
                                                            padding: '12px',
                                                            background: extra.type === 'link' ? 'rgba(59, 130, 246, 0.1)' :
                                                                extra.type === 'book' ? 'rgba(245, 158, 11, 0.1)' :
                                                                    'rgba(249, 115, 22, 0.1)',
                                                            borderRadius: '12px',
                                                            color: extra.type === 'link' ? '#3b82f6' :
                                                                extra.type === 'book' ? '#f59e0b' :
                                                                    '#f97316'
                                                        }}>
                                                            {extra.type === 'link' ? <LinkIcon size={24} /> :
                                                                extra.type === 'book' ? <BookOpen size={24} /> :
                                                                    <Gamepad2 size={24} />}
                                                        </div>
                                                    )}
                                                    <div style={{ flex: 1 }}>
                                                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white', margin: 0 }}>{extra.title}</h3>
                                                        <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: 0, textTransform: 'uppercase', fontWeight: 700 }}>
                                                            {extra.type === 'link' ? 'Enlace' : extra.type === 'book' ? 'Reading Club' : 'Juego'}
                                                        </p>
                                                    </div>
                                                    {!isSortMode && (
                                                        <input type="checkbox" checked={selectedExtras.includes(extra.id)} onChange={() => toggleExtraSelection(extra.id)} style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
                                                    )}
                                                </div>

                                                {!isSortMode && (
                                                    <>
                                                        {/* Toggle Active/Pause */}
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                {extra.is_active ? (
                                                                    <Play size={14} color="#10b981" />
                                                                ) : (
                                                                    <Pause size={14} color="#f59e0b" />
                                                                )}
                                                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: extra.is_active ? '#10b981' : '#f59e0b', textTransform: 'uppercase' }}>
                                                                    {extra.is_active ? 'Activo' : 'Pausado'}
                                                                </span>
                                                            </div>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); toggleActive(extra); }}
                                                                style={{
                                                                    width: '44px',
                                                                    height: '24px',
                                                                    borderRadius: '12px',
                                                                    border: 'none',
                                                                    background: extra.is_active ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'rgba(255,255,255,0.1)',
                                                                    position: 'relative',
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.3s'
                                                                }}
                                                            >
                                                                <div style={{
                                                                    width: '18px',
                                                                    height: '18px',
                                                                    borderRadius: '50%',
                                                                    background: 'white',
                                                                    position: 'absolute',
                                                                    top: '3px',
                                                                    left: extra.is_active ? '23px' : '3px',
                                                                    transition: 'all 0.3s',
                                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                                                }} />
                                                            </button>
                                                        </div>

                                                        {/* Action Buttons */}
                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                            <button onClick={() => handleEdit(extra)} className="btn-outline" style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.85rem' }}>
                                                                <Edit2 size={14} /> Editar
                                                            </button>
                                                            <button onClick={() => handleOpen(extra)} className="btn-premium" style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.85rem' }}>
                                                                <ExternalLink size={14} /> Abrir
                                                            </button>
                                                            <button onClick={() => handleDelete(extra.id)} style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '10px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </Reorder.Item>
                                        ))}
                                    </Reorder.Group>
                                </div>
                            )}

                            {!loading && currentFolders.length === 0 && displayExtras.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
                                    <p style={{ fontSize: '1.1rem', fontWeight: 700 }}>No hay extras aquí</p>
                                    <p style={{ fontSize: '0.9rem', marginTop: '10px' }}>Crea un Link, Juego o Carpeta para comenzar</p>
                                </div>
                            )}
                        </AnimatePresence>
                    )}
                </div>
            </div>

            {/* Modal Create/Edit */}
            {
                showModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)', padding: '20px' }}>
                        <div className="glass anim-up" style={{ width: '100%', maxWidth: '500px', padding: '40px', background: '#0a0a1a', border: '1px solid rgba(167, 139, 250, 0.2)', borderRadius: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                                <h2 style={{ fontSize: '1.8rem', color: 'white', margin: 0, fontWeight: 900 }}>
                                    {editingExtra || editingFolderId ? 'Editar' : 'Nuevo'} {modalType === 'link' ? 'Link' : modalType === 'game' ? 'Juego' : modalType === 'book' ? 'Libro' : 'Carpeta'}
                                </h2>
                                <button onClick={() => setShowModal(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '8px', borderRadius: '8px', display: 'flex' }}>
                                    <X size={20} />
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div>
                                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.9rem', fontWeight: 700, marginBottom: '8px' }}>
                                        {modalType === 'folder' ? 'Nombre de la Carpeta' : 'Título'}
                                    </label>
                                    <input className="premium-input" placeholder="Nombre..." value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} autoFocus style={{ width: '100%' }} />
                                </div>

                                {modalType !== 'folder' && modalType !== 'book' && (
                                    <div>
                                        <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.9rem', fontWeight: 700, marginBottom: '8px' }}>
                                            {modalType === 'link' ? 'URL' : 'Archivo del Juego'}
                                        </label>
                                        {modalType === 'link' ? (
                                            <input className="premium-input" type="url" placeholder="https://ejemplo.com" value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} style={{ width: '100%' }} />
                                        ) : (
                                            <select className="premium-input" value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', color: 'white' }}>
                                                <option value="" style={{ color: '#000' }}>Selecciona un juego...</option>
                                                <optgroup label="Listen" style={{ color: '#000' }}>
                                                    <option value="Listen BASE.html" style={{ color: '#000' }}>Listen BASE</option>
                                                    <option value="Listen BIG.html" style={{ color: '#000' }}>Listen BIG</option>
                                                    <option value="Listen MINI.html" style={{ color: '#000' }}>Listen MINI</option>
                                                    <option value="Listen TINY.html" style={{ color: '#000' }}>Listen TINY</option>
                                                </optgroup>
                                                <optgroup label="Match" style={{ color: '#000' }}>
                                                    <option value="Match BASE.html" style={{ color: '#000' }}>Match BASE</option>
                                                    <option value="Match BIG.html" style={{ color: '#000' }}>Match BIG</option>
                                                    <option value="Match MINI.html" style={{ color: '#000' }}>Match MINI</option>
                                                    <option value="Match TINY.html" style={{ color: '#000' }}>Match TINY</option>
                                                </optgroup>
                                                <optgroup label="Memoria" style={{ color: '#000' }}>
                                                    <option value="Memoria BASE.html" style={{ color: '#000' }}>Memoria BASE</option>
                                                    <option value="Memoria BIG.html" style={{ color: '#000' }}>Memoria BIG</option>
                                                    <option value="Memoria MINI.html" style={{ color: '#000' }}>Memoria MINI</option>
                                                    <option value="Memoria RC.html" style={{ color: '#000' }}>Memoria RC</option>
                                                    <option value="Memoria TINY.html" style={{ color: '#000' }}>Memoria TINY</option>
                                                </optgroup>
                                                <optgroup label="PAD" style={{ color: '#000' }}>
                                                    <option value="PAD BASE.html" style={{ color: '#000' }}>PAD BASE</option>
                                                    <option value="PAD BIG.html" style={{ color: '#000' }}>PAD BIG</option>
                                                    <option value="PAD MINI.html" style={{ color: '#000' }}>PAD MINI</option>
                                                    <option value="PAD TINY.html" style={{ color: '#000' }}>PAD TINY</option>
                                                </optgroup>
                                                <optgroup label="Search" style={{ color: '#000' }}>
                                                    <option value="Search BASE.html" style={{ color: '#000' }}>Search BASE</option>
                                                    <option value="Search BIG.html" style={{ color: '#000' }}>Search BIG</option>
                                                    <option value="Search MINI.html" style={{ color: '#000' }}>Search MINI</option>
                                                    <option value="Search TINY.html" style={{ color: '#000' }}>Search TINY</option>
                                                </optgroup>
                                                <optgroup label="Select" style={{ color: '#000' }}>
                                                    <option value="Select BASE.html" style={{ color: '#000' }}>Select BASE</option>
                                                    <option value="Select BIG.html" style={{ color: '#000' }}>Select BIG</option>
                                                    <option value="Select MINI.html" style={{ color: '#000' }}>Select MINI</option>
                                                    <option value="Select TINY.html" style={{ color: '#000' }}>Select TINY</option>
                                                </optgroup>
                                                <optgroup label="Spell" style={{ color: '#000' }}>
                                                    <option value="Spell BASE.html" style={{ color: '#000' }}>Spell BASE</option>
                                                    <option value="Spell BIG.html" style={{ color: '#000' }}>Spell BIG</option>
                                                    <option value="Spell MINI.html" style={{ color: '#000' }}>Spell MINI</option>
                                                    <option value="Spell TINY.html" style={{ color: '#000' }}>Spell TINY</option>
                                                </optgroup>
                                                <optgroup label="Otros" style={{ color: '#000' }}>
                                                    <option value="Simulador.html" style={{ color: '#000' }}>Simulador</option>
                                                </optgroup>
                                            </select>
                                        )}
                                    </div>
                                )}

                                {/* Toggle Active/Pause en Modal */}
                                {modalType !== 'folder' && (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            {formData.is_active ? (
                                                <Play size={16} color="#10b981" />
                                            ) : (
                                                <Pause size={16} color="#f59e0b" />
                                            )}
                                            <div>
                                                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'white' }}>
                                                    Estado del Extra
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                                                    {formData.is_active ? 'Activo y visible' : 'Pausado y oculto'}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                                            style={{
                                                width: '52px',
                                                height: '28px',
                                                borderRadius: '14px',
                                                border: 'none',
                                                background: formData.is_active ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'rgba(255,255,255,0.1)',
                                                position: 'relative',
                                                cursor: 'pointer',
                                                transition: 'all 0.3s'
                                            }}
                                        >
                                            <div style={{
                                                width: '22px',
                                                height: '22px',
                                                borderRadius: '50%',
                                                background: 'white',
                                                position: 'absolute',
                                                top: '3px',
                                                left: formData.is_active ? '27px' : '3px',
                                                transition: 'all 0.3s',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                            }} />
                                        </button>
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                                    <button onClick={() => setShowModal(false)} className="btn-outline" style={{ flex: 1, height: '55px' }}>Cancelar</button>
                                    <button onClick={handleSave} className="btn-premium" style={{ flex: 2, height: '55px' }}>{editingExtra || editingFolderId ? 'Actualizar' : 'Crear'}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Modal Move */}
            {
                showMoveModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
                        <div className="glass" style={{ width: '450px', padding: '40px', background: '#0a0a1a' }}>
                            <h2 style={{ fontSize: '1.5rem', color: 'white', marginBottom: '20px' }}>Mover {selectedExtras.length} Extra{selectedExtras.length > 1 ? 's' : ''}</h2>
                            <select className="premium-input" style={{ width: '100%', marginBottom: '20px', background: 'rgba(255,255,255,0.05)', color: 'white' }} value={targetFolderForMove} onChange={(e) => setTargetFolderForMove(e.target.value)}>
                                <option value="" style={{ color: '#000' }}>Selecciona destino...</option>
                                <option value="root" style={{ color: '#000' }}>Raíz (Principal)</option>
                                {folders.map(f => <option key={f.id} value={f.id} style={{ color: '#000' }}>{f.name}</option>)}
                            </select>
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <button onClick={() => setShowMoveModal(false)} className="btn-outline" style={{ flex: 1 }}>Cancelar</button>
                                <button onClick={handleMoveSelected} className="btn-premium" style={{ flex: 2 }}>Mover Ahora</button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
