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
        setShowReview(false); // Resetear revisión al iniciar
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
        if (feedback !== null) return; // Evitar doble click

        const currentQ = questions[currentQIndex];
        const isCorrect = optionIndex === currentQ.correctAnswer;

        setIsRunning(false); // Pausar timer durante feedback
        setSelectedOption(optionIndex);
        setFeedback(isCorrect ? 'correct' : 'incorrect');

        // Guardar respuesta
        const logEntry = {
            question: currentQ,
            selected: optionIndex,
            isCorrect: isCorrect,
            isSkipped: optionIndex === -1
        };

        // Retraso para mostrar feedback visual
        setTimeout(() => {
            setAnswersLog(prev => [...prev, logEntry]);

            if (currentQIndex < questions.length - 1) {
                // Siguiente pregunta
                setCurrentQIndex(prev => prev + 1);
                setFeedback(null);
                setSelectedOption(null);
                setHiddenOptions([]);
                setIsRunning(true);
            } else {
                // Fin del juego
                setView('results');
            }
        }, 1500);
    };

    const handleFiftyFifty = () => {
        // Penalización: +10 segundos
        setTimer(prev => prev + 10);

        const currentQ = questions[currentQIndex];
        const wrongIndices = currentQ.options
            .map((_, idx) => idx)
            .filter(idx => idx !== currentQ.correctAnswer);

        // Mezclar y tomar 2 para ocultar
        const shuffledWrong = wrongIndices.sort(() => 0.5 - Math.random());
        setHiddenOptions(shuffledWrong.slice(0, 2));
    };

    const handlePass = () => {
        // Penalización: +30 segundos y cuenta como incorrecta/saltada
        setTimer(prev => prev + 30);
        handleAnswer(-1); // -1 indica saltada
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    // --- RENDERIZADO ---

    if (view === 'home') {
        return (
            <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 font-sans" style={{ zIndex: 1000 }}>
                <div className="max-w-md w-full bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-700 relative">
                    <button
                        onClick={onExit}
                        className="absolute top-4 right-4 text-gray-400 hover:text-white"
                    >
                        <X size={24} />
                    </button>
                    <h1 className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Grammar Quiz</h1>
                    <p className="text-gray-400 text-center mb-8">Demuestra tus conocimientos en inglés.</p>

                    <button
                        onClick={startQuiz}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-all transform hover:scale-105 mb-6"
                    >
                        <Play size={24} />
                        INICIAR ACTIVIDAD
                    </button>

                    <div className="border-t border-gray-700 pt-6">
                        <p className="text-sm text-gray-500 mb-2">Administración</p>
                        <div className="flex gap-2">
                            <input
                                type="password"
                                placeholder="Clave (123)"
                                className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 flex-1 text-white focus:outline-none focus:border-blue-500"
                                value={adminPass}
                                onChange={(e) => setAdminPass(e.target.value)}
                            />
                            <button
                                onClick={goToAdmin}
                                className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-gray-300"
                            >
                                <Settings size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (view === 'admin') {
        // Calcular el índice de la pregunta en edición para mostrarlo
        const editingIndex = editingQ ? questions.findIndex(q => q.id === editingQ.id) : -1;

        return (
            <div className="min-h-screen bg-gray-900 text-white p-6 overflow-y-auto">
                <div className="max-w-4xl mx-auto">
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <Edit2 className="text-blue-400" /> Panel de Administración
                        </h2>
                        <button onClick={restartApp} className="text-gray-400 hover:text-white">Atrás</button>
                    </div>

                    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-6 transition-all">
                        <h3 className="text-lg font-semibold mb-4 text-purple-400">
                            {editingQ ? `Editar Pregunta #${editingIndex + 1}` : 'Crear Nueva Pregunta'}
                        </h3>
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
                    </div>

                    <div className="space-y-4">
                        {questions.map((q, idx) => {
                            const isActive = editingQ?.id === q.id;
                            return (
                                <div
                                    key={q.id}
                                    onClick={() => setEditingQ(q)}
                                    className={`bg-gray-800 p-4 rounded-lg flex justify-between items-center border transition-all cursor-pointer ${isActive ? 'border-blue-500 bg-blue-900/20 shadow-[0_0_10px_rgba(59,130,246,0.2)]' : 'border-gray-700 hover:border-gray-600'}`}
                                >
                                    <div className="flex-1">
                                        <span className={`${isActive ? 'text-blue-400' : 'text-blue-500'} font-bold mr-2`}>#{idx + 1}</span>
                                        <span className={isActive ? 'text-white font-medium' : 'text-gray-200'}>{q.question}</span>
                                    </div>
                                    <div className="flex gap-2 ml-4">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingQ(q);
                                            }}
                                            className={`p-2 rounded-full transition-colors ${isActive ? 'bg-blue-600 text-white' : 'hover:bg-blue-900/50 text-blue-400'}`}
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (window.confirm('¿Estás seguro de que deseas eliminar esta pregunta?')) {
                                                    setQuestions(questions.filter(item => item.id !== q.id));
                                                    if (editingQ?.id === q.id) setEditingQ(null);
                                                }
                                            }}
                                            className="p-2 hover:bg-red-900/50 text-red-400 rounded-full transition-colors"
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
            <div className="min-h-screen bg-black text-white flex flex-col items-center p-4">
                {/* Header */}
                <div className="w-full max-w-3xl flex justify-between items-center mb-8 pt-4">
                    <div className="bg-gray-800 px-4 py-2 rounded-full text-sm font-mono text-blue-300 border border-gray-700">
                        Pregunta {currentQIndex + 1} / {questions.length}
                    </div>
                    <div className={`flex items-center gap-2 text-xl font-bold font-mono px-4 py-2 rounded-lg ${feedback ? 'text-yellow-400' : 'text-white'}`}>
                        <Clock size={20} />
                        {formatTime(timer)}
                    </div>
                </div>

                {/* Question Area */}
                <div className="w-full max-w-3xl flex-1 flex flex-col justify-center">
                    <h2 className="text-2xl md:text-3xl font-medium leading-relaxed mb-10 text-center">
                        {currentQ.question}
                    </h2>

                    <div className="grid grid-cols-1 gap-4 mb-8">
                        {currentQ.options.map((opt, idx) => {
                            if (hiddenOptions.includes(idx)) return <div key={idx} className="h-16"></div>; // Espacio vacío para opciones ocultas

                            let btnClass = "bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-200";

                            if (feedback) {
                                if (idx === currentQ.correctAnswer) btnClass = "bg-green-600 border-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.5)]";
                                else if (idx === selectedOption) btnClass = "bg-red-600 border-red-500 text-white";
                                else btnClass = "opacity-50 bg-gray-800 border-gray-700";
                            }

                            return (
                                <button
                                    key={idx}
                                    onClick={() => handleAnswer(idx)}
                                    disabled={feedback !== null}
                                    className={`relative p-4 rounded-xl border-2 text-left transition-all duration-200 flex items-center ${btnClass} w-full`}
                                >
                                    <span className="w-8 h-8 rounded-full border border-current flex items-center justify-center mr-4 text-sm font-bold opacity-70">
                                        {String.fromCharCode(65 + idx)}
                                    </span>
                                    <span className="text-lg">{opt}</span>
                                    {feedback && idx === currentQ.correctAnswer && <Check className="absolute right-4" />}
                                    {feedback && idx === selectedOption && idx !== currentQ.correctAnswer && <X className="absolute right-4" />}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Lifelines / Footer */}
                <div className="w-full max-w-3xl mt-auto pb-6">
                    <div className="flex justify-center gap-4">
                        <button
                            onClick={handleFiftyFifty}
                            disabled={feedback !== null || hiddenOptions.length > 0}
                            className="flex flex-col items-center gap-1 text-sm text-blue-400 disabled:opacity-30 hover:text-blue-300 transition-colors"
                        >
                            <div className="w-12 h-12 rounded-full bg-gray-800 border border-blue-900 flex items-center justify-center shadow-lg">
                                <span className="font-bold">50:50</span>
                            </div>
                            <span>+10s</span>
                        </button>

                        <button
                            onClick={handlePass}
                            disabled={feedback !== null}
                            className="flex flex-col items-center gap-1 text-sm text-purple-400 disabled:opacity-30 hover:text-purple-300 transition-colors"
                        >
                            <div className="w-12 h-12 rounded-full bg-gray-800 border border-purple-900 flex items-center justify-center shadow-lg">
                                <SkipForward size={20} />
                            </div>
                            <span>Pasar (+30s)</span>
                        </button>
                    </div>

                    <div className="text-center mt-6">
                        <button
                            className="text-gray-600 text-sm hover:text-gray-400 flex items-center justify-center gap-1 mx-auto"
                            onClick={() => {
                                const pass = prompt('Ingresa la clave de administrador para cancelar el juego:');
                                if (pass === '123') {
                                    restartApp();
                                } else if (pass !== null) {
                                    alert('Clave incorrecta');
                                }
                            }}
                        >
                            Cancelar Juego
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (view === 'results') {
        const correctCount = answersLog.filter(a => a.isCorrect).length;
        const incorrectCount = answersLog.filter(a => !a.isCorrect && !a.isSkipped).length;
        const skippedCount = answersLog.filter(a => a.isSkipped).length;

        return (
            <div className="min-h-screen bg-gray-900 text-white p-6 overflow-y-auto">
                <div className="max-w-2xl mx-auto">
                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-bold mb-2">Resultados</h2>
                        <div className="text-6xl font-mono text-blue-400 font-bold mb-4">{formatTime(timer)}</div>
                        <p className="text-gray-400">Tiempo Total</p>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-8">
                        <div className="bg-green-900/30 border border-green-800 p-4 rounded-xl text-center">
                            <div className="text-2xl font-bold text-green-400">{correctCount}</div>
                            <div className="text-xs text-green-200">Correctas</div>
                        </div>
                        <div className="bg-red-900/30 border border-red-800 p-4 rounded-xl text-center">
                            <div className="text-2xl font-bold text-red-400">{incorrectCount}</div>
                            <div className="text-xs text-red-200">Incorrectas</div>
                        </div>
                        <div className="bg-yellow-900/30 border border-yellow-800 p-4 rounded-xl text-center">
                            <div className="text-2xl font-bold text-yellow-400">{skippedCount}</div>
                            <div className="text-xs text-yellow-200">Saltadas</div>
                        </div>
                    </div>

                    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 mb-8">
                        <div
                            className="flex items-center justify-between cursor-pointer"
                            onClick={() => setShowReview(!showReview)}
                        >
                            <div className="flex items-center gap-2">
                                <Eye size={20} className="text-blue-400" />
                                <h3 className="text-lg font-bold">Revisión</h3>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300">
                                <span>{showReview ? 'Ocultar' : 'Ver más'}</span>
                                {showReview ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </div>
                        </div>

                        {showReview && (
                            <div className="space-y-6 mt-6 border-t border-gray-700 pt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                {answersLog.map((log, idx) => (
                                    <div key={idx} className="border-b border-gray-700 pb-4 last:border-0">
                                        <div className="flex items-start justify-between mb-2">
                                            <p className="font-medium text-gray-200 w-10/12">
                                                <span className="text-gray-500 mr-2">{idx + 1}.</span>
                                                {log.question.question}
                                            </p>
                                            {log.isCorrect ? <Check className="text-green-500" /> : <X className="text-red-500" />}
                                        </div>

                                        <div className="ml-6 text-sm">
                                            {log.isSkipped ? (
                                                <p className="text-yellow-500 italic">Pregunta Saltada (+30s)</p>
                                            ) : (
                                                <p className={`${log.isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                                                    Tu respuesta: <span className="font-semibold">{log.question.options[log.selected]}</span>
                                                </p>
                                            )}

                                            {!log.isCorrect && (
                                                <p className="text-blue-400 mt-1">
                                                    Correcta: <span className="font-semibold">{log.question.options[log.question.correctAnswer]}</span>
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={restartApp}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg"
                    >
                        <RotateCcw /> REINICIAR ACTIVIDAD
                    </button>
                </div>
            </div>
        );
    }

    return null;
}

// Sub-componente para formulario
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
        if (!formData.question || formData.options.some(o => !o)) return alert("Completa todos los campos");
        onSave(formData);
        // Reset si es nuevo
        if (!initialData) setFormData({ question: '', options: ['', '', '', ''], correctAnswer: 0 });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm text-gray-400 mb-1">Pregunta</label>
                <textarea
                    className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                    rows="2"
                    value={formData.question}
                    onChange={e => setFormData({ ...formData, question: e.target.value })}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {formData.options.map((opt, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                        <input
                            type="radio"
                            name="correct"
                            checked={formData.correctAnswer === idx}
                            onChange={() => setFormData({ ...formData, correctAnswer: idx })}
                            className="accent-blue-500 w-4 h-4"
                        />
                        <input
                            type="text"
                            placeholder={`Opción ${idx + 1}`}
                            className={`flex-1 bg-gray-900 border ${formData.correctAnswer === idx ? 'border-blue-500' : 'border-gray-600'} rounded p-2 text-white`}
                            value={opt}
                            onChange={e => handleChangeOption(idx, e.target.value)}
                        />
                    </div>
                ))}
            </div>

            <div className="flex gap-3 mt-4">
                <button type="submit" className="flex-1 bg-green-600 hover:bg-green-500 py-2 rounded text-white flex justify-center gap-2 items-center">
                    <Save size={18} /> Guardar
                </button>
                {onCancel && (
                    <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600">
                        Cancelar
                    </button>
                )}
            </div>
        </form>
    );
}
