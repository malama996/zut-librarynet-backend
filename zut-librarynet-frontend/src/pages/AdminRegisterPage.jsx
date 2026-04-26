import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile, signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { MdPerson, MdLibraryBooks, MdCheckCircle } from 'react-icons/md';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { FormGroup, Label, Input, FormError } from '../components/ui/Form';
import { toastError, toastSuccess } from '../lib/toast';
import AuthLayout from '../layouts/AuthLayout';
import { auth, db } from '../firebase/config';
import { registerMemberProfile } from '../api/api';

const ADMIN_SECRET = 'ZUT-ADMIN-2026';

function AdminRegisterPage() {
    const [formData, setFormData] = useState({
        name: '', email: '', password: '', confirmPassword: '', adminSecret: ''
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [newAdmin, setNewAdmin] = useState(null);
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.name.trim()) newErrors.name = 'Name is required';
        if (!formData.email.trim()) newErrors.email = 'Email is required';
        if (!formData.email.includes('@')) newErrors.email = 'Invalid email';
        if (!formData.password) newErrors.password = 'Password is required';
        if (formData.password.length < 6) newErrors.password = 'Min 6 characters';
        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }
        if (formData.adminSecret !== ADMIN_SECRET) {
            newErrors.adminSecret = 'Invalid admin secret';
        }
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
            // Step 1: Firebase Auth signup
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                formData.email.trim(),
                formData.password
            );
            const firebaseUser = userCredential.user;

            // Step 2: Update display name
            await updateProfile(firebaseUser, { displayName: formData.name.trim() });

            // Step 3: Create Firestore user profile with admin role
            const uid = firebaseUser.uid;
            await setDoc(doc(db, 'users', uid), {
                uid: uid,
                name: formData.name.trim(),
                email: formData.email.trim().toLowerCase(),
                role: 'ADMIN',
                status: 'active',
                createdAt: new Date().toISOString(),
            });

            // Step 4: Get Firebase ID token for backend verification
            const idToken = await firebaseUser.getIdToken();

            // Step 5: Create admin profile in backend
            try {
                await registerMemberProfile({
                    idToken: idToken,
                    uid: uid,
                    name: formData.name.trim(),
                    email: formData.email.trim().toLowerCase(),
                    phone: 'Not provided',
                    type: 'ADMIN',
                    role: 'admin',
                });
            } catch (apiErr) {
                console.warn('[AdminRegister] Backend profile creation failed:', apiErr);
            }

            // Step 6: Sign out to prevent auto-login (admin must log in manually)
            await signOut(auth);

            setNewAdmin({
                name: formData.name.trim(),
                email: formData.email.trim(),
                role: 'admin',
                uid: uid,
            });
            setSuccess(true);
            toastSuccess('Admin registered successfully!');
        } catch (error) {
            const message = error.code === 'auth/email-already-in-use'
                ? 'Email already registered'
                : error.code === 'auth/invalid-email'
                ? 'Invalid email address'
                : error.code === 'auth/weak-password'
                ? 'Password is too weak'
                : error.message || 'Admin registration failed';
            toastError(message);
        } finally {
            setLoading(false);
        }
    };

    if (success && newAdmin) {
        return (
            <AuthLayout>
                <Card style={{ maxWidth: '400px', margin: '0 auto', backgroundColor: 'white', border: '2px solid #dc2626' }}>
                    <CardContent style={{ textAlign: 'center', padding: '2rem' }}>
                        <MdCheckCircle style={{ fontSize: '3rem', color: '#dc2626', marginBottom: '1rem' }} />
                        <CardTitle style={{ color: '#dc2626', marginBottom: '1rem' }}>Admin Registered!</CardTitle>
                        <div style={{ textAlign: 'left', backgroundColor: '#fef2f2', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
                            <p style={{ margin: '0.25rem 0' }}><strong>Name:</strong> {newAdmin.name}</p>
                            <p style={{ margin: '0.25rem 0' }}><strong>Email:</strong> {newAdmin.email}</p>
                            <p style={{ margin: '0.25rem 0' }}><strong>Role:</strong> {newAdmin.role}</p>
                        </div>
                        <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
                            Please log in with your credentials to access the admin panel.
                        </p>
                        <button
                            onClick={() => navigate('/login')}
                            style={{
                                backgroundColor: '#dc2626', color: 'white',
                                padding: '0.5rem 1.5rem', borderRadius: '0.5rem',
                                border: 'none', cursor: 'pointer', fontWeight: '600', width: '100%'
                            }}
                        >
                            Go to Login
                        </button>
                    </CardContent>
                </Card>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                    <MdLibraryBooks style={{ fontSize: '3rem', color: 'white' }} />
                </div>
                <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'white', marginBottom: '0.5rem' }}>
                    Admin Registration
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.9)' }}>Register as system administrator</p>
            </div>

            <Card style={{ maxWidth: '440px', margin: '0 auto' }}>
                <CardHeader>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <MdPerson style={{ color: '#dc2626' }} />
                        <CardTitle style={{ margin: 0 }}>Admin Account</CardTitle>
                    </div>
                    <CardDescription>
                        Requires admin secret key
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <FormGroup>
                            <Label>Full Name</Label>
                            <Input
                                name="name"
                                placeholder="Admin Name"
                                value={formData.name}
                                onChange={handleChange}
                                disabled={loading}
                                error={!!errors.name}
                            />
                            {errors.name && <FormError message={errors.name} />}
                        </FormGroup>

                        <FormGroup>
                            <Label>Email</Label>
                            <Input
                                name="email"
                                type="email"
                                placeholder="admin@zut.ac.zm"
                                value={formData.email}
                                onChange={handleChange}
                                disabled={loading}
                                error={!!errors.email}
                            />
                            {errors.email && <FormError message={errors.email} />}
                        </FormGroup>

                        <FormGroup>
                            <Label>Password</Label>
                            <Input
                                name="password"
                                type="password"
                                placeholder="Min 6 characters"
                                value={formData.password}
                                onChange={handleChange}
                                disabled={loading}
                                error={!!errors.password}
                            />
                            {errors.password && <FormError message={errors.password} />}
                        </FormGroup>

                        <FormGroup>
                            <Label>Confirm Password</Label>
                            <Input
                                name="confirmPassword"
                                type="password"
                                placeholder="Confirm password"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                disabled={loading}
                                error={!!errors.confirmPassword}
                            />
                            {errors.confirmPassword && <FormError message={errors.confirmPassword} />}
                        </FormGroup>

                        <FormGroup>
                            <Label>Admin Secret *</Label>
                            <Input
                                name="adminSecret"
                                type="password"
                                placeholder="Enter admin secret"
                                value={formData.adminSecret}
                                onChange={handleChange}
                                disabled={loading}
                                error={!!errors.adminSecret}
                            />
                            {errors.adminSecret && <FormError message={errors.adminSecret} />}
                            <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                                Demo secret: {ADMIN_SECRET}
                            </p>
                        </FormGroup>

                        <Button type="submit" style={{ width: '100%' }} disabled={loading}>
                            {loading ? 'Registering...' : 'Register Admin'}
                        </Button>
                    </form>

                    <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
                        <p style={{ textAlign: 'center', fontSize: '0.875rem', color: '#6b7280' }}>
                            Already have an account?{' '}
                            <Link to="/login" style={{ fontWeight: 600, color: '#3b82f6' }}>Sign in</Link>
                        </p>
                    </div>
                </CardContent>
            </Card>
        </AuthLayout>
    );
}

export default AdminRegisterPage;

