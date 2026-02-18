import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MagneticButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    strength?: number; // How far the button moves (default: 30)
    children: React.ReactNode;
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    size?: "default" | "sm" | "lg" | "icon";
}

const MagneticButton = ({
    strength = 30,
    children,
    className,
    variant = 'default',
    size = 'default',
    ...props
}: MagneticButtonProps) => {
    const buttonRef = useRef<HTMLButtonElement>(null);
    const textRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        const button = buttonRef.current;
        const text = textRef.current;
        if (!button || !text) return;

        const onMouseMove = (e: MouseEvent) => {
            const rect = button.getBoundingClientRect();
            const x = e.clientX - (rect.left + rect.width / 2);
            const y = e.clientY - (rect.top + rect.height / 2);

            // Move button
            gsap.to(button, {
                x: x * 0.4,
                y: y * 0.4,
                duration: 0.8,
                ease: "power3.out"
            });

            // Move text slightly more for parallax
            gsap.to(text, {
                x: x * 0.1,
                y: y * 0.1,
                duration: 0.8,
                ease: "power3.out"
            });
        };

        const onMouseLeave = () => {
            gsap.to([button, text], {
                x: 0,
                y: 0,
                duration: 0.8,
                ease: "elastic.out(1, 0.3)"
            });
        };

        button.addEventListener('mousemove', onMouseMove);
        button.addEventListener('mouseleave', onMouseLeave);

        return () => {
            button.removeEventListener('mousemove', onMouseMove);
            button.removeEventListener('mouseleave', onMouseLeave);
        };
    }, [strength]);

    return (
        <Button
            ref={buttonRef}
            variant={variant}
            size={size}
            className={cn("relative overflow-hidden transition-colors", className)}
            {...props}
        >
            <span ref={textRef} className="relative z-10 block">
                {children}
            </span>
        </Button>
    );
};

export default MagneticButton;
