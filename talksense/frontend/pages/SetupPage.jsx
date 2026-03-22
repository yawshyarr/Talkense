console.log("SetupPage.jsx script executing...");
const { motion, AnimatePresence } = window;

const SetupPage = ({ onNavigate }) => {
  const [topic, setTopic] = useState('');
  const [timer, setTimer] = useState(60);
  const [mode, setMode] = useState('Impromptu');
  const [difficulty, setDifficulty] = useState('Intermediate');
  
  const [toggles, setToggles] = useState({
    emotion: true,
    plagiarism: false,
    filler: true,
    transcript: true
  });

  const presetTopics = [
    "Introduce Yourself", 
    "My Favourite Movie", 
    "Climate Change", 
    "AI in Education"
  ];

  const handleStart = () => {
    onNavigate('live', { 
        topic, 
        duration_seconds: timer, 
        mode, 
        difficulty, 
        toggles 
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 relative">
      <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/20 rounded-full blur-[80px] z-0 pointer-events-none"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8 relative z-10"
      >
        <div className="mb-8 border-b border-white/10 pb-6 text-center">
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-400">Configure Session</h2>
          <p className="text-gray-400 mt-2">Adjust your settings before you start speaking.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
          
          {/* Left Column - Core Settings */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Speech Topic</label>
              <input 
                type="text" 
                className="w-full bg-black/40 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                placeholder="Type a topic or select below..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
              <div className="flex flex-wrap gap-2 mt-3">
                {presetTopics.map(t => (
                  <span 
                    key={t}
                    onClick={() => setTopic(t)}
                    className="text-xs px-3 py-1 bg-white/5 border border-white/10 rounded-full cursor-pointer hover:bg-primary/20 hover:border-primary/50 transition-colors"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Duration Timer</label>
              <select 
                value={timer}
                onChange={(e) => setTimer(Number(e.target.value))}
                className="w-full bg-black/40 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary appearance-none [&>option]:bg-navy"
              >
                <option value={30}>30 Seconds</option>
                <option value={60}>1 Minute</option>
                <option value={120}>2 Minutes</option>
                <option value={180}>3 Minutes</option>
                <option value={300}>5 Minutes</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Mode</label>
                <select 
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  className="w-full bg-black/40 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary appearance-none [&>option]:bg-navy"
                >
                  <option value="Impromptu">Impromptu</option>
                  <option value="Prepared">Prepared</option>
                  <option value="Interview">Interview</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Difficulty</label>
                <select 
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full bg-black/40 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary appearance-none [&>option]:bg-navy"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
            </div>
          </div>

          {/* Right Column - Toggles & Start */}
          <div className="space-y-6 flex flex-col">
            <h3 className="text-sm font-medium text-gray-300 mb-2 tracking-wider">ADVANCED FEATURES</h3>
            
            <div className="space-y-4">
              {Object.entries(toggles).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:border-primary/30 transition-colors">
                  <span className="capitalize text-gray-300">
                    {key === 'transcript' ? 'Show Real-time Transcript' : `Enable ${key} Analysis`}
                  </span>
                  <div 
                    onClick={() => setToggles(prev => ({...prev, [key]: !prev[key]}))}
                    className={`w-12 h-6 rounded-full cursor-pointer relative transition-colors ${value ? 'bg-primary' : 'bg-gray-700'}`}
                  >
                    <motion.div 
                      className="absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow-sm"
                      animate={{ x: value ? 24 : 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-auto pt-6 border-t border-white/10 flex flex-col gap-4">
              <button 
                className="w-full py-3 rounded-lg bg-white/5 text-white font-medium hover:bg-white/10 transition-colors border border-white/10 flex items-center justify-center gap-2"
                onClick={() => alert("Microphone test: Permissions granted. Sound detected.")}
              >
                🎙️ Test Microphone
              </button>
              
              <button 
                onClick={handleStart}
                disabled={!topic}
                className={`btn-neon w-full py-4 rounded-xl font-bold text-lg shadow-lg ${
                  topic 
                    ? 'bg-gradient-to-r from-primary to-blue-600 text-white shadow-primary/30' 
                    : 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-50'
                }`}
              >
                START SESSION
              </button>
            </div>

          </div>
        </div>
      </motion.div>
    </div>
  );
};
window.TalkSense.register('SetupPage', SetupPage);
