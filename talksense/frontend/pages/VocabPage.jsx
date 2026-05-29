console.log("VocabPage.jsx script executing...");

const VocabPage = ({ user, onNavigate, goBack, canGoBack }) => {
  const { motion, AnimatePresence } = window;
  const [searchWord, setSearchWord] = useState('');
  const [wordData, setWordData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userSentence, setUserSentence] = useState('');
  const [evaluation, setEvaluation] = useState(null);
  const [evaluating, setEvaluating] = useState(false);
  const [recentWords, setRecentWords] = useState(JSON.parse(localStorage.getItem('learned_words') || '[]'));
  
  const masterWords = [
    "Eloquent", "Resilience", "Paradigm", "Pragmatic", "Ineffable", 
    "Ephemeral", "Ubiquitous", "Cognizant", "Magnanimous", "Exacerbate",
    "Capricious", "Fastidious", "Gregarious", "Incessant", "Meticulous",
    "Nefarious", "Obsequious", "Pernicious", "Querulous", "Reticent",
    "Sycophant", "Taciturn", "Vociferous", "Zenith", "Abundance"
  ];

  const handleSearch = async (wordToSearch = null) => {
    const word = wordToSearch || searchWord;
    if (!word.trim() || loading) return;

    setLoading(true);
    setWordData(null);
    setEvaluation(null);
    setUserSentence('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://127.0.0.1:8000/api/vocab/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ word: word })
      });

      if (response.ok) {
        const data = await response.json();
        data.synonyms = Array.isArray(data.synonyms) ? data.synonyms : [];
        data.antonyms = Array.isArray(data.antonyms) ? data.antonyms : [];
        data.examples = Array.isArray(data.examples) ? data.examples : [];
        setWordData(data);
        
        // Update recent words
        const updated = [data.word, ...recentWords.filter(w => w !== data.word)].slice(0, 50);
        setRecentWords(updated);
        localStorage.setItem('learned_words', JSON.stringify(updated));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluate = async (e) => {
    e.preventDefault();
    if (!userSentence.trim() || evaluating) return;

    setEvaluating(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://127.0.0.1:8000/api/vocab/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ word: wordData.word, sentence: userSentence })
      });

      if (response.ok) {
        const data = await response.json();
        data.issues = Array.isArray(data.issues) ? data.issues : [];
        setEvaluation(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black p-6 md:p-12 pt-24">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Vocabulary Lab</h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-2 italic">Master the art of expression with AI-driven linguistics</p>
          </div>
          <button 
            onClick={() => canGoBack ? goBack() : onNavigate('dashboard')}
            className="px-6 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
          >
            {canGoBack ? 'Go Back' : 'Back to Dashboard'}
          </button>
        </div>

        {/* Search Bar */}
        <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="relative group">
          <input 
            type="text"
            value={searchWord}
            onChange={(e) => setSearchWord(e.target.value)}
            placeholder="Search for any word (e.g., Eloquent, Resilience)..."
            className="w-full bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[2.5rem] px-10 py-6 text-xl font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 dark:focus:border-blue-600 transition-all shadow-2xl shadow-slate-200/50 dark:shadow-black/50"
          />
          <button 
            type="submit"
            disabled={loading}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-emerald-600 dark:bg-blue-600 flex items-center justify-center text-white shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
          </button>
        </form>

        {/* Master Explorer Quick Tags */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Master List Explorer:</span>
          {masterWords.map(w => (
            <button 
              key={w}
              onClick={() => { setSearchWord(w); handleSearch(w); }}
              className="px-4 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-500 hover:text-emerald-500 hover:border-emerald-500 transition-all"
            >
              {w}
            </button>
          ))}
          <span className="text-[10px] font-bold text-slate-400 italic ml-2">+ and 5000+ more available via search</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-8">
            <AnimatePresence mode="wait">
              {wordData ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="glass-card p-10 bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800"
                >
                  <div className="flex items-baseline gap-4 mb-8">
                    <h2 className="text-5xl font-black text-emerald-600 dark:text-blue-500 capitalize">{wordData.word}</h2>
                  </div>

                  {/* Multilingual Meanings */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                    <div className="p-8 rounded-[2rem] bg-emerald-500/10 dark:bg-emerald-500/20 border-2 border-emerald-500/20 shadow-lg">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px] font-black">HI</div>
                        <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Hindi Translation</p>
                      </div>
                      <p className="text-3xl font-black text-slate-900 dark:text-white leading-tight">
                        {wordData.hindi || "Processing..."}
                      </p>
                    </div>
                    <div className="p-8 rounded-[2rem] bg-blue-500/10 dark:bg-blue-500/20 border-2 border-blue-500/20 shadow-lg">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] font-black">MR</div>
                        <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Marathi Translation</p>
                      </div>
                      <p className="text-3xl font-black text-slate-900 dark:text-white leading-tight">
                        {wordData.marathi || "Processing..."}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div>
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Core Definition</h3>
                      <p className="text-lg text-slate-700 dark:text-slate-300 font-medium leading-relaxed">{wordData.definition}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                      <div>
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Synonyms</h3>
                        <div className="flex flex-wrap gap-2">
                          {wordData.synonyms.length > 0 ? wordData.synonyms.map(s => <span key={s} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-400">{s}</span>) : <span className="text-sm font-bold text-slate-400">No clean synonyms found.</span>}
                        </div>
                      </div>
                      <div>
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Antonyms</h3>
                        <div className="flex flex-wrap gap-2">
                          {wordData.antonyms.length > 0 ? wordData.antonyms.map(a => <span key={a} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-400">{a}</span>) : <span className="text-sm font-bold text-slate-400">No clean antonyms found.</span>}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Usage Examples</h3>
                      <ul className="space-y-3">
                        {wordData.examples.map((ex, i) => (
                          <li key={i} className="flex gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 italic font-medium">
                            <span className="text-emerald-500 font-black">"</span>
                            {ex}
                            <span className="text-emerald-500 font-black">"</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Interactive Sentence Builder */}
                  <div className="mt-12 pt-10 border-t border-slate-100 dark:border-slate-800">
                    <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl"></div>
                      <h3 className="text-xl font-black uppercase tracking-tight mb-2">Interactive Sentence Builder</h3>
                      <p className="text-slate-400 text-sm font-bold mb-6 italic">Construct a sentence using "{wordData.word}" to unlock full mastery.</p>
                      
                      <form onSubmit={handleEvaluate} className="space-y-6">
                        <textarea 
                          value={userSentence}
                          onChange={(e) => setUserSentence(e.target.value)}
                          placeholder="Type your sentence here..."
                          className="w-full h-32 bg-black/40 border-2 border-white/5 rounded-2xl p-6 text-emerald-50 focus:outline-none focus:border-emerald-500 transition-all font-medium"
                        />
                        <button 
                          type="submit"
                          disabled={evaluating || !userSentence.trim()}
                          className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest rounded-xl transition-all shadow-xl shadow-emerald-900/20 flex items-center justify-center gap-3"
                        >
                          {evaluating ? "AI Analysis in Progress..." : "Submit for Evaluation"}
                        </button>
                      </form>

                      <AnimatePresence>
                        {evaluation && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className={`mt-8 p-6 rounded-2xl border-2 ${evaluation.is_correct ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}
                          >
                            <div className="flex items-center gap-3 mb-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${evaluation.is_correct ? 'bg-emerald-500' : 'bg-red-500'}`}>
                                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  {evaluation.is_correct 
                                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                  }
                                </svg>
                              </div>
                              <span className="font-black uppercase tracking-widest text-xs">{evaluation.is_correct ? 'Mastery Verified' : 'Needs Adjustment'} {evaluation.score ? `• ${evaluation.score}/100` : ''}</span>
                            </div>
                            <p className="text-sm font-bold text-slate-200 mb-4">{evaluation.feedback}</p>
                            {evaluation.issues?.length > 0 && (
                              <div className="mb-4 p-4 bg-black/30 rounded-xl border border-white/5">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Detected Issues</p>
                                <div className="space-y-2">
                                  {evaluation.issues.map((issue, index) => (
                                    <p key={index} className="text-sm text-slate-200">• {issue}</p>
                                  ))}
                                </div>
                              </div>
                            )}
                            <div className="p-4 bg-black/40 rounded-xl border border-white/5">
                              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">How To Improve</p>
                              <p className="text-emerald-400 font-medium italic">"{evaluation.suggestion}"</p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              ) : !loading && (
                <div className="h-full flex flex-col items-center justify-center text-center p-20 glass-card bg-white/50 dark:bg-slate-900/50">
                  <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-700 mb-8">
                    <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-black text-slate-400 uppercase tracking-tighter">Your Dictionary is Empty</h3>
                  <p className="text-slate-500 font-medium mt-4">Search for a word above to begin your linguistic journey.</p>
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Sidebar: Stats & Recent */}
          <div className="space-y-8">
            <div className="glass-card p-8 bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Learning Progress</h3>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                    <span>Vocabulary Reach</span>
                    <span className="text-emerald-500">{recentWords.length * 120} Words</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-[65%]"></div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="text-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                    <p className="text-2xl font-black text-slate-800 dark:text-slate-200">{recentWords.length}</p>
                    <p className="text-[8px] font-black text-slate-500 uppercase">Words Analyzed</p>
                  </div>
                  <div className="text-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                    <p className="text-2xl font-black text-slate-800 dark:text-slate-200">A+</p>
                    <p className="text-[8px] font-black text-slate-500 uppercase">Linguistic Rank</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-card p-8 bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 max-h-[500px] flex flex-col">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Recent Investigations</h3>
              <div className="space-y-3 overflow-y-auto scrollbar-hide pr-2">
                {recentWords.map(word => (
                  <button 
                    key={word}
                    onClick={() => { setSearchWord(word); handleSearch(word); }}
                    className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 border border-slate-100 dark:border-slate-800 text-left transition-all group"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-700 dark:text-slate-300 capitalize">{word}</span>
                      <svg className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

window.TalkSense.register('VocabPage', VocabPage);
