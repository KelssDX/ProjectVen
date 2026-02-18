import { useEffect } from 'react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import MagneticButton from '@/components/landing/MagneticButton';
import VendromLogo from '@/components/VendromLogo';

const LandingPage = () => {

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  return (
    <div className="min-h-screen font-inter selection:bg-slate-200 selection:text-slate-900 bg-[#FAFAFA] text-slate-900 overflow-x-hidden">

      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full z-50 px-8 py-8 flex justify-between items-center bg-[#FAFAFA]/90 backdrop-blur-sm transition-all mix-blend-multiply">
        <div className="flex items-center gap-3">
          <VendromLogo showText={false} size={24} className="text-slate-900" />
          <span className="text-lg font-bold tracking-tighter">VENDROME</span>
        </div>
        <div className="flex gap-8 items-center">
          <Link to="/auth/login" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">Log In</Link>
          <Link to="/auth/signup" className="text-sm font-bold text-slate-900 border-b-2 border-slate-900 hover:border-transparent transition-all pb-0.5">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section - Massive Typography */}
      <section className="min-h-[80vh] flex flex-col justify-center items-start px-6 md:px-20 pt-40 pb-20 max-w-[1600px] mx-auto">

        <h1 className="text-[12vw] leading-[0.85] font-black tracking-tighter text-slate-900 mb-12">
          THE <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-500 animate-gradient-text">
            SOCIAL
          </span> <br />
          ECONOMY.
        </h1>

        <div className="max-w-2xl">
          <p className="text-2xl md:text-3xl text-slate-500 font-medium leading-tight mb-12">
            Vendrome is where business happens naturally. <br />
            <span className="text-slate-900">Connect, Invest, and Grow</span> in a verified ecosystem.
          </p>

          <div className="flex gap-6 items-center">
            <Link to="/auth/signup">
              <MagneticButton className="bg-slate-900 text-white px-10 py-5 rounded-full text-xl font-bold hover:scale-105 transition-transform shadow-2xl shadow-indigo-500/20">
                Join the Network
              </MagneticButton>
            </Link>
            <div className="h-px w-20 bg-slate-200"></div>
            <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Est. 2026</span>
          </div>
        </div>

      </section>

      {/* Pillars Section - Large Soft Cards */}
      <section className="py-20 px-6 md:px-20 max-w-[1600px] mx-auto">

        <div className="flex flex-col gap-8">

          {/* Card 1: Networking (Diamond) - PRIORITY */}
          <Link to="/dashboard/feed" className="group block w-full">
            <div className="w-full bg-white rounded-[3rem] p-12 md:p-20 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-slate-100 hover-card-lift relative overflow-hidden">
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                <div>
                  <div className="w-20 h-20 bg-cyan-50 rounded-3xl flex items-center justify-center mb-6 shadow-sm">
                    {/* Diamond Icon */}
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2L2 9L12 22L22 9L12 2Z" fill="url(#diamond-gradient)" stroke="url(#diamond-stroke)" strokeWidth="1.5" strokeLinejoin="round" />
                      <path d="M2 9H22" stroke="url(#diamond-stroke)" strokeWidth="1.5" strokeLinejoin="round" />
                      <path d="M12 22L7 9" stroke="url(#diamond-stroke)" strokeWidth="1.5" strokeLinejoin="round" />
                      <path d="M12 22L17 9" stroke="url(#diamond-stroke)" strokeWidth="1.5" strokeLinejoin="round" />
                      <path d="M7 9L12 2" stroke="url(#diamond-stroke)" strokeWidth="1.5" strokeLinejoin="round" />
                      <path d="M17 9L12 2" stroke="url(#diamond-stroke)" strokeWidth="1.5" strokeLinejoin="round" />
                      <defs>
                        <linearGradient id="diamond-gradient" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#22D3EE" stopOpacity="0.2" />
                          <stop offset="1" stopColor="#3B82F6" stopOpacity="0.1" />
                        </linearGradient>
                        <linearGradient id="diamond-stroke" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#06B6D4" />
                          <stop offset="1" stopColor="#3B82F6" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                  <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-4 text-slate-900">Networking.</h2>
                  <p className="text-xl text-slate-500 max-w-xl">
                    Social media for business. Connect, post, and engage with a community of entrepreneurs and investors.
                  </p>
                </div>
                <div className="w-16 h-16 rounded-full border border-slate-200 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-900 transition-all">
                  <ArrowRight size={24} />
                </div>
              </div>
              <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-l from-cyan-50/50 to-transparent rounded-full blur-3xl -z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            </div>
          </Link>

          {/* Card 2: Marketplace (Gold) */}
          <Link to="/marketplace" className="group block w-full">
            <div className="w-full bg-white rounded-[3rem] p-12 md:p-20 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-slate-100 hover-card-lift relative overflow-hidden">
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                <div>
                  <div className="w-20 h-20 bg-yellow-50 rounded-3xl flex items-center justify-center mb-6 shadow-sm">
                    {/* Gold Icon (Ingot/Stack shape) */}
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4 8L12 4L20 8L12 12L4 8Z" fill="url(#gold-gradient)" stroke="url(#gold-stroke)" strokeWidth="1.5" strokeLinejoin="round" />
                      <path d="M4 12L12 16L20 12" stroke="url(#gold-stroke)" strokeWidth="1.5" strokeLinejoin="round" />
                      <path d="M4 16L12 20L20 16" stroke="url(#gold-stroke)" strokeWidth="1.5" strokeLinejoin="round" />
                      <path d="M4 8V16" stroke="url(#gold-stroke)" strokeWidth="1.5" strokeLinejoin="round" />
                      <path d="M20 8V16" stroke="url(#gold-stroke)" strokeWidth="1.5" strokeLinejoin="round" />
                      <path d="M12 12V20" stroke="url(#gold-stroke)" strokeWidth="1.5" strokeLinejoin="round" />
                      <defs>
                        <linearGradient id="gold-gradient" x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#FACC15" stopOpacity="0.3" />
                          <stop offset="1" stopColor="#CA8A04" stopOpacity="0.1" />
                        </linearGradient>
                        <linearGradient id="gold-stroke" x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#EAB308" />
                          <stop offset="1" stopColor="#A16207" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                  <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-4 text-slate-900">Marketplace.</h2>
                  <p className="text-xl text-slate-500 max-w-xl">
                    Sell services, list products, and promote your business. The global exchange for growth.
                  </p>
                </div>
                <div className="w-16 h-16 rounded-full border border-slate-200 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-900 transition-all">
                  <ArrowRight size={24} />
                </div>
              </div>
              {/* Abstract Background Decoration */}
              <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-l from-yellow-50/50 to-transparent rounded-full blur-3xl -z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            </div>
          </Link>

          {/* Card 3: Capital (Silver) */}
          <Link to="/capital" className="group block w-full">
            <div className="w-full bg-white rounded-[3rem] p-12 md:p-20 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-slate-100 hover-card-lift relative overflow-hidden">
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                <div>
                  <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mb-6 shadow-sm">
                    {/* Silver Icon (Coin/Growth shape) */}
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" fill="url(#silver-gradient)" stroke="url(#silver-stroke)" strokeWidth="1.5" />
                      <path d="M12 6V18" stroke="url(#silver-stroke)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M15 9.5C15 9.5 15 8 12 8C9 8 9 9.5 9 11C9 12.5 15 12.5 15 14C15 15.5 15 17 12 17C9 17 9 15.5 9 15.5" stroke="url(#silver-stroke)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <defs>
                        <linearGradient id="silver-gradient" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#F1F5F9" stopOpacity="0.4" />
                          <stop offset="1" stopColor="#94A3B8" stopOpacity="0.2" />
                        </linearGradient>
                        <linearGradient id="silver-stroke" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#94A3B8" />
                          <stop offset="1" stopColor="#475569" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                  <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-4 text-slate-900">Capital.</h2>
                  <p className="text-xl text-slate-500 max-w-xl">Deal flow infrastructure. Raise funds or deploy capital with transparency.</p>
                </div>
                <div className="w-16 h-16 rounded-full border border-slate-200 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-900 transition-all">
                  <ArrowRight size={24} />
                </div>
              </div>
              <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-l from-slate-100/50 to-transparent rounded-full blur-3xl -z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            </div>
          </Link>

          {/* Card 4: Mentorship (Copper) */}
          <Link to="/mentorship" className="group block w-full">
            <div className="w-full bg-white rounded-[3rem] p-12 md:p-20 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-slate-100 hover-card-lift relative overflow-hidden">
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                <div>
                  <div className="w-20 h-20 bg-orange-50 rounded-3xl flex items-center justify-center mb-6 shadow-sm">
                    {/* Copper Icon (Shield/Badge shape) */}
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2L3 7V12C3 17.52 7 22 12 22C17 22 21 17.52 21 12V7L12 2Z" fill="url(#copper-gradient)" stroke="url(#copper-stroke)" strokeWidth="1.5" strokeLinejoin="round" />
                      <path d="M12 8V16" stroke="url(#copper-stroke)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M8 12L12 16L16 12" stroke="url(#copper-stroke)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <defs>
                        <linearGradient id="copper-gradient" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#FDBA74" stopOpacity="0.3" />
                          <stop offset="1" stopColor="#EA580C" stopOpacity="0.1" />
                        </linearGradient>
                        <linearGradient id="copper-stroke" x1="3" y1="2" x2="21" y2="22" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#F97316" />
                          <stop offset="1" stopColor="#C2410C" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                  <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-4 text-slate-900">Mentorship.</h2>
                  <p className="text-xl text-slate-500 max-w-xl">Access wisdom. Connect with industry titans and accelerate your journey.</p>
                </div>
                <div className="w-16 h-16 rounded-full border border-slate-200 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-900 transition-all">
                  <ArrowRight size={24} />
                </div>
              </div>
              <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-l from-orange-50/50 to-transparent rounded-full blur-3xl -z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            </div>
          </Link>

        </div>
      </section>

      {/* Footer - Clean */}
      <footer className="py-20 px-6 md:px-20 text-center border-t border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-3xl font-bold tracking-tighter mb-8 text-slate-900">Ready to build?</h3>
          <Link to="/auth/signup">
            <button className="px-12 py-4 rounded-full border-2 border-slate-900 text-slate-900 font-bold hover:bg-slate-900 hover:text-white transition-all">
              Start Now
            </button>
          </Link>
          <div className="mt-20 flex flex-wrap justify-between items-center text-sm font-medium text-slate-400">
            <div>© 2024 VENDROME</div>
            <div className="flex gap-8">
              <a href="#" className="hover:text-slate-900 transition-colors">Privacy</a>
              <a href="#" className="hover:text-slate-900 transition-colors">Terms</a>
              <a href="#" className="hover:text-slate-900 transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
