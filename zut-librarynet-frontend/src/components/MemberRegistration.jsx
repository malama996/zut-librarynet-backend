import React, { useState } from 'react';
import { registerMember } from '../api/api';
import toast from 'react-hot-toast';

const MemberRegistration = () => {
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

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const data = { type: memberType, ...formData };
            const response = await registerMember(data);
            toast.success(`Member registered successfully: ${response.data.name}`);
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
                    <label>Phone (0977xxxxxx) *</label>
                    <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        pattern="09[7-9][0-9]{7}"
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
        </div>
    );
};

export default MemberRegistration;
