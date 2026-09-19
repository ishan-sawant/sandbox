import { motion, useScroll, useSpring, useMotionValueEvent, useTransform } from "motion/react";
import { ArchitectureDiagram } from "./components/ArchitectureDiagram";
import { Skills } from "./components/Skills";
import { Experience } from "./components/Experience";
import { Contact } from "./components/Contact";
import { ThemeSeagull, ThemeWaves } from "./components/ThemeDrawings";
import { useState, useEffect } from "react";
import { 
  ChevronDown, 
  ArrowRight,
  Home,
  Sun,
  Moon
} from "lucide-react";
import sydneyHarborImage from "./assets/images/sydney_harbor_refined_bg_1782136462280.jpg";

export default function App() {
  const { scrollY } = useScroll();
  const { scrollYProgress } = useScroll();
  const [showHomeButton, setShowHomeButton] = useState(false);
  const [showChevron, setShowChevron] = useState(true);
  const [theme, setTheme] = useState<'light' | 'night'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'light' || saved === 'night') {
        return saved;
      }
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return prefersDark ? 'night' : 'light';
    }
    return 'light';
  });

  const isNight = theme === 'night';

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('theme-toggling');

    if (theme === 'night') {
      root.classList.add('theme-night');
    } else {
      root.classList.remove('theme-night');
    }

    // Force reflow to apply instant class styles
    void root.offsetHeight;

    const timer = setTimeout(() => {
      root.classList.remove('theme-toggling');
    }, 150);

    return () => clearTimeout(timer);
  }, [theme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('theme')) {
        const root = document.documentElement;
        root.classList.add('theme-toggling');
        setTheme(e.matches ? 'night' : 'light');
        setTimeout(() => {
          root.classList.remove('theme-toggling');
        }, 150);
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Parallax/Layering effects for the name
  const nameX = useTransform(scrollY, [0, 500], [0, -40]);
  const nameY = useTransform(scrollY, [0, 500], [0, -20]);
  const lastNameX = useTransform(scrollY, [0, 500], [0, 40]);
  const lastNameY = useTransform(scrollY, [0, 500], [0, 20]);
  const nameOpacity = useTransform(scrollY, [0, 300], [1, 0]);
  const nameScale = useTransform(scrollY, [0, 500], [1, 1.1]);

  useMotionValueEvent(scrollY, "change", (latest) => {
    if (latest > 10) {
      setShowChevron(false);
    } else {
      setShowChevron(true);
    }

    if (latest > 100) {
      setShowHomeButton(true);
    } else {
      setShowHomeButton(false);
    }
  });

  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <div className="min-h-screen relative">
      {/* Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-brand-primary z-50 origin-left"
        style={{ scaleX }}
      />

      {/* Floating Navigation - Separate Home (Left) & Theme Toggle (Right) */}
      <nav className="fixed top-6 left-0 right-0 z-50 pointer-events-none px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between w-full">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ 
              opacity: showHomeButton ? 1 : 0, 
              y: showHomeButton ? 0 : -20,
              pointerEvents: showHomeButton ? "auto" : "none" 
            }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className="pointer-events-auto"
          >
            <a 
              href="#" 
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-xl border cursor-pointer hover:scale-105 active:scale-95 transition-all duration-75 ${
                isNight 
                  ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-blue-800/80 hover:text-white hover:border-blue-900/60' 
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-brand-primary hover:text-white hover:border-brand-primary'
              }`}
              title="Go to Home"
              aria-label="Go to Home"
            >
              <Home className="w-5 h-5" />
            </a>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.1 }}
            className="pointer-events-auto"
          >
            <button
              onClick={() => {
                const root = document.documentElement;
                root.classList.add('theme-toggling');
                const nextTheme = theme === 'light' ? 'night' : 'light';
                setTheme(nextTheme);
                localStorage.setItem('theme', nextTheme);
                setTimeout(() => {
                  root.classList.remove('theme-toggling');
                }, 150);
              }}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all shadow-xl border cursor-pointer hover:scale-105 active:scale-95 ${
                isNight 
                  ? 'bg-slate-900 border-slate-800 text-yellow-400 hover:bg-slate-800' 
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
              title={isNight ? "Switch to Light Mode" : "Switch to Night Mode"}
              aria-label="Toggle Night Mode"
            >
              {isNight ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>
          </motion.div>
        </div>
      </nav>

      {/* Hero Section - Full Height */}
      <header className="relative min-h-[100dvh] flex items-center justify-center py-20 px-6 overflow-hidden bg-bg-light">
        <div className="absolute inset-0 z-0">
          <img 
            src={sydneyHarborImage} 
            alt="Sydney Harbour Blueprint Background" 
            className="hero-bg-img w-full h-full object-cover object-bottom opacity-25 md:opacity-25 blur-[0.5px] pointer-events-none mix-blend-multiply"
            referrerPolicy="no-referrer"
          />
          {/* Subtle central fade mask to keep foreground typography highly legible */}
          <div 
            className="absolute inset-0 pointer-events-none" 
            style={{
              background: 'radial-gradient(circle at center, color-mix(in srgb, var(--theme-bg-base) 75%, transparent) 0%, transparent 80%)'
            }}
          />
          
          {/* Highly transparent ambient blue and indigo glows */}
          <div className={`absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full blur-[120px] opacity-35 animate-pulse pointer-events-none ${isNight ? 'bg-cyan-500/15' : 'bg-blue-50/40'}`} />
          <div className={`absolute bottom-1/4 right-1/4 w-[600px] h-[600px] rounded-full blur-[120px] opacity-35 animate-pulse delay-700 pointer-events-none ${isNight ? 'bg-indigo-500/15' : 'bg-indigo-50/40'}`} />
          
          {/* Smooth transition to the rest of the page (positioned behind waves to avoid washing them out) */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t pointer-events-none from-bg-light to-transparent" />

          {/* Animated Stylized Theme Seagull */}
          <ThemeSeagull isNight={isNight} />

          {/* Animated Water Theme Wave Lines (Sydney Harbor alive effect) */}
          <ThemeWaves isNight={isNight} />
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <span className={`font-mono text-xs font-bold tracking-[0.3em] uppercase px-4 py-2 rounded-full border ${
              isNight 
                ? 'bg-blue-950/80 border-blue-800/80 text-blue-300' 
                : 'text-brand-primary bg-blue-50 border-blue-100'
            }`}>
              Platform | SRE | DevOps
            </span>
          </motion.div>

          {/* Layered Animated Name */}
          <div className="mb-10 select-none relative">
            <motion.h1 
              style={{ x: nameX, y: nameY, opacity: nameOpacity, scale: nameScale }}
              className={`text-6xl md:text-9xl font-black tracking-tighter leading-[0.8] uppercase ${isNight ? 'text-slate-200' : 'text-slate-900'}`}
            >
              Ishan
            </motion.h1>
            <motion.h1 
              style={{ x: lastNameX, y: lastNameY, opacity: nameOpacity, scale: nameScale }}
              className={`text-6xl md:text-9xl font-black tracking-tighter leading-[0.8] uppercase ${isNight ? 'text-slate-800/60' : 'text-slate-200 md:text-slate-300'}`}
            >
              Sawant.
            </motion.h1>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <p className="text-xl md:text-2xl text-slate-400 font-light max-w-2xl mx-auto mb-10 leading-relaxed">
              <span className={`font-medium ${isNight ? 'text-slate-100' : 'text-slate-900'}`}>Passionate</span> about building <span className={`font-medium ${isNight ? 'text-slate-100' : 'text-slate-900'}`}>reliable systems</span> and streamlining <span className={`font-medium ${isNight ? 'text-slate-100' : 'text-slate-900'}`}>DevEx</span> in the agentic era.
            </p>
            
            <div className="flex flex-wrap justify-center gap-3 mb-10">
              {[
                { label: "How am I running this?", link: "#architecture" },
                { label: "Stack", link: "#skills" },
                { label: "Experience", link: "#experience" }
              ].map((item) => (
                <a 
                  key={item.label}
                  href={item.link}
                  className={`px-5 py-3 bg-bg-pill rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm border ${
                    isNight 
                      ? "border-slate-700 text-slate-200 hover:border-blue-400/50 hover:text-blue-300"
                      : "border-slate-200 text-slate-400 hover:border-brand-primary hover:text-brand-primary"
                  }`}
                >
                  {item.label}
                </a>
              ))}
            </div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex justify-center"
            >
              <a 
                href="#contact" 
                className={`group w-full md:w-auto px-10 py-5 font-bold rounded-2xl flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 ${
                  isNight 
                    ? 'bg-blue-800/80 border border-blue-900/60 text-slate-100 hover:bg-blue-800/80 hover:border-blue-800 shadow-xl' 
                    : 'bg-brand-primary text-white shadow-2xl shadow-blue-600/20'
                }`}
              >
                Let's Build Together
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
            </motion.div>
          </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: showChevron ? 1 : 0, y: showChevron ? 0 : 10 }}
          transition={{ duration: 0.3 }}
          className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 text-slate-400 z-20 pointer-events-none"
        >
          <ChevronDown className="w-4 h-4 animate-bounce" />
        </motion.div>
      </header>



      {/* Main Sections */}
      <main>
        <ArchitectureDiagram />
        <Skills />
        <Experience />
        <Contact isNight={isNight} />
      </main>
    </div>
  );
}
