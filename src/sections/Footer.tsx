import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { VendromLogo } from '@/components/VendromLogo';
import { 
  Linkedin, 
  Twitter, 
  Facebook, 
  Instagram,
  Send,
  MapPin,
  Phone,
  Mail
} from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const Footer = () => {
  const footerRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState('');

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Logo
      const footerLogo = footerRef.current?.querySelector('.footer-logo');
      if (footerLogo) {
        gsap.fromTo(
          footerLogo,
          { y: 20, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.5,
            ease: 'expo.out',
            scrollTrigger: {
              trigger: footerRef.current,
              start: 'top 90%',
              toggleActions: 'play none none reverse',
            },
            delay: 0.2,
          }
        );
      }

      // Description
      const footerDesc = footerRef.current?.querySelector('.footer-desc');
      if (footerDesc) {
        gsap.fromTo(
          footerDesc,
          { opacity: 0 },
          {
            opacity: 1,
            duration: 0.4,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: footerRef.current,
              start: 'top 90%',
              toggleActions: 'play none none reverse',
            },
            delay: 0.35,
          }
        );
      }

      // Newsletter
      const newsletter = footerRef.current?.querySelector('.newsletter');
      if (newsletter) {
        gsap.fromTo(
          newsletter,
          { y: 30, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.5,
            ease: 'expo.out',
            scrollTrigger: {
              trigger: footerRef.current,
              start: 'top 90%',
              toggleActions: 'play none none reverse',
            },
            delay: 0.45,
          }
        );
      }

      // Links columns
      const linkColumns = footerRef.current?.querySelectorAll('.link-column');
      linkColumns?.forEach((column, colIndex) => {
        const links = column.querySelectorAll('a');
        if (links.length > 0) {
          gsap.fromTo(
            links,
            { y: 15, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.4,
              stagger: 0.06,
              ease: 'expo.out',
              scrollTrigger: {
                trigger: footerRef.current,
                start: 'top 90%',
                toggleActions: 'play none none reverse',
              },
              delay: 0.3 + colIndex * 0.1,
            }
          );
        }
      });

      // Social icons
      const socialIcons = footerRef.current?.querySelectorAll('.social-icon');
      if (socialIcons && socialIcons.length > 0) {
        gsap.fromTo(
          socialIcons,
          { scale: 0, opacity: 0 },
          {
            scale: 1,
            opacity: 1,
            duration: 0.4,
            stagger: 0.08,
            ease: 'elastic.out(1, 0.5)',
            scrollTrigger: {
              trigger: footerRef.current,
              start: 'top 90%',
              toggleActions: 'play none none reverse',
            },
            delay: 0.8,
          }
        );
      }
    }, footerRef);

    return () => ctx.revert();
  }, []);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle subscription
    alert(`Thank you for subscribing with: ${email}`);
    setEmail('');
  };

  const quickLinks = [
    { name: 'Home', href: '#home' },
    { name: 'About Us', href: '#about' },
    { name: 'Features', href: '#features' },
    { name: 'Pricing', href: '#' },
    { name: 'Contact', href: '#' },
  ];

  const resources = [
    { name: 'Blog', href: '#' },
    { name: 'Help Center', href: '#' },
    { name: 'Community', href: '#' },
    { name: 'Terms of Service', href: '#' },
    { name: 'Privacy Policy', href: '#' },
  ];

  const socialLinks = [
    { icon: Linkedin, href: '#', label: 'LinkedIn' },
    { icon: Twitter, href: '#', label: 'Twitter' },
    { icon: Facebook, href: '#', label: 'Facebook' },
    { icon: Instagram, href: '#', label: 'Instagram' },
  ];

  return (
    <footer ref={footerRef} className="bg-gray-900 text-white">
      {/* Wave divider */}
      <div className="relative h-16 overflow-hidden">
        <svg
          className="absolute bottom-0 w-full"
          viewBox="0 0 1440 60"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <path
            d="M0 60L48 55C96 50 192 40 288 35C384 30 480 30 576 33.3C672 37 768 43 864 45C960 47 1056 45 1152 41.7C1248 37 1344 30 1392 26.7L1440 23V60H1392C1344 60 1248 60 1152 60C1056 60 960 60 864 60C768 60 672 60 576 60C480 60 384 60 288 60C192 60 96 60 48 60H0Z"
            fill="#111827"
          />
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Column 1: Logo & Newsletter */}
          <div className="lg:col-span-1">
            <a href="#home" className="footer-logo flex items-center gap-2 mb-4">
              <VendromLogo size={40} textClassName="text-white" />
            </a>
            <p className="footer-desc text-gray-400 text-sm mb-6">
              Empowering SMEs and entrepreneurs to connect, collaborate, and grow together.
            </p>
            <form onSubmit={handleSubscribe} className="newsletter flex gap-2">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-[var(--brand-primary)] focus:ring-[var(--brand-primary)]/20"
              />
              <Button
                type="submit"
                className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] px-4"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>

          {/* Column 2: Quick Links */}
          <div className="link-column">
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-gray-400 hover:text-[var(--brand-primary)] transition-all duration-200 hover:translate-x-1 inline-block text-sm"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Resources */}
          <div className="link-column">
            <h4 className="text-lg font-semibold mb-4">Resources</h4>
            <ul className="space-y-3">
              {resources.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-gray-400 hover:text-[var(--brand-primary)] transition-all duration-200 hover:translate-x-1 inline-block text-sm"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Contact */}
          <div className="link-column">
            <h4 className="text-lg font-semibold mb-4">Contact Us</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-[var(--brand-primary)] flex-shrink-0 mt-0.5" />
                <span className="text-gray-400 text-sm">hello@vendrom.com</span>
              </li>
              <li className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-[var(--brand-primary)] flex-shrink-0 mt-0.5" />
                <span className="text-gray-400 text-sm">+1 (555) 123-4567</span>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[var(--brand-primary)] flex-shrink-0 mt-0.5" />
                <span className="text-gray-400 text-sm">
                  123 Business Ave, Suite 100<br />
                  San Francisco, CA 94105
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-sm">
            © 2024 Vendrom. All rights reserved.
          </p>
          <div className="flex gap-4">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                className="social-icon w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-[var(--brand-primary)] hover:text-white transition-all duration-250 hover:scale-120"
                aria-label={social.label}
              >
                <social.icon className="w-5 h-5" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
