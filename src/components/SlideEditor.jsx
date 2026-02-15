import React, { useState, useEffect, useRef } from 'react';
import { User, Settings as SettingsIcon, ArrowRight, Play, Lock, X, GraduationCap, ChevronRight, Key, Plus, LayoutGrid, Eye, HelpCircle, Save, Layers, Image as ImageIcon, Trash2, Edit2, Copy, Move, Target, Pause, ShieldCheck, Folder, FolderPlus, ArrowUp, ArrowDown, ChevronLeft, GripVertical, Music, Paintbrush, Type, Upload, ZoomIn, ZoomOut } from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { optimizeImage } from '../lib/imageOptimizer';
import confetti from 'canvas-confetti';

export default function SlideEditor({ slides, onSave, onExit, isActive, onToggleActive, onViewResults, selectedProject: initialProject, onSelectProject, returnFromResults, onOpenQuiz, onPreview }) {
    const [localSlides, setLocalSlides] = useState(slides || []);
    const [selectedIdx, setSelectedIdx] = useState(0);
    const [loading, setLoading] = useState(false);
    // Only show gallery if NOT returning from results and no project selected
    const [showGallery, setShowGallery] = useState(!returnFromResults && !initialProject);
    const [projects, setProjects] = useState([]);
    const [folders, setFolders] = useState([]);
    const [currentProject, setCurrentProject] = useState(initialProject);
    const [galleryTab, setGalleryTab] = useState('guias'); // 'guias' or 'quiz'
    const [currentFolderId, setCurrentFolderId] = useState(null);
    const [isSortMode, setIsSortMode] = useState(false);
    const [addType, setAddType] = useState('guias'); // 'guias', 'quiz', 'folder'
    const [editingFolderId, setEditingFolderId] = useState(null);

    // For dragging and resizing in editor
    const canvasContainerRef = useRef(null);
    const [draggingElementId, setDraggingElementId] = useState(null);
    const [resizingElementId, setResizingElementId] = useState(null);
    const [selectedElementId, setSelectedElementId] = useState(null);

    const [selectedProjects, setSelectedProjects] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);
    const [isLandscape, setIsLandscape] = useState(window.innerWidth > window.innerHeight);
    const [isCompact, setIsCompact] = useState(window.innerWidth < 1200);
    const [showSlidesPanel, setShowSlidesPanel] = useState(window.innerWidth >= 1200);
    const [showSettingsPanel, setShowSettingsPanel] = useState(window.innerWidth >= 1200);
    const [showTypeDropdown, setShowTypeDropdown] = useState(false);

    // Estados para edición controlada en Ajustes
    const [isEditingProjectName, setIsEditingProjectName] = useState(false);
    const [isEditingAccessCode, setIsEditingAccessCode] = useState(false);
    const [hasUnsavedNameChanges, setHasUnsavedNameChanges] = useState(false);
    const [hasUnsavedCodeChanges, setHasUnsavedCodeChanges] = useState(false);
    const [showProjectDetails, setShowProjectDetails] = useState(false);
    const [hoveredFolderId, setHoveredFolderId] = useState(null);
    const [showMoveModal, setShowMoveModal] = useState(false);
    const [targetFolderForMove, setTargetFolderForMove] = useState('');
    const [canvasZoom, setCanvasZoom] = useState(1);

    const PROGRAM_ORDER = [
        'Baby Program', 'Mini Program', 'Tiny Program', 'Big Program',
        'Junior Program', 'Reading Club', 'Conversation Club'
    ];

    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            setIsMobile(width < 768);
            setIsTablet(width >= 768 && width < 1024);
            setIsLandscape(width > height);
            setIsCompact(width < 1200);
            // Auto-show panels on larger screens
            if (width >= 1200) {
                setShowSlidesPanel(true);
                setShowSettingsPanel(true);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        loadProjects();
    }, []);

    useEffect(() => {
        const handleClickOutside = () => setShowTypeDropdown(false);
        if (showTypeDropdown) {
            window.addEventListener('click', handleClickOutside);
        }
        return () => window.removeEventListener('click', handleClickOutside);
    }, [showTypeDropdown]);

    // Sync project when it changes in parent App (but don't hide gallery - we want gallery first)
    useEffect(() => {
        if (initialProject) {
            setCurrentProject(initialProject);
            // Removed: setShowGallery(false) - we always want to show gallery first
        }
    }, [initialProject]);

    useEffect(() => {
        setLocalSlides(slides || []);
    }, [slides]);

    const loadProjects = async () => {
        setLoading(true);
        try {
            // Fetch Folders (silently fail if table doesn't exist yet)
            const { data: folderData, error: fError } = await supabase.from('folders').select('*').order('order_index', { ascending: true });
            if (!fError) setFolders(folderData || []);

            // Fetch Projects
            // We first try to fetch with order_index, if it fails (because the column doesn't exist), we fallback to name
            let { data: projectData, error: pError } = await supabase.from('projects')
                .select('*')
                .order('order_index', { ascending: true });

            if (pError) {
                // Fallback to name-based sorting if order_index is missing
                const { data: fallbackData } = await supabase.from('projects')
                    .select('*')
                    .order('name');
                projectData = fallbackData;
            }

            if (projectData) {
                setProjects(projectData);
            }
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
                const { error } = await supabase.from('folders').update({ name: newProjectName.trim() }).eq('id', editingFolderId);
                if (error) alert('Error: ' + error.message);
            } else {
                const { error } = await supabase.from('folders').insert({
                    name: newProjectName.trim(),
                    order_index: folders.length + projects.filter(p => !p.folder_id).length
                });
                if (error) alert('Error: ' + error.message);
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

    const handleDuplicateFolder = async (folder) => {
        setLoading(true);
        try {
            const newFolderName = `${folder.name} (Copia)`;
            const { data: newFolder, error: fError } = await supabase
                .from('folders')
                .insert({ name: newFolderName, order_index: folders.length + projects.filter(p => !p.folder_id).length })
                .select()
                .single();

            if (fError) throw fError;

            // Clone all projects inside using the new duplication logic
            const projectsToClone = projects.filter(p => p.folder_id === folder.id);
            for (const p of projectsToClone) {
                await handleDuplicateProject(p, newFolder.id);
            }
            loadProjects();
            alert('✅ Carpeta completa duplicada');
        } catch (err) {
            alert('Error al duplicar carpeta: ' + err.message);
        }
        setLoading(false);
    };

    const [tempFolders, setTempFolders] = useState([]);
    const [tempProjects, setTempProjects] = useState([]);

    const toggleSortMode = async () => {
        if (isSortMode) {
            setLoading(true);
            try {
                // Save Folders order
                for (let i = 0; i < tempFolders.length; i++) {
                    if (tempFolders[i].order_index !== i) {
                        await supabase.from('folders').update({ order_index: i }).eq('id', tempFolders[i].id);
                    }
                }

                // Save ONLY projects that were in the current view or moved
                // To be safe, we'll save all tempProjects that have changed folder or index
                for (let i = 0; i < tempProjects.length; i++) {
                    const original = projects.find(p => p.id === tempProjects[i].id);
                    if (original && (original.folder_id !== tempProjects[i].folder_id || original.order_index !== i)) {
                        await supabase.from('projects').update({
                            order_index: i,
                            folder_id: tempProjects[i].folder_id
                        }).eq('id', tempProjects[i].id);
                    }
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

    const handleMoveToFolder = async (projectId, folderId) => {
        if (!isSortMode) return;
        setTempProjects(prev => prev.map(p => p.id === projectId ? { ...p, folder_id: folderId } : p));
    };

    const handleDuplicateProject = async (project, targetFolderId = null, silent = false) => {
        if (!silent) setLoading(true);
        try {
            const newId = project.id.startsWith('quiz-') ? `quiz-${crypto.randomUUID()}` : crypto.randomUUID();
            const newName = `${project.name} (Copia)`;

            const { data: slidesToClone } = await supabase.from('slides').select('*').eq('project_id', project.id);

            const clonedSlides = [];
            if (slidesToClone) {
                for (const s of slidesToClone) {
                    const newSlideId = crypto.randomUUID();
                    let newBgUrl = s.image_url;
                    let newAudioUrl = s.audio_url;

                    // Physical copy of background image
                    if (s.image_url) {
                        const oldPath = s.image_url.split('/media/')[1];
                        if (oldPath) {
                            const newPath = `copy_${Date.now()}_${oldPath}`;
                            const { error: copyErr } = await supabase.storage.from('media').copy(oldPath, newPath);
                            if (!copyErr) {
                                const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(newPath);
                                newBgUrl = publicUrl;
                            }
                        }
                    }

                    // Physical copy of audio
                    if (s.audio_url) {
                        const oldPath = s.audio_url.split('/media/')[1];
                        if (oldPath) {
                            const newPath = `copy_${Date.now()}_${oldPath}`;
                            const { error: copyErr } = await supabase.storage.from('media').copy(oldPath, newPath);
                            if (!copyErr) {
                                const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(newPath);
                                newAudioUrl = publicUrl;
                            }
                        }
                    }

                    // Elements icons
                    const newElements = [];
                    if (s.elements) {
                        for (const el of s.elements) {
                            let newElUrl = el.url;
                            if (el.url) {
                                const oldPath = el.url.split('/media/')[1];
                                if (oldPath) {
                                    const newPath = `copy_${Date.now()}_${oldPath}`;
                                    const { error: copyErr } = await supabase.storage.from('media').copy(oldPath, newPath);
                                    if (!copyErr) {
                                        const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(newPath);
                                        newElUrl = publicUrl;
                                    }
                                }
                            }
                            newElements.push({ ...el, url: newElUrl });
                        }
                    }

                    clonedSlides.push({
                        id: newSlideId,
                        project_id: newId,
                        image_url: newBgUrl,
                        audio_url: newAudioUrl,
                        elements: newElements,
                        order_index: s.order_index
                    });
                }
            }

            // Create project
            const { error: pError } = await supabase.from('projects').insert({
                ...project,
                id: newId,
                name: newName,
                is_active: false,
                folder_id: targetFolderId || project.folder_id,
                order_index: projects.filter(p => p.folder_id === (targetFolderId || project.folder_id)).length
            });
            if (pError) throw pError;

            // Insert cloned slides
            if (clonedSlides.length > 0) {
                await supabase.from('slides').insert(clonedSlides);
            }

            if (!silent) {
                loadProjects();
                alert('✅ Proyecto y archivos duplicados correctamente');
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
                if (project) {
                    await handleDuplicateProject(project, project.folder_id, true);
                }
            }
            setSelectedProjects([]);
            loadProjects();
            alert(`✅ ${selectedProjects.length} proyectos duplicados correctamente`);
        } catch (err) {
            alert('Error al duplicar selección: ' + err.message);
        }
        setLoading(false);
    };

    const handleDeleteSelected = async () => {
        if (selectedProjects.length === 0) return;
        if (!confirm(`¿Estás seguro de eliminar ${selectedProjects.length} programas ? `)) return;

        setLoading(true);
        try {
            for (const id of selectedProjects) {
                // Fetch all slides with elements to clean up storage
                const { data: slides } = await supabase.from('slides').select('image_url, audio_url, elements').eq('project_id', id);
                if (slides) {
                    for (const slide of slides) {
                        if (slide.image_url) await deleteFileFromStorage(slide.image_url);
                        if (slide.audio_url) await deleteFileFromStorage(slide.audio_url);
                        if (slide.elements) {
                            for (const el of slide.elements) {
                                if (el.url) await deleteFileFromStorage(el.url);
                            }
                        }
                    }
                }
                // Cascading delete in DB will handle slides records, but we delete project here
                await supabase.from('projects').delete().eq('id', id);
            }
            loadProjects();
            alert('Eliminados correctamente de la base de datos y almacén de archivos.');
        } catch (err) {
            alert('Error: ' + err.message);
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

    const handleSaveAll = async (isSilent = false) => {
        if (!currentProject) return;
        if (!isSilent) setLoading(true);
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

            if (!isSilent) {
                confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
                // No more alert for smoother experience, just confetti or a small toast if we had one
                // But user requested "indicame antes de ejecutar", so I'll keep it or use a better way.
                // Actually, I'll remove the alert to make it feel more "automatic".
            }
            return true;
        } catch (err) {
            if (!isSilent) alert('Error al guardar: ' + err.message);
            return false;
        } finally {
            if (!isSilent) setLoading(false);
        }
    };

    // Auto-save logic
    const autoSaveTimerRef = useRef(null);
    useEffect(() => {
        if (showGallery || !currentProject) return;

        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

        autoSaveTimerRef.current = setTimeout(() => {
            handleSaveAll(true);
        }, 3000); // 3 seconds of inactivity

        return () => {
            if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        };
    }, [localSlides, currentProject?.name, currentProject?.access_code]);

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
        const newEl = {
            id: crypto.randomUUID(),
            type,
            x: 50,
            y: 50,
            width: type === 'text' ? 300 : (type === 'drag' ? 80 : null),
            height: type === 'text' ? 150 : (type === 'drag' ? 80 : null),
            text: type === 'text' ? 'Escribe aquí...' : '',
            url: '',
            imageSize: type === 'drag' ? 100 : undefined
        };
        if (!localSlides[selectedIdx]) return;
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
            if (!newSlides[selectedIdx]) return;
            const element = newSlides[selectedIdx].elements.find(el => el.id === draggingElementId);
            if (element) {
                element.x = Math.max(0, Math.min(100, x));
                element.y = Math.max(0, Math.min(100, y));
                setLocalSlides(newSlides);
            }
        } else if (resizingElementId) {
            const newSlides = [...localSlides];
            if (!newSlides[selectedIdx]) return;
            const element = newSlides[selectedIdx].elements.find(el => el.id === resizingElementId);
            if (element) {
                const elementX = (element.x / 100) * rect.width;
                const elementY = (element.y / 100) * rect.height;
                const mouseX = (x / 100) * rect.width;
                const mouseY = (y / 100) * rect.height;

                // Allow free resizing for Text and Stamp
                element.width = Math.max(50, (mouseX - elementX) * 2);
                if (element.type === 'text' || element.type === 'stamp') {
                    element.height = Math.max(30, (mouseY - elementY) * 2);
                } else {
                    // Maintain ratio for others if needed, though Drag won't have the handle
                    element.height = element.width * 0.5;
                }
                setLocalSlides(newSlides);
            }
        }
    };

    if (showGallery) {
        return (
            <div style={{ height: '100vh', width: '100vw', background: '#050510', display: 'flex', flexDirection: 'column', overflow: 'auto', padding: isMobile ? '20px' : isTablet ? '30px' : '40px' }}>
                {/* Header Gallery */}
                <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: isMobile ? '20px' : '40px', gap: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        {currentFolderId && (
                            <button onClick={() => setCurrentFolderId(null)} className="btn-outline" style={{ padding: '10px' }}>
                                <ChevronLeft size={24} />
                            </button>
                        )}
                        <div>
                            <h1 style={{ fontSize: isMobile ? '1.8rem' : isTablet ? '2.2rem' : '2.5rem', fontWeight: 900, color: 'white', marginBottom: '4px' }}>
                                {currentFolderId ? folders.find(f => f.id === currentFolderId)?.name : 'Galería'}
                            </h1>
                            <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
                                <button
                                    onClick={() => setGalleryTab('all')}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: galleryTab === 'all' ? '#7c3aed' : '#475569',
                                        fontSize: '0.9rem',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        borderBottom: galleryTab === 'all' ? '2px solid #7c3aed' : '2px solid transparent',
                                        paddingBottom: '5px'
                                    }}
                                >
                                    TODAS
                                </button>
                                <button
                                    onClick={() => setGalleryTab('guias')}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: galleryTab === 'guias' ? '#a78bfa' : '#475569',
                                        fontSize: '0.9rem',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        borderBottom: galleryTab === 'guias' ? '2px solid #a78bfa' : '2px solid transparent',
                                        paddingBottom: '5px'
                                    }}
                                >
                                    GUIAS
                                </button>
                                <button
                                    onClick={() => setGalleryTab('quiz')}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: galleryTab === 'quiz' ? '#3b82f6' : '#475569',
                                        fontSize: '0.9rem',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        borderBottom: galleryTab === 'quiz' ? '2px solid #3b82f6' : '2px solid transparent',
                                        paddingBottom: '5px'
                                    }}
                                >
                                    QUIZZES
                                </button>
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto', alignItems: 'center' }}>
                        {selectedProjects.length > 0 && (
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    onClick={handleDuplicateSelected}
                                    className="btn-outline"
                                    style={{
                                        background: 'rgba(59, 130, 246, 0.1)',
                                        color: '#3b82f6',
                                        borderColor: 'rgba(59, 130, 246, 0.2)',
                                        padding: '12px 25px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        fontWeight: 800
                                    }}
                                >
                                    <Copy size={20} /> Duplicar ({selectedProjects.length})
                                </button>
                                <button
                                    onClick={() => setShowMoveModal(true)}
                                    className="btn-outline"
                                    style={{
                                        background: 'rgba(167, 139, 250, 0.1)',
                                        color: '#a78bfa',
                                        borderColor: 'rgba(167, 139, 250, 0.2)',
                                        padding: '12px 25px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        fontWeight: 800
                                    }}
                                >
                                    <Move size={20} /> Mover ({selectedProjects.length})
                                </button>
                                <button
                                    onClick={handleDeleteSelected}
                                    className="btn-outline"
                                    style={{
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        color: '#ef4444',
                                        borderColor: 'rgba(239, 68, 68, 0.2)',
                                        padding: '12px 25px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        fontWeight: 800
                                    }}
                                >
                                    <Trash2 size={20} /> Eliminar ({selectedProjects.length})
                                </button>
                            </div>
                        )}

                        <button onClick={onExit} className="btn-outline" style={{ padding: '12px 25px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ChevronLeft size={20} /> Home
                        </button>

                        <button
                            onClick={toggleSortMode}
                            className="btn-outline"
                            style={{
                                padding: '12px 25px',
                                background: isSortMode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)',
                                color: isSortMode ? '#10b981' : 'white',
                                borderColor: isSortMode ? '#10b981' : 'rgba(255,255,255,0.1)',
                                fontWeight: 800
                            }}
                        >
                            {isSortMode ? 'Ordenado' : 'Ordenar'}
                        </button>

                        <div style={{ position: 'relative' }}>
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setShowTypeDropdown(!showTypeDropdown);
                                }}
                                className="btn-premium"
                                style={{ padding: '12px 25px' }}
                            >
                                <Plus size={20} /> Agregar
                            </button>

                            {showTypeDropdown && (
                                <div className="glass" style={{
                                    position: 'absolute',
                                    top: 'calc(100% + 10px)',
                                    right: 0,
                                    width: '220px',
                                    zIndex: 9999,
                                    padding: '10px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px',
                                    background: 'rgba(15, 15, 30, 0.95)',
                                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                                }}>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setAddType('guias'); setShowAddModal(true); setShowTypeDropdown(false); }}
                                        className="btn-outline"
                                        style={{ width: '100%', textAlign: 'left', border: 'none', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderRadius: '12px' }}
                                    >
                                        <LayoutGrid size={18} color="#a78bfa" /> <span>Guía</span>
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setAddType('quiz'); setShowAddModal(true); setShowTypeDropdown(false); }}
                                        className="btn-outline"
                                        style={{ width: '100%', textAlign: 'left', border: 'none', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderRadius: '12px' }}
                                    >
                                        <HelpCircle size={18} color="#3b82f6" /> <span>Quiz</span>
                                    </button>
                                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }}></div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setAddType('folder'); setShowAddModal(true); setShowTypeDropdown(false); }}
                                        className="btn-outline"
                                        style={{ width: '100%', textAlign: 'left', border: 'none', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderRadius: '12px' }}
                                    >
                                        <FolderPlus size={18} color="#10b981" /> <span>Carpeta</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Custom Modal for Selection */}
                {showAddModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div className="glass anim-up" style={{ width: '400px', padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <h2 style={{ fontSize: '1.2rem', color: 'white' }}>
                                {addType === 'folder' ? 'Nueva Carpeta' : 'Nueva Presentación'}
                            </h2>
                            <input
                                className="premium-input"
                                type="text"
                                placeholder={addType === 'folder' ? "Nombre de la carpeta" : "Nombre de la lección"}
                                value={newProjectName}
                                onChange={(e) => setNewProjectName(e.target.value)}
                                autoFocus
                            />
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button onClick={() => { setShowAddModal(false); setNewProjectName(''); }} className="btn-outline" style={{ flex: 1 }}>Cancelar</button>
                                <button onClick={handleCreateProject} className="btn-premium" style={{ flex: 1 }}>Crear</button>
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
                        <div style={{ paddingBottom: '100px' }}>
                            {/* Render Folders (only if at root) */}
                            {!currentFolderId && (
                                <Reorder.Group
                                    axis="y"
                                    values={isSortMode ? tempFolders : folders}
                                    onReorder={isSortMode ? setTempFolders : () => { }}
                                    style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(320px, 1fr))', gap: isMobile ? '15px' : '25px', listStyle: 'none', padding: 0 }}
                                >
                                    {(isSortMode ? tempFolders : folders).map(f => {
                                        const projectsInFolder = (isSortMode ? tempProjects : projects).filter(p => p.folder_id === f.id);
                                        const isActiva = projectsInFolder.length > 0;
                                        return (
                                            <Reorder.Item
                                                key={f.id}
                                                value={f}
                                                className="glass"
                                                data-folder-id={f.id}
                                                style={{
                                                    padding: '24px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '18px',
                                                    position: 'relative',
                                                    cursor: isSortMode ? 'grab' : 'default',
                                                    border: `1px solid ${hoveredFolderId === f.id ? '#10b981' : 'rgba(255,255,255,0.08)'}`,
                                                    borderRadius: '32px',
                                                    background: hoveredFolderId === f.id ? 'rgba(16, 185, 129, 0.15)' : '#0a0a1a',
                                                    transform: hoveredFolderId === f.id ? 'scale(1.02)' : 'scale(1)',
                                                    transition: 'all 0.2s ease'
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                                    <div style={{ padding: '14px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '16px', color: '#10b981' }}>
                                                        <Folder size={32} />
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                                                        <div style={{ fontSize: '0.65rem', fontWeight: 900, padding: '4px 12px', borderRadius: '100px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Carpeta</div>
                                                        <div style={{ fontSize: '0.6rem', fontWeight: 900, padding: '3px 8px', borderRadius: '6px', background: isActiva ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: isActiva ? '#10b981' : '#ef4444' }}>
                                                            {isActiva ? 'ACTIVA' : 'VACIA'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <h3 style={{ fontSize: '1.5rem', color: 'white', marginBottom: '4px', fontWeight: 900, textTransform: 'uppercase' }}>{f.name}</h3>
                                                    <span style={{ fontSize: '0.9rem', color: '#64748b' }}>{projectsInFolder.length} proyectos</span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', height: '52px' }}>
                                                    <button onClick={() => !isSortMode && setCurrentFolderId(f.id)} className="btn-premium" style={{ flex: 1.5, height: '100%', background: 'linear-gradient(135deg, #10b981, #059669)', fontSize: '1.1rem', fontWeight: 800, borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }} disabled={isSortMode}>Entrar</button>
                                                    <button onClick={() => handleEditFolder(f)} className="btn-outline" style={{ width: '52px', height: '100%', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }} title="Editar Nombre"><Edit2 size={24} strokeWidth={2.5} /></button>
                                                    <button onClick={() => handleDuplicateFolder(f)} className="btn-outline" style={{ width: '52px', height: '100%', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }} title="Duplicar"><Copy size={24} strokeWidth={2.5} /></button>
                                                    <button onClick={() => handleDeleteFolder(f.id)} className="btn-outline" style={{ width: '52px', height: '100%', color: '#ef4444', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }} title="Eliminar"><Trash2 size={24} strokeWidth={2.5} /></button>
                                                </div>
                                                {isSortMode && (
                                                    <div style={{ position: 'absolute', top: '10px', left: '10px' }}>
                                                        <GripVertical size={20} color="rgba(255,255,255,0.2)" />
                                                    </div>
                                                )}
                                            </Reorder.Item>
                                        );
                                    })}
                                </Reorder.Group>
                            )}

                            {/* Render Projects */}
                            <Reorder.Group
                                axis="y"
                                values={(isSortMode ? tempProjects : projects).filter(p => p.folder_id === currentFolderId)}
                                onReorder={(newOrder) => {
                                    if (!isSortMode) return;
                                    const otherProjects = tempProjects.filter(p => p.folder_id !== currentFolderId);
                                    setTempProjects([...otherProjects, ...newOrder]);
                                }}
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(320px, 1fr))',
                                    gap: isMobile ? '15px' : '25px',
                                    listStyle: 'none',
                                    padding: 0,
                                    marginTop: (!currentFolderId && (isSortMode ? tempFolders : folders).length > 0) ? '25px' : '0'
                                }}
                            >
                                {(isSortMode ? tempProjects : projects)
                                    .filter(p => p.folder_id === currentFolderId)
                                    .filter(p => {
                                        if (galleryTab === 'all') return true;
                                        if (galleryTab === 'quiz') return p.id.startsWith('quiz-');
                                        if (galleryTab === 'guias') return !p.id.startsWith('quiz-');
                                        return true;
                                    })
                                    .map(p => {
                                        const isQuiz = p.id.startsWith('quiz-');
                                        return (
                                            <Reorder.Item
                                                key={p.id}
                                                value={p}
                                                className="glass"
                                                style={{
                                                    padding: '32px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '24px',
                                                    position: 'relative',
                                                    cursor: isSortMode ? 'grab' : 'default',
                                                    border: '1px solid rgba(255,255,255,0.08)',
                                                    borderRadius: '32px',
                                                    background: '#0a0a1a'
                                                }}
                                                drag={isSortMode}
                                                onDragEnd={(e, info) => {
                                                    setHoveredFolderId(null);
                                                    if (isSortMode && !currentFolderId) {
                                                        const point = { x: info.point.x, y: info.point.y };
                                                        const elements = document.elementsFromPoint(point.x, point.y);
                                                        const folderEl = elements.find(el => el.getAttribute('data-folder-id'));
                                                        if (folderEl) {
                                                            const folderId = folderEl.getAttribute('data-folder-id');
                                                            handleMoveToFolder(p.id, folderId);
                                                        }
                                                    }
                                                }}
                                                onDrag={(e, info) => {
                                                    if (isSortMode && !currentFolderId) {
                                                        const point = { x: info.point.x, y: info.point.y };
                                                        const elements = document.elementsFromPoint(point.x, point.y);
                                                        const folderEl = elements.find(el => el.getAttribute('data-folder-id'));
                                                        if (folderEl) {
                                                            setHoveredFolderId(folderEl.getAttribute('data-folder-id'));
                                                        } else {
                                                            setHoveredFolderId(null);
                                                        }
                                                    }
                                                }}
                                            >
                                                {/* Top badges and checkbox */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                                    <div style={{
                                                        padding: '16px',
                                                        background: isQuiz ? 'rgba(59, 130, 246, 0.12)' : 'rgba(124, 58, 237, 0.12)',
                                                        borderRadius: '18px',
                                                        color: isQuiz ? '#3b82f6' : '#a78bfa'
                                                    }}>
                                                        {isQuiz ? <HelpCircle size={36} /> : <ShieldCheck size={36} />}
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                            <div style={{
                                                                fontSize: '0.75rem',
                                                                fontWeight: 900,
                                                                padding: '6px 16px',
                                                                borderRadius: '100px',
                                                                background: isQuiz ? '#1e3a8a' : '#3b1e8a',
                                                                color: 'white',
                                                                textTransform: 'uppercase',
                                                                letterSpacing: '1px'
                                                            }}>
                                                                {isQuiz ? 'QUIZ' : 'GUIA'}
                                                            </div>
                                                            {!isSortMode && (
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedProjects.includes(p.id)}
                                                                    onChange={() => toggleProjectSelection(p.id)}
                                                                    style={{ width: '26px', height: '26px', accentColor: '#3b82f6', cursor: 'pointer', backgroundColor: 'white', border: 'none', borderRadius: '4px' }}
                                                                />
                                                            )}
                                                        </div>
                                                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: p.is_active ? '#10b981' : '#64748b' }}>{p.is_active ? 'Activo' : 'Pausado'}</div>
                                                    </div>
                                                </div>

                                                {/* Middle Section: Title and Key */}
                                                <div>
                                                    <h3 style={{ fontSize: '1.8rem', color: 'white', marginBottom: '20px', fontWeight: 900, lineHeight: 1.1 }}>{p.name}</h3>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1rem', color: '#94a3b8', background: 'rgba(0,0,0,0.4)', padding: '14px 22px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.05)', width: 'fit-content' }}>
                                                        <Key size={20} />
                                                        <span>Clave: <strong style={{ color: 'white' }}>{p.access_code || '---'}</strong></span>
                                                    </div>
                                                </div>

                                                {/* Bottom Section: Action Buttons */}
                                                <div style={{ display: 'flex', gap: '12px', marginTop: 'auto', height: '62px' }}>
                                                    <button
                                                        onClick={() => !isSortMode && (isQuiz ? onOpenQuiz(p) : handleSelectProject(p))}
                                                        className="btn-premium"
                                                        style={{ flex: 1, height: '100%', fontSize: '1.4rem', fontWeight: 900, borderRadius: '20px', background: 'linear-gradient(135deg, #4f46e5, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                        disabled={isSortMode}
                                                    >
                                                        Editar
                                                    </button>
                                                    <button
                                                        onClick={() => !isSortMode && onPreview(p, true)}
                                                        className="btn-outline"
                                                        style={{ flex: 1, height: '100%', background: 'rgba(59, 130, 246, 0.08)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', fontWeight: 700, borderRadius: '20px' }}
                                                        disabled={isSortMode}
                                                    >
                                                        Preview
                                                    </button>
                                                </div>

                                                {isSortMode && (
                                                    <div style={{ position: 'absolute', top: '10px', left: '10px' }}>
                                                        <GripVertical size={24} color="rgba(255,255,255,0.2)" />
                                                    </div>
                                                )}
                                            </Reorder.Item>
                                        );
                                    })}
                            </Reorder.Group>
                        </div>
                    )}
                    {showMoveModal && (
                        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)' }}>
                            <div className="glass anim-up" style={{ width: '450px', padding: '40px', display: 'flex', flexDirection: 'column', gap: '25px', background: '#0a0a1a', border: '1px solid rgba(167, 139, 250, 0.2)' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ width: '60px', height: '60px', background: 'rgba(167, 139, 250, 0.1)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a78bfa', margin: '0 auto 15px' }}>
                                        <Move size={30} />
                                    </div>
                                    <h2 style={{ fontSize: '1.5rem', color: 'white', marginBottom: '8px' }}>Mover Proyectos</h2>
                                    <p style={{ color: '#94a3b8' }}>Selecciona el destino para los {selectedProjects.length} proyectos seleccionados.</p>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <label style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Carpeta de Destino</label>
                                    <select
                                        className="premium-input"
                                        style={{ background: 'rgba(255,255,255,0.05)', color: 'white', cursor: 'pointer' }}
                                        value={targetFolderForMove}
                                        onChange={(e) => setTargetFolderForMove(e.target.value)}
                                    >
                                        <option value="" disabled style={{ background: '#0a0a1a', color: 'white' }}>Selecciona una carpeta...</option>
                                        <option value="root" style={{ background: '#0a0a1a', color: 'white' }}>Galería Principal (Raíz)</option>
                                        {folders.map(f => (
                                            <option key={f.id} value={f.id} style={{ background: '#0a0a1a', color: 'white' }}>{f.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                                    <button
                                        onClick={() => { setShowMoveModal(false); setTargetFolderForMove(''); }}
                                        className="btn-outline"
                                        style={{ flex: 1, height: '55px', fontSize: '1.1rem' }}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleMoveSelected}
                                        className="btn-premium"
                                        style={{ flex: 1.5, height: '55px', background: 'linear-gradient(135deg, #a78bfa, #7c3aed)', fontSize: '1.1rem' }}
                                        disabled={!targetFolderForMove || loading}
                                    >
                                        {loading ? 'Moviendo...' : 'Mover Ahora'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    const currentSlide = localSlides[selectedIdx] || null;

    return (
        <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: isMobile ? 'column' : 'row', background: '#050510', overflow: 'hidden' }} onMouseMove={handleCanvasMouseMove} onMouseUp={() => { setDraggingElementId(null); setResizingElementId(null); }} onTouchEnd={() => { setDraggingElementId(null); setResizingElementId(null); }} onClick={(e) => { if (e.target === e.currentTarget) setSelectedElementId(null); }}>
            {/* Left Panel: Slides - Collapsible in compact mode */}
            <aside style={{
                width: showSlidesPanel ? (isMobile ? '100%' : '200px') : '0px',
                minWidth: showSlidesPanel ? (isMobile ? '100%' : '200px') : '0px',
                height: (isMobile && showSlidesPanel) ? '150px' : 'auto',
                borderRight: (showSlidesPanel && !isMobile) ? '1px solid rgba(255,255,255,0.05)' : 'none',
                borderBottom: (showSlidesPanel && isMobile) ? '1px solid rgba(255,255,255,0.05)' : 'none',
                background: '#0a0a1a',
                display: 'flex',
                flexDirection: isMobile ? 'row' : 'column',
                transition: 'all 0.3s ease',
                overflow: 'hidden'
            }}>
                <div style={{ padding: isMobile ? '10px' : '20px', borderBottom: isMobile ? 'none' : '1px solid rgba(255,255,255,0.05)', borderRight: isMobile ? '1px solid rgba(255,255,255,0.05)' : 'none', display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '0.6rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: '#475569' }}>{isMobile ? 'Lám.' : 'Diapositivas'}</span>
                    <button onClick={addSlide} style={{ background: 'rgba(124, 58, 237, 0.1)', border: 'none', color: '#a78bfa', padding: '6px', borderRadius: '8px', cursor: 'pointer' }}><Plus size={14} /></button>
                </div>
                <div style={{ flex: 1, overflowX: isMobile ? 'auto' : 'hidden', overflowY: isMobile ? 'hidden' : 'auto', padding: '10px', display: 'flex', flexDirection: isMobile ? 'row' : 'column', gap: '10px' }}>
                    {localSlides.map((slide, idx) => (
                        <div key={slide.id} onClick={() => setSelectedIdx(idx)} style={{ position: 'relative', borderRadius: '10px', border: `2px solid ${selectedIdx === idx ? '#7c3aed' : 'transparent'} `, background: '#000', width: isMobile ? '100px' : 'auto', minWidth: isMobile ? '100px' : 'auto', aspectRatio: '16/9', overflow: 'hidden', cursor: 'pointer', transition: '0.2s', boxShadow: selectedIdx === idx ? '0 0 10px rgba(124, 58, 237, 0.3)' : 'none' }}>
                            <span style={{ position: 'absolute', top: '3px', left: '3px', zIndex: 10, fontSize: '9px', fontWeight: 900, background: 'rgba(0,0,0,0.7)', width: '16px', height: '16px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>{idx + 1}</span>
                            {slide.image_url ? <img src={slide.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.1 }}><ImageIcon size={18} color="white" /></div>}
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteSlide(idx); }} style={{ position: 'absolute', top: '3px', right: '3px', zIndex: 10, background: 'rgba(239, 68, 68, 0.9)', border: 'none', color: 'white', padding: '4px', borderRadius: '4px', cursor: 'pointer' }}><Trash2 size={10} /></button>
                        </div>
                    ))}
                </div>
            </aside>

            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'radial-gradient(circle at top right, #111, #050510)' }}>
                <header style={{ height: isMobile ? 'auto' : '70px', padding: isMobile ? '10px' : '0 20px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(10,10,20,0.8)', backdropFilter: 'blur(15px)', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'space-between' : 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {/* Toggle Slides Panel - Only in compact mode */}
                            {isCompact && (
                                <button
                                    onClick={() => setShowSlidesPanel(!showSlidesPanel)}
                                    style={{ background: showSlidesPanel ? 'rgba(124, 58, 237, 0.2)' : 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '8px', borderRadius: '10px', color: showSlidesPanel ? '#a78bfa' : '#94a3b8', cursor: 'pointer' }}
                                    title="Mostrar/Ocultar Diapositivas"
                                >
                                    <Layers size={18} />
                                </button>
                            )}
                            <button
                                onClick={() => setShowGallery(true)}
                                title="IR A GALERIA"
                                style={{
                                    padding: '10px',
                                    background: 'rgba(59, 130, 246, 0.1)',
                                    borderRadius: '12px',
                                    color: '#3b82f6',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: '0.3s'
                                }}
                            >
                                <LayoutGrid size={20} />
                            </button>
                        </div>
                        {isMobile && (
                            <h2 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'white', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '150px' }}>{currentProject?.name}</h2>
                        )}
                        {!isMobile && (
                            <div>
                                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white', lineHeight: 1.2 }}>{currentProject?.name}</h2>
                                <span style={{ fontSize: '0.65rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Editor de Programa</span>
                            </div>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'center' : 'flex-end', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                        <button onClick={onViewResults} className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', fontSize: '0.75rem' }}><Eye size={14} /> Resultados</button>
                        <button
                            onClick={async () => {
                                const saved = await handleSaveAll(false);
                                if (saved) onPreview(currentProject, false);
                            }}
                            className="btn-outline"
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', fontSize: '0.75rem', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)' }}
                            disabled={loading}
                        >
                            <Play size={14} /> Preview
                        </button>
                        <button onClick={onToggleActive} className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', fontSize: '0.75rem', color: isActive ? '#ef4444' : '#10b981', borderColor: isActive ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)' }}>
                            {isActive ? <Pause size={14} /> : <Play size={14} />} {!isMobile && (isActive ? 'Suspender' : 'Activar')}
                        </button>
                        <button onClick={handleSaveAll} className="btn-premium" style={{ padding: '8px 12px', fontSize: '0.75rem' }}><Save size={14} /> Guardar</button>
                        {/* Toggle Settings Panel - Only in compact mode */}
                        {isCompact && (
                            <button
                                onClick={() => setShowSettingsPanel(!showSettingsPanel)}
                                style={{ background: showSettingsPanel ? 'rgba(124, 58, 237, 0.2)' : 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '8px', borderRadius: '10px', color: showSettingsPanel ? '#a78bfa' : '#94a3b8', cursor: 'pointer' }}
                                title="Mostrar/Ocultar Ajustes"
                            >
                                <SettingsIcon size={18} />
                            </button>
                        )}
                    </div>
                </header>

                <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                    <div style={{ flex: 1, padding: isMobile ? '20px' : '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'auto' }} onClick={() => setSelectedElementId(null)}>
                        {!currentSlide && !loading && (
                            <div style={{ color: '#475569', textAlign: 'center', background: 'rgba(255,255,255,0.02)', padding: '40px', borderRadius: '24px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                                <ImageIcon size={48} style={{ marginBottom: '15px', opacity: 0.5 }} />
                                <h3 style={{ fontSize: '1.2rem', color: 'white', marginBottom: '10px' }}>Proyecto Vacío</h3>
                                <p style={{ fontSize: '0.9rem' }}>Pulsa el botón <b>+</b> en el panel de la izquierda para añadir tu primera lámina.</p>
                            </div>
                        )}
                        {loading && (
                            <div style={{ color: '#a78bfa', textAlign: 'center' }}>
                                <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                                <p>Cargando láminas del programa...</p>
                            </div>
                        )}
                        {currentSlide && (
                            <div
                                ref={canvasContainerRef}
                                style={{
                                    zoom: canvasZoom,
                                    width: currentSlide?.format === '1/1' ? '700px' : '900px',
                                    aspectRatio: currentSlide?.format === '1/1' ? '1/1' : '16/9',
                                    background: '#000',
                                    borderRadius: '24px',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    boxShadow: '0 50px 100px -20px black',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    flexShrink: 0,
                                    margin: 'auto',
                                    transition: 'zoom 0.2s ease-out'
                                }}
                                onClick={(e) => e.stopPropagation()}
                            >
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
                                        <button onClick={() => { const a = new Audio(currentSlide.audio_url); a.play(); }} style={{ background: '#10b981', border: 'none', color: 'white', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Play size={12} fill="white" /></button>
                                        <span style={{ fontSize: '10px', fontWeight: 900 }}>AUDIO CARGADO</span>
                                        <button onClick={async () => {
                                            if (currentSlide.audio_url) await deleteFileFromStorage(currentSlide.audio_url);
                                            const copy = [...localSlides];
                                            copy[selectedIdx].audio_url = '';
                                            setLocalSlides(copy);
                                        }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={14} /></button>
                                    </div>
                                )}

                                {(currentSlide?.elements || []).map(el => (
                                    <div
                                        key={el.id}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedElementId(el.id);
                                        }}
                                        onMouseDown={(e) => {
                                            e.stopPropagation();
                                            setDraggingElementId(el.id);
                                            setSelectedElementId(el.id);
                                        }}
                                        style={{
                                            position: 'absolute',
                                            left: `${el.x}%`,
                                            top: `${el.y}%`,
                                            transform: 'translate(-50%, -50%)',
                                            zIndex: 100,
                                            cursor: 'move',
                                            padding: el.type === 'drag' ? '0' : '10px',
                                            border: (draggingElementId === el.id || selectedElementId === el.id) ? '2px solid var(--primary)' : '1px dashed rgba(255,255,255,0.3)',
                                            borderRadius: '12px',
                                            background: (el.url || el.type === 'stamp') ? 'transparent' : 'rgba(0,0,0,0.5)',
                                            backdropFilter: (el.url || el.type === 'stamp') ? 'none' : 'blur(10px)',
                                            width: el.type === 'drag' ? `${(el.imageSize || 100) / 100 * 45}px` : (el.width ? `${(el.width / 900) * 100}%` : 'auto'),
                                            height: el.type === 'drag' ? `${(el.imageSize || 100) / 100 * 45}px` : (el.height ? `${(el.height / (currentSlide?.format === '1/1' ? 700 : 506)) * 100}%` : 'auto'),
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        {el.type === 'text' && (
                                            <textarea
                                                value={el.text}
                                                onChange={(e) => {
                                                    const copy = [...localSlides];
                                                    (copy[selectedIdx].elements || []).find(item => item.id === el.id).text = e.target.value;
                                                    setLocalSlides(copy);
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: 'white',
                                                    textAlign: 'center',
                                                    width: '100%',
                                                    height: '100%',
                                                    outline: 'none',
                                                    fontWeight: 800,
                                                    resize: 'none',
                                                    fontFamily: 'Outfit',
                                                    fontSize: '1.2rem'
                                                }}
                                            />
                                        )}
                                        {el.type === 'drag' && (
                                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {el.url ? (
                                                    <img
                                                        src={el.url}
                                                        style={{
                                                            width: '100%',
                                                            height: '100%',
                                                            objectFit: 'contain'
                                                        }}
                                                    />
                                                ) : (
                                                    <Move size={24} color="#3b82f6" />
                                                )}
                                            </div>
                                        )}
                                        {el.type === 'stamp' && (
                                            <div style={{ width: '100%', height: '100%', borderRadius: '50%', border: '2px dashed rgba(255,255,255,0.8)', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Target size={24} color="rgba(255,255,255,0.5)" />
                                            </div>
                                        )}
                                        {/* Handle for resizing - Only for Text and Stamp */}
                                        {(el.type === 'text' || el.type === 'stamp') && (
                                            <div
                                                onMouseDown={(e) => { e.stopPropagation(); setResizingElementId(el.id); }}
                                                style={{
                                                    position: 'absolute',
                                                    bottom: '-10px',
                                                    right: '-10px',
                                                    width: '24px',
                                                    height: '24px',
                                                    cursor: 'nwse-resize',
                                                    background: 'var(--primary)',
                                                    borderRadius: '50%',
                                                    border: '3px solid white',
                                                    boxShadow: '0 4px 10px rgba(124, 58, 237, 0.5)',
                                                    zIndex: 110,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    transition: 'transform 0.2s'
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
                                                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right Panel: Settings - Collapsible in compact mode */}
                    <div style={{
                        width: showSettingsPanel ? (isMobile ? '100%' : '320px') : '0px',
                        minWidth: showSettingsPanel ? (isMobile ? '100%' : '320px') : '0px',
                        height: (isMobile && showSettingsPanel) ? 'auto' : '100%',
                        background: 'rgba(10, 10, 20, 0.95)',
                        borderLeft: (showSettingsPanel && !isMobile) ? '1px solid var(--border)' : 'none',
                        borderTop: (showSettingsPanel && isMobile) ? '1px solid var(--border)' : 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        transition: 'all 0.3s ease'
                    }}>
                        <div style={{ padding: '40px 25px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '30px', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
                            {/* Zoom Section */}
                            <div style={{ margin: '0 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                    <button onClick={() => setCanvasZoom(Math.max(0.1, canvasZoom - 0.1))} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#94a3b8', padding: '8px', cursor: 'pointer', borderRadius: '10px', display: 'flex', alignItems: 'center' }}><ZoomOut size={18} /></button>
                                    <div style={{ fontSize: '1rem', color: '#a78bfa', fontWeight: 900, minWidth: '60px', textAlign: 'center' }}>{Math.round(canvasZoom * 100)}%</div>
                                    <button onClick={() => setCanvasZoom(Math.min(2, canvasZoom + 0.1))} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#94a3b8', padding: '8px', cursor: 'pointer', borderRadius: '10px', display: 'flex', alignItems: 'center' }}><ZoomIn size={18} /></button>
                                </div>
                            </div>

                            {/* Ajustes Section */}
                            <div style={{ margin: '0 8px', background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <h3 style={{ color: 'white', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '2px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><SettingsIcon size={18} color="#a78bfa" /> Ajustes</div>
                                    <button
                                        onClick={() => setShowProjectDetails(!showProjectDetails)}
                                        style={{
                                            border: 'none',
                                            color: 'var(--primary-light)',
                                            fontSize: '0.65rem',
                                            fontWeight: 900,
                                            cursor: 'pointer',
                                            textTransform: 'uppercase',
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            background: 'rgba(124, 58, 237, 0.1)'
                                        }}
                                    >
                                        {showProjectDetails ? 'Ocultar' : 'Ver más'}
                                    </button>
                                </h3>

                                {showProjectDetails && (
                                    <div className="anim-up" style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <label style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Nombre del Proyecto</label>
                                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <input
                                                    className="premium-input"
                                                    type="text"
                                                    value={currentProject?.name || ''}
                                                    readOnly={!isEditingProjectName}
                                                    onChange={(e) => {
                                                        if (currentProject) {
                                                            setCurrentProject({ ...currentProject, name: e.target.value });
                                                            setHasUnsavedNameChanges(true);
                                                        }
                                                    }}
                                                    style={{
                                                        padding: '12px',
                                                        paddingRight: '45px',
                                                        flex: 1,
                                                        fontSize: '0.85rem',
                                                        opacity: isEditingProjectName ? 1 : 0.7,
                                                        cursor: isEditingProjectName ? 'text' : 'not-allowed',
                                                        borderColor: isEditingProjectName ? 'var(--primary)' : 'var(--border)'
                                                    }}
                                                />
                                                <button
                                                    onClick={async () => {
                                                        if (isEditingProjectName && hasUnsavedNameChanges && currentProject?.id) {
                                                            try {
                                                                await supabase.from('projects').update({ name: currentProject.name }).eq('id', currentProject.id);
                                                                setHasUnsavedNameChanges(false);
                                                                setIsEditingProjectName(false);
                                                                loadProjects();
                                                            } catch (err) {
                                                                alert('Error al guardar nombre: ' + err.message);
                                                            }
                                                        } else {
                                                            setIsEditingProjectName(!isEditingProjectName);
                                                        }
                                                    }}
                                                    style={{
                                                        position: 'absolute',
                                                        right: '12px',
                                                        background: 'none',
                                                        border: 'none',
                                                        color: isEditingProjectName ? '#10b981' : '#64748b',
                                                        cursor: 'pointer',
                                                        padding: '8px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        transition: '0.3s',
                                                        borderRadius: '8px'
                                                    }}
                                                    title={isEditingProjectName ? 'Guardar cambios' : 'Editar nombre'}
                                                >
                                                    {isEditingProjectName ? <Save size={18} /> : <Edit2 size={18} />}
                                                </button>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <label style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Clave de Acceso</label>
                                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <input
                                                    className="premium-input"
                                                    type="text"
                                                    value={currentProject?.access_code || ''}
                                                    readOnly={!isEditingAccessCode}
                                                    onChange={(e) => {
                                                        if (currentProject) {
                                                            setCurrentProject({ ...currentProject, access_code: e.target.value });
                                                            setHasUnsavedCodeChanges(true);
                                                        }
                                                    }}
                                                    style={{
                                                        padding: '12px',
                                                        paddingRight: '45px',
                                                        flex: 1,
                                                        fontSize: '0.85rem',
                                                        opacity: isEditingAccessCode ? 1 : 0.7,
                                                        cursor: isEditingAccessCode ? 'text' : 'not-allowed',
                                                        borderColor: isEditingAccessCode ? 'var(--primary)' : 'var(--border)'
                                                    }}
                                                />
                                                <button
                                                    onClick={async () => {
                                                        if (isEditingAccessCode && hasUnsavedCodeChanges && currentProject?.id) {
                                                            try {
                                                                await supabase.from('projects').update({ access_code: currentProject.access_code }).eq('id', currentProject.id);
                                                                setHasUnsavedCodeChanges(false);
                                                                setIsEditingAccessCode(false);
                                                                loadProjects();
                                                            } catch (err) {
                                                                alert('Error al guardar clave: ' + err.message);
                                                            }
                                                        } else {
                                                            setIsEditingAccessCode(!isEditingAccessCode);
                                                        }
                                                    }}
                                                    style={{
                                                        position: 'absolute',
                                                        right: '12px',
                                                        background: 'none',
                                                        border: 'none',
                                                        color: isEditingAccessCode ? '#10b981' : '#64748b',
                                                        cursor: 'pointer',
                                                        padding: '8px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        transition: '0.3s',
                                                        borderRadius: '8px'
                                                    }}
                                                    title={isEditingAccessCode ? 'Guardar cambios' : 'Editar clave'}
                                                >
                                                    {isEditingAccessCode ? <Save size={18} /> : <Edit2 size={18} />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Herramientas Section */}
                            <div style={{ margin: '0 8px', background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <h3 style={{ color: 'white', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <LayoutGrid size={18} color="#3b82f6" /> Herramientas
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    {(() => {
                                        const selectedEl = (localSlides[selectedIdx]?.elements || []).find(e => e.id === selectedElementId);
                                        return [
                                            { type: 'draw', icon: Paintbrush, color: '#7c3aed', label: 'Draw' },
                                            { type: 'drag', icon: Move, color: '#3b82f6', label: 'Drag' },
                                            { type: 'stamp', icon: Target, color: '#ef4444', label: 'Stamp' },
                                            { type: 'text', icon: Type, color: '#10b981', label: 'Text' }
                                        ].map(t => {
                                            const isSelected = selectedEl?.type === t.type;
                                            return (
                                                <button
                                                    key={t.type}
                                                    onClick={() => addElement(t.type)}
                                                    className="glass"
                                                    style={{
                                                        padding: '18px 10px',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                        transition: '0.2s',
                                                        border: `2px solid ${isSelected ? t.color : 'var(--border)'} `,
                                                        borderRadius: '16px',
                                                        background: isSelected ? `${t.color}15` : 'transparent',
                                                        boxShadow: isSelected ? `0 0 15px ${t.color}30` : 'none'
                                                    }}
                                                    onMouseEnter={e => !isSelected && (e.currentTarget.style.borderColor = t.color)}
                                                    onMouseLeave={e => !isSelected && (e.currentTarget.style.borderColor = 'var(--border)')}
                                                >
                                                    <div style={{ color: t.color, transform: isSelected ? 'scale(1.1)' : 'scale(1)', transition: '0.2s' }}><t.icon size={20} /></div>
                                                    <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: isSelected ? 'white' : 'var(--text-muted)' }}>{t.label}</span>
                                                </button>
                                            );
                                        });
                                    })()}
                                </div>
                            </div>

                            {/* Opciones / Audio Section */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                                {selectedElementId && (localSlides[selectedIdx]?.elements || []).find(e => e.id === selectedElementId) && (
                                    <div className="anim-up" style={{ margin: '0 8px', background: 'rgba(124, 58, 237, 0.1)', padding: '20px', borderRadius: '24px', border: '1px solid rgba(124, 58, 237, 0.2)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                            <h4 style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--primary-light)', textTransform: 'uppercase', margin: 0 }}>Opciones</h4>
                                            <div style={{ background: 'rgba(124, 58, 237, 0.2)', padding: '4px 10px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                {(() => {
                                                    const el = (localSlides[selectedIdx].elements || []).find(e => e.id === selectedElementId);
                                                    if (el?.type === 'text') return <><Type size={12} /> <span style={{ fontSize: '0.6rem', fontWeight: 900 }}>TEXT</span></>;
                                                    if (el?.type === 'drag') return <><Move size={12} /> <span style={{ fontSize: '0.6rem', fontWeight: 900 }}>DRAG</span></>;
                                                    if (el?.type === 'draw') return <><Paintbrush size={12} /> <span style={{ fontSize: '0.6rem', fontWeight: 900 }}>DRAW</span></>;
                                                    if (el?.type === 'stamp') return <><Target size={12} /> <span style={{ fontSize: '0.6rem', fontWeight: 900 }}>STAMP</span></>;
                                                    return null;
                                                })()}
                                            </div>
                                        </div>
                                        {(localSlides[selectedIdx]?.elements || []).find(e => e.id === selectedElementId)?.type === 'drag' && (
                                            <>
                                                <label className="btn-premium" style={{ width: '100%', padding: '10px', fontSize: '0.75rem', cursor: 'pointer', marginBottom: '10px' }}>
                                                    <Upload size={16} /> Subir Imagen
                                                    <input type="file" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e, 'drag_img', selectedIdx, (localSlides[selectedIdx].elements || []).findIndex(item => item.id === selectedElementId))} />
                                                </label>
                                                {(localSlides[selectedIdx]?.elements || []).find(e => e.id === selectedElementId)?.url && (
                                                    <div style={{ marginBottom: '10px' }}>
                                                        <label style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                                                            Tamaño: {(localSlides[selectedIdx]?.elements || []).find(e => e.id === selectedElementId)?.imageSize || 100}%
                                                        </label>
                                                        <input
                                                            type="range"
                                                            min="20"
                                                            max="500"
                                                            step="5"
                                                            value={((currentSlide?.elements || []).find(e => e.id === selectedElementId)?.imageSize || 100)}
                                                            onChange={(e) => {
                                                                if (!localSlides[selectedIdx]) return;
                                                                const copy = [...localSlides];
                                                                const element = (copy[selectedIdx].elements || []).find(item => item.id === selectedElementId);
                                                                if (element) {
                                                                    element.imageSize = parseInt(e.target.value);
                                                                    setLocalSlides(copy);
                                                                }
                                                            }}
                                                            style={{
                                                                width: '100%',
                                                                height: '6px',
                                                                borderRadius: '3px',
                                                                background: 'linear-gradient(to right, rgba(124, 58, 237, 0.3), rgba(124, 58, 237, 0.8))',
                                                                outline: 'none',
                                                                cursor: 'pointer',
                                                                accentColor: '#7c3aed'
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                            </>
                                        )}
                                        <button onClick={async () => {
                                            if (!localSlides[selectedIdx]) return;
                                            const elementToDelete = (currentSlide?.elements || []).find(e => e.id === selectedElementId);
                                            if (elementToDelete?.url) await deleteFileFromStorage(elementToDelete.url);
                                            const copy = [...localSlides];
                                            copy[selectedIdx].elements = copy[selectedIdx].elements.filter(e => e.id !== selectedElementId);
                                            setLocalSlides(copy);
                                            setSelectedElementId(null);
                                            setDraggingElementId(null);
                                        }} className="btn-outline" style={{ width: '100%', color: '#ef4444', padding: '12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                            <Trash2 size={16} /> Eliminar
                                        </button>
                                    </div>
                                )}

                                <div style={{ margin: '0 8px', background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <h3 style={{ color: 'white', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <Music size={18} color="#10b981" /> Audio
                                    </h3>
                                    <label className="btn-outline" style={{ width: '100%', padding: '15px', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', gap: '10px', borderRadius: '15px' }}>
                                        <Music size={18} /> {currentSlide?.audio_url ? 'Cambiar Audio' : 'Subir Audio'}
                                        <input type="file" style={{ display: 'none' }} accept="audio/*" onChange={(e) => handleFileUpload(e, 'audio', selectedIdx)} />
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
