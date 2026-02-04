'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, Lock, Loader2, User } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getSupabase } from '@/lib/supabase';
import { signInWithGoogle } from '@/lib/auth-helpers';

export function RegisterForm() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const supabase = getSupabase();
        if (!supabase) {
            setError('Connection error. Please try again later.');
            setIsLoading(false);
            return;
        }

        const { error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                },
                emailRedirectTo: `${window.location.origin}/auth/confirm`,
            },
        });

        if (signUpError) {
            setError(signUpError.message);
            setIsLoading(false);
        } else {
            setIsSuccess(true);
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        setError(null);
        const { error: googleError } = await signInWithGoogle();
        if (googleError) {
            setError(googleError.message);
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-4"
            >
                <div className="mx-auto w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                    <Mail className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-semibold text-zinc-900">Check your email</h2>
                <p className="text-zinc-600">
                    We've sent a confirmation link to <span className="font-medium text-zinc-900">{email}</span>.
                    Please verify your email to continue.
                </p>
                <div className="pt-4">
                    <Button
                        variant="outline"
                        className="rounded-full w-full h-11"
                        onClick={() => router.push('/login')}
                    >
                        Back to login
                    </Button>
                </div>
            </motion.div>
        );
    }

    return (
        <div className="space-y-4 lg:space-y-6">
            <form onSubmit={handleRegister} className="space-y-2.5 lg:space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-700" htmlFor="fullName">
                        Full Name
                    </label>
                    <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                        <Input
                            id="fullName"
                            placeholder="John Doe"
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="pl-10 h-11 bg-zinc-50 border-zinc-200 focus:bg-white transition-all outline-none"
                            required
                            disabled={isLoading}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-700" htmlFor="email">
                        Email
                    </label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                        <Input
                            id="email"
                            placeholder="name@example.com"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="pl-10 h-11 bg-zinc-50 border-zinc-200 focus:bg-white transition-all outline-none"
                            required
                            disabled={isLoading}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-700" htmlFor="password">
                        Password
                    </label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                        <Input
                            id="password"
                            placeholder="••••••••"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="pl-10 h-11 bg-zinc-50 border-zinc-200 focus:bg-white transition-all outline-none"
                            required
                            disabled={isLoading}
                            minLength={6}
                        />
                    </div>
                </div>

                {error && (
                    <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="text-sm font-medium text-red-600 bg-red-50 p-3 rounded-lg"
                    >
                        {error}
                    </motion.p>
                )}

                <Button
                    type="submit"
                    className="w-full h-11 bg-black text-white hover:bg-zinc-800 transition-all rounded-full"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        'Create account'
                    )}
                </Button>
            </form>

            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-zinc-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-zinc-500">Or continue with</span>
                </div>
            </div>

            <Button
                type="button"
                variant="outline"
                className="w-full h-11 border-zinc-200 hover:bg-zinc-50 transition-all rounded-full flex gap-2"
                onClick={handleGoogleLogin}
                disabled={isLoading}
            >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                    />
                    <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                    />
                    <path
                        d="M5.84 14.09c-.22-.66-.35-1.38-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                    />
                    <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                    />
                </svg>
                Google
            </Button>

            <p className="text-center text-sm text-zinc-600">
                Already have an account?{' '}
                <Link href="/login" className="font-semibold text-zinc-900 hover:underline">
                    Sign in
                </Link>
            </p>
        </div>
    );
}
