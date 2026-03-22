console.log("DashboardPage.jsx script executing...");
const { motion, AnimatePresence } = window;

const Dashboard = ({ user, onNavigate }) => {
  const [recentSessions, setRecentSessions] = useState([]);
  const [stats, setStats] = useState({ avgScore: 0, total: 0, words: 0, wpm: 0, scoresHistory: [] });

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const res = await fetch('http://localhost:8002/api/sessions/', {
           headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
           const data = await res.json();
           
           if (data.length > 0) {
              const sorted = [...data].sort((a,b) => new Date(b.date) - new Date(a.date));
              setRecentSessions(sorted.slice(0, 5));
              
              let totalWords = 0;
              let totalScore = 0;
              let totalPace = 0;
              let scoresHist = [];
              
              // Sort asc for history graph
              const ascData = [...data].sort((a,b) => new Date(a.date) - new Date(b.date));
              
              ascData.forEach(session => {
                  const sData = session.analysis_data;
                  if (sData) {
                      totalWords += sData.stats?.words_spoken || 0;
                      totalPace += sData.stats?.pace || 0;
                      const sessionScore = Math.round((sData.scores.fluency + sData.scores.clarity + sData.scores.pace + sData.scores.vocabulary + sData.scores.confidence) / 5);
                      totalScore += sessionScore;
                      scoresHist.push(sessionScore);
                  }
              });
              
              setStats({
                  avgScore: Math.round(totalScore / data.length),
                  total: data.length,
                  words: totalWords,
                  wpm: Math.round(totalPace / data.length),
                  scoresHistory: scoresHist.slice(-10) // last 10 for graph
              });
           }
        }
      } catch (err) { 
        console.error("Failed to load dashboard data");
      }
    };
    fetchDashboard();
  }, []);

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  
  const formatDuration = (sec) => {
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      
      {/* Header Profile Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8 mb-8 flex flex-col md:flex-row items-center md:items-start justify-between gap-6"
      >
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-4xl font-bold shadow-[0_0_20px_rgba(0,229,255,0.4)]">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-1">Welcome back, {user?.name || 'User'}!</h1>
            <p className="text-gray-400">Ready to improve your speaking skills today?</p>
            
            <div className="flex gap-4 mt-4">
              <span className="bg-primary/20 text-primary px-3 py-1 rounded-full text-sm font-medium border border-primary/30 flex items-center gap-2">
                🔥 {user?.streaks || 0} Day Streak
              </span>
              <span className="bg-secondary/20 text-secondary px-3 py-1 rounded-full text-sm font-medium border border-secondary/30 flex items-center gap-2">
                🏆 Top 10% Fluency
              </span>
            </div>
          </div>
        </div>
        
        <button 
          onClick={() => onNavigate('setup')}
          className="btn-neon px-8 py-4 rounded-xl bg-gradient-to-r from-primary to-secondary font-bold text-lg whitespace-nowrap shadow-lg shadow-primary/20"
        >
          + New Session
        </button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (Stats & Graph) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="glass-card p-4 text-center">
              <p className="text-gray-400 text-sm mb-1">Avg Score</p>
              <p className="text-3xl font-bold text-primary">{stats.avgScore || '-'}</p>
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="glass-card p-4 text-center">
              <p className="text-gray-400 text-sm mb-1">Total Sessions</p>
              <p className="text-3xl font-bold text-white">{stats.total}</p>
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="glass-card p-4 text-center">
              <p className="text-gray-400 text-sm mb-1">Words Spoken</p>
              <p className="text-3xl font-bold text-white">{stats.words >= 1000 ? (stats.words/1000).toFixed(1) + 'k' : stats.words}</p>
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="glass-card p-4 text-center">
              <p className="text-gray-400 text-sm mb-1">Avg Pace (WPM)</p>
              <p className="text-3xl font-bold text-secondary">{stats.wpm || '-'}</p>
            </motion.div>
          </div>

          {/* Progress Graph Area */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card p-6 min-h-[300px] flex flex-col justify-center items-center relative overflow-hidden group"
          >
             <h3 className="text-xl font-semibold mb-6 w-full text-left">Score Progression</h3>
             
             {stats.scoresHistory.length > 0 ? (
               <div className="flex items-end gap-2 sm:gap-4 h-40 w-full px-2 sm:px-4 mt-auto">
                  {stats.scoresHistory.map((score, i) => (
                    <div key={i} className="flex-1 flex flex-col justify-end group-hover:opacity-100 opacity-80 transition-opacity">
                      <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: `${score}%` }}
                        transition={{ duration: 1, delay: 0.5 + (i * 0.1) }}
                        className="w-full bg-gradient-to-t from-primary/40 to-primary rounded-t-md relative group/bar"
                      >
                        <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold opacity-0 group-hover/bar:opacity-100 transition-opacity">{score}</span>
                      </motion.div>
                    </div>
                  ))}
               </div>
             ) : (
               <p className="text-gray-500 m-auto text-sm">Complete a session to see your progress graph!</p>
             )}
          </motion.div>
        </div>

        {/* Right Column (Recent History) */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-6 flex flex-col"
        >
          <div className="flex justify-between items-end mb-6">
            <h3 className="text-xl font-semibold">Recent Sessions</h3>
            {recentSessions.length > 0 && <button className="text-sm text-primary hover:neon-text-primary transition-all">View All</button>}
          </div>
          
          <div className="space-y-4 flex-grow">
            {recentSessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-6 text-center border border-dashed border-white/20 rounded-xl bg-white/5">
                    <p className="text-gray-400 text-sm mb-4">No sessions yet. Time to practice!</p>
                    <button onClick={() => onNavigate('setup')} className="text-primary text-sm font-semibold hover:neon-text-primary">Start First Session</button>
                </div>
            ) : (
                recentSessions.map((session, i) => {
                  const sData = session.analysis_data;
                  const score = sData ? Math.round((sData.scores.fluency + sData.scores.clarity + sData.scores.pace + sData.scores.vocabulary + sData.scores.confidence) / 5) : 0;
                  
                  return (
                      <div 
                        key={session.id} 
                        className="bg-white/5 border border-white/10 rounded-lg p-4 hover:border-primary/50 transition-colors cursor-pointer"
                        onClick={() => onNavigate('report', {
                            transcript: session.raw_transcript,
                            topic: session.topic,
                            duration_seconds: session.duration_seconds
                            // In a real app we'd fetch the exact session by ID or cache reports
                        })}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-white truncate max-w-[70%]">{session.topic}</h4>
                          <span className={`font-bold ${score >= 90 ? 'text-green-400' : score >= 80 ? 'text-primary' : 'text-yellow-400'}`}>
                            {score || '-'}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-400">
                          <span>{formatDate(session.date)}</span>
                          <span>⏱ {formatDuration(session.duration_seconds)}</span>
                        </div>
                      </div>
                  );
                })
            )}
          </div>
        </motion.div>

      </div>
    </div>
  );
};
window.TalkSense.register('Dashboard', Dashboard);
