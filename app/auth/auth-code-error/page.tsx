'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AuthCodeError() {
    return (
        <Suspense fallback={<LoadingError />}>
            <ErrorContent />
        </Suspense>
    );
}

function LoadingError() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-white px-6">
            <div className="max-w-md w-full text-center space-y-6">
                <div className="mx-auto w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center animate-pulse">
                    <div className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                    <div className="h-8 bg-gray-100 rounded w-1/2 mx-auto animate-pulse" />
                    <div className="h-4 bg-gray-100 rounded w-3/4 mx-auto animate-pulse" />
                </div>
            </div>
        </div>
    );
}

function ErrorContent() {
    const searchParams = useSearchParams();
    const error = searchParams.get('error');
    const errorCode = searchParams.get('error_code');

    return (
        <div className="min-h-screen flex items-center justify-center bg-white px-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full text-center space-y-6"
            >
                <div className="mx-auto w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-8 h-8" />
                </div>

                <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-zinc-900">Authentication Error</h1>
                    <p className="text-zinc-600">
                        {error || "We couldn't verify your login code. This usually happens if the link has expired or has already been used."}
                    </p>
                    {errorCode && (
                        <p className="text-xs text-zinc-400 font-mono">
                            Error Code: {errorCode}
                        </p>
                    )}
                </div>

                <div className="pt-4 space-y-3">
                    <Button asChild className="w-full h-11 bg-black text-white rounded-full">
                        <Link href="/login">
                            Try signing in again
                        </Link>
                    </Button>
                    <Button asChild variant="ghost" className="w-full h-11 rounded-full gap-2">
                        <Link href="/">
                            <ArrowLeft className="w-4 h-4" />
                            Back to home
                        </Link>
                    </Button>
                </div>
            </motion.div>
        </div>
    );
}
