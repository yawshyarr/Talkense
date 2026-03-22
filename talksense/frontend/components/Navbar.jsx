console.log("Navbar.jsx script executing...");
const { motion } = window;

function Navbar({ user, onNavigate, onLogout }) {
  return (
    <nav className="fixed w-full z-40 glass border-b border-primary/20 backdrop-blur-md bg-navy/80 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div 
            className="flex items-center cursor-pointer group"
            onClick={() => onNavigate('landing')}
          >
            <div className="flex-shrink-0 relative">
              <span className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary neon-text-primary tracking-tighter">
                TalkSense
              </span>
              <motion.div 
                className="absolute -top-1 -right-3 w-2 h-2 rounded-full bg-primary"
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
          </div>
          <div className="flex items-center space-x-6">
            {!user ? (
              <>
                <button 
                  onClick={() => onNavigate('login')}
                  className="text-gray-300 hover:text-white hover:neon-text-primary transition-colors font-medium"
                >
                  Log In
                </button>
                <button 
                  onClick={() => onNavigate('register')}
                  className="btn-neon px-6 py-2.5 rounded-full bg-gradient-to-r from-primary/80 to-secondary/80 text-white font-semibold shadow-lg shadow-primary/30"
                >
                  Get Started
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={() => onNavigate('dashboard')}
                  className="text-gray-300 hover:text-white hover:neon-text-primary transition-colors font-medium"
                >
                  Dashboard
                </button>
                <button 
                  onClick={() => onNavigate('setup')}
                  className="text-gray-300 hover:text-white hover:neon-text-primary transition-colors font-medium"
                >
                  New Session
                </button>
                <div className="h-8 w-px bg-gray-700 mx-2"></div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center font-bold text-sm shadow-md shadow-primary/40">
                    {user.name.charAt(0)}
                  </div>
                  <button 
                    onClick={onLogout}
                    className="text-sm text-gray-400 hover:text-red-400 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
window.TalkSense.register('Navbar', Navbar);
