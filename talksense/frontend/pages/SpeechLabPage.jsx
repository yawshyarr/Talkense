console.log("SpeechLabPage.jsx advanced studio script executing...");

const LAB_HISTORY_KEY = 'talksense_speech_lab_history_v2';
const LAB_FILLER_WORDS = ['um', 'uh', 'like', 'basically', 'actually', 'literally', 'honestly', 'you know', 'i mean', 'so'];

const LAB_MODES = [
  {
    id: 'clarity',
    name: 'Clarity Drill',
    accent: 'bg-blue-500',
    targetPace: [105, 145],
    objective: 'Train crisp phrasing, cleaner diction, and medium-length sentences.',
    focus: 'Best for presentation rehearsal and interview answers.',
    prompt: 'Explain a difficult concept in simple words for one minute.',
  },
  {
    id: 'pace',
    name: 'Pace Control',
    accent: 'bg-emerald-500',
    targetPace: [115, 150],
    objective: 'Hold a steady rhythm without rushing or dragging.',
    focus: 'Best for speeches where timing and calm delivery matter.',
    prompt: 'Introduce yourself and explain your strongest skill with a steady pace.',
  },
  {
    id: 'filler',
    name: 'Filler Cleanse',
    accent: 'bg-amber-500',
    targetPace: [95, 135],
    objective: 'Reduce filler words and replace them with short controlled pauses.',
    focus: 'Best for nervous speakers who overuse placeholder words.',
    prompt: 'Talk about a recent challenge you solved without using filler words.',
  },
  {
    id: 'story',
    name: 'Storytelling Flow',
    accent: 'bg-fuchsia-500',
    targetPace: [110, 155],
    objective: 'Build narrative flow with variation in energy and sentence shape.',
    focus: 'Best for pitches, public speaking, and audience engagement.',
    prompt: 'Tell a short story about a turning point in your life or career.',
  },
];

const clampLab = (value, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(value)));

const readLabHistory = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(LAB_HISTORY_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveLabHistory = (entry) => {
  const next = [entry, ...readLabHistory()].slice(0, 10);
  localStorage.setItem(LAB_HISTORY_KEY, JSON.stringify(next));
  return next;
};

const buildLabSummary = ({ transcript, elapsedSeconds, fillerCount, pace, audioSamples, selectedMode }) => {
  const words = transcript.toLowerCase().match(/\b[\w']+\b/g) || [];
  const sentenceParts = transcript.split(/[.!?]+/).map((chunk) => chunk.trim()).filter(Boolean);
  const sentenceLengths = sentenceParts.map((item) => (item.match(/\b[\w']+\b/g) || []).length).filter(Boolean);
  const averageSentence = sentenceLengths.length
    ? sentenceLengths.reduce((sum, count) => sum + count, 0) / sentenceLengths.length
    : 0;
  const uniqueWords = new Set(words);
  const uniqueRatio = words.length ? uniqueWords.size / words.length : 0;
  const fillerRate = words.length ? fillerCount / words.length : 0;
  const audioAverage = audioSamples.length
    ? audioSamples.reduce((sum, level) => sum + level, 0) / audioSamples.length
    : 0;
  const audioVariance = audioSamples.length
    ? audioSamples.reduce((sum, level) => sum + Math.pow(level - audioAverage, 2), 0) / audioSamples.length
    : 0;
  const energyVariation = Math.sqrt(audioVariance);
  const [minPace, maxPace] = selectedMode.targetPace;
  const pacePenalty = pace === 0 ? 45 : pace < minPace ? (minPace - pace) * 1.25 : pace > maxPace ? (pace - maxPace) * 1.15 : 0;

  const clarityScore = words.length === 0
    ? 0
    : clampLab(88 - fillerRate * 240 - Math.max(0, Math.abs(averageSentence - 13) * 2.3) + uniqueRatio * 18);
  const paceScore = words.length === 0
    ? 0
    : clampLab(94 - pacePenalty);
  const controlScore = words.length === 0
    ? 0
    : clampLab(90 - fillerCount * 3.5 - Math.max(0, 12 - energyVariation) * 1.4);
  const varietyScore = words.length === 0
    ? 0
    : clampLab(45 + uniqueRatio * 45 + Math.min(18, energyVariation * 0.9));
  const sessionScore = clampLab((clarityScore * 0.3) + (paceScore * 0.25) + (controlScore * 0.25) + (varietyScore * 0.2));

  const notes = [];
  if (words.length < 25) notes.push('Try speaking longer so the lab has enough material to judge your delivery.');
  if (pace < minPace && words.length > 0) notes.push(`Your pace was below the ${selectedMode.name} target. Push closer to ${Math.round((minPace + maxPace) / 2)} WPM.`);
  if (pace > maxPace) notes.push('You were speaking too fast for this drill. Slow down and leave cleaner pauses.');
  if (fillerRate > 0.04) notes.push('Filler density was high. Replace filler words with one silent breath before the next idea.');
  if (averageSentence > 19) notes.push('Your sentences became long. Break one idea into two shorter units for better clarity.');
  if (averageSentence > 0 && averageSentence < 7) notes.push('Your thoughts were clipped. Add one supporting detail before ending each sentence.');
  if (energyVariation < 10 && words.length > 0) notes.push('Vocal energy looked flat. Add more emphasis on key words and transitions.');
  if (uniqueRatio < 0.45 && words.length > 20) notes.push('Vocabulary repetition was noticeable. Swap repeated words with stronger alternatives.');
  if (notes.length === 0) notes.push('Strong practice run. Your delivery stayed balanced for the selected drill.');

  const strongestMetric = [
    { label: 'Clarity', value: clarityScore },
    { label: 'Pace', value: paceScore },
    { label: 'Control', value: controlScore },
    { label: 'Variety', value: varietyScore },
  ].sort((a, b) => b.value - a.value)[0];

  const weakestMetric = [
    { label: 'Clarity', value: clarityScore },
    { label: 'Pace', value: paceScore },
    { label: 'Control', value: controlScore },
    { label: 'Variety', value: varietyScore },
  ].sort((a, b) => a.value - b.value)[0];

  return {
    sessionScore,
    clarityScore,
    paceScore,
    controlScore,
    varietyScore,
    stats: {
      elapsedSeconds,
      words: words.length,
      fillers: fillerCount,
      pace,
      averageSentence: Number(averageSentence.toFixed(1)),
      uniqueRatio: Number((uniqueRatio * 100).toFixed(1)),
      energyVariation: Number(energyVariation.toFixed(1)),
    },
    strongestMetric,
    weakestMetric,
    notes,
  };
};

const SpeechLabPage = ({ user, onNavigate, goBack, canGoBack }) => {
  const { motion, AnimatePresence } = window;
  const [selectedModeId, setSelectedModeId] = useState('clarity');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isPracticing, setIsPracticing] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [audioBars, setAudioBars] = useState(Array.from({ length: 28 }, () => 8));
  const [audioLevel, setAudioLevel] = useState(0);
  const [pace, setPace] = useState(0);
  const [fillerCount, setFillerCount] = useState(0);
  const [coachingLine, setCoachingLine] = useState('Choose a drill and start practicing.');
  const [practiceSummary, setPracticeSummary] = useState(null);
  const [labHistory, setLabHistory] = useState(readLabHistory());
  const [recognitionSupported, setRecognitionSupported] = useState(true);

  const selectedMode = LAB_MODES.find((mode) => mode.id === selectedModeId) || LAB_MODES[0];
  const transcriptRef = useRef('');
  const interimRef = useRef('');
  const wordCountRef = useRef(0);
  const startTimeRef = useRef(null);
  const fillerRef = useRef(0);
  const audioSamplesRef = useRef([]);
  const speechSegmentsRef = useRef([]);
  const recognitionRef = useRef(null);
  const recognitionRestartTimeoutRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const animationRef = useRef(null);
  const timerRef = useRef(null);
  const isPracticingRef = useRef(false);

  const targetPrompt = customPrompt.trim() || selectedMode.prompt;

  const resetSessionState = () => {
    transcriptRef.current = '';
    interimRef.current = '';
    wordCountRef.current = 0;
    fillerRef.current = 0;
    audioSamplesRef.current = [];
    speechSegmentsRef.current = [];
    setSessionSeconds(0);
    setLiveTranscript('');
    setFinalTranscript('');
    setPace(0);
    setFillerCount(0);
    setPracticeSummary(null);
    setAudioLevel(0);
    setAudioBars(Array.from({ length: 28 }, () => 8));
  };

  const stopMedia = () => {
    if (recognitionRestartTimeoutRef.current) {
      clearTimeout(recognitionRestartTimeoutRef.current);
      recognitionRestartTimeoutRef.current = null;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch (e) {}
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    analyserRef.current = null;
  };

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setRecognitionSupported(false);
      setCoachingLine('This browser does not support Web Speech API. Use Chrome for the full Speech Lab.');
      return undefined;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let liveInterim = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcriptPart = event.results[i][0].transcript.trim();
        if (!transcriptPart) continue;
        if (event.results[i].isFinal) {
          transcriptRef.current = `${transcriptRef.current} ${transcriptPart}`.trim();
          const words = transcriptPart.match(/\b[\w']+\b/g) || [];
          const fillers = (transcriptPart.toLowerCase().match(/\b(um|uh|like|basically|actually|literally|honestly|you know|i mean|so)\b/g) || []).length;
          wordCountRef.current += words.length;
          fillerRef.current += fillers;
          setFillerCount(fillerRef.current);
          setFinalTranscript(transcriptRef.current);
          speechSegmentsRef.current = [...speechSegmentsRef.current, transcriptPart].slice(-5);
        } else {
          liveInterim = `${liveInterim} ${transcriptPart}`.trim();
        }
      }
      interimRef.current = liveInterim;
      setLiveTranscript(`${transcriptRef.current} ${liveInterim}`.trim());
    };

    recognition.onerror = (event) => {
      if (!isPracticingRef.current) return;
      if (event.error === 'no-speech') {
        setCoachingLine('No speech detected. Speak a little louder and keep the mic close.');
        return;
      }
      if (event.error === 'aborted') return;
      setCoachingLine(`Speech recognition issue: ${event.error}. The lab will keep trying.`);
    };

    recognition.onend = () => {
      if (!isPracticingRef.current) return;
      recognitionRestartTimeoutRef.current = setTimeout(() => {
        try {
          recognition.start();
        } catch (error) {
          console.warn('Speech Lab recognition restart skipped:', error);
        }
      }, 180);
    };

    recognitionRef.current = recognition;

    return () => {
      isPracticingRef.current = false;
      stopMedia();
    };
  }, []);

  useEffect(() => {
    return () => {
      isPracticingRef.current = false;
      stopMedia();
    };
  }, []);

  const updateCoaching = (currentPace, currentAudioLevel) => {
    const [minPace, maxPace] = selectedMode.targetPace;
    if (wordCountRef.current === 0) {
      setCoachingLine('Start speaking. The lab is listening for your first complete idea.');
      return;
    }
    if (currentAudioLevel < 10) {
      setCoachingLine('Your voice energy is low. Bring the microphone closer or project more clearly.');
      return;
    }
    if (currentPace > maxPace + 10) {
      setCoachingLine('You are rushing this drill. Slow down and land each sentence before starting the next one.');
      return;
    }
    if (currentPace < minPace - 10) {
      setCoachingLine('Your pace is too slow for this drill. Add more forward momentum between ideas.');
      return;
    }
    if (fillerRef.current >= 4 && selectedMode.id === 'filler') {
      setCoachingLine('Pause silently instead of filling space. Let one breath replace your filler habit.');
      return;
    }
    if (speechSegmentsRef.current.length > 0) {
      setCoachingLine(`Latest captured line: "${speechSegmentsRef.current[speechSegmentsRef.current.length - 1]}"`);
      return;
    }
    setCoachingLine('Delivery is stable. Keep your thought structure clean and intentional.');
  };

  const startPractice = async () => {
    try {
      stopMedia();
      resetSessionState();
      setIsPracticing(true);
      isPracticingRef.current = true;
      startTimeRef.current = Date.now();
      setCoachingLine(`Live drill started: ${selectedMode.name}.`);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          noiseSuppression: true,
          echoCancellation: true,
        },
      });
      mediaStreamRef.current = stream;

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 128;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (error) {
          console.warn('Speech Lab recognition start skipped:', error);
        }
      }

      timerRef.current = setInterval(() => {
        const elapsed = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
        setSessionSeconds(elapsed);
        const elapsedMinutes = Math.max(elapsed / 60, 1 / 60);
        const currentPace = Math.round(wordCountRef.current / elapsedMinutes);
        setPace(currentPace);
        updateCoaching(currentPace, audioLevel);
      }, 1000);

      const animate = () => {
        if (!isPracticingRef.current || !analyserRef.current) return;
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        const bars = Array.from(data.slice(0, 28)).map((value) => Math.max(8, Math.round((value / 255) * 100)));
        const averageLevel = data.length ? data.reduce((sum, value) => sum + value, 0) / data.length : 0;
        const normalizedLevel = Math.round((averageLevel / 255) * 100);
        audioSamplesRef.current = [...audioSamplesRef.current, normalizedLevel].slice(-180);
        setAudioBars(bars);
        setAudioLevel(normalizedLevel);
        const elapsedMinutes = Math.max(((Date.now() - startTimeRef.current) / 1000) / 60, 1 / 60);
        const currentPace = Math.round(wordCountRef.current / elapsedMinutes);
        setPace(currentPace);
        updateCoaching(currentPace, normalizedLevel);
        animationRef.current = requestAnimationFrame(animate);
      };

      animate();
    } catch (error) {
      console.error('Speech Lab start failed:', error);
      setIsPracticing(false);
      isPracticingRef.current = false;
      setCoachingLine('Microphone access is required for Speech Lab. Please allow mic access and try again.');
    }
  };

  const stopPractice = () => {
    const elapsedSeconds = Math.max(1, Math.round((Date.now() - (startTimeRef.current || Date.now())) / 1000));
    const elapsedMinutes = Math.max(elapsedSeconds / 60, 1 / 60);
    const finalPace = Math.round(wordCountRef.current / elapsedMinutes);
    const transcript = `${transcriptRef.current} ${interimRef.current}`.trim();

    setIsPracticing(false);
    isPracticingRef.current = false;
    stopMedia();
    setSessionSeconds(elapsedSeconds);
    setPace(finalPace);
    setFinalTranscript(transcript);

    const summary = buildLabSummary({
      transcript,
      elapsedSeconds,
      fillerCount: fillerRef.current,
      pace: finalPace,
      audioSamples: audioSamplesRef.current,
      selectedMode,
    });
    setPracticeSummary(summary);
    setCoachingLine(summary.notes[0]);

    const historyEntry = {
      id: `${Date.now()}`,
      createdAt: new Date().toISOString(),
      modeId: selectedMode.id,
      modeName: selectedMode.name,
      prompt: targetPrompt,
      score: summary.sessionScore,
      pace: summary.stats.pace,
      fillers: summary.stats.fillers,
      words: summary.stats.words,
      notes: summary.notes.slice(0, 2),
    };
    setLabHistory(saveLabHistory(historyEntry));
  };

  const quickStats = [
    { label: 'Pace', value: `${pace} WPM`, state: pace === 0 ? 'Idle' : pace > selectedMode.targetPace[1] ? 'Fast' : pace < selectedMode.targetPace[0] ? 'Slow' : 'On target' },
    { label: 'Fillers', value: fillerCount, state: fillerCount > 5 ? 'Needs work' : 'Controlled' },
    { label: 'Audio Energy', value: `${audioLevel}%`, state: audioLevel < 10 ? 'Low' : audioLevel > 60 ? 'Strong' : 'Stable' },
    { label: 'Duration', value: `${sessionSeconds}s`, state: sessionSeconds < 20 ? 'Warm-up' : 'Active' },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.08),_transparent_32%),linear-gradient(180deg,#f8fafc_0%,#eef4f2_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.12),_transparent_26%),linear-gradient(180deg,#020617_0%,#020617_100%)] pt-24 px-6 pb-12">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.35em] text-primary mb-3">Speech Lab Studio</p>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white">Deliberate practice for real speaking situations</h1>
            <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 font-semibold mt-4 max-w-3xl">
              Pick a drill, rehearse with live coaching, and get a practical breakdown of pace, fillers, control, and vocal variety.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => canGoBack ? goBack() : onNavigate('dashboard')}
              className="px-5 py-3 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-black uppercase tracking-widest text-[10px] shadow-lg"
            >
              {canGoBack ? 'Go Back' : 'Exit Lab'}
            </button>
            <button
              onClick={isPracticing ? stopPractice : startPractice}
              disabled={!recognitionSupported}
              className={`px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl transition-all ${isPracticing ? 'bg-red-500 text-white shadow-red-500/25' : 'bg-primary text-white shadow-primary/25'} ${!recognitionSupported ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              {isPracticing ? 'Finish Drill' : 'Start Drill'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          <div className="xl:col-span-8 space-y-8">
            <div className="glass-card rounded-[2rem] border border-white/40 dark:border-white/10 bg-white/80 dark:bg-slate-950/80 shadow-2xl p-8">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-8">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400 mb-3">Drill Modes</p>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white">Choose a training objective</h2>
                </div>
                <div className="rounded-2xl bg-slate-100 dark:bg-slate-900 px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.25em] text-slate-400 font-black">Target Pace</p>
                  <p className="text-sm font-black text-slate-900 dark:text-white mt-1">{selectedMode.targetPace[0]} - {selectedMode.targetPace[1]} WPM</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {LAB_MODES.map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setSelectedModeId(mode.id)}
                    className={`text-left rounded-[1.5rem] border p-5 transition-all ${selectedModeId === mode.id ? 'border-primary bg-primary/8 shadow-lg shadow-primary/10' : 'border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/80 hover:border-primary/30'}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className={`w-3 h-3 rounded-full ${mode.accent}`} />
                      <span className="text-[10px] uppercase tracking-[0.25em] font-black text-slate-400">{mode.targetPace[0]}-{mode.targetPace[1]} WPM</span>
                    </div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">{mode.name}</h3>
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mt-2">{mode.objective}</p>
                    <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400 mt-4">{mode.focus}</p>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6">
                <div className="rounded-[1.75rem] bg-slate-950 text-white p-6 shadow-xl">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-3">Practice Prompt</p>
                  <p className="text-lg font-bold leading-relaxed">{targetPrompt}</p>
                  <textarea
                    value={customPrompt}
                    onChange={(event) => setCustomPrompt(event.target.value)}
                    placeholder="Or write your own custom prompt for this drill..."
                    className="mt-5 w-full min-h-[110px] rounded-[1.25rem] bg-white/5 border border-white/10 px-4 py-4 text-sm font-semibold text-white placeholder:text-white/35 outline-none focus:border-primary/40 resize-none"
                  />
                </div>

                <div className="rounded-[1.75rem] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-3">Coach Direction</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-relaxed">{selectedMode.focus}</p>
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    {quickStats.map((item) => (
                      <div key={item.label} className="rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 py-4">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black">{item.label}</p>
                        <p className="text-lg font-black text-slate-900 dark:text-white mt-2">{item.value}</p>
                        <p className="text-[10px] uppercase tracking-[0.15em] text-primary font-black mt-2">{item.state}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-card rounded-[2rem] border border-white/40 dark:border-white/10 bg-white/80 dark:bg-slate-950/80 shadow-2xl p-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">Live Studio</p>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white">Realtime coaching and voice energy</h2>
                </div>
                <div className={`px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.25em] ${isPracticing ? 'bg-red-500/10 text-red-500' : 'bg-slate-100 dark:bg-slate-900 text-slate-500'}`}>
                  {isPracticing ? 'Recording' : 'Standby'}
                </div>
              </div>

              <div className="rounded-[1.75rem] bg-slate-100 dark:bg-black border border-slate-200 dark:border-slate-800 min-h-[220px] px-6 py-8 flex items-end gap-2 overflow-hidden">
                {audioBars.map((bar, index) => (
                  <motion.div
                    key={`${bar}-${index}`}
                    animate={{ height: `${bar}%` }}
                    transition={{ type: 'spring', stiffness: 220, damping: 24 }}
                    className={`flex-1 rounded-full ${index % 4 === 0 ? 'bg-primary' : 'bg-primary/35'}`}
                  />
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr] gap-6 mt-6">
                <div className="rounded-[1.75rem] bg-slate-950 text-white p-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-3">Coach Feed</p>
                  <p className="text-lg font-bold leading-relaxed">{coachingLine}</p>
                  <div className="mt-6 flex items-center gap-3 text-xs font-black uppercase tracking-[0.2em] text-white/50">
                    <span className={`w-2.5 h-2.5 rounded-full ${isPracticing ? 'bg-red-500 animate-pulse' : 'bg-white/20'}`} />
                    {recognitionSupported ? 'Speech recognition active' : 'Speech recognition unavailable'}
                  </div>
                </div>
                <div className="rounded-[1.75rem] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-3">Transcript Monitor</p>
                  <div className="min-h-[180px] rounded-[1.25rem] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-5 text-sm leading-7 font-semibold text-slate-700 dark:text-slate-200">
                    {liveTranscript || 'Your live transcript will appear here as you rehearse the drill.'}
                  </div>
                </div>
              </div>
            </div>

            {practiceSummary && (
              <div className="glass-card rounded-[2rem] border border-white/40 dark:border-white/10 bg-white/80 dark:bg-slate-950/80 shadow-2xl p-8">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-8">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">Session Debrief</p>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white">What this practice run tells you</h2>
                  </div>
                  <div className="rounded-[1.5rem] bg-primary text-white px-6 py-4 shadow-xl shadow-primary/25">
                    <p className="text-[10px] uppercase tracking-[0.25em] font-black text-white/75">Lab Score</p>
                    <p className="text-3xl font-black mt-1">{practiceSummary.sessionScore}%</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                  {[
                    { label: 'Clarity', value: practiceSummary.clarityScore },
                    { label: 'Pace', value: practiceSummary.paceScore },
                    { label: 'Control', value: practiceSummary.controlScore },
                    { label: 'Variety', value: practiceSummary.varietyScore },
                  ].map((metric) => (
                    <div key={metric.label} className="rounded-[1.5rem] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black">{metric.label}</p>
                      <p className="text-3xl font-black text-slate-900 dark:text-white mt-3">{metric.value}%</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-6">
                  <div className="rounded-[1.75rem] bg-slate-950 text-white p-6">
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary mb-4">Performance Snapshot</p>
                    <div className="space-y-4 text-sm font-bold">
                      <div className="flex items-center justify-between"><span className="text-white/60">Words spoken</span><span>{practiceSummary.stats.words}</span></div>
                      <div className="flex items-center justify-between"><span className="text-white/60">Average pace</span><span>{practiceSummary.stats.pace} WPM</span></div>
                      <div className="flex items-center justify-between"><span className="text-white/60">Filler count</span><span>{practiceSummary.stats.fillers}</span></div>
                      <div className="flex items-center justify-between"><span className="text-white/60">Sentence length</span><span>{practiceSummary.stats.averageSentence} words</span></div>
                      <div className="flex items-center justify-between"><span className="text-white/60">Vocabulary variety</span><span>{practiceSummary.stats.uniqueRatio}%</span></div>
                      <div className="flex items-center justify-between"><span className="text-white/60">Energy variation</span><span>{practiceSummary.stats.energyVariation}</span></div>
                    </div>
                    <div className="mt-6 rounded-2xl bg-white/5 p-4">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-black">Strongest Area</p>
                      <p className="text-lg font-black mt-2">{practiceSummary.strongestMetric.label}</p>
                    </div>
                    <div className="mt-4 rounded-2xl bg-white/5 p-4">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-black">Main Focus Area</p>
                      <p className="text-lg font-black mt-2">{practiceSummary.weakestMetric.label}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {practiceSummary.notes.map((note, index) => (
                      <div key={`${note}-${index}`} className="rounded-[1.5rem] bg-primary/6 border border-primary/15 p-5">
                        <p className="text-[10px] uppercase tracking-[0.25em] text-primary font-black mb-2">Coach Note {index + 1}</p>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{note}</p>
                      </div>
                    ))}
                    <div className="rounded-[1.5rem] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
                      <p className="text-[10px] uppercase tracking-[0.25em] text-slate-400 font-black mb-2">Captured Transcript</p>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-7">{finalTranscript || 'No transcript captured for this drill.'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="xl:col-span-4 space-y-8">
            <div className="glass-card rounded-[2rem] border border-white/40 dark:border-white/10 bg-white/80 dark:bg-slate-950/80 shadow-2xl p-8">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4">Real-Life Use Cases</p>
              <div className="space-y-4">
                {[
                  'Interview answers: use Clarity Drill to remove rambling.',
                  'Seminar presentation: use Pace Control to keep timing clean.',
                  'Viva or defense: use Filler Cleanse to sound more composed.',
                  'Pitch or storytelling: use Storytelling Flow to sound more dynamic.',
                ].map((tip) => (
                  <div key={tip} className="rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-4">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{tip}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card rounded-[2rem] border border-white/40 dark:border-white/10 bg-slate-950 text-white shadow-2xl p-8">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-4">Drill Rules</p>
              <div className="space-y-4 text-sm font-bold">
                <p>1. Speak for at least 30 to 45 seconds so the lab has enough data.</p>
                <p>2. Finish complete thoughts instead of isolated phrases.</p>
                <p>3. Let pauses do the work instead of saying filler words.</p>
                <p>4. Repeat the same drill twice and compare your lab score.</p>
              </div>
            </div>

            <div className="glass-card rounded-[2rem] border border-white/40 dark:border-white/10 bg-white/80 dark:bg-slate-950/80 shadow-2xl p-8">
              <div className="flex items-center justify-between mb-5">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Recent Lab Sessions</p>
                <button
                  onClick={() => {
                    localStorage.removeItem(LAB_HISTORY_KEY);
                    setLabHistory([]);
                  }}
                  className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-red-500"
                >
                  Clear
                </button>
              </div>
              <div className="space-y-3">
                {labHistory.length > 0 ? labHistory.map((entry) => (
                  <div key={entry.id} className="rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-black text-slate-900 dark:text-white">{entry.modeName}</p>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-black mt-1">{new Date(entry.createdAt).toLocaleString()}</p>
                      </div>
                      <span className="text-sm font-black text-primary">{entry.score}%</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mt-4 text-center">
                      <div className="rounded-xl bg-white dark:bg-slate-950 px-3 py-3">
                        <p className="text-[9px] uppercase tracking-[0.15em] text-slate-400 font-black">Pace</p>
                        <p className="text-sm font-black text-slate-900 dark:text-white mt-1">{entry.pace}</p>
                      </div>
                      <div className="rounded-xl bg-white dark:bg-slate-950 px-3 py-3">
                        <p className="text-[9px] uppercase tracking-[0.15em] text-slate-400 font-black">Fillers</p>
                        <p className="text-sm font-black text-slate-900 dark:text-white mt-1">{entry.fillers}</p>
                      </div>
                      <div className="rounded-xl bg-white dark:bg-slate-950 px-3 py-3">
                        <p className="text-[9px] uppercase tracking-[0.15em] text-slate-400 font-black">Words</p>
                        <p className="text-sm font-black text-slate-900 dark:text-white mt-1">{entry.words}</p>
                      </div>
                    </div>
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-4">{entry.notes?.[0] || 'Session saved.'}</p>
                  </div>
                )) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-5 bg-slate-50 dark:bg-slate-900">
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400">No lab history yet. Finish a drill and your practice record will appear here.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

window.TalkSense.register('SpeechLabPage', SpeechLabPage);
