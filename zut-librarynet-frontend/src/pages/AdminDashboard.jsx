import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input, Select, Label } from '../components/ui/Form';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { toastSuccess, toastError } from '../lib/toast';
import {
  adminGetAllResources,
  adminCreateResource,
  adminUpdateResource,
  adminDeleteResource,
  adminGetAllUsers,
  adminUpdateUser,
  adminGetAllLoans,
  adminGetAllReservations,
  adminGetStats
} from '../api/api';
import { MdLibraryBooks, MdPeople, MdAssignment, MdDashboard, MdAdd, MdEdit, MdDelete, MdRefresh, MdEvent } from 'react-icons/md';
import { useAuth } from '../hooks/useAuth';

// TABS
const TABS = {
  DASHBOARD: 'dashboard',
  RESOURCES: 'resources',
  USERS: 'users',
  LOANS: 'loans',
  RESERVATIONS: 'reservations'
};

function AdminDashboard() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState(TABS.DASHBOARD);
  const [stats, setStats] = useState(null);
  const [resources, setResources] = useState([]);
  const [users, setUsers] = useState([]);
  const [loans, setLoans] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [reservations, setReservations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [showResourceForm, setShowResourceForm] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [resourceForm, setResourceForm] = useState({
    type: 'Book', title: '', publisher: '', author: '', isbn: '',
    issn: '', volume: '', issue: '', url: '', accessDate: ''
  });

  useEffect(() => {
    if (isAdmin) {
      loadAllData();
    }
  }, [isAdmin]);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, resourcesRes, usersRes] = await Promise.all([
        adminGetStats(),
        adminGetAllResources(),
        adminGetAllUsers()
      ]);

      if (statsRes.data?.success) setStats(statsRes.data.data);
      if (resourcesRes.data?.success) setResources(resourcesRes.data.data || []);
      if (usersRes.data?.success) setUsers(usersRes.data.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================
  // RESOURCE CRUD
  // ============================================================

  const handleResourceSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingResource) {
        await adminUpdateResource(editingResource.id, resourceForm);
        toastSuccess('Resource updated!');
      } else {
        await adminCreateResource(resourceForm);
        toastSuccess('Resource created!');
      }
      setShowResourceForm(false);
      setEditingResource(null);
      setResourceForm({ type: 'Book', title: '', publisher: '', author: '', isbn: '' });
      refreshResources();
    } catch (error) {
      toastError(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleEditResource = (resource) => {
    setEditingResource(resource);
    setResourceForm({
      type: resource.type || 'Book',
      title: resource.title || '',
      publisher: resource.publisher || '',
      author: resource.author || '',
      isbn: resource.isbn || ''
    });
    setShowResourceForm(true);
  };

  const handleDeleteResource = async (id) => {
    if (!confirm('Delete this resource?')) return;
    try {
      await adminDeleteResource(id);
      toastSuccess('Resource deleted');
      refreshResources();
    } catch (error) {
      toastError(error.response?.data?.message || 'Delete failed');
    }
  };

  const refreshResources = async () => {
    const res = await adminGetAllResources();
    if (res.data?.success) setResources(res.data.data || []);
  };

  // ============================================================
  // USER MANAGEMENT
  // ============================================================

  const handleUserRoleUpdate = async (userId, newRole) => {
    try {
      await adminUpdateUser(userId, { role: newRole });
      toastSuccess('User role updated');
      refreshUsers();
    } catch (error) {
      toastError(error.response?.data?.message || 'Update failed');
    }
  };

  const handleUserStatusToggle = async (userId, currentActive) => {
    try {
      await adminUpdateUser(userId, { active: !currentActive });
      toastSuccess(`User ${currentActive ? 'deactivated' : 'activated'}`);
      refreshUsers();
    } catch (error) {
      toastError(error.response?.data?.message || 'Update failed');
    }
  };

  const refreshUsers = async () => {
    const res = await adminGetAllUsers();
    if (res.data?.success) setUsers(res.data.data || []);
  };

  // ============================================================
  // LOAD LOANS/RESERVATIONS
  // ============================================================

  const loadLoans = async () => {
    setIsLoading(true);
    try {
      const res = await adminGetAllLoans();
      if (res.data?.success) setLoans(res.data.data || []);
    } catch (error) {
      console.error('Error loading loans:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadReservations = async () => {
    setIsLoading(true);
    try {
      const res = await adminGetAllReservations();
      if (res.data?.success) setReservations(res.data.data || []);
    } catch (error) {
      console.error('Error loading reservations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === TABS.LOANS) loadLoans();
    if (activeTab === TABS.RESERVATIONS) loadReservations();
  }, [activeTab]);

  // BLOCK NON-ADMINS
  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
        <p className="text-gray-600 mt-2">Admin privileges required.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Manage all system data</p>
        </div>
        <Button variant="outline" onClick={loadAllData}>
          <MdRefresh className="mr-2" /> Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        {[
          { key: TABS.DASHBOARD,     label: 'Dashboard',     icon: MdDashboard },
          { key: TABS.RESOURCES,    label: 'Resources',      icon: MdLibraryBooks },
          { key: TABS.USERS,         label: 'Users',          icon: MdPeople },
          { key: TABS.LOANS,         label: 'Loans',          icon: MdAssignment },
          { key: TABS.RESERVATIONS,  label: 'Reservations',  icon: MdEvent },
        ].map(tab => (
          <Button
            key={tab.key}
            variant={activeTab === tab.key ? 'default' : 'ghost'}
            onClick={() => setActiveTab(tab.key)}
            className="flex items-center gap-2"
          >
            <tab.icon /> {tab.label}
          </Button>
        ))}
      </div>

      {/* ==================== DASHBOARD TAB ==================== */}
      {activeTab === TABS.DASHBOARD && (
        <div className="space-y-6">
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Resources" value={stats.totalResources} color="blue" />
              <StatCard label="Total Users" value={stats.totalUsers} color="purple" />
              <StatCard label="Active Loans" value={stats.activeLoans} color="amber" />
              <StatCard label="Available" value={stats.availableResources} color="green" />
            </div>
          )}
        </div>
      )}

      {/* ==================== RESOURCES TAB ==================== */}
      {activeTab === TABS.RESOURCES && (
        <div className="space-y-4">
          {/* Add/Edit Form */}
          {showResourceForm && (
            <Card>
              <CardHeader>
                <CardTitle>{editingResource ? 'Edit Resource' : 'Add New Resource'}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleResourceSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Type</Label>
                      <Select
                        value={resourceForm.type}
                        onChange={(e) => setResourceForm({ ...resourceForm, type: e.target.value })}
                      >
                        <option value="Book">Book</option>
                        <option value="Journal">Journal</option>
                        <option value="Digital">Digital</option>
                      </Select>
                    </div>
                    <div>
                      <Label>Title *</Label>
                      <Input
                        value={resourceForm.title}
                        onChange={(e) => setResourceForm({ ...resourceForm, title: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label>Publisher</Label>
                      <Input
                        value={resourceForm.publisher}
                        onChange={(e) => setResourceForm({ ...resourceForm, publisher: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Author</Label>
                      <Input
                        value={resourceForm.author}
                        onChange={(e) => setResourceForm({ ...resourceForm, author: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>ISBN</Label>
                      <Input
                        value={resourceForm.isbn}
                        onChange={(e) => setResourceForm({ ...resourceForm, isbn: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit">{editingResource ? 'Update' : 'Create'}</Button>
                    <Button type="button" variant="outline" onClick={() => { setShowResourceForm(false); setEditingResource(null); }}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">All Resources</h2>
            <Button onClick={() => setShowResourceForm(true)}>
              <MdAdd className="mr-1" /> Add Resource
            </Button>
          </div>

          {/* Resources Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>ISBN</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resources.length > 0 ? (
                    resources.map(r => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.title}</TableCell>
                        <TableCell><Badge>{r.type}</Badge></TableCell>
                        <TableCell>{r.author || '-'}</TableCell>
                        <TableCell>{r.isbn || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={r.available ? 'success' : 'destructive'}>
                            {r.available ? 'Available' : 'Borrowed'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" variant="ghost" onClick={() => handleEditResource(r)}>
                              <MdEdit />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteResource(r.id)}>
                              <MdDelete className="text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        No resources found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ==================== USERS TAB ==================== */}
      {activeTab === TABS.USERS && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">All Users</h2>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Member Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length > 0 ? (
                    users.map(u => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.name}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>
                          {u.memberType && u.memberType !== u.role ? (
                            <Badge variant="info">{u.memberType}</Badge>
                          ) : (
                            <Badge variant="destructive">{u.role}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={u.active ? 'success' : 'destructive'}>
                            {u.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUserStatusToggle(u.id, u.active)}
                          >
                            {u.active ? 'Deactivate' : 'Activate'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        No users found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ==================== LOANS TAB ==================== */}
      {activeTab === TABS.LOANS && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">All Loans</h2>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : loans.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Loan ID</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>Member</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loans.map(l => (
                      <TableRow key={l.id}>
                        <TableCell className="font-mono text-sm">{l.id}</TableCell>
                        <TableCell>{l.resourceTitle}</TableCell>
                        <TableCell>{l.memberName || l.memberId}</TableCell>
                        <TableCell>{l.dueDate}</TableCell>
                        <TableCell>
                          <Badge variant={l.status === 'ACTIVE' ? 'success' : 'secondary'}>
                            {l.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card><CardContent className="text-center py-8">No loans found</CardContent></Card>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }) {
  const colors = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    amber: 'bg-amber-50 border-amber-200',
    purple: 'bg-purple-50 border-purple-200'
  };
  return (
    <Card className={`border ${colors[color]}`}>
      <CardContent className="p-4">
        <p className="text-sm text-gray-600">{label}</p>
        <p className="text-2xl font-bold">{value || 0}</p>
      </CardContent>
    </Card>
  );
}

export default AdminDashboard;

