import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import { Button } from '@/components/ui/button';

gsap.registerPlugin(ScrollTrigger);

interface Testimonial {
  name: string;
  role: string;
  company: string;
  quote: string;
  avatar: string;
}

const Testimonials = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  const testimonials: Testimonial[] = [
    {
      name: 'Sarah Johnson',
      role: 'CEO',
      company: 'TechStart',
      quote: 'Vendrom transformed how we connect with partners. We have raised $2M and found our key strategic partners through this platform. The networking opportunities are unmatched.',
      avatar: '/avatar-1.jpg',
    },
    {
      name: 'Michael Chen',
      role: 'Founder',
      company: 'GreenEnergy',
      quote: 'The mentorship program alone is worth its weight in gold. Our mentor helped us avoid costly mistakes and accelerate our growth by months. Highly recommended!',
      avatar: '/avatar-2.jpg',
    },
    {
      name: 'Emily Rodriguez',
      role: 'Director',
      company: 'InnovateLab',
      quote: 'We have discovered trending opportunities we never knew existed. Our network has grown 10x since joining, and we have formed partnerships that drive real results.',
      avatar: '/avatar-3.jpg',
    },
    {
      name: 'David Williams',
      role: 'Co-Founder',
      company: 'ScaleUp Inc',
      quote: 'The capital access feature helped us connect with the right investors. Within 3 months, we secured our Series A funding. Vendrom is a game-changer for startups.',
      avatar: '/avatar-4.jpg',
    },
    {
      name: 'Jennifer Park',
      role: 'Managing Director',
      company: 'Venture Partners',
      quote: 'As an investor, Vendrom gives me access to quality deal flow. The platform\'s vetting process ensures I only see businesses that match my investment criteria.',
      avatar: '/avatar-5.jpg',
    },
  ];

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Header animation
      gsap.fromTo(
        headerRef.current,
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: headerRef.current,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        }
      );

      // Carousel reveal
      gsap.fromTo(
        carouselRef.current,
        { rotateX: 10, opacity: 0 },
        {
          rotateX: 0,
          opacity: 1,
          duration: 0.8,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: carouselRef.current,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
          delay: 0.2,
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  // Auto-rotate carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [testimonials.length]);

  const goToPrev = () => {
    setActiveIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const goToNext = () => {
    setActiveIndex((prev) => (prev + 1) % testimonials.length);
  };

  const getCardStyle = (index: number) => {
    const diff = index - activeIndex;
    const normalizedDiff = ((diff + testimonials.length) % testimonials.length);
    const adjustedDiff = normalizedDiff > testimonials.length / 2 ? normalizedDiff - testimonials.length : normalizedDiff;

    if (adjustedDiff === 0) {
      return {
        transform: 'translateX(0) translateZ(100px) rotateY(0deg) scale(1)',
        opacity: 1,
        filter: 'blur(0px)',
        zIndex: 10,
      };
    } else if (Math.abs(adjustedDiff) === 1) {
      return {
        transform: `translateX(${adjustedDiff * 120}%) translateZ(-50px) rotateY(${-adjustedDiff * 35}deg) scale(0.85)`,
        opacity: 0.7,
        filter: 'blur(2px)',
        zIndex: 5,
      };
    } else {
      return {
        transform: `translateX(${adjustedDiff * 150}%) translateZ(-100px) rotateY(${-adjustedDiff * 60}deg) scale(0.7)`,
        opacity: 0,
        filter: 'blur(4px)',
        zIndex: 0,
      };
    }
  };

  return (
    <section id="testimonials" ref={sectionRef} className="py-20 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div ref={headerRef} className="text-center mb-16">
          <span className="inline-block px-4 py-2 rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] text-sm font-medium mb-4">
            TESTIMONIALS
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            What Our Members Say
          </h2>
        </div>

        {/* 3D Carousel */}
        <div
          ref={carouselRef}
          className="relative h-[400px] perspective-1000"
          style={{ perspective: '1200px' }}
        >
          {/* Floating quote mark */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 text-[200px] font-serif text-[var(--brand-primary)] pointer-events-none select-none"
            style={{ animation: 'float 5s ease-in-out infinite', opacity: 0.05 }}
          >
            <Quote className="w-48 h-48" />
          </div>

          {/* Cards container */}
          <div className="relative h-full flex items-center justify-center preserve-3d">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="absolute w-full max-w-2xl px-4 transition-all duration-600"
                style={{
                  ...getCardStyle(index),
                  transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[var(--brand-primary)]/20">
                      <img
                        src={testimonial.avatar}
                        alt={testimonial.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-900">{testimonial.name}</h4>
                      <p className="text-sm text-gray-500">
                        {testimonial.role}, {testimonial.company}
                      </p>
                    </div>
                  </div>
                  <p className="text-gray-600 leading-relaxed text-lg italic">
                    "{testimonial.quote}"
                  </p>
                  <div className="mt-6 flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className="w-5 h-5" style={{ color: "#06b6d4" }}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full border-2 hover:bg-[var(--brand-primary)] hover:text-white hover:border-[var(--brand-primary)] transition-all duration-200 hover:scale-120"
              onClick={goToPrev}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="flex gap-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index === activeIndex
                      ? 'w-8 bg-[var(--brand-primary)]'
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                  onClick={() => setActiveIndex(index)}
                />
              ))}
            </div>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full border-2 hover:bg-[var(--brand-primary)] hover:text-white hover:border-[var(--brand-primary)] transition-all duration-200 hover:scale-120"
              onClick={goToNext}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
