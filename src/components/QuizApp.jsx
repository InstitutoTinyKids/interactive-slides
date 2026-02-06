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
    const [view, setView] = useState(isAdmin ? 'admin' : 'home'); // home, admin, playing, results
    const [questions, setQuestions] = useState(INITIAL_QUESTIONS);
    const [selectedQIdx, setSelectedQIdx] = useState(0);
    const [projectLocal, setProjectLocal] = useState(project);

    // Estados del Admin
    const [adminPass, setAdminPass] = useState('');
    const [isAdminAuth, setIsAdminAuth] = useState(false);
    const [editingQ, setEditingQ] = useState(null); // Pregunta siendo editada/creada

    // Estados del Juego
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [answersLog, setAnswersLog] = useState([]); // { qId, selected, correct, timeSpent }
    const [timer, setTimer] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
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
        setIsRunning(false);
        setView('home');
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

    if (view === 'home') {
        return (
            <div className="min-h-screen bg-[#050510] text-white flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                    <div className="absolute top-[10%] left-[10%] w-[30vw] h-[30vw] bg-blue-600/10 blur-[120px] rounded-full"></div>
                    <div className="absolute bottom-[10%] right-[10%] w-[30vw] h-[30vw] bg-purple-600/10 blur-[120px] rounded-full"></div>
                </div>

                <div className="max-w-md w-full glass p-8 relative z-10 animate-up">
                    <button onClick={onExit} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
                        <X size={24} />
                    </button>

                    <div className="text-center mb-8">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/20">
                            <HelpCircle size={40} className="text-white" />
                        </div>
                        <h1 className="text-4xl font-black mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Grammar Quiz</h1>
                        <p className="text-slate-400">Demuestra tus conocimientos en inglés.</p>
                    </div>

                    <button onClick={startQuiz} className="btn-premium w-full py-5 text-lg group">
                        <Play size={24} className="group-hover:scale-110 transition-transform" />
                        INICIAR ACTIVIDAD
                    </button>
                </div>
            </div>
        );
    }

    if (view === 'admin') {
        const currentEditingQ = questions[selectedQIdx] || null;

        return (
            <div style={{ height: '100vh', width: '100vw', display: 'flex', background: '#050510', overflow: 'hidden' }}>
                {/* Panel Izquierdo: Lista de Preguntas */}
                <aside style={{
                    width: '300px',
                    minWidth: '300px',
                    borderRight: '1px solid rgba(255,255,255,0.05)',
                    background: '#0a0a1a',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}>
                    <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#475569' }}>Preguntas ({questions.length})</span>
                        <button
                            onClick={() => {
                                const newQ = { id: Date.now(), question: 'Nueva Pregunta...', options: ['', '', '', ''], correctAnswer: 0 };
                                setQuestions([...questions, newQ]);
                                setSelectedQIdx(questions.length);
                            }}
                            style={{ background: 'rgba(124, 58, 237, 0.1)', border: 'none', color: '#a78bfa', padding: '6px', borderRadius: '8px', cursor: 'pointer' }}
                        >
                            <Plus size={16} />
                        </button>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '15px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {questions.map((q, idx) => (
                            <div
                                key={q.id}
                                onClick={() => setSelectedQIdx(idx)}
                                style={{
                                    padding: '12px 15px',
                                    borderRadius: '12px',
                                    border: `1px solid ${selectedQIdx === idx ? '#3b82f6' : 'rgba(255,255,255,0.05)'}`,
                                    background: selectedQIdx === idx ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.02)',
                                    cursor: 'pointer',
                                    transition: '0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px'
                                }}
                            >
                                <span style={{ fontSize: '0.6rem', fontWeight: 900, color: selectedQIdx === idx ? '#3b82f6' : '#475569' }}>#{idx + 1}</span>
                                <p style={{ flex: 1, fontSize: '0.8rem', color: selectedQIdx === idx ? 'white' : '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.question}</p>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm('¿Eliminar esta pregunta?')) {
                                            const updated = questions.filter((_, i) => i !== idx);
                                            setQuestions(updated);
                                            if (selectedQIdx >= updated.length) setSelectedQIdx(Math.max(0, updated.length - 1));
                                        }
                                    }}
                                    style={{ background: 'none', border: 'none', color: '#ef4444', padding: '4px', cursor: 'pointer', opacity: 0.5 }}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                </aside>

                {/* Área Central: Editor */}
                <main style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'radial-gradient(circle at top right, #111, #050510)' }}>
                    <header style={{ height: '70px', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(10,10,20,0.8)', backdropFilter: 'blur(15px)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <button onClick={onExit} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '10px', borderRadius: '12px', color: '#94a3b8', cursor: 'pointer' }}><LayoutGrid size={22} /></button>
                            <div>
                                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white', lineHeight: 1.2 }}>{projectLocal?.name || 'Cargando...'}</h2>
                                <span style={{ fontSize: '0.65rem', color: '#3b82f6', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Editor de Quiz</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <button onClick={onViewResults} className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 15px', fontSize: '0.8rem' }}><Eye size={16} /> Resultados</button>
                            <button onClick={onToggleActive} className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 15px', fontSize: '0.8rem', color: isActive ? '#ef4444' : '#10b981', borderColor: isActive ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)' }}>
                                {isActive ? <Pause size={16} /> : <Play size={16} />} {isActive ? 'Suspender' : 'Activar'}
                            </button>
                            <button onClick={() => handleSaveQuiz(questions)} className="btn-premium" style={{ padding: '10px 15px', fontSize: '0.8rem' }} disabled={loading}><Save size={16} /> Guardar</button>
                        </div>
                    </header>

                    <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
                        <div className="max-w-3xl mx-auto">
                            <section className="glass p-8 animate-up">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-xl font-bold text-blue-400">
                                        Editando Pregunta #{selectedQIdx + 1}
                                    </h3>
                                    <span style={{ fontSize: '0.6rem', color: '#475569', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>ID: {currentEditingQ?.id}</span>
                                </div>
                                <AdminForm
                                    initialData={currentEditingQ}
                                    onSave={(q) => {
                                        const newQuestions = questions.map(item => item.id === q.id ? q : item);
                                        setQuestions(newQuestions);
                                        alert('Pregunta actualizada en memoria. No olvides Guardar para subir a la nube.');
                                    }}
                                />
                            </section>
                        </div>
                    </div>
                </main>

                {/* Panel Derecho: Ajustes */}
                <aside style={{
                    width: '320px',
                    minWidth: '320px',
                    background: 'rgba(10, 10, 20, 0.95)',
                    borderLeft: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}>
                    <div style={{ padding: '30px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '30px' }}>
                        <div>
                            <h3 style={{ color: 'white', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '2px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px' }}><Settings size={18} /> Ajustes del Quiz</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={{ fontSize: '0.65rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Clave de Acceso</label>
                                    <div style={{ position: 'relative' }}>
                                        <Key size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
                                        <input
                                            className="premium-input"
                                            value={localAccessCode}
                                            onChange={async (e) => {
                                                const val = e.target.value;
                                                setLocalAccessCode(val);
                                                // Sync to Supabase directly if you want, or handle via general save
                                                await supabase.from('projects').update({ access_code: val }).eq('id', project.id);
                                            }}
                                            style={{ paddingLeft: '40px', width: '100%' }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: 'auto', padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '15px', textAlign: 'center' }}>¿Terminaste de editar este cuestionario?</p>
                            <button
                                onClick={onExit}
                                className="btn-outline"
                                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                            >
                                <LayoutGrid size={18} /> Volver a Galería
                            </button>
                        </div>
                    </div>
                </aside>
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

function AdminForm({ initialData, onSave }) {
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
        <form onSubmit={handleSubmit} className="space-y-8">
            <div className="flex flex-col gap-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Cuerpo de la Pregunta</label>
                <textarea
                    className="premium-input w-full min-h-[140px] text-xl font-bold leading-relaxed"
                    placeholder="¿Cuál es la pregunta?"
                    value={formData.question}
                    onChange={e => setFormData({ ...formData, question: e.target.value })}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {formData.options.map((opt, idx) => (
                    <div
                        key={idx}
                        className={`group relative p-6 rounded-2xl border-2 transition-all cursor-pointer ${formData.correctAnswer === idx ? 'border-blue-500 bg-blue-500/10' : 'border-white/5 bg-white/2 hover:border-white/10'}`}
                        onClick={() => setFormData({ ...formData, correctAnswer: idx })}
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${formData.correctAnswer === idx ? 'border-blue-500 bg-blue-500' : 'border-white/20'}`}>
                                {formData.correctAnswer === idx && <div className="w-2 h-2 bg-white rounded-full" />}
                            </div>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Opción {String.fromCharCode(65 + idx)}</span>
                            {formData.correctAnswer === idx && <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest ml-auto">Correcta</span>}
                        </div>
                        <input
                            type="text"
                            placeholder="Texto de la respuesta..."
                            className="bg-transparent border-none p-0 w-full text-white font-black text-lg focus:ring-0 placeholder:text-slate-700"
                            value={opt}
                            onChange={(e) => {
                                e.stopPropagation();
                                handleChangeOption(idx, e.target.value);
                            }}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                ))}
            </div>

            <button type="submit" className="btn-premium w-full py-5 text-lg shadow-blue-500/20">
                <Save size={24} /> Guardar Pregunta
            </button>
        </form>
    );
}
