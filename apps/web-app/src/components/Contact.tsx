import { motion } from "motion/react";
import { ThemeLightbulbFish } from "./ThemeDrawings";

interface ContactProps {
  isNight?: boolean;
}

export const Contact = ({ isNight }: ContactProps) => {
  const strokeColor = isNight ? "rgba(240, 249, 255, 0.32)" : "rgba(15, 23, 42, 0.11)";
  const strokeWidth = "2.2";
  const glowStrokeColor = isNight ? "rgba(240, 249, 255, 0.16)" : "rgba(15, 23, 42, 0.05)";
  const bulbFillColor = isNight ? "rgba(240, 249, 255, 0.4)" : "rgba(15, 23, 42, 0.15)";

  const commonStrokeProps = {
    stroke: strokeColor,
    strokeWidth,
    vectorEffect: "non-scaling-stroke" as const,
  };

  const commonGlowStrokeProps = {
    stroke: glowStrokeColor,
    strokeWidth,
    vectorEffect: "non-scaling-stroke" as const,
  };

  return (
    <section className="relative pt-12 pb-10 px-6 bg-slate-50 border-t border-slate-100 overflow-hidden" id="contact">
      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="flex justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className={`w-full rounded-[2.5rem] p-6 md:p-10 flex flex-col md:flex-row items-center md:justify-center gap-6 md:gap-48 ${
              isNight
                ? "bg-blue-800/80 border border-blue-900/60 text-slate-100 shadow-xl shadow-slate-950/50"
                : "bg-brand-primary text-white shadow-2xl shadow-blue-600/20"
            }`}
          >
            <div className="text-center md:text-left">
              <h2 className={`text-4xl md:text-5xl font-black mb-4 leading-[0.9] tracking-tighter ${
                isNight ? "text-slate-100" : "text-slate-900"
              }`}>
                Let's chat!
              </h2>
              <p className={`text-base md:text-lg max-w-xs leading-relaxed font-light ${
                isNight ? "text-slate-300" : "text-white/80"
              }`}>
                Ready to engineer resilient, automated cloud systems that run themselves.
              </p>
            </div>

            <div className="w-full md:w-auto max-w-sm">
              <a 
                href="https://www.linkedin.com/in/ishansawant" 
                target="_blank" 
                rel="noopener noreferrer" 
                className={`contact-linkedin-btn group flex items-center gap-5 p-5 md:p-6 rounded-[2rem] border transition-all duration-150 ease-in-out ${
                  isNight
                    ? "bg-blue-950/60 border-blue-900/40 text-blue-300 hover:bg-blue-950/80 hover:border-blue-700/80 hover:text-blue-200"
                    : "bg-white/5 border border-white/5 text-white hover:bg-white hover:text-[#0A66C2]"
                }`}
              >
                <div className={`flex-none w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner transition-all duration-150 ease-in-out border ${
                  isNight
                    ? "bg-blue-950/40 border-blue-900/40 text-white"
                    : "bg-white/10 border border-white/5 text-white group-hover:bg-[#0A66C2] group-hover:border-transparent"
                }`}>
                  <svg 
                    viewBox="0 0 24 24" 
                    fill="currentColor" 
                    className="w-11 h-11 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                  </svg>
                </div>
                <div className="text-left">
                  <span className={`text-lg font-bold block leading-tight ${
                    isNight ? "text-slate-200" : ""
                  }`}>Connect on LinkedIn</span>
                  <div className={`text-xs font-mono tracking-wider uppercase mt-1 ${
                    isNight ? "text-slate-500" : "opacity-60"
                  }`}>@ishan-sawant</div>
                </div>
              </a>
            </div>
          </motion.div>
        </div>
        
        <footer className="mt-8 pt-6 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-mono text-slate-300 uppercase tracking-[0.3em] font-black">
          <div className="flex gap-8">
            <a href="https://github.com/ishan-sawant" className="hover:text-brand-primary transition-colors">GitHub</a>
          </div>
        </footer>
      </div>

      {/* Blueprint Seafloor & Lightbulb Fish */}
      <div className="absolute inset-x-0 bottom-0 h-32 pointer-events-none select-none overflow-hidden z-0">
        {/* Seafloor Lines (same art style as landing page blueprint waves) */}
        <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="absolute bottom-0 left-0 w-full h-24 text-slate-400/20">
          <defs>
            <mask id="seabed-mask">
              {/* Entire SVG bounds filled with white (everything visible) */}
              <rect width="1440" height="120" fill="white" />
              {/* Cut out seabed line inside the Rock */}
              <path
                d="M 820 102 C 810 92, 835 80, 850 85 C 860 88, 865 98, 860 105 Z"
                fill="black"
              />
              {/* Cut out seabed line at the base of the seaweed left */}
              <circle cx="180" cy="96" r="12" fill="black" />
              {/* Cut out seabed line at the base of the seaweed right */}
              <circle cx="1250" cy="93" r="12" fill="black" />
            </mask>
          </defs>
          {/* Front seafloor dune */}
          <path
            d="M 0 100 Q 300 80, 600 95 T 1200 90 T 1440 100 L 1440 120 L 0 120 Z"
            fill="none"
            mask="url(#seabed-mask)"
            {...commonStrokeProps}
          />
          {/* Sea floor details - Rock */}
          <path
            d="M 820 102 C 810 92, 835 80, 850 85 C 860 88, 865 98, 860 105 Z"
            fill="none"
            {...commonStrokeProps}
          />
          {/* Sea floor details - Seaweed left */}
          <path
            d="M 180 110 Q 170 80, 185 50 T 175 20 M 180 110 Q 195 85, 190 60 T 198 35"
            fill="none"
            strokeLinecap="round"
            {...commonStrokeProps}
          />
          {/* Sea floor details - Seaweed right */}
          <path
            d="M 1250 105 Q 1260 80, 1245 55 T 1255 30 M 1250 105 Q 1240 85, 1245 65 T 1238 45"
            fill="none"
            strokeLinecap="round"
            {...commonStrokeProps}
          />
        </svg>
      </div>

      {/* Lightbulb Fish (Anglerfish) swimming slowly - z-20 to ensure it is always visible in front of background/cards */}
      <ThemeLightbulbFish isNight={isNight} />
    </section>
  );
};
