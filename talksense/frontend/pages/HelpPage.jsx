console.log("HelpPage.jsx script executing...");

const HELP_SECTIONS = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    iconColor: 'bg-slate-900',
    what: 'Your main control room. It shows recent sessions, quick stats, goals, and shortcut access to every tool.',
    use: [
      'Open the dashboard after login to see your latest speech activity.',
      'Use the bell icon for reminders and follow-up actions.',
      'Use recent sessions to reopen reports directly.',
      'Use the sidebar to move between all modules.',
    ],
    flow: ['Login', 'Open dashboard', 'Pick a tool', 'Practice or analyze', 'Review progress'],
  },
  {
    id: 'setup',
    title: 'Setup Session',
    iconColor: 'bg-primary',
    what: 'This prepares a formal speech analysis session. You choose your topic, duration, level, and security options here.',
    use: [
      'Enter the topic you want to speak on.',
      'Choose the session duration.',
      'Select Beginner, Intermediate, or Advanced.',
      'Enable security checks if needed, then start the live session.',
    ],
    flow: ['Choose topic', 'Pick level', 'Pick duration', 'Enable protections', 'Start live session'],
  },
  {
    id: 'live',
    title: 'Live Analyzer',
    iconColor: 'bg-emerald-500',
    what: 'This is the real-time speech capture screen. It transcribes your speech live and tracks pace, fillers, confidence, and fair-use integrity.',
    use: [
      'Click start and begin speaking clearly.',
      'Watch the transcript appear live on screen.',
      'Check pace, filler count, and confidence while speaking.',
      'Keep your face visible so voice proctoring can validate the session.',
    ],
    flow: ['Mic + camera start', 'Speech captured', 'Transcript updates live', 'Voice proctoring checks sync', 'Stop session for report'],
  },
  {
    id: 'report',
    title: 'Results Report',
    iconColor: 'bg-blue-500',
    what: 'The report gives final scores and explains why you got them. It uses the transcript, pace, fillers, vocabulary, and integrity signals.',
    use: [
      'Read the overall score first.',
      'Check the individual scores for fluency, clarity, pace, vocabulary, and confidence.',
      'Use the “Why You Got This Score” section to understand the calculations.',
      'Read coaching notes to know what to improve next.',
    ],
    flow: ['Session ends', 'Metrics are calculated', 'Scores are explained', 'Coaching is generated', 'Session is saved'],
  },
  {
    id: 'analytics',
    title: 'Analytics',
    iconColor: 'bg-fuchsia-500',
    what: 'Analytics turns saved session history into trends. It helps the user understand long-term improvement, not just one speech.',
    use: [
      'Open analytics after you have saved sessions.',
      'Check score progression, pace trends, level usage, and filler patterns.',
      'Use recent-vs-previous comparisons to see improvement.',
      'Open a specific report from analytics when you want details.',
    ],
    flow: ['Saved sessions collected', 'History aggregated', 'Charts and comparisons built', 'Weak points highlighted'],
  },
  {
    id: 'lab',
    title: 'Speech Lab',
    iconColor: 'bg-amber-500',
    what: 'Speech Lab is a guided rehearsal module. It is for practice before the formal analyzer, with drill modes and live coaching.',
    use: [
      'Choose a drill like Clarity, Pace Control, Filler Cleanse, or Storytelling Flow.',
      'Use the practice prompt or type your own.',
      'Start the drill and speak for at least 30 to 45 seconds.',
      'Read the session debrief and repeat the drill to improve.',
    ],
    flow: ['Choose drill', 'Read prompt', 'Start drill', 'Speak and monitor feedback', 'Finish and review debrief'],
  },
  {
    id: 'vocab',
    title: 'Vocabulary',
    iconColor: 'bg-cyan-500',
    what: 'This helps the user learn words and actively practice using them.',
    use: [
      'Search a word to get meaning, synonyms, antonyms, and examples.',
      'Use the sentence builder to write your own sentence.',
      'Submit the sentence to see whether it is right or wrong.',
      'Read the improvement feedback and try again.',
    ],
    flow: ['Search word', 'Read word data', 'Write sentence', 'Submit', 'Get correction'],
  },
  {
    id: 'coach',
    title: 'AI Coach',
    iconColor: 'bg-indigo-500',
    what: 'The AI Coach gives supportive improvement guidance based on your speaking work.',
    use: [
      'Use it after reports or practice sessions.',
      'Read the coaching suggestions as your next action plan.',
      'Focus on one or two suggestions at a time instead of everything at once.',
    ],
    flow: ['Finish session', 'Open coach', 'Read top advice', 'Apply in next session'],
  },
  {
    id: 'settings',
    title: 'Settings',
    iconColor: 'bg-rose-500',
    what: 'Settings control how the analyzer behaves. This includes transcription, confidence display, filler tracking, camera behavior, and reminders.',
    use: [
      'Add your Deepgram key if you want that transcription path available.',
      'Choose transcription language and target WPM.',
      'Turn confidence display and live metrics on or off.',
      'Enable reminders and camera preferences.',
    ],
    flow: ['Open settings', 'Adjust analyzer defaults', 'Save automatically', 'Use new defaults in next session'],
  },
];

const HelpCard = ({ section, index }) => {
  const { motion } = window;
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="rounded-[2rem] border border-white/40 dark:border-white/10 bg-white/80 dark:bg-slate-950/85 shadow-2xl p-8"
    >
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-8">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-2xl ${section.iconColor} text-white flex items-center justify-center shadow-lg`}>
            <span className="font-black text-lg">{section.title.charAt(0)}</span>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">Tool Guide</p>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">{section.title}</h2>
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mt-3 max-w-2xl">{section.what}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
        <div className="rounded-[1.5rem] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-4">How To Use</p>
          <div className="space-y-3">
            {section.use.map((item, itemIndex) => (
              <div key={item} className="flex gap-3">
                <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black shrink-0">
                  {itemIndex + 1}
                </div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.5rem] bg-slate-950 text-white p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary mb-5">Simple Workflow</p>
          <div className="space-y-3">
            {section.flow.map((step, stepIndex) => (
              <div key={step} className="relative rounded-2xl bg-white/5 border border-white/10 px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center text-[10px] font-black">
                    {stepIndex + 1}
                  </div>
                  <p className="text-sm font-bold">{step}</p>
                </div>
                {stepIndex < section.flow.length - 1 && (
                  <div className="absolute left-8 top-[100%] h-4 w-px bg-primary/40" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const HelpPage = ({ onNavigate, goBack, canGoBack }) => {
  const { motion } = window;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.08),_transparent_30%),linear-gradient(180deg,#f8fafc_0%,#edf4f0_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.12),_transparent_25%),linear-gradient(180deg,#020617_0%,#020617_100%)] px-6 py-12">
      <div className="max-w-7xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[2.5rem] border border-white/40 dark:border-white/10 bg-white/80 dark:bg-slate-950/85 shadow-2xl px-8 py-10"
        >
          <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.35em] text-primary mb-3">Help Center</p>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white">How to use every tool in TalkSense</h1>
              <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 font-semibold mt-4 max-w-3xl">
                This page explains what each module does, when to use it, and the easiest workflow to follow. Read it top to bottom once, then you can use the whole app smoothly.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => canGoBack ? goBack() : onNavigate('dashboard')}
                className="px-5 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-black uppercase tracking-widest text-[10px] shadow-lg"
              >
                {canGoBack ? 'Go Back' : 'Back To Dashboard'}
              </button>
              <button
                onClick={() => onNavigate('setup')}
                className="px-5 py-3 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20"
              >
                Start A Session
              </button>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'Best starting point', value: 'Dashboard' },
            { label: 'Formal analysis flow', value: 'Setup -> Live -> Report' },
            { label: 'Practice flow', value: 'Speech Lab -> Repeat -> Improve' },
          ].map((item) => (
            <div key={item.label} className="rounded-[1.75rem] border border-white/40 dark:border-white/10 bg-white/80 dark:bg-slate-950/85 shadow-xl px-6 py-6">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">{item.label}</p>
              <p className="text-xl font-black text-slate-900 dark:text-white mt-3">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="space-y-8">
          {HELP_SECTIONS.map((section, index) => (
            <HelpCard key={section.id} section={section} index={index} />
          ))}
        </div>
      </div>
    </div>
  );
};

window.TalkSense.register('HelpPage', HelpPage);
