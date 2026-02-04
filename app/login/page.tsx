import { AuthLayout } from '@/components/auth/AuthLayout';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata = {
    title: 'Login | Yachtdrop',
    description: 'Sign in to your Yachtdrop account to manage your orders and profile.',
};

export default function LoginPage() {
    return (
        <AuthLayout
            title="Welcome back"
            subtitle="Please enter your details to sign in to your account."
        >
            <LoginForm />
        </AuthLayout>
    );
}
