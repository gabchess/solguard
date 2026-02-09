'use client';

import { useEffect, useRef } from 'react';

export default function MatrixLoader() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size
        const resize = () => {
            canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
            canvas.height = 200; // Fixed height for the loader area
        };
        resize();
        window.addEventListener('resize', resize);

        // Matrix characters
        const chars = '01XYZABCDEF';
        const fontSize = 14;
        const columns = canvas.width / fontSize;
        const drops: number[] = [];

        for (let i = 0; i < columns; i++) {
            drops[i] = 1;
        }

        const draw = () => {
            // Semi-transparent black to create trail effect
            ctx.fillStyle = 'rgba(10, 10, 15, 0.1)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = '#00ff88'; // Neon Green
            ctx.font = `${fontSize}px monospace`;

            for (let i = 0; i < drops.length; i++) {
                const text = chars.charAt(Math.floor(Math.random() * chars.length));
                ctx.fillText(text, i * fontSize, drops[i] * fontSize);

                if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                    drops[i] = 0;
                }
                drops[i]++;
            }
        };

        const interval = setInterval(draw, 50);

        return () => {
            clearInterval(interval);
            window.removeEventListener('resize', resize);
        };
    }, []);

    return (
        <div className="w-full h-[200px] bg-cyber-black overflow-hidden border border-cyber-green/20 relative">
            <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="text-cyber-green font-bold tracking-widest text-xl animate-pulse bg-cyber-black/80 px-4 py-2 border border-cyber-green">
                    SYSTEM_SCANNING...
                </div>
            </div>
            <canvas ref={canvasRef} className="opacity-50" />
        </div>
    );
}
