import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { MdLock } from 'react-icons/md';
import logoImg from '../assets/logo.png';
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
                    <img src={logoImg} alt="ZUT Logo" style={{ height: '6rem', width: 'auto', dropShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                </div>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'white', marginBottom: '0.75rem' }}>
                    ZUT LibraryNet
                </h1>
                <p style={{ fontSize: '1.125rem', color: 'rgba(255,255,255,0.95)', fontWeight: 500 }}>
                    University Library Management System
                </p>
                <p style={{ marginTop: '1rem', fontSize: '1rem', color: 'white', fontWeight: 'bold', maxWidth: '450px', margin: '1rem auto 0 auto', lineHeight: '1.4' }}>
                    "Welcome back to ZUT LibraryNet! We're thrilled to see you again. Dive back into a world of knowledge, research, and limitless discovery."
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

            <div style={{
                marginTop: '3rem',
                display: 'flex',
                gap: '3rem',
                justifyContent: 'center',
                flexWrap: 'wrap',
                color: 'white',
                textShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <h3 style={{ fontSize: '1.75rem', fontWeight: '900', margin: 0, color: '#facc15' }}>10k+</h3>
                    <p style={{ fontSize: '0.875rem', fontWeight: '600', opacity: 0.95, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Resources</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <h3 style={{ fontSize: '1.75rem', fontWeight: '900', margin: 0, color: '#60a5fa' }}>5k+</h3>
                    <p style={{ fontSize: '0.875rem', fontWeight: '600', opacity: 0.95, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Scholars</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <h3 style={{ fontSize: '1.75rem', fontWeight: '900', margin: 0, color: '#4ade80' }}>24/7</h3>
                    <p style={{ fontSize: '0.875rem', fontWeight: '600', opacity: 0.95, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cloud Access</p>
                </div>
            </div>

        </AuthLayout>
    );
}

export default LoginPage;

