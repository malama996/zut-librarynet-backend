import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { MdLock, MdLibraryBooks } from 'react-icons/md';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { FormGroup, Label, Input, FormError } from '../components/ui/Form';
import { toastError, toastSuccess } from '../lib/toast';
import AuthLayout from '../layouts/AuthLayout';
import { auth } from '../firebase/config';

function LoginPage() {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.email.trim()) newErrors.email = 'Email is required';
        if (!formData.password) newErrors.password = 'Password is required';
        return newErrors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setLoading(true);
        try {
            await signInWithEmailAndPassword(
                auth,
                formData.email.trim(),
                formData.password
            );

            toastSuccess(`Welcome back!`);
        } catch (error) {
            const message = error.code === 'auth/user-not-found'
                ? 'No account found with this email'
                : error.code === 'auth/wrong-password'
                ? 'Incorrect password'
                : error.code === 'auth/invalid-credential'
                ? 'Invalid email or password'
                : error.message || 'Login failed';
            toastError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout>
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
                    <MdLibraryBooks style={{ fontSize: '3.5rem', color: 'white' }} />
                </div>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'white', marginBottom: '0.75rem' }}>
                    ZUT LibraryNet
                </h1>
                <p style={{ fontSize: '1.125rem', color: 'rgba(255,255,255,0.95)', fontWeight: 500 }}>
                    University Library Management System
                </p>
            </div>

            <Card style={{ maxWidth: '420px', margin: '0 auto', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                <CardHeader>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <MdLock style={{ fontSize: '1.5rem', color: 'var(--primary-600)' }} />
                        <CardTitle style={{ margin: 0 }}>Sign In</CardTitle>
                    </div>
                    <CardDescription>
                        Enter your credentials to access the system
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <FormGroup>
                            <Label htmlFor="email">Email Address</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="you@zut.ac.zm"
                                value={formData.email}
                                onChange={handleChange}
                                disabled={loading}
                                error={!!errors.email}
                            />
                            {errors.email && <FormError message={errors.email} />}
                        </FormGroup>

                        <FormGroup>
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                placeholder="Enter password"
                                value={formData.password}
                                onChange={handleChange}
                                disabled={loading}
                                error={!!errors.password}
                            />
                            {errors.password && <FormError message={errors.password} />}
                        </FormGroup>

                        <Button type="submit" style={{ width: '100%' }} disabled={loading}>
                            {loading ? 'Signing in...' : 'Sign In'}
                        </Button>
                    </form>

                    <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--neutral-200)' }}>
                        <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--neutral-600)' }}>
                            Don&apos;t have an account?{' '}
                            <Link to="/register" style={{ fontWeight: 600, color: 'var(--primary-600)', textDecoration: 'none' }}>
                                Register here
                            </Link>
                        </p>
                        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--neutral-500)', marginTop: '0.75rem' }}>
                            Admin?{' '}
                            <Link to="/admin/register" style={{ fontWeight: 600, color: '#dc2626' }}>
                                Register here
                            </Link>
                        </p>
                    </div>
                </CardContent>
            </Card>
        </AuthLayout>
    );
}

export default LoginPage;

