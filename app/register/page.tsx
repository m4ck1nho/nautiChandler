import { AuthLayout } from '@/components/auth/AuthLayout';
import { RegisterForm } from '@/components/auth/RegisterForm';

export const metadata = {
    title: 'Sign Up | Yachtdrop',
    description: 'Create a Yachtdrop account to start your luxury yacht provisioning journey.',
};

export default function RegisterPage() {
    return (
        <AuthLayout
            title="Create an account"
            subtitle="Join the exclusive community of luxury yacht owners and crew."
        >
            <RegisterForm />
        </AuthLayout>
    );
}
