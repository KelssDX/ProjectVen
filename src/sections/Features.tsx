import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { 
  Network, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Megaphone, 
  Handshake 
} from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

interface FeatureCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  index: number;
  rotation: string;
}

const FeatureCard = ({ icon: Icon, title, description, index, rotation }: FeatureCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        cardRef.current,
        { y: 60, rotateZ: parseFloat(rotation) - 1, opacity: 0 },
        {
          y: 0,
          rotateZ: parseFloat(rotation),
          opacity: 1,
          duration: 0.7,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: cardRef.current,
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
          delay: 0.5 + index * 0.12,
        }
      );
    }, cardRef);

    return () => ctx.revert();
  }, [index, rotation]);

  return (
    <div
      ref={cardRef}
      className="group bg-white rounded-2xl p-8 shadow-lg border border-gray-100 transition-all duration-350 hover:-translate-y-3 hover:scale-[1.03] hover:rotate-0 hover:shadow-[0_25px_50px_rgba(0,0,0,0.12)] hover:border-[var(--brand-primary)]/20 hover:z-10"
    >
      <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6 transition-all duration-300 group-hover:scale-115 group-hover:-translate-y-1 feature-icon-bg">
        <Icon className="w-7 h-7 text-[var(--brand-primary)] transition-colors duration-300 group-hover:text-white" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
      
      {/* Background pattern */}
      <div className="absolute bottom-0 right-0 w-32 h-32 opacity-0 group-hover:opacity-[0.03] transition-opacity duration-300 pointer-events-none">
        <div className="w-full h-full bg-[var(--brand-primary)] rounded-tl-full" />
      </div>
    </div>
  );
};

const Features = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Label animation
      const sectionLabel = headerRef.current?.querySelector('.section-label');
      if (sectionLabel) {
        gsap.fromTo(
          sectionLabel,
          { x: -30, opacity: 0 },
          {
            x: 0,
            opacity: 1,
            duration: 0.5,
            ease: 'expo.out',
            scrollTrigger: {
              trigger: headerRef.current,
              start: 'top 80%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }

      // Headline character animation
      const chars = headerRef.current?.querySelectorAll('.char');
      if (chars && chars.length > 0) {
        gsap.fromTo(
          chars,
          { y: 30, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.6,
            stagger: 0.02,
            ease: 'expo.out',
            scrollTrigger: {
              trigger: headerRef.current,
              start: 'top 80%',
              toggleActions: 'play none none reverse',
            },
            delay: 0.1,
          }
        );
      }

      // Subheadline animation
      const subheadline = headerRef.current?.querySelector('.subheadline');
      if (subheadline) {
        gsap.fromTo(
          subheadline,
          { opacity: 0, filter: 'blur(8px)' },
          {
            opacity: 1,
            filter: 'blur(0px)',
            duration: 0.5,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: headerRef.current,
              start: 'top 80%',
              toggleActions: 'play none none reverse',
            },
            delay: 0.4,
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const features = [
    {
      icon: Network,
      title: 'Smart Networking',
      description: 'Connect with relevant businesses using AI-powered matching based on industry, goals, and complementary skills.',
      rotation: '-2',
    },
    {
      icon: TrendingUp,
      title: 'Trending Insights',
      description: 'Discover trending SMEs and emerging opportunities in your industry with real-time analytics.',
      rotation: '0',
    },
    {
      icon: DollarSign,
      title: 'Capital Access',
      description: 'Connect with investors, apply for funding, and showcase your business to potential backers.',
      rotation: '2',
    },
    {
      icon: Users,
      title: 'Mentorship Program',
      description: 'Learn from experienced entrepreneurs and industry experts through structured mentorship.',
      rotation: '-2',
    },
    {
      icon: Megaphone,
      title: 'Marketing Tools',
      description: 'Reach your target audience with precision marketing tools and audience analytics.',
      rotation: '0',
    },
    {
      icon: Handshake,
      title: 'Partnership Hub',
      description: 'Find strategic partners, form joint ventures, and expand your business network.',
      rotation: '2',
    },
  ];

  const headlineText = 'Everything You Need to Succeed';

  return (
    <section id="features" ref={sectionRef} className="py-24 bg-transparent relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div ref={headerRef} className="text-center mb-16">
          <span className="section-label inline-block px-4 py-2 rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] text-sm font-medium mb-4">
            FEATURES
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            {headlineText.split('').map((char, index) => (
              <span key={index} className="char inline-block">
                {char === ' ' ? '\u00A0' : char}
              </span>
            ))}
          </h2>
          <p className="subheadline text-lg text-gray-600 max-w-2xl mx-auto">
            Powerful tools designed to accelerate your business growth
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 p-2">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              index={index}
              rotation={feature.rotation}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
