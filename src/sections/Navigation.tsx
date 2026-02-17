import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { VendromLogo } from '@/components/VendromLogo';

const Navigation = () => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', href: '#home' },
    { name: 'About', href: '#about' },
    { name: 'Features', href: '#features' },
    { name: 'How It Works', href: '#how-it-works' },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'glass shadow-lg py-3'
          : 'bg-transparent py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <a
            href="#home"
            className="flex items-center gap-2 group"
            style={{ animation: 'slideDown 0.6s var(--ease-expo-out) forwards' }}
          >
            <VendromLogo size={40} />
          </a>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link, index) => (
              <a
                key={link.name}
                href={link.href}
                className="text-sm font-medium text-gray-600 hover:text-[var(--brand-primary)] underline-animate transition-colors duration-200"
                style={{
                  animation: `slideDown 0.5s var(--ease-expo-out) forwards`,
                  animationDelay: `${100 + index * 80}ms`,
                  opacity: 0,
                }}
              >
                {link.name}
              </a>
            ))}
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-4">
            <Button
              variant="ghost"
              className="text-sm font-medium text-gray-600 hover:text-[var(--brand-primary)]"
              style={{
                animation: 'slideDown 0.5s var(--ease-expo-out) 500ms forwards',
                opacity: 0,
              }}
              onClick={() => navigate('/login')}
            >
              Login
            </Button>
            <Button
              className="text-sm font-medium bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white btn-magnetic animate-pulse-glow"
              style={{
                animation: 'scaleIn 0.6s var(--ease-elastic) 580ms forwards, pulseGlow 3s ease-in-out infinite',
                opacity: 0,
              }}
              onClick={() => navigate('/register')}
            >
              Sign Up
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6 text-gray-600" />
            ) : (
              <Menu className="w-6 h-6 text-gray-600" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 py-4 border-t border-gray-100">
            <div className="flex flex-col gap-4">
              {navLinks.map((link, index) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="text-sm font-medium text-gray-600 hover:text-[var(--brand-primary)] transition-colors"
                  style={{
                    animation: `slideUp 0.4s var(--ease-expo-out) forwards`,
                    animationDelay: `${index * 80}ms`,
                    opacity: 0,
                  }}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.name}
                </a>
              ))}
              <div className="flex flex-col gap-2 pt-4 border-t border-gray-100">
                <Button variant="outline" className="w-full" onClick={() => { navigate('/login'); setIsMobileMenuOpen(false); }}>
                  Login
                </Button>
                <Button className="w-full bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white" onClick={() => { navigate('/register'); setIsMobileMenuOpen(false); }}>
                  Sign Up
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
