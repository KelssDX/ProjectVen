import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const LogoCarousel = () => {
  const sectionRef = useRef<HTMLDivElement>(null);

  const logos = [
    { name: 'TechCorp', initial: 'T' },
    { name: 'InnovateLab', initial: 'I' },
    { name: 'GrowthCo', initial: 'G' },
    { name: 'VentureX', initial: 'V' },
    { name: 'StartupHub', initial: 'S' },
    { name: 'ScaleUp', initial: 'S' },
    { name: 'BizConnect', initial: 'B' },
    { name: 'FutureBiz', initial: 'F' },
  ];

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        sectionRef.current,
        { opacity: 0 },
        {
          opacity: 1,
          duration: 0.6,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="py-16 bg-transparent overflow-hidden relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8 relative z-10">
        <p className="text-center text-sm font-medium text-gray-500 uppercase tracking-wider">
          Trusted by leading companies worldwide
        </p>
      </div>

      <div className="relative">
        {/* Gradient masks */}
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[#f8fbff] to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#f8fbff] to-transparent z-10" />

        {/* Scrolling track */}
        <div className="flex animate-logo-scroll hover:[animation-play-state:paused]">
          {/* First set of logos */}
          {[...logos, ...logos].map((logo, index) => (
            <div
              key={index}
              className="flex-shrink-0 mx-8 group cursor-pointer"
            >
              <div className="flex items-center gap-3 px-6 py-4 rounded-xl transition-all duration-300 hover:bg-gray-50">
                <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center transition-all duration-300 group-hover:bg-[var(--brand-primary)] group-hover:scale-110">
                  <span className="text-xl font-bold text-gray-400 group-hover:text-white transition-colors">
                    {logo.initial}
                  </span>
                </div>
                <span className="text-lg font-semibold text-gray-400 group-hover:text-gray-900 transition-colors">
                  {logo.name}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LogoCarousel;
