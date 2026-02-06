import { supabase } from '../lib/supabase';
import {
    Settings, Play, Clock, Check, X, HelpCircle, SkipForward,
    RotateCcw, Edit2, Trash2, Plus, Save, ArrowRight, Eye,
    AlertTriangle, ChevronDown, ChevronUp, LayoutGrid, Pause, Key
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

export default function QuizApp({ onExit, isAdmin = false, project, isActive, onToggleActive, onViewResults }) {
    // --- ESTADOS ---
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

    // Estados de Ayudas
    const [hiddenOptions, setHiddenOptions] = useState([]); // Índices ocultos por 50/50

    const [showReview, setShowReview] = useState(false);
    const [loading, setLoading] = useState(false);
    const [localAccessCode, setLocalAccessCode] = useState(project?.access_code || '123');

    const timerRef = useRef(null);

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

            if (data && data.questions) {
                setQuestions(data.questions);
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

        setIsRunning(false);
        setSelectedOption(optionIndex);
        setFeedback(isCorrect ? 'correct' : 'incorrect');

        const logEntry = {
            question: currentQ,
            selected: optionIndex,
            isCorrect: isCorrect,
            isSkipped: optionIndex === -1
        };

        setTimeout(() => {
            setAnswersLog(prev => [...prev, logEntry]);

            if (currentQIndex < questions.length - 1) {
                setCurrentQIndex(prev => prev + 1);
                setFeedback(null);
                setSelectedOption(null);
                setHiddenOptions([]);
                setIsRunning(true);
            } else {
                setView('results');
            }
        }, 1500);
    };

    const handleFiftyFifty = () => {
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
                        <div style={{ padding: '12px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '15px', color: '#3b82f6' }}>
                            <LayoutGrid size={24} />
                        </div>
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
                            {questions.map((q, idx) => (
                                <div
                                    key={q.id}
                                    onClick={() => { setSelectedQIdx(idx); setEditingQ(q); }}
                                    style={{
                                        padding: '18px',
                                        borderRadius: '16px',
                                        border: `1px solid ${selectedQIdx === idx && !editingQ?.isNew ? '#3b82f6' : 'rgba(255,255,255,0.05)'}`,
                                        background: selectedQIdx === idx && !editingQ?.isNew ? 'rgba(59, 130, 246, 0.12)' : 'rgba(255,255,255,0.02)',
                                        cursor: 'pointer',
                                        transition: '0.3s',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '10px',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#3b82f6', background: 'rgba(59, 130, 246, 0.1)', padding: '2px 8px', borderRadius: '6px' }}>#{idx + 1}</span>
                                        <div style={{ flex: 1 }} />
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><Edit2 size={14} /></button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (window.confirm('¿ESTÁS SEGURO? Esta acción no se puede deshacer.')) {
                                                        const updated = questions.filter((_, i) => i !== idx);
                                                        setQuestions(updated);
                                                        if (selectedQIdx >= updated.length) setSelectedQIdx(Math.max(0, updated.length - 1));
                                                    }
                                                }}
                                                style={{ background: 'none', border: 'none', color: '#ef4444', opacity: 0.6, cursor: 'pointer' }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    <p style={{ fontSize: '0.85rem', color: selectedQIdx === idx && !editingQ?.isNew ? 'white' : '#94a3b8', lineHeight: 1.5, fontWeight: selectedQIdx === idx && !editingQ?.isNew ? 700 : 400 }}>{q.question || <span style={{ fontStyle: 'italic', opacity: 0.5 }}>Sin texto...</span>}</p>
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
                                        <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Clave de Acceso al Quiz</label>
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

                            <div style={{ marginTop: 'auto', padding: '25px', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                                <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '20px' }}>¿Deseas volver a la galería de proyectos?</p>
                                <button
                                    onClick={onExit}
                                    style={{
                                        width: '100%',
                                        padding: '15px',
                                        borderRadius: '16px',
                                        background: 'rgba(255,255,255,0.05)',
                                        color: 'white',
                                        fontWeight: 800,
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '12px',
                                        transition: '0.3s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                >
                                    <ArrowRight size={20} style={{ transform: 'rotate(180deg)' }} /> Salir al Dashboard
                                </button>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        );
    }

    if (view === 'playing') {
        const currentQ = questions[currentQIndex];
        return (
            <div className="min-h-screen bg-[#050510] text-white flex flex-col p-4 md:p-8 font-sans">
                {/* HUD */}
                <header className="w-full max-w-4xl mx-auto flex justify-between items-center py-6 animate-fade-in relative z-10">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Progreso</span>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-black text-blue-400">{currentQIndex + 1}</span>
                            <span className="text-slate-600 text-lg font-bold">/ {questions.length}</span>
                        </div>
                    </div>

                    <div className={`flex flex-col items-center bg-white/5 px-8 py-3 rounded-2xl border border-white/10 backdrop-blur-md ${feedback ? 'ring-2 ring-yellow-500/50' : ''}`}>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Cronómetro</span>
                        <div className="flex items-center gap-3 text-2xl font-black italic tracking-wider">
                            <Clock size={20} className="text-blue-500" />
                            {formatTime(timer)}
                        </div>
                    </div>

                    <button onClick={() => { if (confirm('¿Salir del Quiz?')) restartApp(); }} className="btn-outline !p-3">
                        <X size={20} className="text-slate-500" />
                    </button>
                </header>

                {/* Progress Bar */}
                <div className="w-full max-w-4xl mx-auto h-1.5 bg-white/5 rounded-full mt-2 mb-12 overflow-hidden border border-white/5">
                    <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                        style={{ width: `${((currentQIndex + 1) / questions.length) * 100}%` }}
                    />
                </div>

                {/* Question Section */}
                <main className="w-full max-w-3xl mx-auto flex-1 flex flex-col justify-center animate-up relative z-10">
                    <div className="text-center mb-16">
                        <h2 className="text-2xl md:text-4xl font-extrabold leading-[1.3] text-white text-balance drop-shadow-sm">
                            {currentQ.question}
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {currentQ.options.map((opt, idx) => {
                            if (hiddenOptions.includes(idx)) return <div key={idx} className="h-[74px] border border-white/5 rounded-2xl opacity-10"></div>;

                            let styles = "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-slate-200";
                            let icon = <span className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-sm font-black text-slate-500 group-hover:text-white transition-colors uppercase">{String.fromCharCode(65 + idx)}</span>;

                            if (feedback) {
                                if (idx === currentQ.correctAnswer) {
                                    styles = "bg-green-500/20 border-green-500 text-white shadow-[0_0_30px_rgba(34,197,94,0.15)]";
                                    icon = <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center text-white"><Check size={20} /></div>;
                                } else if (idx === selectedOption) {
                                    styles = "bg-red-500/20 border-red-500 text-white shadow-[0_0_30px_rgba(239,68,68,0.15)]";
                                    icon = <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center text-white"><X size={20} /></div>;
                                } else {
                                    styles = "opacity-20 grayscale scale-95 border-white/5";
                                }
                            }

                            return (
                                <button
                                    key={idx}
                                    onClick={() => handleAnswer(idx)}
                                    disabled={feedback !== null}
                                    className={`group flex items-center gap-6 p-4 rounded-2xl border-2 transition-all duration-300 text-left relative overflow-hidden ${styles}`}
                                >
                                    {icon}
                                    <span className="text-lg font-semibold tracking-tight leading-tight">{opt}</span>
                                </button>
                            );
                        })}
                    </div>
                </main>

                {/* Footer Controls */}
                <footer className="w-full max-w-4xl mx-auto py-8">
                    <div className="flex justify-center items-center gap-10">
                        <button
                            onClick={handleFiftyFifty}
                            disabled={feedback !== null || hiddenOptions.length > 0}
                            className="flex flex-col items-center group disabled:opacity-30 transition-all"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-2 group-hover:border-blue-500/50 group-hover:bg-blue-500/10 transition-all text-blue-400 shadow-xl group-active:scale-90">
                                <span className="text-lg font-black tracking-tighter">50:50</span>
                            </div>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">+10s Penalti</span>
                        </button>

                        <button
                            onClick={handlePass}
                            disabled={feedback !== null}
                            className="flex flex-col items-center group disabled:opacity-30 transition-all"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-2 group-hover:border-purple-500/50 group-hover:bg-purple-500/10 transition-all text-purple-400 shadow-xl group-active:scale-90">
                                <SkipForward size={24} />
                            </div>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Saltar (+30s)</span>
                        </button>
                    </div>
                </footer>
            </div>
        );
    }

    if (view === 'results') {
        const correctCount = answersLog.filter(a => a.isCorrect).length;
        const totalCount = questions.length;
        const pScore = Math.floor((correctCount / totalCount) * 100);

        return (
            <div className="min-h-screen bg-[#050510] text-white p-6 md:p-12 overflow-y-auto font-sans relative">
                <div className="absolute top-0 left-0 w-full h-[400px] bg-gradient-to-b from-blue-600/10 to-transparent pointer-events-none"></div>

                <div className="max-w-3xl mx-auto relative z-10">
                    <header className="text-center mb-16 animate-up">
                        <h2 className="text-sm font-black text-blue-400 uppercase tracking-[0.4em] mb-4">Resultado Final</h2>
                        <div className="inline-flex items-end gap-2 mb-2">
                            <div className="text-8xl font-black italic tracking-tighter leading-none bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">{pScore}</div>
                            <div className="text-4xl font-black text-slate-600 italic mb-2">%</div>
                        </div>
                        <p className="text-slate-400 font-medium italic">¡Has completado el Grammar Quiz!</p>
                    </header>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 animate-up delay-100">
                        <div className="bg-white/5 p-6 rounded-3xl border border-white/5 text-center shadow-xl">
                            <Clock size={20} className="mx-auto mb-3 text-blue-400 opacity-50" />
                            <div className="text-2xl font-black italic">{formatTime(timer)}</div>
                            <div className="text-[10px] font-black text-slate-500 uppercase mt-1">Tiempo</div>
                        </div>
                        <div className="bg-white/5 p-6 rounded-3xl border border-white/5 text-center shadow-xl">
                            <Check size={20} className="mx-auto mb-3 text-green-400 opacity-50" />
                            <div className="text-2xl font-black italic">{correctCount}</div>
                            <div className="text-[10px] font-black text-slate-500 uppercase mt-1">Correctas</div>
                        </div>
                        <div className="bg-white/5 p-6 rounded-3xl border border-white/5 text-center shadow-xl">
                            <X size={20} className="mx-auto mb-3 text-red-400 opacity-50" />
                            <div className="text-2xl font-black italic text-red-400/80">{answersLog.filter(a => !a.isCorrect && !a.isSkipped).length}</div>
                            <div className="text-[10px] font-black text-slate-500 uppercase mt-1">Errores</div>
                        </div>
                        <div className="bg-white/5 p-6 rounded-3xl border border-white/5 text-center shadow-xl">
                            <SkipForward size={20} className="mx-auto mb-3 text-yellow-400 opacity-50" />
                            <div className="text-2xl font-black italic text-yellow-400/80">{answersLog.filter(a => a.isSkipped).length}</div>
                            <div className="text-[10px] font-black text-slate-500 uppercase mt-1">Saltadas</div>
                        </div>
                    </div>

                    <div className="glass p-8 mb-12 animate-up delay-200">
                        <button
                            className="w-full flex items-center justify-between text-left group"
                            onClick={() => setShowReview(!showReview)}
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-blue-400 group-hover:bg-blue-400/10 transition-colors"><Eye size={24} /></div>
                                <div>
                                    <h3 className="text-xl font-black">Revisión de Errores</h3>
                                    <p className="text-sm text-slate-500">Analiza tus respuestas una a una</p>
                                </div>
                            </div>
                            {showReview ? <ChevronUp className="text-slate-600" /> : <ChevronDown className="text-slate-600" />}
                        </button>

                        {showReview && (
                            <div className="space-y-6 mt-10 border-t border-white/5 pt-8">
                                {answersLog.map((log, idx) => (
                                    <div key={idx} className="bg-white/2 p-6 rounded-2xl border border-white/5">
                                        <div className="flex items-start gap-4 mb-4">
                                            <span className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-xs font-black text-slate-500 flex-shrink-0">{idx + 1}</span>
                                            <p className="font-bold text-lg leading-snug">{log.question.question}</p>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-12">
                                            <div className={`p-4 rounded-xl border text-sm flex items-center justify-between ${log.isSkipped ? 'border-yellow-500/30 bg-yellow-500/5' : (log.isCorrect ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5')}`}>
                                                <span>{log.isSkipped ? '⚠️ Pregunta Saltada' : log.question.options[log.selected]}</span>
                                                {log.isCorrect ? <Check size={16} className="text-green-500" /> : <X size={16} className="text-red-500" />}
                                            </div>
                                            {!log.isCorrect && (
                                                <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/10 text-sm flex items-center justify-between">
                                                    <span className="font-bold text-blue-400">{log.question.options[log.question.correctAnswer]}</span>
                                                    <Check size={16} className="text-blue-500" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex gap-4 animate-up delay-300">
                        <button
                            onClick={restartApp}
                            className="btn-premium flex-1 py-5 text-lg shadow-blue-500/40"
                        >
                            <RotateCcw /> REINICIAR CUESTIONARIO
                        </button>
                        <button
                            onClick={onExit}
                            className="btn-outline !py-5 px-8"
                        >
                            Galería
                        </button>
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
        options: ['', '', '', ''],
        correctAnswer: 0
    });

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        }
    }, [initialData]);

    const handleChangeOption = (idx, val) => {
        const newOpts = [...formData.options];
        newOpts[idx] = val;
        setFormData({ ...formData, options: newOpts });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>Pregunta</label>
                <textarea
                    style={{
                        width: '100%',
                        minHeight: '120px',
                        background: 'rgba(5, 5, 15, 0.4)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        padding: '20px',
                        color: 'white',
                        fontSize: '1rem',
                        lineHeight: '1.6',
                        outline: 'none',
                        resize: 'vertical'
                    }}
                    placeholder="Escribe el enunciado de la pregunta aquí..."
                    value={formData.question}
                    onChange={e => setFormData({ ...formData, question: e.target.value })}
                    required
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {formData.options.map((opt, idx) => (
                    <div
                        key={idx}
                        style={{
                            background: 'rgba(5, 5, 15, 0.4)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '12px',
                            padding: '12px 20px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '15px',
                            transition: '0.3s',
                            borderLeft: formData.correctAnswer === idx ? '4px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)'
                        }}
                    >
                        <input
                            type="radio"
                            name="correct-answer"
                            checked={formData.correctAnswer === idx}
                            onChange={() => setFormData({ ...formData, correctAnswer: idx })}
                            style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#3b82f6' }}
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
                                fontSize: '0.95rem',
                                outline: 'none'
                            }}
                            required
                        />
                    </div>
                ))}
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
