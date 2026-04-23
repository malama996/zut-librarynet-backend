import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginMember } from '../api/api';
import toast from 'react-hot-toast';

const LoginMember = ({ onLoginSuccess }) => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [memberId, setMemberId] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (!email.trim()) {
                toast.error('Please enter your email');
                setLoading(false);
                return;
            }

            if (!memberId.trim()) {
                toast.error('Please enter your Member ID');
                setLoading(false);
                return;
            }

            const loginData = {
                email: email.trim(),
                memberId: memberId.trim()
            };

            const response = await loginMember(loginData);
            const { token, memberType, name, memberId: receivedId } = response.data;

            // Store token in localStorage
            localStorage.setItem('authToken', token);
            localStorage.setItem('memberId', receivedId);
            localStorage.setItem('memberName', name);
            localStorage.setItem('memberType', memberType);

            toast.success(`Welcome back, ${name}!`);
            
            // Reset form
            setEmail('');
            setMemberId('');
            
            // Call callback if provided
            if (onLoginSuccess) {
                onLoginSuccess({ memberId: receivedId, name, memberType, token });
            }
            
            // Redirect to dashboard after a short delay
            setTimeout(() => {
                navigate('/');
            }, 1000);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Login failed');
            localStorage.removeItem('authToken');
            localStorage.removeItem('memberId');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card login-card">
            <h2>🔐 Member Login</h2>
            <p className="login-description">Enter both your email and Member ID to access your account</p>

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Email Address *</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your registered email"
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Member ID *</label>
                    <input
                        type="text"
                        value={memberId}
                        onChange={(e) => setMemberId(e.target.value)}
                        placeholder="Enter your unique Member ID"
                        required
                    />
                </div>

                <button type="submit" disabled={loading} className="btn btn-primary btn-large">
                    {loading ? 'Logging in...' : 'Login'}
                </button>
            </form>

            <div className="login-info">
                <p><strong>Don't have an account?</strong> Register as a new member first.</p>
                <p className="small-text">You need to provide both your email and Member ID to login securely.</p>
            </div>
        </div>
    );
};

export default LoginMember;
