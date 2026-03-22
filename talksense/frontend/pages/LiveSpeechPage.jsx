console.log("LiveSpeechPage.jsx script executing...");
const { motion, AnimatePresence } = window;

const VoiceVisualizer = ({ isRecording }) => {
  const canvasRef = useRef(null);
  const requestRef = useRef();
  const audioContextRef = useRef();
  const analyserRef = useRef();
  const dataArrayRef = useRef();
  const sourceRef = useRef();
  const volumeRef = useRef(0);

  useEffect(() => {
    if (isRecording) {
      const startAudio = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
          analyserRef.current = audioContextRef.current.createAnalyser();
          sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
          sourceRef.current.connect(analyserRef.current);
          
          analyserRef.current.fftSize = 256; // Smaller FFT for performance
          const bufferLength = analyserRef.current.frequencyBinCount;
          dataArrayRef.current = new Uint8Array(bufferLength);
          
          animate();
        } catch (err) {
          console.error("Audio visualizer failed:", err);
        }
      };
      startAudio();
    } else {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      cancelAnimationFrame(requestRef.current);
    }

    return () => {
      if (audioContextRef.current) audioContextRef.current.close();
      cancelAnimationFrame(requestRef.current);
    };
  }, [isRecording]);

  const animate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;

    let phase = 0;

    const draw = () => {
      if (!analyser || !dataArray) return;
      requestRef.current = requestAnimationFrame(draw);
      
      analyser.getByteFrequencyData(dataArray);

      // Smooth volume
      let sum = 0;
      for(let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const targetVolume = isRecording ? (sum / dataArray.length / 128) : 0;
      volumeRef.current += (targetVolume - volumeRef.current) * 0.1;
      const v = volumeRef.current;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const w = canvas.width;
      const h = canvas.height;
      const mid = h / 2;
      
      phase += 0.05 + (v * 0.1);

      // We'll draw 3 layers of waves with different speeds and opacities
      const layers = [
        { opacity: 0.3, amplitude: 40, speed: 1.0, color: '#10b981' }, // Emerald 500
        { opacity: 0.5, amplitude: 30, speed: 1.5, color: '#3b82f6' }, // Blue 500
        { opacity: 1.0, amplitude: 20, speed: 2.0, color: '#064e3b' }  // Emerald 900
      ];

      layers.forEach(layer => {
        ctx.beginPath();
        ctx.strokeStyle = layer.color;
        ctx.globalAlpha = layer.opacity;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const segments = 60; 
        for (let i = 0; i <= segments; i++) {
          const x = (i / segments) * w;
          // Simplified math for better performance
          const sin = Math.sin(x * 0.015 + phase * layer.speed);
          const noise = sin * layer.amplitude * (v + 0.1);
          // Taper edges
          const taper = Math.sin((i / segments) * Math.PI);
          const y = mid + (noise * taper);
          
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      });

      ctx.globalAlpha = 1.0;
    };
    draw();
  };

  if (!isRecording) return null; // Only show when session starts

  return (
    <div className="w-full h-40 flex items-center justify-center mb-10 overflow-hidden">
      <canvas ref={canvasRef} width={800} height={160} className="w-full h-full pointer-events-none" />
    </div>
  );
};

const LiveSpeechPage = ({ onNavigate, config }) => {
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [timer, setTimer] = useState(config?.duration_seconds || 60);
  const [warnings, setWarnings] = useState(0);
  const [proctoringAlert, setProctoringAlert] = useState(null);
  const [sentiment, setSentiment] = useState({ label: 'Calibrating...', confidence: 0 });
  const [securityBreach, setSecurityAlert] = useState(null);
  const [isTerminated, setIsTerminated] = useState(false);

  // New Movement Tracking States
  const [faceDetected, setFaceDetected] = useState(false);
  const [attentionLevel, setAttentionLevel] = useState('High'); // High, Medium, Low
  const [movementLevel, setMovementLevel] = useState('Low'); // Low, Moderate, High
  const [proctoringMetrics, setProctoringMetrics] = useState({
    faceCount: 0,
    headPose: { yaw: 0, pitch: 0 },
    gaze: { x: 0.5, y: 0.5 },
    motionScore: 0,
    presenceTime: 0
  });
  
  const videoRef = useRef(null);
  const recognitionRef = useRef(null);
  const proctoringInterval = useRef(null);
  const faceMeshRef = useRef(null);
  const lastLandmarks = useRef(null);
  const faceMissingTimer = useRef(0);
  const violationsLog = useRef([]);

  // 3-Strike Rule Implementation
  useEffect(() => {
    if (warnings >= 3 && !isTerminated) {
      setIsTerminated(true);
      setSecurityAlert("TERMINATING SESSION: 3 Security Violations Detected.");
      setTimeout(() => {
        handleStop(true); // Forced stop
      }, 3000);
    }
  }, [warnings]);

  // Tab Switch Security
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isRecording && config?.security?.tabSwitch && !isTerminated) {
        logViolation("Tab Switch", "High");
        setWarnings(prev => prev + 1);
        setSecurityAlert(`INTEGRITY ALERT: Tab Switch detected (${warnings + 1}/3)`);
        setTimeout(() => setSecurityAlert(null), 4000);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isRecording, config, warnings, isTerminated]);

  const logViolation = (type, severity) => {
    const v = { type, severity, time: new Date().toLocaleTimeString() };
    violationsLog.current = [v, ...violationsLog.current].slice(0, 10);
  };

  // Speech-to-Text Initialization
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        if (isTerminated) return;
        let finalTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          }
        }
        if (finalTranscript) setTranscript(finalTranscript.trim());
      };
      recognitionRef.current = recognition;
    }
  }, [isTerminated]);

  // MediaPipe Initialization
  useEffect(() => {
    if (!window.FaceMesh) return;

    const faceMesh = new window.FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    });

    faceMesh.setOptions({
      maxNumFaces: 2,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    faceMesh.onResults((results) => {
      if (!isRecording || isTerminated) return;

      const numFaces = results.multiFaceLandmarks?.length || 0;
      setProctoringMetrics(prev => ({ ...prev, faceCount: numFaces }));
      setFaceDetected(numFaces > 0);

      // 1. Multiple Face Detection
      if (numFaces > 1) {
        logViolation("Multiple Faces Detected", "High");
        setSecurityAlert("CRITICAL: Multiple individuals detected in frame!");
        setWarnings(prev => prev + 1);
        return;
      }

      // 2. Face Presence Detection
      if (numFaces === 0) {
        faceMissingTimer.current += 1;
        if (faceMissingTimer.current > 30) { // Approx 3 seconds at 10fps
          logViolation("Face Missing", "High");
          setSecurityAlert("ALERT: No face detected for 3+ seconds!");
          setWarnings(prev => prev + 1);
          faceMissingTimer.current = 0;
        }
        return;
      } else {
        faceMissingTimer.current = 0;
      }

      const landmarks = results.multiFaceLandmarks[0];
      
      // 3. Head Pose Tracking (Yaw/Pitch)
      // Using simplified landmark ratios for pose
      const nose = landmarks[1];
      const leftEye = landmarks[33];
      const rightEye = landmarks[263];
      const chin = landmarks[152];

      const yaw = (nose.x - (leftEye.x + rightEye.x) / 2) * 100;
      const pitch = (nose.y - (leftEye.y + chin.y) / 2) * 100;

      // 4. Eye Gaze Detection (Simplified iris-to-eye ratio)
      const irisLeft = landmarks[468]; // Center of left iris
      const irisRight = landmarks[473]; // Center of right iris
      
      const gazeX = (irisLeft.x + irisRight.x) / 2;
      const gazeY = (irisLeft.y + irisRight.y) / 2;

      // 5. Motion Intensity Detection
      let motionScore = 0;
      if (lastLandmarks.current) {
        // Sample movement of key points
        [1, 33, 263, 152].forEach(idx => {
          const dX = landmarks[idx].x - lastLandmarks.current[idx].x;
          const dY = landmarks[idx].y - lastLandmarks.current[idx].y;
          motionScore += Math.sqrt(dX*dX + dY*dY);
        });
      }
      lastLandmarks.current = landmarks;

      setProctoringMetrics(prev => ({
        ...prev,
        headPose: { yaw, pitch },
        gaze: { x: gazeX, y: gazeY },
        motionScore: motionScore * 1000
      }));

      // Analyze Behaviors
      analyzeBehavior(yaw, pitch, gazeX, gazeY, motionScore * 1000);
    });

    faceMeshRef.current = faceMesh;
  }, [isRecording, isTerminated]);

  const analyzeBehavior = (yaw, pitch, gx, gy, motion) => {
    // Thresholds
    const isLookingAway = Math.abs(yaw) > 15 || Math.abs(pitch) > 10;
    const isDistracted = gx < 0.4 || gx > 0.6 || gy < 0.4 || gy > 0.6;

    // Attention Level
    if (isLookingAway || isDistracted) {
      setAttentionLevel('Low');
      // Frequency-based trigger placeholder: if attention is low for X% of time
    } else if (Math.abs(yaw) > 8) {
      setAttentionLevel('Medium');
    } else {
      setAttentionLevel('High');
    }

    // Movement Level
    if (motion > 20) setMovementLevel('High');
    else if (motion > 8) setMovementLevel('Moderate');
    else setMovementLevel('Low');

    // Behavior Violations
    if (Math.abs(yaw) > 20) {
        logViolation("Looking Away (Horizontal)", "Medium");
        setProctoringAlert("ALERT: Looking away from screen detected.");
    }
    if (pitch > 15) {
        logViolation("Looking Down", "Medium");
        setProctoringAlert("ALERT: Looking down (possible phone use).");
    }
    if (motion > 25) {
        logViolation("Excessive Movement", "Low");
        setProctoringAlert("NOTE: Excessive movement detected.");
    }
  };

  // Camera & MediaPipe Loop
  useEffect(() => {
    let stream = null;
    let camera = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 640, height: 480, frameRate: 15 } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          
          if (faceMeshRef.current) {
            let frameCount = 0;
            camera = new window.Camera(videoRef.current, {
              onFrame: async () => {
                frameCount++;
                if (frameCount % 3 === 0) { // Process every 3rd frame to reduce CPU load
                  await faceMeshRef.current.send({ image: videoRef.current });
                }
              },
              width: 480, // Lower resolution for processing
              height: 360
            });
            camera.start();
          }
        }
      } catch (err) { console.error("Camera access failed:", err); }
    };
    
    if (isRecording) startCamera();

    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
      if (camera) camera.stop();
    };
  }, [isRecording]);

  // Sentiment analysis still correlated with fillers
  useEffect(() => {
    if (isRecording && !isTerminated) {
        proctoringInterval.current = setInterval(() => {
            const fillers = (transcript.match(/\b(um|uh|like|basically|so)\b/gi) || []).length;
            const labels = fillers > 3 ? ['Nervous', 'Hesitant', 'Thinking'] : ['Confident', 'Articulate', 'Calm', 'Engaged'];
            const selected = labels[Math.floor(Math.random() * labels.length)];
            setSentiment({ label: selected, confidence: Math.floor(60 + Math.random() * 35) });
        }, 5000);
    }
    return () => clearInterval(proctoringInterval.current);
  }, [isRecording, isTerminated, transcript]);

  const handleStart = () => {
    if (isTerminated) return;
    setIsRecording(true);
    if (recognitionRef.current) {
      try { recognitionRef.current.start(); } catch (e) {}
    }
  };

  const handleStop = (forced = false) => {
    setIsRecording(false);
    if (recognitionRef.current) recognitionRef.current.stop();
    
    // Only navigate to report if not a complete integrity failure (or allow viewing why they failed)
    onNavigate('report', { 
      transcript, 
      duration_seconds: config.duration_seconds - timer,
      topic: config.topic,
      difficulty: config.difficulty,
      security_violations: warnings,
      is_terminated: forced || warnings >= 3
    });
  };

  useEffect(() => {
    let interval;
    if (isRecording && timer > 0 && !isTerminated) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    } else if (timer === 0) {
      handleStop();
    }
    return () => clearInterval(interval);
  }, [isRecording, timer, isTerminated]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 min-h-screen">
      
      <AnimatePresence>
        {(proctoringAlert || securityBreach) && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className={`fixed top-10 left-1/2 -translate-x-1/2 z-[100] px-8 py-4 rounded-2xl font-bold shadow-2xl flex items-center gap-3 border ${securityBreach ? 'bg-red-600 border-red-400 text-white' : 'bg-amber-500 border-amber-400 text-slate-900'}`}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {securityBreach || proctoringAlert}
          </motion.div>
        )}
      </AnimatePresence>

      {isTerminated && (
        <div className="fixed inset-0 z-[110] bg-bgApp/90 backdrop-blur-xl flex items-center justify-center">
          <div className="text-center p-12 glass-card border-red-500/50 max-w-md bg-bgApp">
            <div className="w-20 h-20 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-textMain mb-2">Session Terminated</h2>
            <p className="text-slate-400 mb-8">Multiple integrity violations were detected. Your results have been logged for review.</p>
            <button onClick={() => handleStop(true)} className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all">
              View Violation Report
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* Left: Recording & Transcript */}
        <div className="lg:col-span-2 space-y-8">
          <div className="glass-card p-10 min-h-[550px] flex flex-col relative overflow-hidden bg-bgApp">
            <div className="absolute top-0 left-0 w-full h-1 bg-slate-800">
              <motion.div 
                className="h-full bg-primary"
                initial={{ width: "100%" }}
                animate={{ width: `${(timer / config.duration_seconds) * 100}%` }}
                transition={{ duration: 1, ease: "linear" }}
              />
            </div>

            <div className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-ping' : 'bg-slate-600'}`}></div>
                <span className="font-bold text-slate-400 uppercase tracking-widest text-xs">
                  {isRecording ? 'Live Transmission' : 'Awaiting Initialization'}
                </span>
              </div>
              <div className="px-4 py-2 rounded-lg bg-bgApp border border-white/5 text-2xl font-mono font-bold text-primary">
                {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
              </div>
            </div>

            <VoiceVisualizer isRecording={isRecording} />

            <div className="flex-grow text-2xl leading-relaxed text-textMain/80 font-medium">
              {transcript || (isRecording ? "Analyzing audio input..." : "Your speech data will be visualized here...")}
            </div>

            <div className="mt-10 flex gap-6">
              {!isRecording ? (
                <button onClick={handleStart} className="btn-primary w-full py-5 text-xl font-black uppercase tracking-tighter shadow-primary/20">Initiate AI Analysis</button>
              ) : (
                <button onClick={() => handleStop(false)} className="w-full py-5 rounded-2xl bg-slate-800 text-white font-bold hover:bg-slate-700 transition-all border border-white/5 uppercase tracking-widest text-sm">
                  Finalize Session
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right: Biometrics */}
        <div className="space-y-8">
          {/* Camera Feed */}
          <div className="glass-card overflow-hidden relative aspect-video border-primary/10">
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover mirror -scale-x-100" />
            <div className="absolute inset-0 border-2 border-primary/20 pointer-events-none"></div>
            <div className="absolute top-4 left-4 flex gap-2">
              <div className={`px-2 py-1 ${faceDetected ? 'bg-primary' : 'bg-red-600'} text-[10px] font-bold rounded uppercase flex items-center gap-1 transition-colors text-white`}>
                <div className={`w-1 h-1 bg-white rounded-full ${faceDetected ? 'animate-pulse' : ''}`}></div>
                {faceDetected ? 'Face Active' : 'No Face Detected'}
              </div>
            </div>
            {/* Visual Gaze Tracker Overlay (Simplified) */}
            {faceDetected && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-primary/30 rounded-full"></div>
                <motion.div 
                  animate={{ 
                    x: (proctoringMetrics.gaze.x - 0.5) * 100, 
                    y: (proctoringMetrics.gaze.y - 0.5) * 100 
                  }}
                  className="absolute w-2 h-2 bg-primary rounded-full shadow-[0_0_10px_var(--primary)]"
                />
              </div>
            )}
          </div>

          {/* Movement Indicators Panel */}
          <div className="glass-card p-8 space-y-6 bg-bgApp">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Movement Analytics</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-bgApp/50 rounded-2xl border border-white/5">
                <p className="text-[8px] font-bold text-slate-500 uppercase mb-1">Attention</p>
                <p className={`text-sm font-black ${attentionLevel === 'High' ? 'text-primary' : attentionLevel === 'Medium' ? 'text-amber-400' : 'text-red-400'}`}>
                  {attentionLevel}
                </p>
              </div>
              <div className="p-4 bg-bgApp/50 rounded-2xl border border-white/5">
                <p className="text-[8px] font-bold text-slate-500 uppercase mb-1">Movement</p>
                <p className={`text-sm font-black ${movementLevel === 'Low' ? 'text-primary' : movementLevel === 'Moderate' ? 'text-amber-400' : 'text-red-400'}`}>
                  {movementLevel}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Head Stability</span>
                <span className="text-[10px] font-mono text-primary">{Math.round(100 - Math.abs(proctoringMetrics.headPose.yaw))}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                  animate={{ width: `${Math.max(0, 100 - Math.abs(proctoringMetrics.headPose.yaw))}%` }}
                  className={`h-full ${Math.abs(proctoringMetrics.headPose.yaw) > 15 ? 'bg-red-500' : 'bg-primary'}`}
                />
              </div>
            </div>
          </div>

          {/* Alerts Panel */}
          <div className="glass-card p-8 flex flex-col min-h-[250px] bg-bgApp">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Integrity Log</h3>
              <div className={`px-2 py-0.5 rounded-md text-[10px] font-black ${warnings > 0 ? 'bg-red-500/20 text-red-400' : 'bg-primary/20 text-primary'}`}>
                {warnings} / 3 Strikes
              </div>
            </div>
            
            <div className="flex-grow space-y-3 overflow-y-auto max-h-[200px] pr-2">
              {violationsLog.current.length > 0 ? violationsLog.current.map((v, i) => (
                <motion.div 
                  key={i}
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className={`p-3 rounded-xl border ${v.severity === 'High' ? 'bg-red-500/5 border-red-500/20' : 'bg-amber-500/5 border-amber-500/20'} flex justify-between items-center`}
                >
                  <div>
                    <p className={`text-[10px] font-black ${v.severity === 'High' ? 'text-red-400' : 'text-amber-400'}`}>{v.type}</p>
                    <p className="text-[8px] text-slate-500 font-bold uppercase">{v.time}</p>
                  </div>
                  <div className={`w-1.5 h-1.5 rounded-full ${v.severity === 'High' ? 'bg-red-500' : 'bg-amber-500'}`}></div>
                </motion.div>
              )) : (
                <div className="flex flex-col items-center justify-center h-32 opacity-30">
                  <svg className="w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <p className="text-[10px] font-bold uppercase">System Clear</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

window.TalkSense.register('LiveSpeechPage', LiveSpeechPage);
