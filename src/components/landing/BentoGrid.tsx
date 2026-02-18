import React from 'react';
import { cn } from '@/lib/utils';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface BentoItem {
    title: string;
    description: string;
    icon?: React.ReactNode;
    className?: string;
    href?: string;
    image?: string;
}

const BentoGrid = ({ items }: { items: BentoItem[] }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-7xl mx-auto p-4">
            {items.map((item, i) => (
                <div
                    key={i}
                    className={cn(
                        "group relative overflow-hidden rounded-3xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-colors duration-300",
                        item.className
                    )}
                >
                    {item.image && (
                        <div className="absolute inset-0 z-0">
                            <img src={item.image} alt="" className="w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-700 ease-out" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                        </div>
                    )}

                    <div className="relative z-10 h-full p-8 flex flex-col justify-between min-h-[300px]">
                        <div className="flex justify-between items-start">
                            <div className="bg-neutral-800/50 backdrop-blur-md p-3 rounded-2xl text-white">
                                {item.icon}
                            </div>
                            {item.href && (
                                <Link to={item.href} className="text-neutral-500 hover:text-white transition-colors">
                                    <ArrowUpRight size={24} />
                                </Link>
                            )}
                        </div>

                        <div className="translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                            <h3 className="text-2xl font-bold text-white mb-2">{item.title}</h3>
                            <p className="text-neutral-400 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75">
                                {item.description}
                            </p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default BentoGrid;
