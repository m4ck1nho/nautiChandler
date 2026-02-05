'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface AuthLayoutProps {
    children: ReactNode;
    title: string;
    subtitle: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
    return (
        <div className="min-h-[100dvh] grid lg:grid-cols-2 bg-white selection:bg-black selection:text-white">
            {/* Left side: Form */}
            <div className="flex flex-col justify-start lg:justify-center px-4 pt-6 pb-12 sm:px-12 lg:px-24 min-h-[100dvh]">
                <div className="w-full max-w-md mx-auto">
                    <Link href="/" className="inline-block mb-4 lg:mb-12">
                        <img
                            src="/yachtDropLogo.png"
                            alt="Yachtdrop"
                            className="h-8 sm:h-12 w-auto object-contain"
                        />
                    </Link>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-900 tracking-tight">
                            {title}
                        </h1>
                        <p className="mt-1 sm:mt-2 text-sm sm:text-base text-zinc-600">
                            {subtitle}
                        </p>

                        <div className="mt-6 lg:mt-10">
                            {children}
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Right side: Image/Visual */}
            <div className="hidden lg:block relative bg-zinc-900">
                <div
                    className="absolute inset-0 bg-cover bg-center opacity-70"
                    style={{
                        backgroundImage: 'url("https://images.unsplash.com/photo-1567899378494-47b22a2bb96a?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80")'
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-12 left-12 right-12">
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3, duration: 0.8 }}
                    >
                        <p className="text-2xl font-light text-white leading-tight">
                            "Experience the ultimate luxury in yacht provisioning. Your needs, met anywhere on the Mediterranean."
                        </p>
                        <div className="mt-6 h-px w-12 bg-white/30" />
                        <p className="mt-6 text-sm font-medium text-white/70 uppercase tracking-widest">
                            Yachtdrop Exclusives
                        </p>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
