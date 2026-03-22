console.log("Navbar.jsx script executing...");
const { motion } = window;

function Navbar({ user, onNavigate, onLogout, theme, toggleTheme }) {
  if (user && window.location.hash !== '#landing') return null; // Hide in dashboard mode

  return (
    <nav className="fixed w-full z-40 border-b border-slate-100 dark:border-slate-800 bg-bgApp/80 backdrop-blur-xl transition-all duration-300">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-12">
        <div className="flex justify-between items-center h-24">
          <div 
            className="flex items-center cursor-pointer group gap-4"
            onClick={() => onNavigate('landing')}
          >
            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-2xl shadow-primary/20 group-hover:scale-110 transition-transform duration-500">
              <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-3xl font-black text-textMain tracking-tighter">TalkSense</span>
          </div>
          <div className="flex items-center space-x-10">
            {/* Theme Toggle */}
            <button 
              onClick={toggleTheme}
              className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-primary transition-all"
            >
              {theme === 'light' ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 9H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </button>

            {!user ? (
              <>
                <button 
                  onClick={() => onNavigate('login')}
                  className="text-slate-500 dark:text-slate-400 hover:text-textMain transition-colors font-black text-xs uppercase tracking-widest"
                >
                  Sign In
                </button>
                <button 
                  onClick={() => onNavigate('register')}
                  className="bg-primary hover:brightness-110 px-10 py-4 rounded-[2rem] text-white font-black text-sm uppercase tracking-widest transition-all shadow-2xl shadow-primary/30 transform hover:scale-[1.05]"
                >
                  Enroll Now
                </button>
              </>
            ) : (
              <div className="flex items-center gap-8">
                <button 
                  onClick={() => onNavigate('dashboard')}
                  className="text-slate-500 dark:text-slate-400 hover:text-textMain transition-colors font-black text-xs uppercase tracking-widest border-b-2 border-transparent hover:border-primary pb-1"
                >
                  Return to Dashboard
                </button>
                <div className="flex items-center gap-3 pl-8 border-l border-slate-100 dark:border-slate-800">
                  <div className="text-right">
                    <p className="text-sm font-black text-textMain leading-none">{user.name}</p>
                    <p className="text-[10px] text-primary font-black uppercase tracking-tighter mt-1">Authorized</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 flex items-center justify-center font-black text-slate-600 dark:text-slate-400 text-lg shadow-inner">
                    {user.name.charAt(0)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
window.TalkSense.register('Navbar', Navbar);
