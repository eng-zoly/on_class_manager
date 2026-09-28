import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Star, Award, CheckCircle2, Laptop } from 'lucide-react';

export default function TeacherIllustration() {
  return (
    <div className="relative w-full max-w-[420px] mx-auto aspect-square flex items-center justify-center select-none">
      {/* Background Soft Radiant Light Glows */}
      <motion.div 
        animate={{ 
          scale: [1, 1.1, 1],
          opacity: [0.45, 0.75, 0.45]
        }}
        transition={{ repeat: Infinity, duration: 7, ease: "easeInOut" }}
        className="absolute inset-4 rounded-full bg-gradient-to-tr from-indigo-300/40 via-violet-200/35 to-pink-200/30 blur-3xl"
      />

      {/* Outer Floating Ring */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 40, ease: "linear" }}
        className="absolute w-[86%] h-[86%] rounded-full border border-dashed border-indigo-300/50"
      />

      {/* SVG Character and Teaching Workspace */}
      <motion.div 
        animate={{ y: [0, -9, 0] }}
        transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
        className="relative z-10 w-full h-full flex items-center justify-center"
      >
        <svg
          viewBox="0 0 400 400"
          className="w-full h-full filter drop-shadow-xl"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Subtle Stage Podium */}
          <ellipse cx="200" cy="350" rx="140" ry="24" fill="url(#podiumGradient)" opacity="0.3" />
          <ellipse cx="200" cy="346" rx="110" ry="16" fill="url(#podiumInner)" opacity="0.25" />

          {/* Teacher Silhouette / Character */}
          <g id="teacher-character">
            {/* Teacher Body / Blazer */}
            <path
              d="M130 340 C130 260 160 230 200 230 C240 230 270 260 270 340 Z"
              fill="url(#blazerGradient)"
            />
            {/* Shirt Collar / Inner tie */}
            <path d="M185 230 L200 275 L215 230 Z" fill="#FFFFFF" opacity="0.98" />
            <path d="M197 230 L200 282 L203 230 Z" fill="#4F46E5" />

            {/* Teacher Neck */}
            <rect x="188" y="195" width="24" height="40" rx="10" fill="#FCD34D" />
            
            {/* Teacher Head */}
            <circle cx="200" cy="170" r="42" fill="#FDE68A" />

            {/* Hair Style */}
            <path
              d="M158 165 C158 128 175 120 200 120 C228 120 242 130 242 165 C242 170 236 172 230 160 C220 142 205 138 190 142 C175 146 168 165 158 165 Z"
              fill="#1E1B4B"
            />

            {/* Glasses */}
            <rect x="172" y="160" width="22" height="16" rx="4" stroke="#3730A3" strokeWidth="3" fill="rgba(255,255,255,0.6)" />
            <rect x="206" y="160" width="22" height="16" rx="4" stroke="#3730A3" strokeWidth="3" fill="rgba(255,255,255,0.6)" />
            <line x1="194" y1="168" x2="206" y2="168" stroke="#3730A3" strokeWidth="3" />
            <line x1="162" y1="166" x2="172" y2="166" stroke="#3730A3" strokeWidth="2.5" />
            <line x1="228" y1="166" x2="238" y2="166" stroke="#3730A3" strokeWidth="2.5" />

            {/* Smile & Cheeks */}
            <path d="M192 188 Q200 196 208 188" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="174" cy="180" r="4" fill="#FCA5A5" opacity="0.7" />
            <circle cx="226" cy="180" r="4" fill="#FCA5A5" opacity="0.7" />

            {/* Graduation Cap / Academic Mortarboard */}
            <g id="graduation-cap">
              <polygon points="200,82 255,108 200,126 145,108" fill="url(#capGradient)" />
              <polygon points="200,82 255,108 200,126 145,108" stroke="#6366F1" strokeWidth="1.5" />
              <rect x="175" y="118" width="50" height="14" rx="3" fill="#1E1B4B" />
              {/* Tassel */}
              <path d="M200 104 C205 106 245 115 248 135" stroke="#FBBF24" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              <circle cx="248" cy="138" r="3.5" fill="#F59E0B" />
            </g>

            {/* Left Arm holding interactive Tablet */}
            <path d="M142 270 C130 285 125 315 152 328 C165 334 175 320 178 305 Z" fill="url(#armGradient)" />
            {/* Tablet */}
            <rect x="120" y="278" width="52" height="42" rx="6" fill="#0F172A" stroke="#4F46E5" strokeWidth="2.5" transform="rotate(-12 120 278)" />
            <rect x="125" y="284" width="42" height="30" rx="3" fill="#1E293B" transform="rotate(-12 125 284)" />
            <line x1="130" y1="294" x2="158" y2="288" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
            <line x1="132" y1="302" x2="152" y2="298" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" />
            <circle cx="160" cy="304" r="3" fill="#10B981" />

            {/* Right Arm in friendly teaching gesture pointing up */}
            <path d="M258 270 C272 250 288 232 298 215 C304 205 315 212 308 225 C295 248 275 290 260 305 Z" fill="url(#armGradient)" />
            {/* Hand with glowing pointer tip */}
            <circle cx="304" cy="210" r="5" fill="#FCD34D" />
            <circle cx="312" cy="198" r="4.5" fill="#3B82F6" />
            <circle cx="312" cy="198" r="10" fill="#3B82F6" opacity="0.35" />
          </g>

          {/* Gradients */}
          <defs>
            <linearGradient id="blazerGradient" x1="130" y1="230" x2="270" y2="340" gradientUnits="userSpaceOnUse">
              <stop stopColor="#4F46E5" />
              <stop offset="0.5" stopColor="#4338CA" />
              <stop offset="1" stopColor="#312E81" />
            </linearGradient>
            <linearGradient id="armGradient" x1="140" y1="250" x2="270" y2="320" gradientUnits="userSpaceOnUse">
              <stop stopColor="#6366F1" />
              <stop offset="1" stopColor="#3730A3" />
            </linearGradient>
            <linearGradient id="capGradient" x1="145" y1="82" x2="255" y2="126" gradientUnits="userSpaceOnUse">
              <stop stopColor="#3730A3" />
              <stop offset="1" stopColor="#1E1B4B" />
            </linearGradient>
            <radialGradient id="podiumGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#818CF8" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="podiumInner" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#A855F7" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
            </radialGradient>
          </defs>
        </svg>
      </motion.div>

      {/* Floating Glassmorphic Badge 1: Top Right - A+ Excellence Badge */}
      <motion.div
        animate={{ y: [0, -10, 0], x: [0, 4, 0] }}
        transition={{ repeat: Infinity, duration: 4.8, ease: "easeInOut" }}
        className="absolute top-2 -right-2 sm:right-2 z-20 flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white/90 border border-amber-200/90 backdrop-blur-xl shadow-lg shadow-amber-500/10"
      >
        <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-slate-950 font-black text-xs shadow-sm shadow-amber-500/20">
          <Award className="h-4 w-4" />
        </div>
        <div>
          <div className="flex items-center gap-1">
            <span className="text-xs font-black text-slate-900">Grade A+</span>
            <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
          </div>
          <p className="text-[10px] text-slate-500 font-semibold">98.5% Pass Rate</p>
        </div>
      </motion.div>

      {/* Floating Glassmorphic Badge 2: Left Middle - Student Attendance */}
      <motion.div
        animate={{ y: [0, 8, 0], x: [0, -3, 0] }}
        transition={{ repeat: Infinity, duration: 5.4, ease: "easeInOut", delay: 0.8 }}
        className="absolute bottom-20 -left-4 sm:left-0 z-20 flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white/90 border border-emerald-200/90 backdrop-blur-xl shadow-lg shadow-emerald-500/10"
      >
        <div className="h-8 w-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
          <CheckCircle2 className="h-4 w-4" />
        </div>
        <div>
          <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
            <span>វត្តមានសិស្ស</span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.2 rounded-full border border-emerald-200">
              100%
            </span>
          </span>
          <p className="text-[10px] text-slate-500 font-semibold">Active Students</p>
        </div>
      </motion.div>

      {/* Floating Glassmorphic Badge 3: Bottom Right - Computer Class */}
      <motion.div
        animate={{ y: [0, -7, 0], x: [0, 3, 0] }}
        transition={{ repeat: Infinity, duration: 6, ease: "easeInOut", delay: 1.2 }}
        className="absolute bottom-4 right-4 z-20 flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white/90 border border-indigo-200/90 backdrop-blur-xl shadow-lg shadow-indigo-500/10"
      >
        <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-sm shadow-indigo-500/20">
          <Laptop className="h-4 w-4" />
        </div>
        <div>
          <span className="text-xs font-bold text-slate-900">វគ្គកុំព្យូទ័ររដ្ឋបាល</span>
          <p className="text-[10px] text-indigo-600 font-bold">Computer & Office</p>
        </div>
      </motion.div>

      {/* Sparkle Particles */}
      <motion.div
        animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        className="absolute top-10 left-10 text-indigo-500"
      >
        <Sparkles className="h-5 w-5" />
      </motion.div>
      <motion.div
        animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.9, 0.3] }}
        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 1.5 }}
        className="absolute top-28 right-16 text-amber-500"
      >
        <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
      </motion.div>
    </div>
  );
}
