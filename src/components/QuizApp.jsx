import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
    Settings, Play, Clock, Check, X, HelpCircle, SkipForward,
    RotateCcw, Edit2, Trash2, Plus, Save, ArrowRight, Eye,
    AlertTriangle, ChevronDown, ChevronUp, LayoutGrid, Pause, Key, Image as ImageIcon
} from 'lucide-react';

// --- DATOS INICIALES (Extraídos de tus imágenes) ---
const INITIAL_QUESTIONS = [
    {
        id: 1,
        question: "Choose the correct option: The guitarist will play fast ______ the stage ______.",
        options: ["on / tonight", "at / tomorrow", "at / tonight", "in / right now"],
        correctAnswer: 0 // A
    },
    {
        id: 2,
        question: "Fill in the blanks: 'The singer ______ ______ (perform/passionately) ______ the recording studio tomorrow.'",
        options: ["performs passionately on", "will perform passionate at", "will passionately perform at", "will perform passionately in"],
        correctAnswer: 3 // D
    },
    {
        id: 3,
        question: "Find the mistake: 'The drummer will play loudly on the concert hall next weekend.'",
        options: ["The word 'drummer' is incorrect.", "The preposition 'on' should be 'at'.", "The adverb 'loudly' is wrong.", "The time marker 'next weekend' is wrong."],
        correctAnswer: 1 // B
    },
    {
        id: 4,
        question: "Unscramble the sentence: 'at / The / interact / festival / will / music / the / frontman / energetically / tonight'",
        options: [
            "The frontman at the music festival will interact energetically tonight.",
            "The frontman will interact energetically at the music festival tonight.",
            "Tonight the frontman will energetically interact at the music festival.",
            "The music festival will interact at the frontman energetically tonight."
        ],
        correctAnswer: 1 // B
    },
    {
        id: 5,
        question: "Challenge: How and where will the singer perform tomorrow? (Venue: Theater / Adverb: Well)",
        options: ["She will perform well at the theater tomorrow.", "She will play well at the theater later.", "The singer perform well on the theater tomorrow.", "She will perform well in the theater tomorrow."],
        correctAnswer: 3 // D
    },
    {
        id: 6,
        question: "Which sentence describes a bassist's action with high energy in a private space right now?",
        options: [
            "The bassist perform loudly on the stage right now.",
            "The bassist will perform energetically in the recording studio right now.",
            "The singer will perform energetically in the recording studio right now.",
            "The bassist will play fast at the concert hall tonight."
        ],
        correctAnswer: 1 // B
    },
    {
        id: 7,
        question: "The ______ will ______ (jump) ______ (fast) on the platform next weekend.",
        options: ["drummer / jump / loudly", "frontwoman / will jump / fast", "frontwoman / will jump / fastly", "bassist / will jumps / fast"],
        correctAnswer: 1 // B
    },
    {
        id: 8,
        question: "What is the most accurate way to describe a drummer playing with passion in the band's vehicle later?",
        options: [
            "The drummer will play passionately at the tour bus later.",
            "The drummer will plays passionate in the tour bus tonight.",
            "The guitarist will play passionately on the tour bus later.",
            "The drummer will play passionately in the tour bus later."
        ],
        correctAnswer: 3 // D
    },
    {
        id: 9,
        question: "The ______ (Frontman) will ______ (interact) ______ (energetically) ______ the music festival ______ (tomorrow).",
        options: [
            "singer / will interact / energetically / on / tomorrow",
            "frontman / will interact / energetically / at / tomorrow",
            "frontman / interact / energetically / at / tonight",
            "frontman / will interact / energetic / in / tomorrow"
        ],
        correctAnswer: 1 // B
    },
    {
        id: 10,
        question: "Complete the tour report: 'The bassist will play ______ (well) ______ the backstage ______ (later).'",
        options: ["well / on / tonight", "good / at / later", "well / at / next weekend", "well / in / later"],
        correctAnswer: 3 // D
    }
];

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

    const timerRef = useRef(null);

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

    const handleSaveQuiz = async (updatedQuestions) => {
        if (!project || !project.id) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from('projects')
                .update({ questions: updatedQuestions })
                .eq('id', project.id);

            if (error) throw error;
            setQuestions(updatedQuestions);
            alert('✅ Quiz guardado correctamente');
        } catch (err) {
            alert('Error al guardar: ' + err.message);
        }
        setLoading(false);
    };

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
                            onClick={() => onPreview ? onPreview(projectLocal) : window.dispatchEvent(new CustomEvent('previewProject', { detail: projectLocal }))}
                            className="btn-outline"
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '14px', fontSize: '0.85rem', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)' }}
                        >
                            <Play size={18} /> Preview
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
                                <h3 style={{ color: 'white', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '2.5px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '25px', opacity: 0.6 }}><Settings size={18} /> Configuración</h3>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Clave de Acceso</label>
                                        <div style={{ position: 'relative' }}>
                                            <Key size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#3b82f6' }} />
                                            <input
                                                className="premium-input w-full"
                                                value={localAccessCode}
                                                onChange={async (e) => {
                                                    const val = e.target.value;
                                                    setLocalAccessCode(val);
                                                    await supabase.from('projects').update({ access_code: val }).eq('id', project.id);
                                                }}
                                                style={{ paddingLeft: '50px', fontSize: '1rem', fontWeight: 700 }}
                                            />
                                        </div>
                                        <p style={{ fontSize: '0.65rem', color: '#475569', lineHeight: 1.5 }}>Esta es la clave que los alumnos deberán ingresar para poder realizar este cuestionario.</p>
                                    </div>
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

                {/* PREGUNTA CENTRAL */}
                <div style={{
                    flex: 1,
                    width: '100%',
                    maxWidth: '1000px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: (currentQ.type === 'image' || currentQ.type === 'video') ? 'center' : 'flex-start',
                    textAlign: 'center',
                    overflow: 'hidden',
                    minHeight: 0,
                    paddingTop: (currentQ.type === 'image' || currentQ.type === 'video') ? '0' : '6vh'
                }}>
                    <div style={{
                        marginBottom: (currentQ.type === 'image' || currentQ.type === 'video' || (currentQ.type === 'audio' && !currentQ.question)) ? '2vh' : '6vh',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: (currentQ.type === 'image' || currentQ.type === 'video') ? '2vh' : '5vh',
                        flexShrink: 1,
                        overflow: 'hidden'
                    }}>
                        {currentQ.question && (
                            <h2 style={{
                                fontSize: (currentQ.type === 'image' || currentQ.type === 'video')
                                    ? 'clamp(1.1rem, 2.5vh, 1.6rem)'
                                    : 'clamp(1.8rem, 5.8vh, 3.5rem)',
                                fontWeight: 900,
                                lineHeight: 1.1,
                                margin: 0,
                                color: '#fff',
                                textShadow: '0 4px 10px rgba(0,0,0,0.5)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical'
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
                                    maxWidth: '800px',
                                    maxHeight: '28vh',
                                    objectFit: 'contain',
                                    borderRadius: '15px',
                                    boxShadow: '0 15px 30px rgba(0,0,0,0.5)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    cursor: 'zoom-in',
                                    transition: 'transform 0.2s'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            />
                        )}

                        {currentQ.type === 'audio' && currentQ.mediaUrl && (
                            <div style={{
                                marginTop: !currentQ.question ? '15vh' : '0',
                                width: '100%',
                                display: 'flex',
                                justifyContent: 'center'
                            }}>
                                <audio controls src={currentQ.mediaUrl} style={{ width: '100%', maxWidth: '550px', height: '54px' }} />
                            </div>
                        )}

                        {currentQ.type === 'video' && currentQ.mediaUrl && (
                            <div style={{ width: '100%', maxWidth: '900px', maxHeight: '42vh', aspectRatio: '16/9', borderRadius: '15px', overflow: 'hidden', boxShadow: '0 15px 30px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                {(() => {
                                    const videoId = currentQ.mediaUrl.split('v=')[1]?.split('&')[0] || currentQ.mediaUrl.split('/').pop();
                                    const start = currentQ.videoStart || 0;
                                    const end = currentQ.videoEnd || 0;
                                    const embedUrl = `https://www.youtube.com/embed/${videoId}?start=${start}${end ? `&end=${end}` : ''}&autoplay=1&mute=0&enablejsapi=1`;
                                    return (
                                        <iframe
                                            id="quiz-video-player"
                                            width="100%"
                                            height="100%"
                                            src={embedUrl}
                                            title="YouTube video player"
                                            frameBorder="0"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        ></iframe>
                                    );
                                })()}
                            </div>
                        )}
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: (currentQ.type === 'image' || currentQ.type === 'video') && currentQ.options.length > 2 && currentQ.options.some(o => o.length > 30) ? '1fr' : '1fr 1fr',
                        gap: '1.2vh',
                        width: '100%',
                        maxWidth: '1000px',
                        marginBottom: '3vh',
                        flexShrink: 0
                    }}>
                        {currentQ.options.map((opt, idx) => {
                            const isHidden = hiddenOptions.includes(idx);
                            if (isHidden) return <div key={idx} style={{ height: '70px', opacity: 0 }} />;

                            let bgColor = 'rgba(255, 255, 255, 0.05)';
                            let borderColor = 'rgba(255, 255, 255, 0.1)';
                            let iconColor = '#64748b';
                            let iconBg = 'rgba(255, 255, 255, 0.05)';
                            let showCheck = false;
                            let showX = false;

                            if (feedback) {
                                if (idx === currentQ.correctAnswer) {
                                    bgColor = 'rgba(16, 185, 129, 0.15)';
                                    borderColor = '#10b981';
                                    iconColor = 'white';
                                    iconBg = '#10b981';
                                    showCheck = true;
                                } else if (idx === selectedOption && feedback === 'incorrect') {
                                    bgColor = 'rgba(239, 68, 68, 0.15)';
                                    borderColor = '#ef4444';
                                    iconColor = 'white';
                                    iconBg = '#ef4444';
                                    showX = true;
                                } else {
                                    bgColor = 'rgba(255, 255, 255, 0.02)';
                                    borderColor = 'rgba(255, 255, 255, 0.05)';
                                    iconBg = 'transparent';
                                }
                            }

                            return (
                                <button
                                    key={idx}
                                    onClick={() => handleAnswer(idx)}
                                    disabled={feedback !== null}
                                    style={{
                                        width: '100%',
                                        padding: '1.2vh 20px',
                                        borderRadius: '12px',
                                        background: bgColor,
                                        border: `1px solid ${borderColor}`,
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '15px',
                                        cursor: feedback ? 'default' : 'pointer',
                                        transition: '0.3s',
                                        textAlign: 'left',
                                        fontSize: 'clamp(0.8rem, 2vh, 1rem)',
                                        boxShadow: feedback && idx === currentQ.correctAnswer ? '0 0 20px rgba(16, 185, 129, 0.2)' : 'none'
                                    }}
                                >
                                    <div style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '10px',
                                        background: iconBg,
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.8rem',
                                        fontWeight: 900,
                                        color: iconColor
                                    }}>
                                        {showCheck ? <Check size={20} /> : (showX ? <X size={20} /> : String.fromCharCode(65 + idx))}
                                    </div>
                                    <span style={{ fontSize: '1.2rem', fontWeight: 600 }}>{opt}</span>
                                    {showCheck && <Check size={24} style={{ marginLeft: 'auto', color: '#10b981' }} />}
                                    {showX && <X size={24} style={{ marginLeft: 'auto', color: '#ef4444' }} />}
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
                                    width: 'clamp(44px, 7.5vh, 60px)',
                                    height: 'clamp(44px, 7.5vh, 60px)',
                                    borderRadius: '50%',
                                    background: 'rgba(59, 130, 246, 0.2)',
                                    border: '2px solid rgba(59, 130, 246, 0.4)',
                                    color: '#60a5fa',
                                    fontSize: '0.8rem',
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
                                    width: 'clamp(44px, 7.5vh, 60px)',
                                    height: 'clamp(44px, 7.5vh, 60px)',
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
                                <SkipForward size={22} />
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
            <div style={{ minHeight: '100vh', width: '100vw', background: '#050510', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <div style={{ fontSize: '5rem', marginBottom: '10px' }}>🏆</div>
                    <h2 style={{ fontSize: '2.5rem', fontWeight: 900 }}>¡Juego Terminado!</h2>
                    <p style={{ fontSize: '1.2rem', color: '#94a3b8', marginTop: '10px' }}>Este es tu resumen de desempeño</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', width: '100%', maxWidth: '900px', marginBottom: '50px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '30px', textAlign: 'center' }}>
                        <Clock size={32} style={{ color: '#3b82f6', marginBottom: '15px' }} />
                        <div style={{ fontSize: '2rem', fontWeight: 900 }}>{formatTime(timer)}</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '5px' }}>Tiempo Total</div>
                    </div>
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '24px', padding: '30px', textAlign: 'center' }}>
                        <Check size={32} style={{ color: '#10b981', marginBottom: '15px' }} />
                        <div style={{ fontSize: '2rem', fontWeight: 900, color: '#10b981' }}>{correctCount}</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#065f46', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '5px' }}>Correctas</div>
                    </div>
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '24px', padding: '30px', textAlign: 'center' }}>
                        <X size={32} style={{ color: '#ef4444', marginBottom: '15px' }} />
                        <div style={{ fontSize: '2rem', fontWeight: 900, color: '#ef4444' }}>{incorrectCount}</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '5px' }}>Incorrectas</div>
                    </div>
                    <div style={{ background: 'rgba(124, 58, 237, 0.1)', border: '1px solid rgba(124, 58, 237, 0.2)', borderRadius: '24px', padding: '30px', textAlign: 'center' }}>
                        <SkipForward size={32} style={{ color: '#a78bfa', marginBottom: '15px' }} />
                        <div style={{ fontSize: '2rem', fontWeight: 900, color: '#a78bfa' }}>{skippedCount}</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#5b21b6', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '5px' }}>Saltadas</div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '20px' }}>
                    <button
                        onClick={restartApp}
                        style={{
                            padding: '18px 40px',
                            borderRadius: '16px',
                            background: '#3b82f6',
                            color: 'white',
                            fontWeight: 800,
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            boxShadow: '0 10px 20px rgba(59, 130, 246, 0.3)'
                        }}
                    >
                        <RotateCcw size={20} /> Intentar de Nuevo
                    </button>
                    <button
                        onClick={onExit}
                        style={{
                            padding: '18px 40px',
                            borderRadius: '16px',
                            background: 'rgba(255,255,255,0.05)',
                            color: 'white',
                            fontWeight: 800,
                            border: '1px solid rgba(255,255,255,0.1)',
                            cursor: 'pointer',
                            fontSize: '1rem'
                        }}
                    >
                        {isAdmin ? 'Volver a Galería' : 'Home'}
                    </button>
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
