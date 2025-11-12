"use client";

import React, { useEffect, useRef, useState } from 'react';
import { 
  Users, 
  Clock, 
  Calendar, 
  BarChart3, 
  Shield, 
  UserCheck, 
  Building, 
  Target,
  Award,
  Briefcase,
  MapPin,
  Phone
} from 'lucide-react';

const floatingIcons = [
  { Icon: Users, color: 'text-blue-400', size: 'w-6 h-6' },
  { Icon: Clock, color: 'text-green-400', size: 'w-5 h-5' },
  { Icon: Calendar, color: 'text-purple-400', size: 'w-7 h-7' },
  { Icon: BarChart3, color: 'text-orange-400', size: 'w-6 h-6' },
  { Icon: Shield, color: 'text-red-400', size: 'w-5 h-5' },
  { Icon: UserCheck, color: 'text-cyan-400', size: 'w-6 h-6' },
  { Icon: Building, color: 'text-indigo-400', size: 'w-5 h-5' },
  { Icon: Target, color: 'text-pink-400', size: 'w-6 h-6' },
  { Icon: Award, color: 'text-yellow-400', size: 'w-7 h-7' },
  { Icon: Briefcase, color: 'text-teal-400', size: 'w-5 h-5' },
  { Icon: MapPin, color: 'text-emerald-400', size: 'w-6 h-6' },
  { Icon: Phone, color: 'text-violet-400', size: 'w-5 h-5' }
];

export function GlobalBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [iconPositions, setIconPositions] = useState<Array<{top: string; left: string; delay: string}>>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const positions = floatingIcons.map(() => ({
      top: `${Math.random() * 80 + 10}%`,
      left: `${Math.random() * 80 + 10}%`,
      delay: `${Math.random() * 5}s`,
    }));
    setIconPositions(positions);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const particles: Array<{
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      color: string;
      opacity: number;
    }> = [];

    const initParticles = () => {
      const particleCount = Math.min(50, Math.floor((canvas.width * canvas.height) / 25000));
      const colors = [
        'rgba(59, 130, 246, 0.08)',
        'rgba(139, 92, 246, 0.06)',
        'rgba(14, 165, 233, 0.05)',
        'rgba(16, 185, 129, 0.07)',
        'rgba(245, 101, 101, 0.05)',
        'rgba(251, 191, 36, 0.06)',
      ];

      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 4 + 1,
          speedX: (Math.random() - 0.5) * 0.3,
          speedY: (Math.random() - 0.5) * 0.3,
          color: colors[Math.floor(Math.random() * colors.length)],
          opacity: Math.random() * 0.3 + 0.1,
        });
      }
    };

    const animate = () => {
      if (!ctx || !canvas) return;

      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, 'rgba(248, 250, 252, 0.97)');
      gradient.addColorStop(0.5, 'rgba(241, 245, 249, 0.95)');
      gradient.addColorStop(1, 'rgba(236, 242, 251, 0.98)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach(particle => {
        particle.x += particle.speedX;
        particle.y += particle.speedY;

        if (particle.x <= 0 || particle.x >= canvas.width) particle.speedX *= -1;
        if (particle.y <= 0 || particle.y >= canvas.height) particle.speedY *= -1;

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, 2 * Math.PI);
        ctx.fillStyle = particle.color.replace(/[\d\.]+\)$/g, particle.opacity + ')');
        ctx.fill();

        const glow = ctx.createRadialGradient(
          particle.x, particle.y, particle.size,
          particle.x, particle.y, particle.size * 3
        );
        glow.addColorStop(0, particle.color.replace(/[\d\.]+\)$/g, (particle.opacity * 0.6) + ')'));
        glow.addColorStop(1, particle.color.replace(/[\d\.]+\)$/g, '0)'));

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * 3, 0, 2 * Math.PI);
        ctx.fillStyle = glow;
        ctx.globalAlpha = 0.4;
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      requestAnimationFrame(animate);
    };

    resizeCanvas();
    initParticles();
    animate();

    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 opacity-60" />
      
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-blue-200/20 via-purple-200/10 to-transparent rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-green-200/15 via-cyan-200/10 to-transparent rounded-full blur-3xl animate-pulse-slow" style={{animationDelay: '2s'}} />
      <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gradient-to-r from-pink-200/10 via-yellow-200/10 to-transparent rounded-full blur-3xl animate-pulse-slow" style={{animationDelay: '4s'}} />
      
      {mounted && floatingIcons.map((item, index) => {
        const { Icon, color, size } = item;
        const animations = ['animate-float', 'animate-float-reverse', 'animate-float-slow', 'animate-drift'];
        const animation = animations[index % animations.length];
        const position = iconPositions[index];
        
        if (!position) return null;
        
        return (
          <Icon
            key={index}
            className={`floating-icon ${color} ${size} ${animation}`}
            style={{
              top: position.top,
              left: position.left,
              animationDelay: position.delay,
            }}
          />
        );
      })}
      
      {mounted && Array.from({ length: 8 }).map((_, i) => (
        <div
          key={`particle-${i}`}
          className="floating-icon animate-float-up"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 20}s`,
            animationDuration: `${20 + Math.random() * 10}s`,
          }}
        >
          <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${
            ['from-blue-400 to-purple-400', 'from-green-400 to-cyan-400', 'from-pink-400 to-red-400', 'from-yellow-400 to-orange-400'][i % 4]
          } opacity-60`} />
        </div>
      ))}
      
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shine" />
    </div>
  );
}