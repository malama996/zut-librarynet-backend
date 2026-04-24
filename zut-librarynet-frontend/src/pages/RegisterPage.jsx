import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile, signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { MdLibraryBooks, MdCheckCircle } from 'react-icons/md';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { FormGroup, Label, Input, FormError } from '../components/ui/Form';
import { toastError, toastSuccess } from '../lib/toast';
import AuthLayout from '../layouts/AuthLayout';
import { auth, db } from '../firebase/config';
import { registerMemberProfile } from '../api/api';

const MEMBER_TYPES = {
    STUDENT: {
        label: 'Student',
        icon: '🎓',
        idLabel: 'Student ID',
        idName: 'studentId',
        idHint: 'Format: STU1234  (STU prefix + 4 or more digits)',
        idPattern: '^[A-Z]{3}\\d{4,}$',
        role: 'student',
        extra: [
            { name: 'programme', label: 'Programme', type: 'text', placeholder: 'e.g. Computer Science' },
            { name: 'yearOfStudy', label: 'Year of Study', type: 'select', options: [1,2,3,4,5,6] },
        ],
    },
    LECTURER: {
        label: 'Lecturer',
        icon: '👨\u200d🏫',
        idLabel: 'Employee ID',
        idName: 'employeeId',
        idHint: 'Format: EMP01  (EMP prefix + 2 or more digits)',
        idPattern: '^EMP\\d{2,}$',
        role: 'lecturer',
        extra: [
            { name: 'department', label: 'Department', type: 'text', placeholder: 'e.g. Engineering' },
            { name: 'yearsOfService', label: 'Years of Service', type: 'number', placeholder: '0' },
        ],
    },
    RESEARCHER: {
        label: 'Researcher',
        icon: '🔬',
        idLabel: 'Researcher ID',
        idName: 'researcherId',
        idHint: 'Format: RES01  (RES prefix + 2 or more digits)',
        idPattern: '^RES\\d{2,}$',
        role: 'researcher',
        extra: [
            { name: 'institution', label: 'Institution', type: 'text', placeholder: 'e.g. ZUT Research Centre' },
            { name: 'researchArea', label: 'Research Area', type: 'text', placeholder: 'e.g. Artificial Intelligence' },
        ],
    },
};

function RegisterPage() {
    const [memberType, setMemberType] = useState('STUDENT');
    const [formData, setFormData] = useState({
        name: '', email: '', password: '', confirmPassword: '', phone: '',
        studentId: '', employeeId: '', researcherId: '',
        programme: '', yearOfStudy: 1,
        department: '', yearsOfService: 0,
        institution: '', researchArea: '',
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [newUser, setNewUser] = useState(null);

    const type = MEMBER_TYPES[memberType];

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const validate = () => {
        const errs = {};
        if (!formData.name.trim()) errs.name = 'Name is required';
        if (!formData.email.trim()) errs.email = 'Email is required';
        if (!formData.email.includes('@')) errs.email = 'Invalid email address';
        if (!formData.password) errs.password = 'Password is required';
        if (formData.password.length < 6) errs.password = 'Minimum 6 characters';
        if (formData.password !== formData.confirmPassword) errs.confirmPassword = 'Passwords do not match';
        if (!formData.phone.trim()) errs.phone = 'Phone number is required';

        const idVal = formData[type.idName];
        if (!idVal.trim()) {
            errs[type.idName] = `${type.idLabel} is required`;
        } else if (!new RegExp(type.idPattern).test(idVal)) {
            errs[type.idName] = `Invalid format. Required: ${type.idHint}`;
        }

        for (const field of type.extra) {
            if (!formData[field.name] || (typeof formData[field.name] === 'string' && !formData[field.name].trim())) {
                errs[field.name] = `${field.label} is required`;
            }
        }

        return errs;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length > 0) { setErrors(errs); return; }

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

            // Step 3: Create Firestore user profile
            const uid = firebaseUser.uid;
            await setDoc(doc(db, 'users', uid), {
                uid: uid,
                name: formData.name.trim(),
                email: formData.email.trim().toLowerCase(),
                role: type.role,
                status: 'active',
                memberType: memberType,
                createdAt: new Date().toISOString(),
            });

            // Step 4: Get Firebase ID token for backend verification
            const idToken = await firebaseUser.getIdToken(true);

            // Step 5: Create member in backend LibraryService
            const profilePayload = {
                idToken: idToken,
                uid: uid,
                name: formData.name.trim(),
                email: formData.email.trim().toLowerCase(),
                phone: formData.phone.trim(),
                type: memberType,
                [type.idName]: formData[type.idName].trim(),
            };
            for (const field of type.extra) {
                profilePayload[field.name] = field.type === 'number'
                    ? Number(formData[field.name])
                    : formData[field.name];
            }

            try {
                await registerMemberProfile(profilePayload);
            } catch (apiErr) {
                console.warn('[Register] Backend profile creation failed:', apiErr);
            }

            // Step 6: Sign out to prevent auto-login (user must log in manually)
            await signOut(auth);

            setNewUser({
                name: formData.name.trim(),
                email: formData.email.trim(),
                role: type.role,
                uid: uid,
            });
            setSuccess(true);
            toastSuccess(`${type.label} registered successfully!`);
        } catch (error) {
            const message = error.code === 'auth/email-already-in-use'
                ? 'Email already registered'
                : error.code === 'auth/invalid-email'
                ? 'Invalid email address'
                : error.code === 'auth/weak-password'
                ? 'Password is too weak'
                : error.message || 'Registration failed';
            toastError(message);
        } finally {
            setLoading(false);
        }
    };

    if (success && newUser) {
        return (
            <AuthLayout>
                <Card style={{ maxWidth: '460px', margin: '0 auto', backgroundColor: 'white', border: '2px solid #22c55e' }}>
                    <CardContent style={{ textAlign: 'center', padding: '2rem' }}>
                        <MdCheckCircle style={{ fontSize: '3rem', color: '#22c55e', marginBottom: '1rem' }} />
                        <CardTitle style={{ color: '#22c55e', marginBottom: '0.5rem' }}>Registration Complete!</CardTitle>
                        <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
                            Your {memberType} account is ready.
                        </p>
                        <div style={{ textAlign: 'left', backgroundColor: '#f0fdf4', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
                            <p style={{ margin: '0.25rem 0' }}><strong>Name:</strong> {newUser.name}</p>
                            <p style={{ margin: '0.25rem 0' }}><strong>Email:</strong> {newUser.email}</p>
                            <p style={{ margin: '0.25rem 0' }}><strong>Role:</strong> {newUser.role}</p>
                            <p style={{ margin: '0.25rem 0' }}><strong>UID:</strong> {newUser.uid}</p>
                        </div>
                        <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
                            Please log in with your credentials to access your dashboard.
                        </p>
                        <button
                            onClick={() => window.location.href = '/login'}
                            style={{
                                backgroundColor: '#22c55e', color: 'white',
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
                <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'white' }}>Member Registration</h1>
                <p style={{ color: 'rgba(255,255,255,0.9)' }}>Create your library account</p>
            </div>

            <Card style={{ maxWidth: '520px', margin: '0 auto' }}>
                <CardHeader>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                        {Object.entries(MEMBER_TYPES).map(([key, val]) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => { setMemberType(key); setErrors({}); }}
                                style={{
                                    flex: 1, minWidth: '100px', padding: '0.5rem',
                                    border: `2px solid ${memberType === key ? '#3b82f6' : '#e5e7eb'}`,
                                    borderRadius: '0.5rem',
                                    background: memberType === key ? '#eff6ff' : 'white',
                                    cursor: 'pointer',
                                    fontWeight: memberType === key ? 600 : 400,
                                    color: memberType === key ? '#1d4ed8' : '#374151',
                                    transition: 'all 0.15s',
                                }}
                            >
                                <span style={{ fontSize: '1.25rem' }}>{val.icon}</span><br />
                                {val.label}
                            </button>
                        ))}
                    </div>
                    <CardDescription>
                        Registering as <strong>{type.icon} {type.label}</strong>
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <FormGroup>
                            <Label>Full Name</Label>
                            <Input name="name" placeholder="John Mumba" value={formData.name}
                                onChange={handleChange} disabled={loading} error={!!errors.name} />
                            {errors.name && <FormError message={errors.name} />}
                        </FormGroup>

                        <FormGroup>
                            <Label>Email</Label>
                            <Input name="email" type="email" placeholder="john@zut.ac.zm" value={formData.email}
                                onChange={handleChange} disabled={loading} error={!!errors.email} />
                            {errors.email && <FormError message={errors.email} />}
                        </FormGroup>

                        <FormGroup>
                            <Label>Mobile Phone</Label>
                            <Input name="phone" type="tel" placeholder="+260 97 123 4567" value={formData.phone}
                                onChange={handleChange} disabled={loading} error={!!errors.phone} />
                            {errors.phone && <FormError message={errors.phone} />}
                        </FormGroup>

                        <FormGroup>
                            <Label>{type.idLabel} <span style={{ color: '#ef4444' }}>*</span></Label>
                            <Input name={type.idName} placeholder={type.idHint}
                                value={formData[type.idName]} onChange={handleChange}
                                disabled={loading} error={!!errors[type.idName]} />
                            {errors[type.idName] && <FormError message={errors[type.idName]} />}
                            <small style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                                {type.idHint} — your ID determines your library role
                            </small>
                        </FormGroup>

                        {type.extra.map(field => (
                            <FormGroup key={field.name}>
                                <Label>{field.label}</Label>
                                {field.type === 'select' ? (
                                    <select name={field.name} value={formData[field.name]}
                                        onChange={handleChange} disabled={loading}
                                        style={{
                                            width: '100%', padding: '0.5rem 0.75rem',
                                            borderRadius: '0.375rem',
                                            border: errors[field.name] ? '1px solid #ef4444' : '1px solid #d1d5db',
                                            fontSize: '0.875rem', backgroundColor: 'white',
                                        }}>
                                        {field.options.map(o => (
                                            <option key={o} value={o}>Year {o}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <Input name={field.name} type={field.type} placeholder={field.placeholder}
                                        value={formData[field.name]} onChange={handleChange}
                                        disabled={loading} error={!!errors[field.name]} />
                                )}
                                {errors[field.name] && <FormError message={errors[field.name]} />}
                            </FormGroup>
                        ))}

                        <FormGroup>
                            <Label>Password</Label>
                            <Input name="password" type="password" placeholder="Min 6 characters"
                                value={formData.password} onChange={handleChange}
                                disabled={loading} error={!!errors.password} />
                            {errors.password && <FormError message={errors.password} />}
                        </FormGroup>

                        <FormGroup>
                            <Label>Confirm Password</Label>
                            <Input name="confirmPassword" type="password" placeholder="Re-enter password"
                                value={formData.confirmPassword} onChange={handleChange}
                                disabled={loading} error={!!errors.confirmPassword} />
                            {errors.confirmPassword && <FormError message={errors.confirmPassword} />}
                        </FormGroup>

                        <Button type="submit" style={{ width: '100%' }} disabled={loading}>
                            {loading ? 'Creating…' : `Create ${type.label} Account`}
                        </Button>
                    </form>

                    <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
                        <p style={{ textAlign: 'center', fontSize: '0.875rem', color: '#6b7280' }}>
                            Already have an account?{' '}
                            <Link to="/login" style={{ fontWeight: 600, color: '#3b82f6' }}>Sign in</Link>
                        </p>
                        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
                            Admin? <Link to="/admin/register" style={{ fontWeight: 600, color: '#dc2626' }}>Register here</Link>
                        </p>
                    </div>
                </CardContent>
            </Card>
        </AuthLayout>
    );
}

export default RegisterPage;

