import React, { useState, useEffect, useRef } from 'react';
import { Settings, Play, Clock, Check, X, HelpCircle, SkipForward, RotateCcw, Edit2, Trash2, Plus, Save, ArrowRight, Eye, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

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

export default function QuizApp({ onExit }) {
    // --- ESTADOS ---
    const [view, setView] = useState('home'); // home, admin, playing, results
    const [questions, setQuestions] = useState(INITIAL_QUESTIONS);

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

    // Estado nuevo para la revisión
    const [showReview, setShowReview] = useState(false);

    const timerRef = useRef(null);

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

                    <div className="mt-12 pt-8 border-t border-white/5">
                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Administración</p>
                        <div className="flex gap-2">
                            <input
                                type="password"
                                placeholder="Clave (123)"
                                className="premium-input flex-1 !py-3"
                                value={adminPass}
                                onChange={(e) => setAdminPass(e.target.value)}
                            />
                            <button onClick={goToAdmin} className="btn-outline !p-3 bg-white/5">
                                <Settings size={20} className="text-slate-400" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (view === 'admin') {
        const editingIndex = editingQ ? questions.findIndex(q => q.id === editingQ.id) : -1;
        return (
            <div className="min-h-screen bg-[#050510] text-white p-4 md:p-8 overflow-y-auto">
                <div className="max-w-4xl mx-auto space-y-8">
                    <header className="flex justify-between items-center bg-white/5 p-6 rounded-3xl border border-white/10">
                        <div>
                            <h2 className="text-2xl font-black flex items-center gap-3">
                                <div className="p-2 bg-blue-500/20 rounded-xl text-blue-400"><Edit2 size={24} /></div>
                                Panel de Administración
                            </h2>
                            <p className="text-slate-400 text-sm mt-1">Gestiona las preguntas del cuestionario</p>
                        </div>
                        <button onClick={restartApp} className="btn-outline flex items-center gap-2">
                            <RotateCcw size={18} /> Salir
                        </button>
                    </header>

                    <section className="glass p-8 animate-up">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-purple-400">
                                {editingQ ? `Editando Pregunta #${editingIndex + 1}` : 'Crear Nueva Pregunta'}
                            </h3>
                            {editingQ && (
                                <button onClick={() => setEditingQ(null)} className="text-xs font-bold text-slate-500 uppercase tracking-widest hover:text-white transition-colors">
                                    Cancelar Edición
                                </button>
                            )}
                        </div>
                        <AdminForm
                            initialData={editingQ}
                            onSave={(q) => {
                                if (editingQ) {
                                    setQuestions(questions.map(item => item.id === q.id ? q : item));
                                } else {
                                    setQuestions([...questions, { ...q, id: Date.now() }]);
                                }
                                setEditingQ(null);
                            }}
                            onCancel={() => setEditingQ(null)}
                        />
                    </section>

                    <div className="grid gap-4">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">Preguntas Actuales ({questions.length})</h3>
                        </div>
                        {questions.map((q, idx) => {
                            const isActive = editingQ?.id === q.id;
                            return (
                                <div
                                    key={q.id}
                                    className={`bg-white/5 p-5 rounded-2xl flex justify-between items-center border transition-all ${isActive ? 'border-blue-500 bg-blue-500/5' : 'border-white/5 hover:bg-white/10'}`}
                                >
                                    <div className="flex-1 min-w-0 pr-4">
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="text-xs font-black text-blue-500">#{idx + 1}</span>
                                            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-tighter">ID: {q.id}</span>
                                        </div>
                                        <p className="text-slate-200 truncate font-medium">{q.question}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => setEditingQ(q)} className="p-3 bg-white/5 rounded-xl hover:bg-blue-500/20 text-blue-400 transition-colors">
                                            <Edit2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (window.confirm('¿Eliminar esta pregunta?')) {
                                                    setQuestions(questions.filter(item => item.id !== q.id));
                                                    if (editingQ?.id === q.id) setEditingQ(null);
                                                }
                                            }}
                                            className="p-3 bg-white/5 rounded-xl hover:bg-red-500/20 text-red-400 transition-colors"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
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
        if (!formData.question || formData.options.some(o => !o)) return alert("Por favor completa todos los campos para continuar.");
        onSave(formData);
        if (!initialData) setFormData({ question: '', options: ['', '', '', ''], correctAnswer: 0 });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Cuerpo de la Pregunta</label>
                <textarea
                    className="premium-input w-full min-h-[100px] text-lg"
                    placeholder="Escribe el enunciado de la pregunta aquí..."
                    rows="3"
                    value={formData.question}
                    onChange={e => setFormData({ ...formData, question: e.target.value })}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {formData.options.map((opt, idx) => (
                    <div key={idx} className={`relative p-5 rounded-2xl border-2 transition-all ${formData.correctAnswer === idx ? 'border-blue-500 bg-blue-500/5' : 'border-white/5 bg-white/2'}`}>
                        <div className="flex items-center gap-4 mb-3">
                            <label className="flex items-center gap-2 cursor-pointer flex-1">
                                <input
                                    type="radio"
                                    name="correct"
                                    checked={formData.correctAnswer === idx}
                                    onChange={() => setFormData({ ...formData, correctAnswer: idx })}
                                    className="w-5 h-5 accent-blue-500"
                                />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Opción {String.fromCharCode(65 + idx)}</span>
                            </label>
                            {formData.correctAnswer === idx && <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest bg-blue-500/10 px-2 py-1 rounded-md">Correcta</span>}
                        </div>
                        <input
                            type="text"
                            placeholder="Texto de la respuesta..."
                            className="bg-transparent border-none p-0 w-full text-white font-bold focus:ring-0 placeholder:text-slate-700"
                            value={opt}
                            onChange={e => handleChangeOption(idx, e.target.value)}
                        />
                    </div>
                ))}
            </div>

            <div className="flex gap-4 pt-4">
                <button type="submit" className="btn-premium flex-1 py-4">
                    <Save size={20} /> Guardar Pregunta
                </button>
                {onCancel && (
                    <button type="button" onClick={onCancel} className="btn-outline px-10">
                        Limpiar
                    </button>
                )}
            </div>
        </form>
    );
}
