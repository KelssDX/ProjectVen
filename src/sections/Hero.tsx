import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Play, ArrowRight } from 'lucide-react';
import gsap from 'gsap';

const Hero = () => {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLDivElement>(null);
  const subheadlineRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const shapesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const words = headlineRef.current?.querySelectorAll('.word');
      if (words) {
        gsap.fromTo(
          words,
          { y: 60, opacity: 0, rotateX: 15 },
          {
            y: 0,
            opacity: 1,
            rotateX: 0,
            duration: 0.8,
            stagger: 0.1,
            ease: 'expo.out',
            delay: 0.3,
          }
        );
      }

      gsap.fromTo(
        subheadlineRef.current,
        { opacity: 0, filter: 'blur(10px)' },
        {
          opacity: 1,
          filter: 'blur(0px)',
          duration: 0.7,
          ease: 'power2.out',
          delay: 0.8,
        }
      );

      gsap.fromTo(
        ctaRef.current?.children || [],
        { scale: 0.8, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 0.6,
          stagger: 0.1,
          ease: 'elastic.out(1, 0.5)',
          delay: 1.0,
        }
      );

      gsap.fromTo(
        imageRef.current,
        { rotateY: 15, x: 100, opacity: 0 },
        {
          rotateY: 0,
          x: 0,
          opacity: 1,
          duration: 1,
          ease: 'expo.out',
          delay: 0.6,
        }
      );

      const shapes = shapesRef.current?.querySelectorAll('.shape');
      if (shapes) {
        shapes.forEach((shape, index) => {
          gsap.fromTo(
            shape,
            { scale: 0, opacity: 0 },
            {
              scale: 1,
              opacity: 0.2,
              duration: 0.8,
              ease: 'elastic.out(1, 0.5)',
              delay: 1.4 + index * 0.1,
            }
          );
        });
      }
    }, heroRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const heroHeight = heroRef.current?.offsetHeight || 0;

      if (scrollY < heroHeight) {
        const progress = scrollY / heroHeight;

        if (headlineRef.current) {
          headlineRef.current.style.transform = `translateY(${-scrollY * 0.3}px)`;
        }
        if (subheadlineRef.current) {
          subheadlineRef.current.style.transform = `translateY(${-scrollY * 0.4}px)`;
        }
        if (imageRef.current) {
          imageRef.current.style.transform = `translateY(${-scrollY * 0.2}px) rotateY(${-progress * 5}deg)`;
        }

        const fadeStart = heroHeight * 0.5;
        if (scrollY > fadeStart) {
          const fadeProgress = (scrollY - fadeStart) / (heroHeight * 0.5);
          const opacity = Math.max(0, 1 - fadeProgress);
          if (headlineRef.current) {
            headlineRef.current.style.opacity = String(opacity);
          }
          if (subheadlineRef.current) {
            subheadlineRef.current.style.opacity = String(opacity);
          }
          if (ctaRef.current) {
            ctaRef.current.style.opacity = String(opacity);
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const avatars = [
    '/avatar-1.jpg',
    '/avatar-2.jpg',
    '/avatar-3.jpg',
    '/avatar-4.jpg',
    '/avatar-5.jpg',
  ];

  return (
    <section
      id="home"
      ref={heroRef}
      className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-gray-50/80 via-white/70 to-sky-50/80"
    >
      <div ref={shapesRef} className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="shape absolute top-20 left-10 w-32 h-32 rounded-full bg-[var(--brand-primary)]"
          style={{ animation: 'shapeFloat 8s ease-in-out infinite' }}
        />
        <div
          className="shape absolute top-40 right-20 w-24 h-24 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)',
            animation: 'shapeFloat 10s ease-in-out infinite 2s',
          }}
        />
        <div
          className="shape absolute bottom-40 left-1/4 w-16 h-16 rounded-full bg-gray-300"
          style={{ animation: 'shapeFloat 7s ease-in-out infinite 1s' }}
        />
        <div
          className="shape absolute bottom-20 right-1/3 w-20 h-20 rounded-xl bg-[var(--brand-primary-light)]"
          style={{ animation: 'shapeFloat 9s ease-in-out infinite 3s' }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 pt-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="relative z-10">
            <div ref={headlineRef} className="perspective-1000">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                <span className="word inline-block">Connect.</span>{' '}
                <span className="word inline-block">Collaborate.</span>
                <br />
                <span className="word inline-block text-[var(--brand-primary)]">Grow</span>{' '}
                <span className="word inline-block text-[var(--brand-primary)]">Together.</span>
              </h1>
            </div>

            <p
              ref={subheadlineRef}
              className="mt-6 text-lg text-gray-600 max-w-lg"
            >
              The ultimate business ecosystem where SMEs and entrepreneurs connect,
              share resources, and build successful partnerships. Join thousands of
              businesses already growing together.
            </p>

            <div ref={ctaRef} className="mt-8 flex flex-wrap gap-4">
              <Button
                size="lg"
                className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white px-8 py-6 text-base font-semibold btn-magnetic animate-pulse-glow group"
                onClick={() => navigate('/register')}
              >
                Get Started Free
                <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-gray-300 hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] px-8 py-6 text-base font-semibold group"
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <Play className="mr-2 w-5 h-5 transition-transform group-hover:scale-110" />
                Watch Demo
              </Button>
            </div>

            <div className="mt-10 flex items-center gap-4">
              <div className="flex -space-x-3">
                {avatars.map((avatar, index) => (
                  <div
                    key={index}
                    className="w-10 h-10 rounded-full border-2 border-white overflow-hidden shadow-md"
                    style={{
                      animation: `float 4s ease-in-out infinite ${index * 0.5}s`,
                    }}
                  >
                    <img
                      src={avatar}
                      alt={`User ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">10,000+</p>
                <p className="text-xs text-gray-500">businesses already growing</p>
              </div>
            </div>
          </div>

          <div
            ref={imageRef}
            className="relative lg:pl-8 preserve-3d"
          >
            <div className="relative rounded-2xl overflow-hidden shadow-2xl transition-all duration-400 hover:scale-[1.02] hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(0,0,0,0.15)]">
              <img
                src="/hero-image.jpg"
                alt="Business professionals collaborating"
                className="w-full h-auto"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
            </div>

            <div
              className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-xl p-4 flex items-center gap-3"
              style={{ animation: 'float 5s ease-in-out infinite' }}
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #06b6d4, #0ea5e9)" }}>
                <span className="text-white text-xl font-bold">$</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">$50M+</p>
                <p className="text-xs text-gray-500">Capital Raised</p>
              </div>
            </div>

            <div
              className="absolute -top-4 -right-4 bg-white rounded-xl shadow-xl p-4 flex items-center gap-3"
              style={{ animation: 'float 6s ease-in-out infinite 1s' }}
            >
              <div className="w-12 h-12 rounded-full bg-[var(--brand-primary)] flex items-center justify-center">
                <span className="text-white text-xl font-bold">5K</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Partnerships</p>
                <p className="text-xs text-gray-500">Created</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
