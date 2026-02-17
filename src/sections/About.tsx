import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface StatCardProps {
  numericValue: number;
  suffix: string;
  label: string;
  delay: number;
  offset: string;
}

const StatCard = ({ numericValue, suffix, label, delay, offset }: StatCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const numberRef = useRef<HTMLSpanElement>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Card flip animation
      gsap.fromTo(
        cardRef.current,
        { rotateY: -90, opacity: 0 },
        {
          rotateY: 0,
          opacity: 1,
          duration: 0.7,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: cardRef.current,
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
          delay: delay,
        }
      );

      // Counter animation
      ScrollTrigger.create({
        trigger: cardRef.current,
        start: 'top 85%',
        onEnter: () => {
          gsap.to(
            { val: 0 },
            {
              val: numericValue,
              duration: 2,
              ease: 'expo.out',
              delay: delay + 0.2,
              onUpdate: function () {
                setCount(Math.floor(this.targets()[0].val));
              },
            }
          );
        },
      });
    }, cardRef);

    return () => ctx.revert();
  }, [delay, numericValue]);

  return (
    <div
      ref={cardRef}
      className={`bg-white rounded-2xl p-6 shadow-lg border border-gray-100 transition-all duration-300 hover:-translate-y-2 hover:scale-[1.02] hover:shadow-[0_20px_40px_rgba(0,0,0,0.1)] hover:border-[var(--brand-primary)] ${offset}`}
      style={{ transformStyle: 'preserve-3d' }}
    >
      <div className="text-3xl sm:text-4xl font-bold text-[var(--brand-primary)] mb-2 transition-all duration-300 hover:text-[var(--brand-primary-dark)] hover:[text-shadow:0_0_30px_rgba(0,78,234,0.5)]">
        <span ref={numberRef}>
          {suffix === '$' && '$'}
          {count.toLocaleString()}
          {suffix === '+' && '+'}
          {suffix === '%' && '%'}
        </span>
        {suffix === 'M+' && 'M+'}
      </div>
      <p className="text-sm text-gray-600">{label}</p>
    </div>
  );
};

const About = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const bodyRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Headline word-by-word animation
      const words = headlineRef.current?.querySelectorAll('.word');
      if (words) {
        gsap.fromTo(
          words,
          { y: 40, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.5,
            stagger: 0.08,
            ease: 'expo.out',
            scrollTrigger: {
              trigger: headlineRef.current,
              start: 'top 80%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }

      // Body text animation
      gsap.fromTo(
        bodyRef.current,
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: bodyRef.current,
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
          delay: 0.4,
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const stats = [
    { numericValue: 10000, suffix: '+', label: 'Active Businesses', offset: '' },
    { numericValue: 50, suffix: 'M+', label: 'Capital Raised', offset: 'mt-8' },
    { numericValue: 5000, suffix: '+', label: 'Successful Partnerships', offset: '-mt-4' },
    { numericValue: 98, suffix: '%', label: 'Satisfaction Rate', offset: 'mt-6' },
  ];

  return (
    <section id="about" ref={sectionRef} className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-5 gap-12 items-start">
          {/* Left Content */}
          <div className="lg:col-span-2">
            <span className="inline-block px-4 py-2 rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] text-sm font-medium mb-6">
              About Us
            </span>
            <h2 ref={headlineRef} className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-6">
              <span className="word inline-block">Empowering</span>{' '}
              <span className="word inline-block">Business</span>{' '}
              <span className="word inline-block">Growth</span>{' '}
              <span className="word inline-block text-[var(--brand-primary)]">Through</span>{' '}
              <span className="word inline-block text-[var(--brand-primary)]">Connection</span>
            </h2>
            <p ref={bodyRef} className="text-gray-600 leading-relaxed">
              Vendrom brings together SMEs, entrepreneurs, investors, and mentors in a 
              thriving ecosystem designed to foster collaboration and accelerate success. 
              Our platform provides the tools, connections, and resources you need to take 
              your business to the next level.
            </p>
          </div>

          {/* Right Stats Grid */}
          <div className="lg:col-span-3 perspective-1000">
            <div className="grid grid-cols-2 gap-6">
              {stats.map((stat, index) => (
                <StatCard
                  key={index}
                  numericValue={stat.numericValue}
                  suffix={stat.suffix}
                  label={stat.label}
                  delay={0.6 + index * 0.15}
                  offset={stat.offset}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
