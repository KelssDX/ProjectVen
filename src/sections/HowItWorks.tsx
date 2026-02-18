import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { UserPlus, Search, MessageSquare, TrendingUp } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

interface StepCardProps {
  step: number;
  title: string;
  description: string;
  icon: React.ElementType;
  isLeft: boolean;
  delay: number;
}

const StepCard = ({ step, title, description, icon: Icon, isLeft, delay }: StepCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const numberRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Card slide animation
      gsap.fromTo(
        cardRef.current,
        { x: isLeft ? -60 : 60, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.6,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: cardRef.current,
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
          delay: delay,
        }
      );

      // Number animation
      gsap.fromTo(
        numberRef.current,
        { scale: 0.5, opacity: 0 },
        {
          scale: 1,
          opacity: 0.1,
          duration: 0.8,
          ease: 'elastic.out(1, 0.5)',
          scrollTrigger: {
            trigger: cardRef.current,
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
          delay: delay,
        }
      );
    }, cardRef);

    return () => ctx.revert();
  }, [isLeft, delay]);

  return (
    <div
      ref={cardRef}
      className={`relative flex items-center ${isLeft ? 'lg:justify-end lg:pr-16' : 'lg:justify-start lg:pl-16'}`}
    >
      {/* Background number */}
      <div
        ref={numberRef}
        className="absolute text-[150px] font-bold text-[var(--brand-primary)] select-none pointer-events-none"
        style={{
          [isLeft ? 'right' : 'left']: '20px',
          top: '50%',
          transform: 'translateY(-50%)',
          animation: 'numberPulse 4s ease-in-out infinite',
        }}
      >
        {step}
      </div>

      {/* Card */}
      <div className="relative bg-white rounded-2xl p-6 shadow-lg border border-gray-100 max-w-md transition-all duration-300 hover:translate-x-2 hover:shadow-xl group">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110">
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-[var(--brand-primary)] uppercase tracking-wider">
                Step {step}
              </span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
            <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const HowItWorks = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<SVGPathElement>(null);

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

      // Line draw animation
      if (lineRef.current) {
        const length = lineRef.current.getTotalLength();
        gsap.set(lineRef.current, {
          strokeDasharray: length,
          strokeDashoffset: length,
        });

        gsap.to(lineRef.current, {
          strokeDashoffset: 0,
          duration: 1.5,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 60%',
            toggleActions: 'play none none reverse',
          },
          delay: 0.3,
        });
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const steps = [
    {
      step: 1,
      title: 'Create Your Profile',
      description: 'Sign up and build your business profile with details about your industry, goals, and needs.',
      icon: UserPlus,
      isLeft: true,
      delay: 0.5,
    },
    {
      step: 2,
      title: 'Connect & Discover',
      description: 'Browse and connect with businesses, mentors, and investors that match your objectives.',
      icon: Search,
      isLeft: false,
      delay: 0.7,
    },
    {
      step: 3,
      title: 'Collaborate',
      description: 'Engage in meaningful discussions, share resources, and explore partnership opportunities.',
      icon: MessageSquare,
      isLeft: true,
      delay: 0.9,
    },
    {
      step: 4,
      title: 'Grow Together',
      description: 'Track your progress, measure success, and scale your business with your new network.',
      icon: TrendingUp,
      isLeft: false,
      delay: 1.1,
    },
  ];

  return (
    <section id="how-it-works" ref={sectionRef} className="py-24 bg-transparent overflow-hidden relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 rounded-3xl border border-white/60 bg-white/65 backdrop-blur-md shadow-[0_20px_45px_rgba(30,64,175,0.1)] p-8 lg:p-10">
        {/* Header */}
        <div ref={headerRef} className="text-center mb-16">
          <span className="inline-block px-4 py-2 rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] text-sm font-medium mb-4">
            HOW IT WORKS
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Get Started in Four Simple Steps
          </h2>
        </div>

        {/* Steps with connecting line */}
        <div className="relative">
          {/* SVG Connecting Line - Desktop only */}
          <svg
            className="absolute left-1/2 top-0 h-full w-4 -translate-x-1/2 hidden lg:block"
            viewBox="0 0 4 800"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="var(--brand-primary)" />
                <stop offset="100%" stopColor="var(--brand-secondary)" />
              </linearGradient>
            </defs>
            <path
              ref={lineRef}
              d="M2 0 L2 800"
              stroke="url(#lineGradient)"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
          </svg>

          {/* Steps Grid */}
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-0">
            {steps.map((step, index) => (
              <StepCard
                key={index}
                step={step.step}
                title={step.title}
                description={step.description}
                icon={step.icon}
                isLeft={step.isLeft}
                delay={step.delay}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
