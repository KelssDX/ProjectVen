import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Button } from '@/components/ui/button';
import { ArrowRight, Mail } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const CTA = () => {
  const navigate = useNavigate();
  const sectionRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const shapesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Decorative shapes
      const shapes = shapesRef.current?.querySelectorAll('.shape');
      if (shapes) {
        shapes.forEach((shape, index) => {
          gsap.fromTo(
            shape,
            { scale: 0, opacity: 0 },
            {
              scale: 1,
              opacity: 0.1,
              duration: 0.8,
              ease: 'elastic.out(1, 0.5)',
              scrollTrigger: {
                trigger: sectionRef.current,
                start: 'top 70%',
                toggleActions: 'play none none reverse',
              },
              delay: 0.2 + index * 0.1,
            }
          );
        });
      }

      // Headline word reveal
      const words = contentRef.current?.querySelectorAll('.word');
      if (words) {
        gsap.fromTo(
          words,
          { y: 50, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.6,
            stagger: 0.08,
            ease: 'expo.out',
            scrollTrigger: {
              trigger: contentRef.current,
              start: 'top 80%',
              toggleActions: 'play none none reverse',
            },
            delay: 0.3,
          }
        );
      }

      // Subheadline
      const subheadline = contentRef.current?.querySelector('.subheadline');
      if (subheadline) {
        gsap.fromTo(
          subheadline,
          { y: 30, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.5,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: contentRef.current,
              start: 'top 80%',
              toggleActions: 'play none none reverse',
            },
            delay: 0.6,
          }
        );
      }

      // CTA buttons
      const ctaBtns = contentRef.current?.querySelectorAll('.cta-btn');
      if (ctaBtns && ctaBtns.length > 0) {
        gsap.fromTo(
          ctaBtns,
          { scale: 0.8, opacity: 0 },
          {
            scale: 1,
            opacity: 1,
            duration: 0.6,
            stagger: 0.15,
            ease: 'elastic.out(1, 0.5)',
            scrollTrigger: {
              trigger: contentRef.current,
              start: 'top 80%',
              toggleActions: 'play none none reverse',
            },
            delay: 0.8,
          }
        );
      }

      // Image
      gsap.fromTo(
        imageRef.current,
        { x: 80, rotateY: 10, opacity: 0 },
        {
          x: 0,
          rotateY: 0,
          opacity: 1,
          duration: 0.9,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: imageRef.current,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
          delay: 0.4,
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  // Parallax on scroll
  useEffect(() => {
    const handleScroll = () => {
      const section = sectionRef.current;
      if (!section) return;

      const rect = section.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        const progress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
        
        if (shapesRef.current) {
          const shapes = shapesRef.current.querySelectorAll('.shape');
          shapes.forEach((shape, index) => {
            const direction = index % 2 === 0 ? 1 : -1;
            (shape as HTMLElement).style.transform = `translateY(${progress * 30 * direction}px)`;
          });
        }

        if (imageRef.current) {
          imageRef.current.style.transform = `translateY(${-progress * 30}px)`;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section ref={sectionRef} className="relative py-20 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 vendrom-gradient" />

      {/* Floating shapes */}
      <div ref={shapesRef} className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="shape absolute top-10 left-10 w-40 h-40 rounded-full bg-white"
          style={{ animation: 'shapeFloat 10s ease-in-out infinite' }}
        />
        <div
          className="shape absolute top-1/3 right-20 w-24 h-24 rounded-2xl bg-white"
          style={{ animation: 'shapeFloat 8s ease-in-out infinite 2s' }}
        />
        <div
          className="shape absolute bottom-20 left-1/4 w-32 h-32 rounded-full bg-white"
          style={{ animation: 'shapeFloat 12s ease-in-out infinite 1s' }}
        />
        <div
          className="shape absolute bottom-40 right-1/3 w-20 h-20 rounded-xl bg-white"
          style={{ animation: 'shapeFloat 9s ease-in-out infinite 3s' }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div ref={contentRef} className="text-white">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
              <span className="word inline-block">Ready</span>{' '}
              <span className="word inline-block">to</span>{' '}
              <span className="word inline-block">Grow</span>{' '}
              <span className="word inline-block">Your</span>{' '}
              <span className="word inline-block">Business?</span>
            </h2>
            <p className="subheadline text-lg text-white/80 mb-8 max-w-lg">
              Join thousands of SMEs and entrepreneurs who are already connecting, 
              collaborating, and succeeding together. Start your journey today.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button
                size="lg"
                className="cta-btn bg-white text-[var(--brand-primary)] hover:bg-gray-100 px-8 py-6 text-base font-semibold btn-magnetic group"
                style={{ animation: 'ctaPulse 3s ease-in-out infinite' }}
                onClick={() => navigate('/register')}
              >
                Get Started Free
                <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="cta-btn border-2 border-white text-white hover:bg-white hover:text-[var(--brand-primary)] px-8 py-6 text-base font-semibold"
                onClick={() => navigate('/login')}
              >
                <Mail className="mr-2 w-5 h-5" />
                Contact Sales
              </Button>
            </div>
          </div>

          {/* Image */}
          <div ref={imageRef} className="relative hidden lg:block">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl transition-all duration-400 hover:scale-[1.03] hover:rotate-2">
              <img
                src="/cta-image.jpg"
                alt="Business team collaborating"
                className="w-full h-auto"
              />
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--brand-primary)]/20 to-transparent" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;
