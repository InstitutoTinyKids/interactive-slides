import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
    Settings, Play, Clock, Check, X, HelpCircle, SkipForward,
    RotateCcw, Edit2, Trash2, Plus, Save, ArrowRight, Eye,
    AlertTriangle, ChevronDown, ChevronUp, LayoutGrid, Pause, Key, Image as ImageIcon
} from 'lucide-react';

// --- DATOS INICIALES ---
const INITIAL_QUESTIONS = [];

export default function QuizApp({ onExit, isAdmin = false, role = 'student', project, isActive, onToggleActive, onViewResults, previewMode = false, onPreview }) {
    // --- ESTADOS ---
    const isTeacher = role === 'teacher';
    const [view, setView] = useState(isAdmin ? 'admin' : 'playing'); // admin, playing, results
    const [questions, setQuestions] = useState(INITIAL_QUESTIONS);
    const [selectedQIdx, setSelectedQIdx] = useState(0);
    const [projectLocal, setProjectLocal] = useState(project);

    // Estados del Admin
    const [adminPass, setAdminPass] = useState('');
    const [isAdminAuth, setIsAdminAuth] = useState(isAdmin);
    const [editingQ, setEditingQ] = useState(null); // Pregunta siendo editada/creada

    // Estados del Juego
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [answersLog, setAnswersLog] = useState([]); // { qId, selected, correct, isSkipped }
    const [timer, setTimer] = useState(0);
    const [isRunning, setIsRunning] = useState(!isAdmin);
    const [feedback, setFeedback] = useState(null); // 'correct', 'incorrect'
    const [selectedOption, setSelectedOption] = useState(null);
    const [fullImage, setFullImage] = useState(null);

    // Estados de Ayudas
    const [hiddenOptions, setHiddenOptions] = useState([]); // Índices ocultos por 50/50

    const [showReview, setShowReview] = useState(false);
    const [loading, setLoading] = useState(false);
    const [previewModeLocal] = useState(project?.previewMode || false);
    const [localAccessCode, setLocalAccessCode] = useState(project?.access_code || '123');

    // Estados para edición del nombre del proyecto
    const [isEditingProjectName, setIsEditingProjectName] = useState(false);
    const [hasUnsavedNameChanges, setHasUnsavedNameChanges] = useState(false);
    const [originalProjectName, setOriginalProjectName] = useState('');

    const [isEditingAccessCode, setIsEditingAccessCode] = useState(false);
    const [hasUnsavedCodeChanges, setHasUnsavedCodeChanges] = useState(false);
    const [showProjectDetails, setShowProjectDetails] = useState(false);
    const [isLandscape, setIsLandscape] = useState(window.innerWidth > window.innerHeight);

    const timerRef = useRef(null);

    useEffect(() => {
        const handleResize = () => setIsLandscape(window.innerWidth > window.innerHeight);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Video Range Loop Logic
    useEffect(() => {
        let interval;
        if (view === 'playing' && questions[currentQIndex]?.type === 'video' && questions[currentQIndex]?.videoEnd) {
            const start = questions[currentQIndex].videoStart || 0;
            const end = questions[currentQIndex].videoEnd;

            interval = setInterval(() => {
                const iframe = document.getElementById('quiz-video-player');
                if (iframe) {
                    iframe.contentWindow.postMessage(JSON.stringify({
                        event: 'listening',
                        id: 1,
                        channel: 'widget'
                    }), '*');
                    // Also try sending as object
                    iframe.contentWindow.postMessage({
                        event: 'listening',
                        id: 1,
                        channel: 'widget'
                    }, '*');
                }
            }, 500);

            const handleVideoMessage = (event) => {
                try {
                    const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
                    if (data.event === 'infoDelivery' && data.info && data.info.currentTime) {
                        if (data.info.currentTime >= end) {
                            const iframe = document.getElementById('quiz-video-player');
                            if (iframe) {
                                const seekCmd = {
                                    event: 'command',
                                    func: 'seekTo',
                                    args: [Number(start), true]
                                };
                                iframe.contentWindow.postMessage(JSON.stringify(seekCmd), '*');
                                iframe.contentWindow.postMessage(seekCmd, '*');
                            }
                        }
                    }
                } catch (e) { }
            };
            window.addEventListener('message', handleVideoMessage);
            return () => {
                clearInterval(interval);
                window.removeEventListener('message', handleVideoMessage);
            };
        }
    }, [view, currentQIndex, questions]);

    // Sync project details when changed from parent
    useEffect(() => {
        if (project) {
            setProjectLocal(project);
            setLocalAccessCode(project.access_code);
        }
    }, [project]);

    // --- CARGA DE DATOS ---
    useEffect(() => {
        if (project && project.id) {
            loadQuizData();
        }
    }, [project]);

    const loadQuizData = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('projects')
                .select('questions')
                .eq('id', project.id)
                .single();

            if (data && Array.isArray(data.questions)) {
                setQuestions(data.questions);
            } else if (data && !data.questions) {
                setQuestions([]); // Empty instead of null if no questions yet
            }
        } catch (err) {
            console.error("Error loading quiz data:", err);
        }
        setLoading(false);
    };

    const handleSaveQuiz = async (updatedQuestions, isSilent = false) => {
        if (!project || !project.id) return;
        if (!isSilent) setLoading(true);
        try {
            const { error } = await supabase
                .from('projects')
                .update({
                    questions: updatedQuestions,
                    name: projectLocal?.name,
                    access_code: localAccessCode
                })
                .eq('id', project.id);

            if (error) throw error;
            setQuestions(updatedQuestions);
            if (!isSilent) {
                confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
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
        if (view !== 'admin' || !project?.id) return;

        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

        autoSaveTimerRef.current = setTimeout(() => {
            handleSaveQuiz(questions, true);
        }, 3000);

        return () => {
            if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        };
    }, [questions, projectLocal?.name, localAccessCode, view]);

    // --- LOGICA DEL CRONOMETRO ---
    useEffect(() => {
        if (isRunning) {
            timerRef.current = setInterval(() => {
                setTimer((prev) => prev + 1);
            }, 1000);
        } else {
            clearInterval(timerRef.current);
        }
        return () => clearInterval(timerRef.current);
    }, [isRunning]);

    // --- FUNCIONES DE NAVEGACION ---
    const startQuiz = () => {
        setCurrentQIndex(0);
        setAnswersLog([]);
        setTimer(0);
        setFeedback(null);
        setSelectedOption(null);
        setHiddenOptions([]);
        setIsRunning(true);
        setShowReview(false);
        setView('playing');
    };

    const goToAdmin = () => {
        if (adminPass === '123') {
            setIsAdminAuth(true);
            setView('admin');
            setAdminPass('');
        } else {
            alert('Contraseña incorrecta');
        }
    };

    const restartApp = () => {
        setCurrentQIndex(0);
        setAnswersLog([]);
        setTimer(0);
        setFeedback(null);
        setSelectedOption(null);
        setHiddenOptions([]);
        setIsRunning(true);
        setShowReview(false);
        setView('playing');
        setAdminPass('');
    };

    // --- LOGICA DEL JUEGO ---
    const handleAnswer = (optionIndex) => {
        if (feedback !== null) return;

        const currentQ = questions[currentQIndex];
        const isCorrect = optionIndex === currentQ.correctAnswer;
        const isSkip = optionIndex === -1;

        setIsRunning(false);
        if (!isSkip) {
            setSelectedOption(optionIndex);
            setFeedback(isCorrect ? 'correct' : 'incorrect');
        }

        const logEntry = {
            question: currentQ,
            selected: optionIndex,
            isCorrect: isCorrect,
            isSkipped: isSkip
        };

        const proceed = async () => {
            if (!previewMode && project?.previewMode !== true) {
                setAnswersLog(prev => [...prev, logEntry]);
            }
            if (currentQIndex < questions.length - 1) {
                setCurrentQIndex(prev => prev + 1);
                setFeedback(null);
                setSelectedOption(null);
                setHiddenOptions([]);
                setIsRunning(true);
            } else {
                setView('results');
            }
        };

        if (isSkip) {
            proceed();
        } else {
            setTimeout(proceed, 1500);
        }
    };

    const handleFiftyFifty = () => {
        if (feedback !== null || hiddenOptions.length > 0) return;
        setTimer(prev => prev + 10);
        const currentQ = questions[currentQIndex];
        const wrongIndices = currentQ.options
            .map((_, idx) => idx)
            .filter(idx => idx !== currentQ.correctAnswer);
        const shuffledWrong = wrongIndices.sort(() => 0.5 - Math.random());
        setHiddenOptions(shuffledWrong.slice(0, 2));
    };

    const handlePass = () => {
        setTimer(prev => prev + 30);
        handleAnswer(-1);
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    // Reemplazamos la vista 'home' por un cargador simple si los datos no están listos
    if (loading && questions === INITIAL_QUESTIONS && !isAdmin) {
        return (
            <div className="min-h-screen bg-[#050510] text-white flex flex-col items-center justify-center font-sans">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                <p className="text-slate-400 font-bold tracking-widest uppercase text-xs">Cargando Quiz...</p>
            </div>
        );
    }

    if (view === 'admin') {
        const currentEditingQ = editingQ || questions[selectedQIdx] || null;

        return (
            <div style={{ height: '100vh', width: '100vw', display: 'flex', background: '#050510', overflow: 'hidden', flexDirection: 'column' }}>
                {/* HEADER PROFESIONAL */}
                <header style={{
                    height: '75px',
                    padding: '0 30px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(10,10,25,0.9)',
                    backdropFilter: 'blur(20px)',
                    zIndex: 100
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <button
                            onClick={onExit}
                            title="IR A GALERIA"
                            style={{
                                padding: '12px',
                                background: 'rgba(59, 130, 246, 0.1)',
                                borderRadius: '15px',
                                color: '#3b82f6',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: '0.3s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'}
                        >
                            <LayoutGrid size={24} />
                        </button>
                        <div>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'white', lineHeight: 1.1 }}>{projectLocal?.name || 'Cargando...'}</h2>
                            <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px' }}>Panel de Administración</span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        <button onClick={onViewResults} className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 20px', borderRadius: '14px', fontSize: '0.85rem' }}>
                            <Eye size={18} /> Resultados
                        </button>
                        <button
                            onClick={async () => {
                                const saved = await handleSaveQuiz(questions, false);
                                if (saved) {
                                    if (onPreview) onPreview(projectLocal);
                                    else window.dispatchEvent(new CustomEvent('previewProject', { detail: projectLocal }));
                                }
                            }}
                            className="btn-outline"
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '14px', fontSize: '0.85rem', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)' }}
                            disabled={loading}
                        >
                            <Play size={18} /> {loading ? 'Prep. Preview...' : 'Preview'}
                        </button>
                        <button
                            onClick={onToggleActive}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '12px 20px',
                                borderRadius: '14px',
                                fontSize: '0.85rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                background: isActive ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                color: isActive ? '#ef4444' : '#10b981',
                                border: `1px solid ${isActive ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
                                transition: '0.3s'
                            }}
                        >
                            {isActive ? <Pause size={18} /> : <Play size={18} />} {isActive ? 'Suspender' : 'Activar'}
                        </button>
                        <button
                            onClick={() => handleSaveQuiz(questions)}
                            className="btn-premium"
                            style={{ padding: '12px 25px', borderRadius: '14px', fontSize: '0.85rem' }}
                            disabled={loading}
                        >
                            <Save size={18} /> Guardar Cambios
                        </button>
                    </div>
                </header>

                <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                    {/* PANEL IZQUIERDO: LISTA DE PREGUNTAS */}
                    <aside style={{
                        width: '380px',
                        minWidth: '380px',
                        borderRight: '1px solid rgba(255,255,255,0.05)',
                        background: '#0a0a1a',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                    }}>
                        <div style={{ padding: '25px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ fontSize: '0.8rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'white' }}>Preguntas</h3>
                                <p style={{ fontSize: '0.7rem', color: '#64748b' }}>{questions.length} preguntas creadas</p>
                            </div>
                            <button
                                onClick={() => {
                                    setEditingQ({ id: Date.now(), question: '', options: ['', '', '', ''], correctAnswer: 0, isNew: true });
                                }}
                                style={{ background: '#7c3aed', border: 'none', color: 'white', width: '40px', height: '40px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 5px 15px rgba(124, 58, 237, 0.3)' }}
                            >
                                <Plus size={20} />
                            </button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {(Array.isArray(questions) ? questions : []).map((q, idx) => (
                                <div
                                    key={q.id}
                                    onClick={() => { setSelectedQIdx(idx); setEditingQ(q); }}
                                    style={{
                                        padding: '20px',
                                        borderRadius: '20px',
                                        border: `1px solid ${selectedQIdx === idx ? '#3b82f6' : 'rgba(255,255,255,0.05)'}`,
                                        background: selectedQIdx === idx ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.03)',
                                        boxShadow: selectedQIdx === idx ? '0 0 20px rgba(59, 130, 246, 0.1)' : 'none',
                                        cursor: 'pointer',
                                        transition: '0.3s',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '15px',
                                        position: 'relative'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{
                                            fontSize: '0.7rem',
                                            fontWeight: 900,
                                            color: '#3b82f6',
                                            background: 'rgba(59, 130, 246, 0.15)',
                                            padding: '4px 10px',
                                            borderRadius: '8px'
                                        }}>
                                            #{idx + 1}
                                        </span>
                                        <div style={{ display: 'flex', gap: '12px' }}>
                                            <Edit2 size={16} style={{ color: '#64748b', opacity: 0.6 }} />
                                            <Trash2
                                                size={16}
                                                style={{ color: '#ef4444', opacity: 0.6, cursor: 'pointer' }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (window.confirm('¿ESTÁS SEGURO? Esta acción borrará la pregunta permanentemente.')) {
                                                        const updated = questions.filter((_, i) => i !== idx);
                                                        setQuestions(updated);
                                                        if (selectedQIdx >= updated.length) setSelectedQIdx(Math.max(0, updated.length - 1));
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <p style={{
                                        fontSize: '0.9rem',
                                        color: selectedQIdx === idx ? 'white' : '#94a3b8',
                                        lineHeight: 1.4,
                                        fontWeight: 700,
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                        margin: 0
                                    }}>
                                        {q.question || "Sin enunciado..."}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </aside>

                    {/* AREA CENTRAL: EDITOR PRO */}
                    <main style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'radial-gradient(circle at top right, #0a0a1a, #050510)', overflowY: 'auto', padding: '40px' }}>
                        <div style={{ maxWidth: '900px', width: '100%', margin: '0 auto' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
                                <div style={{ width: '40px', height: '40px', background: 'rgba(124, 58, 237, 0.1)', border: '1px solid rgba(124, 58, 237, 0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a78bfa' }}>
                                    <Edit2 size={20} />
                                </div>
                                <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'white' }}>{editingQ ? (editingQ.isNew ? 'Nueva Pregunta' : 'Editar Pregunta') : 'Selecciona una Pregunta'}</h2>
                            </div>

                            {currentEditingQ ? (
                                <div className="glass" style={{ padding: '40px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    <AdminForm
                                        initialData={currentEditingQ}
                                        onSave={(q) => {
                                            let newQuestions;
                                            if (editingQ?.isNew) {
                                                const { isNew, ...qData } = q;
                                                newQuestions = [...questions, qData];
                                            } else {
                                                newQuestions = questions.map(item => item.id === q.id ? q : item);
                                            }
                                            setQuestions(newQuestions);
                                            setEditingQ(null);
                                            alert('✅ Pregunta guardada con éxito.');
                                        }}
                                        onCancel={() => setEditingQ(null)}
                                    />
                                </div>
                            ) : (
                                <div style={{ height: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.3 }}>
                                    <HelpCircle size={80} color="white" strokeWidth={1} />
                                    <p style={{ marginTop: '20px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px' }}>Selecciona o crea una pregunta</p>
                                </div>
                            )}
                        </div>
                    </main>

                    {/* PANEL DERECHO: AJUSTES */}
                    <aside style={{
                        width: '350px',
                        minWidth: '350px',
                        background: '#0a0a1a',
                        borderLeft: '1px solid rgba(255,255,255,0.05)',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                    }}>
                        <div style={{ padding: '30px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '30px' }}>
                            <div>
                                <h3 style={{ color: 'white', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '2.5px', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '25px', opacity: 0.6 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><Settings size={18} /> Configuración</div>
                                    <button
                                        onClick={() => setShowProjectDetails(!showProjectDetails)}
                                        style={{
                                            border: 'none',
                                            color: '#3b82f6',
                                            fontSize: '0.65rem',
                                            fontWeight: 900,
                                            cursor: 'pointer',
                                            textTransform: 'uppercase',
                                            padding: '4px 8px',
                                            borderRadius: '6px',
                                            background: 'rgba(59, 130, 246, 0.1)'
                                        }}
                                    >
                                        {showProjectDetails ? 'Ocultar' : 'Ver más'}
                                    </button>
                                </h3>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                                    {showProjectDetails && (
                                        <div className="anim-up" style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '10px', padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            {/* Nombre del Proyecto */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Nombre del Proyecto</label>
                                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <input
                                                        className="premium-input w-full"
                                                        value={projectLocal?.name || ''}
                                                        readOnly={!isEditingProjectName}
                                                        onChange={(e) => {
                                                            const newName = e.target.value;
                                                            setProjectLocal({ ...projectLocal, name: newName });
                                                            setHasUnsavedNameChanges(true);
                                                        }}
                                                        style={{
                                                            paddingLeft: '16px',
                                                            paddingRight: '50px',
                                                            fontSize: '1rem',
                                                            fontWeight: 700,
                                                            opacity: isEditingProjectName ? 1 : 0.7,
                                                            cursor: isEditingProjectName ? 'text' : 'not-allowed',
                                                            borderColor: isEditingProjectName ? '#3b82f6' : 'rgba(255,255,255,0.05)'
                                                        }}
                                                    />
                                                    <button
                                                        onClick={async () => {
                                                            if (isEditingProjectName && hasUnsavedNameChanges && project?.id) {
                                                                try {
                                                                    await supabase.from('projects').update({ name: projectLocal.name }).eq('id', project.id);
                                                                    setHasUnsavedNameChanges(false);
                                                                    setIsEditingProjectName(false);
                                                                } catch (err) {
                                                                    alert('Error al guardar nombre: ' + err.message);
                                                                }
                                                            } else {
                                                                setIsEditingProjectName(!isEditingProjectName);
                                                            }
                                                        }}
                                                        style={{
                                                            position: 'absolute',
                                                            right: '16px',
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

                                            {/* Clave de Acceso */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Clave de Acceso</label>
                                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <input
                                                        className="premium-input w-full"
                                                        value={localAccessCode}
                                                        readOnly={!isEditingAccessCode}
                                                        onChange={(e) => {
                                                            setLocalAccessCode(e.target.value);
                                                            setHasUnsavedCodeChanges(true);
                                                        }}
                                                        style={{
                                                            paddingLeft: '16px',
                                                            paddingRight: '50px',
                                                            fontSize: '1rem',
                                                            fontWeight: 700,
                                                            opacity: isEditingAccessCode ? 1 : 0.7,
                                                            cursor: isEditingAccessCode ? 'text' : 'not-allowed',
                                                            borderColor: isEditingAccessCode ? '#3b82f6' : 'rgba(255,255,255,0.05)'
                                                        }}
                                                    />
                                                    <button
                                                        onClick={async () => {
                                                            if (isEditingAccessCode && hasUnsavedCodeChanges && project?.id) {
                                                                try {
                                                                    await supabase.from('projects').update({ access_code: localAccessCode }).eq('id', project.id);
                                                                    setHasUnsavedCodeChanges(false);
                                                                    setIsEditingAccessCode(false);
                                                                } catch (err) {
                                                                    alert('Error al guardar clave: ' + err.message);
                                                                }
                                                            } else {
                                                                setIsEditingAccessCode(!isEditingAccessCode);
                                                            }
                                                        }}
                                                        style={{
                                                            position: 'absolute',
                                                            right: '16px',
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
                                                <p style={{ fontSize: '0.65rem', color: '#475569', lineHeight: 1.5 }}>Esta es la clave que los alumnos deberán ingresar para poder realizar este cuestionario.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>


                        </div>
                    </aside>
                </div>
            </div>
        );
    }

    if (view === 'playing') {
        const currentQ = questions[currentQIndex];
        if (!currentQ) return null;

        return (
            <div style={{
                height: '100vh',
                width: '100vw',
                background: '#000',
                color: 'white',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '1.5vh 20px',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* HUD SUPERIOR */}
                <div style={{ width: '100%', maxWidth: '1000px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2vh', flexShrink: 0 }}>
                    <div style={{
                        background: 'rgba(59, 130, 246, 0.15)',
                        padding: '10px 25px',
                        borderRadius: '100px',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        color: '#93c5fd'
                    }}>
                        Pregunta {currentQIndex + 1} / {questions.length}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.4rem', fontWeight: 900, color: 'white' }}>
                        <Clock size={24} style={{ color: '#3b82f6' }} />
                        <span>{formatTime(timer)}</span>
                    </div>
                </div>

                {/* AREA DE JUEGO ADAPTABLE */}
                <div className="quiz-container-landscape" style={{
                    flex: 1,
                    width: '100%',
                    maxWidth: '1200px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '20px',
                    overflow: 'hidden'
                }}>
                    {/* PREGUNTA Y MEDIA */}
                    <div style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        textAlign: 'center',
                        gap: '2vh',
                        minWidth: '40%'
                    }}>
                        {currentQ.question && (
                            <h2 style={{
                                fontSize: (currentQ.type === 'image' || currentQ.type === 'video')
                                    ? 'clamp(1rem, 2.2vh, 1.4rem)'
                                    : 'clamp(1.5rem, 5vh, 2.5rem)',
                                fontWeight: 900,
                                margin: 0,
                                color: '#fff'
                            }}>
                                {currentQ.question}
                            </h2>
                        )}

                        {currentQ.type === 'image' && currentQ.mediaUrl && (
                            <img
                                src={currentQ.mediaUrl}
                                alt="Question"
                                onClick={() => setFullImage(currentQ.mediaUrl)}
                                style={{
                                    width: '100%',
                                    maxHeight: '30vh',
                                    objectFit: 'contain',
                                    borderRadius: '15px'
                                }}
                            />
                        )}

                        {currentQ.type === 'audio' && currentQ.mediaUrl && (
                            <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                                <audio controls src={currentQ.mediaUrl} style={{ width: '100%', height: '40px' }} />
                            </div>
                        )}

                        {currentQ.type === 'video' && currentQ.mediaUrl && (
                            <div style={{ width: '100%', aspectRatio: '16/9', maxHeight: '35vh', borderRadius: '15px', overflow: 'hidden' }}>
                                {(() => {
                                    const videoId = currentQ.mediaUrl.split('v=')[1]?.split('&')[0] || currentQ.mediaUrl.split('/').pop();
                                    const start = currentQ.videoStart || 0;
                                    const end = currentQ.videoEnd || 0;
                                    const embedUrl = `https://www.youtube.com/embed/${videoId}?start=${start}${end ? `&end=${end}` : ''}&autoplay=1&mute=0&enablejsapi=1`;
                                    return (
                                        <iframe id="quiz-video-player" width="100%" height="100%" src={embedUrl} title="YouTube" frameBorder="0" allow="autoplay" allowFullScreen></iframe>
                                    );
                                })()}
                            </div>
                        )}
                    </div>

                    {/* OPCIONES */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: isLandscape ? '1fr' : ((currentQ.type === 'image' || currentQ.type === 'video') && currentQ.options.length > 2 && currentQ.options.some(o => o.length > 30) ? '1fr' : '1fr 1fr'),
                        gap: isLandscape ? '1.5vh' : '1vh',
                        width: '100%',
                        flex: 1.2,
                        alignContent: 'center'
                    }}>
                        {currentQ.options.map((opt, idx) => {
                            const isHidden = hiddenOptions.includes(idx);
                            if (isHidden) return <div key={idx} style={{ padding: '1.2vh', opacity: 0 }} />;

                            let bgColor = 'rgba(255, 255, 255, 0.05)';
                            let borderColor = 'rgba(255, 255, 255, 0.1)';
                            let iconBg = 'rgba(255, 255, 255, 0.05)';
                            let showCheck = false;
                            let showX = false;

                            if (feedback) {
                                if (idx === currentQ.correctAnswer) {
                                    bgColor = 'rgba(16, 185, 129, 0.15)';
                                    borderColor = '#10b981';
                                    iconBg = '#10b981';
                                    showCheck = true;
                                } else if (idx === selectedOption && feedback === 'incorrect') {
                                    bgColor = 'rgba(239, 68, 68, 0.15)';
                                    borderColor = '#ef4444';
                                    iconBg = '#ef4444';
                                    showX = true;
                                }
                            }

                            return (
                                <button
                                    key={idx}
                                    onClick={() => handleAnswer(idx)}
                                    disabled={feedback !== null}
                                    style={{
                                        width: '100%',
                                        padding: isLandscape ? '2.5vh 25px' : '1.2vh 15px',
                                        borderRadius: '12px',
                                        background: bgColor,
                                        border: `1px solid ${borderColor}`,
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '15px',
                                        cursor: feedback ? 'default' : 'pointer',
                                        fontSize: isLandscape ? 'clamp(0.8rem, 2vh, 1.1rem)' : 'clamp(0.7rem, 1.8vh, 0.95rem)'
                                    }}
                                >
                                    <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>
                                        {showCheck ? <Check size={16} /> : (showX ? <X size={16} /> : String.fromCharCode(65 + idx))}
                                    </div>
                                    <span style={{ fontWeight: 600 }}>{opt}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* CONTROLES / AYUDAS */}
                <div style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.2vh', marginTop: '1.5vh', flexShrink: 0 }}>
                    <div style={{ display: 'flex', gap: '30px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                            <button
                                onClick={handleFiftyFifty}
                                disabled={feedback !== null || hiddenOptions.length > 0}
                                style={{
                                    width: isLandscape ? '80px' : '65px',
                                    height: isLandscape ? '80px' : '65px',
                                    borderRadius: '50%',
                                    background: 'rgba(59, 130, 246, 0.2)',
                                    border: '2px solid rgba(59, 130, 246, 0.4)',
                                    color: '#60a5fa',
                                    fontSize: isLandscape ? '1.1rem' : '0.9rem',
                                    fontWeight: 900,
                                    cursor: 'pointer',
                                    transition: '0.3s',
                                    opacity: (feedback || hiddenOptions.length > 0) ? 0.3 : 1
                                }}
                            >
                                50:50
                            </button>
                            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#3b82f6' }}>+10s</span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                            <button
                                onClick={handlePass}
                                disabled={feedback !== null}
                                style={{
                                    width: isLandscape ? '80px' : '65px',
                                    height: isLandscape ? '80px' : '65px',
                                    borderRadius: '50%',
                                    background: 'rgba(124, 58, 237, 0.2)',
                                    border: '2px solid rgba(124, 58, 237, 0.4)',
                                    color: '#a78bfa',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    transition: '0.3s',
                                    opacity: feedback ? 0.3 : 1
                                }}
                            >
                                <SkipForward size={isLandscape ? 32 : 26} />
                            </button>
                            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#7c3aed' }}>Pasar (+30s)</span>
                        </div>
                    </div>

                    <button
                        onClick={() => {
                            const correctPass = project?.access_code || '123';
                            const pass = prompt('Ingresa la clave de administrador para cancelar el juego:');
                            if (pass === correctPass) {
                                restartApp();
                                onExit();
                            } else if (pass !== null) {
                                alert('Clave incorrecta');
                            }
                        }}
                        style={{ background: 'none', border: 'none', color: '#475569', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', opacity: 0.6 }}
                    >
                        Cancelar Juego
                    </button>
                </div>

                {/* MODAL IMAGEN FULL SCREEN */}
                {fullImage && (
                    <div
                        onClick={() => setFullImage(null)}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            width: '100vw',
                            height: '100vh',
                            backgroundColor: 'rgba(0,0,0,0.95)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 9999,
                            cursor: 'zoom-out'
                        }}
                    >
                        <img
                            src={fullImage}
                            alt="Full Screen"
                            style={{
                                maxWidth: '95%',
                                maxHeight: '95%',
                                objectFit: 'contain',
                                borderRadius: '10px',
                                boxShadow: '0 0 50px rgba(0,0,0,0.8)'
                            }}
                        />
                        <div style={{
                            position: 'absolute',
                            top: '20px',
                            right: '20px',
                            color: 'white',
                            cursor: 'pointer',
                            background: 'rgba(255,255,255,0.1)',
                            borderRadius: '50%',
                            padding: '10px'
                        }}>
                            <X size={32} />
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (view === 'results') {
        const correctCount = answersLog.filter(a => a.isCorrect).length;
        const totalCount = questions.length;
        const incorrectCount = answersLog.filter(a => !a.isCorrect && !a.isSkipped).length;
        const skippedCount = answersLog.filter(a => a.isSkipped).length;

        return (
            <div style={{ minHeight: '100vh', width: '100vw', background: '#050510', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                <div className="entry-card glass anim-up" style={{ padding: '30px', maxWidth: '1000px' }}>
                    <div className="responsive-grid">
                        <div className="responsive-header" style={{ textAlign: 'center', alignItems: 'center' }}>
                            <div style={{ fontSize: '4rem', marginBottom: '10px' }}>🏆</div>
                            <h2 style={{ fontSize: '2rem', fontWeight: 900 }}>¡Juego Terminado!</h2>
                            <p style={{ fontSize: '1rem', color: '#94a3b8' }}>Estadísticas de la partida</p>
                        </div>

                        <div className="responsive-content" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '15px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.4rem', fontWeight: 900 }}>{formatTime(timer)}</div>
                                    <div style={{ fontSize: '0.6rem', color: '#64748b', textTransform: 'uppercase' }}>Tiempo</div>
                                </div>
                                <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '16px', padding: '15px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#10b981' }}>{correctCount}</div>
                                    <div style={{ fontSize: '0.6rem', color: '#065f46', textTransform: 'uppercase' }}>Correctas</div>
                                </div>
                                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '16px', padding: '15px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#ef4444' }}>{incorrectCount}</div>
                                    <div style={{ fontSize: '0.6rem', color: '#991b1b', textTransform: 'uppercase' }}>Incorrectas</div>
                                </div>
                                <div style={{ background: 'rgba(124, 58, 237, 0.1)', border: '1px solid rgba(124, 58, 237, 0.2)', borderRadius: '16px', padding: '15px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#a78bfa' }}>{skippedCount}</div>
                                    <div style={{ fontSize: '0.6rem', color: '#5b21b6', textTransform: 'uppercase' }}>Saltadas</div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '15px', width: '100%' }}>
                                <button onClick={restartApp} className="btn-premium" style={{ flex: 1, padding: '14px', fontSize: '0.9rem' }}>
                                    Reiniciar
                                </button>
                                <button onClick={onExit} className="btn-outline" style={{ flex: 1, padding: '14px', fontSize: '0.9rem' }}>
                                    Home
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}

function AdminForm({ initialData, onSave, onCancel }) {
    const [formData, setFormData] = useState({
        question: '',
        type: 'text', // text, audio, video, image
        mediaUrl: '',
        videoStart: 0,
        videoEnd: 0,
        options: ['', '', '', ''],
        correctAnswer: 0
    });
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (initialData) {
            setFormData({
                ...formData,
                ...initialData,
                type: initialData.type || 'text',
                options: initialData.options || ['', '', '', '']
            });
        }
    }, [initialData]);

    const handleFileUpload = async (e, type) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        try {
            const fileName = `quiz/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
            const { data, error } = await supabase.storage.from('media').upload(fileName, file);
            if (error) throw error;
            const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(fileName);
            setFormData({ ...formData, mediaUrl: publicUrl });
        } catch (error) {
            alert('Error al subir: ' + error.message);
        }
        setUploading(false);
    };

    const handleChangeOption = (idx, val) => {
        const newOpts = [...formData.options];
        newOpts[idx] = val;
        setFormData({ ...formData, options: newOpts });
    };

    const addOption = () => {
        setFormData({ ...formData, options: [...formData.options, ''] });
    };

    const removeOption = (idx) => {
        if (formData.options.length <= 2) return;
        const newOpts = formData.options.filter((_, i) => i !== idx);
        let newCorrect = formData.correctAnswer;
        if (newCorrect === idx) newCorrect = 0;
        else if (newCorrect > idx) newCorrect--;
        setFormData({ ...formData, options: newOpts, correctAnswer: newCorrect });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    const iconStyle = { marginRight: '8px' };

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            {/* Tipo de Pregunta */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>Tipo de Contenido</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                    {[
                        { id: 'text', label: 'Pregunta', Icon: HelpCircle, color: '#a78bfa' },
                        { id: 'audio', label: 'Audio', Icon: Clock, color: '#3b82f6' },
                        { id: 'video', label: 'Video', Icon: Play, color: '#ef4444' },
                        { id: 'image', label: 'Imagen', Icon: ImageIcon, color: '#10b981' }
                    ].map(t => (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => setFormData({ ...formData, type: t.id })}
                            style={{
                                padding: '12px',
                                borderRadius: '12px',
                                background: formData.type === t.id ? `${t.color}20` : 'rgba(255,255,255,0.03)',
                                border: `1px solid ${formData.type === t.id ? t.color : 'rgba(255,255,255,0.1)'}`,
                                color: formData.type === t.id ? t.color : '#94a3b8',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: '0.3s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
                        >
                            <t.Icon size={16} /> {t.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Enunciado */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>Enunciado de la Pregunta</label>
                <textarea
                    style={{
                        width: '100%',
                        minHeight: '80px',
                        background: 'rgba(5, 5, 15, 0.4)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        padding: '15px',
                        color: 'white',
                        fontSize: '1rem',
                        lineHeight: '1.4',
                        outline: 'none',
                        resize: 'vertical'
                    }}
                    placeholder="Escribe la pregunta aquí..."
                    value={formData.question}
                    onChange={e => setFormData({ ...formData, question: e.target.value })}
                    required
                />
            </div>

            {/* Multimedia Specific Controls */}
            {(formData.type === 'audio' || formData.type === 'image') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>Cargar Archivo ({formData.type === 'audio' ? 'MP3, WAV' : 'JPG, PNG'})</label>
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        <label className="btn-outline" style={{ flex: 1, padding: '12px', cursor: 'pointer', textAlign: 'center' }}>
                            {uploading ? 'Subiendo...' : (formData.mediaUrl ? 'Cambiar Archivo' : 'Elegir Archivo')}
                            <input type="file" hidden accept={formData.type === 'audio' ? 'audio/*' : 'image/*'} onChange={e => handleFileUpload(e, formData.type)} />
                        </label>
                        {formData.mediaUrl && (
                            <div style={{ flex: 2, fontSize: '0.75rem', color: '#10b981', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                ✅ {formData.mediaUrl.split('/').pop()}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {formData.type === 'video' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>Link de Youtube</label>
                        <input
                            type="text"
                            className="premium-input"
                            placeholder="https://www.youtube.com/watch?v=..."
                            value={formData.mediaUrl}
                            onChange={e => setFormData({ ...formData, mediaUrl: e.target.value })}
                        />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>Inicio (p.e. 112 para 1:12)</label>
                            <input
                                type="text"
                                className="premium-input"
                                placeholder="0"
                                value={typeof formData.videoStart === 'number' ?
                                    (Math.floor(formData.videoStart / 60) > 0 ? `${Math.floor(formData.videoStart / 60)}${(formData.videoStart % 60).toString().padStart(2, '0')}` : (formData.videoStart % 60).toString()) :
                                    formData.videoStart}
                                onChange={e => {
                                    const val = e.target.value.replace(/[^0-9]/g, '');
                                    if (!val) { setFormData({ ...formData, videoStart: 0 }); return; }
                                    const num = parseInt(val);
                                    const m = Math.floor(num / 100);
                                    const s = num % 100;
                                    setFormData({ ...formData, videoStart: (m * 60) + s });
                                }}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>Fin (p.e. 150 para 1:50)</label>
                            <input
                                type="text"
                                className="premium-input"
                                placeholder="0"
                                value={typeof formData.videoEnd === 'number' ?
                                    (Math.floor(formData.videoEnd / 60) > 0 ? `${Math.floor(formData.videoEnd / 60)}${(formData.videoEnd % 60).toString().padStart(2, '0')}` : (formData.videoEnd % 60).toString()) :
                                    formData.videoEnd}
                                onChange={e => {
                                    const val = e.target.value.replace(/[^0-9]/g, '');
                                    if (!val) { setFormData({ ...formData, videoEnd: 0 }); return; }
                                    const num = parseInt(val);
                                    const m = Math.floor(num / 100);
                                    const s = num % 100;
                                    setFormData({ ...formData, videoEnd: (m * 60) + s });
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Opciones */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>Opciones de Respuesta</label>
                    <button type="button" onClick={addOption} style={{ background: 'rgba(16, 185, 129, 0.1)', border: 'none', color: '#10b981', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Plus size={14} /> Agregar Opción
                    </button>
                </div>

                <div style={{ gridTemplateColumns: '1fr 1fr', display: 'grid', gap: '15px' }}>
                    {(Array.isArray(formData.options) ? formData.options : []).map((opt, idx) => (
                        <div
                            key={idx}
                            style={{
                                background: 'rgba(5, 5, 15, 0.4)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '12px',
                                padding: '10px 15px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                transition: '0.3s',
                                borderLeft: formData.correctAnswer === idx ? '4px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)'
                            }}
                        >
                            <input
                                type="radio"
                                name="correct-answer"
                                title="Marcar como correcta"
                                checked={formData.correctAnswer === idx}
                                onChange={() => setFormData({ ...formData, correctAnswer: idx })}
                                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#3b82f6' }}
                            />
                            <input
                                type="text"
                                placeholder={`Opción ${idx + 1}`}
                                value={opt}
                                onChange={(e) => handleChangeOption(idx, e.target.value)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'white',
                                    width: '100%',
                                    fontSize: '0.9rem',
                                    outline: 'none'
                                }}
                                required
                            />
                            {formData.options.length > 2 && (
                                <button type="button" onClick={() => removeOption(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', opacity: 0.5, cursor: 'pointer' }}>
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                <button
                    type="submit"
                    className="btn-premium"
                    style={{
                        flex: 1,
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        padding: '15px',
                        fontSize: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        border: 'none',
                        boxShadow: '0 10px 20px rgba(16, 185, 129, 0.2)'
                    }}
                >
                    <Save size={20} /> Guardar Pregunta
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="btn-outline"
                    style={{
                        padding: '15px 30px',
                        fontSize: '1rem',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'white'
                    }}
                >
                    Cancelar
                </button>
            </div>
        </form>
    );
}
