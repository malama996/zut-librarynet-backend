import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerMember } from '../api/api';
import toast from 'react-hot-toast';

const MemberRegistration = ({ onRegistrationSuccess }) => {
    const navigate = useNavigate();
    const [memberType, setMemberType] = useState('student');
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        studentId: '',
        programme: '',
        yearOfStudy: 1,
        employeeId: '',
        department: '',
        yearsOfService: 0,
        researcherId: '',
        institution: '',
        researchArea: ''
    });
    const [loading, setLoading] = useState(false);
    const [registeredMember, setRegisteredMember] = useState(null);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const data = { type: memberType, ...formData };
            const response = await registerMember(data);
            
            // Save registration details
            const memberData = {
                memberId: response.data.memberId,
                email: response.data.email,
                name: response.data.name,
                memberType: response.data.memberType,
                token: response.data.token
            };
            
            setRegisteredMember(memberData);
            
            // Auto-save to localStorage
            localStorage.setItem('authToken', response.data.token);
            localStorage.setItem('memberId', response.data.memberId);
            localStorage.setItem('memberName', response.data.name);
            localStorage.setItem('memberType', response.data.memberType);
            
            toast.success(`✅ Member registered successfully!`);
            
            // Call the callback to update parent component's auth state
            if (onRegistrationSuccess) {
                onRegistrationSuccess({
                    memberId: response.data.memberId,
                    name: response.data.name,
                    memberType: response.data.memberType,
                    token: response.data.token
                });
            }
            
            // Redirect to dashboard after 2 seconds
            setTimeout(() => {
                navigate('/');
            }, 2000);
            
            // Reset form
            setFormData({
                name: '', email: '', phone: '',
                studentId: '', programme: '', yearOfStudy: 1,
                employeeId: '', department: '', yearsOfService: 0,
                researcherId: '', institution: '', researchArea: ''
            });
        } catch (error) {
            toast.error(error.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card">
            <h2>Register New Member</h2>

            <div className="member-type-selector">
                <button
                    className={memberType === 'student' ? 'active' : ''}
                    onClick={() => setMemberType('student')}
                >
                    🎓 Student
                </button>
                <button
                    className={memberType === 'lecturer' ? 'active' : ''}
                    onClick={() => setMemberType('lecturer')}
                >
                    👨‍🏫 Lecturer
                </button>
                <button
                    className={memberType === 'researcher' ? 'active' : ''}
                    onClick={() => setMemberType('researcher')}
                >
                    🔬 Researcher
                </button>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Full Name *</label>
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Email *</label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Mobile Phone Number *</label>
                    <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="+1234567890 or 0977123456"
                        pattern="[+]?[0-9]{6,15}"
                        title="Phone number must have 6-15 digits (with optional + prefix)"
                        required
                    />
                </div>

                {memberType === 'student' && (
                    <>
                        <div className="form-group">
                            <label>Student ID (7 digits) *</label>
                            <input
                                type="text"
                                name="studentId"
                                value={formData.studentId}
                                onChange={handleChange}
                                pattern="\d{7}"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Programme *</label>
                            <input
                                type="text"
                                name="programme"
                                value={formData.programme}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Year of Study *</label>
                            <select
                                name="yearOfStudy"
                                value={formData.yearOfStudy}
                                onChange={handleChange}
                                required
                            >
                                {[1, 2, 3, 4, 5, 6].map(year => (
                                    <option key={year} value={year}>Year {year}</option>
                                ))}
                            </select>
                        </div>
                    </>
                )}

                {memberType === 'lecturer' && (
                    <>
                        <div className="form-group">
                            <label>Employee ID (EMP001 format) *</label>
                            <input
                                type="text"
                                name="employeeId"
                                value={formData.employeeId}
                                onChange={handleChange}
                                pattern="EMP\d{3}"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Department *</label>
                            <input
                                type="text"
                                name="department"
                                value={formData.department}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Years of Service *</label>
                            <input
                                type="number"
                                name="yearsOfService"
                                value={formData.yearsOfService}
                                onChange={handleChange}
                                min="0"
                                required
                            />
                        </div>
                    </>
                )}

                {memberType === 'researcher' && (
                    <>
                        <div className="form-group">
                            <label>Researcher ID (RES0001 format) *</label>
                            <input
                                type="text"
                                name="researcherId"
                                value={formData.researcherId}
                                onChange={handleChange}
                                pattern="RES\d{4}"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Institution *</label>
                            <input
                                type="text"
                                name="institution"
                                value={formData.institution}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Research Area *</label>
                            <input
                                type="text"
                                name="researchArea"
                                value={formData.researchArea}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </>
                )}

                <button type="submit" disabled={loading}>
                    {loading ? 'Registering...' : 'Register Member'}
                </button>
            </form>

            {registeredMember && (
                <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#d4edda', border: '2px solid #28a745', borderRadius: '8px' }}>
                    <h3 style={{ color: '#155724', marginTop: 0 }}>✅ Registration Successful!</h3>
                    <p style={{ color: '#155724', fontSize: '16px' }}><strong>Save your Member ID - you'll need it to login:</strong></p>
                    <div style={{ 
                        backgroundColor: '#fff', 
                        padding: '15px', 
                        borderRadius: '5px', 
                        marginBottom: '15px',
                        border: '2px solid #155724'
                    }}>
                        <p style={{ margin: '5px 0' }}><strong>📋 Member ID:</strong> <code style={{ fontSize: '18px', fontWeight: 'bold', color: '#ff6b35' }}>{registeredMember.memberId}</code></p>
                        <p style={{ margin: '5px 0' }}><strong>👤 Name:</strong> {registeredMember.name}</p>
                        <p style={{ margin: '5px 0' }}><strong>📧 Email:</strong> {registeredMember.email}</p>
                        <p style={{ margin: '5px 0' }}><strong>🏷️ Type:</strong> {registeredMember.memberType}</p>
                    </div>
                    <p style={{ color: '#155724', fontSize: '14px' }}>✅ You are now logged in automatically. Your token has been saved.</p>
                    <button 
                        style={{ 
                            padding: '10px 20px', 
                            backgroundColor: '#28a745', 
                            color: 'white', 
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            fontSize: '16px'
                        }}
                        onClick={() => setRegisteredMember(null)}
                    >
                        Close
                    </button>
                </div>
            )}
        </div>
    );
};

export default MemberRegistration;
