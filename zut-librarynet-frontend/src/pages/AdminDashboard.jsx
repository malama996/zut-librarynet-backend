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
  adminGetStats,
  adminGetDashboard
} from '../api/api';
import { MdLibraryBooks, MdPeople, MdAssignment, MdDashboard, MdAdd, MdEdit, MdDelete, MdRefresh, MdEvent, MdWarning } from 'react-icons/md';
import { useAuth } from '../hooks/useAuth';

const TABS = {
  DASHBOARD: 'dashboard',
  RESOURCES: 'resources',
  USERS: 'users',
  LOANS: 'loans',
  RESERVATIONS: 'reservations'
};

// Resource type configurations with specific fields
const RESOURCE_TYPES = {
  Book: {
    label: 'Book',
    fields: [
      { name: 'title', label: 'Title', placeholder: 'e.g. Introduction to Algorithms', required: true },
      { name: 'author', label: 'Author', placeholder: 'e.g. Thomas H. Cormen', required: false },
      { name: 'publisher', label: 'Publisher', placeholder: 'e.g. MIT Press', required: false },
      { name: 'isbn', label: 'ISBN', placeholder: 'e.g. 9780262033848', required: false },
      { name: 'edition', label: 'Edition', placeholder: 'e.g. 3rd Edition', required: false },
      { name: 'genre', label: 'Genre', placeholder: 'e.g. Computer Science', required: false },
    ]
  },
  Journal: {
    label: 'Journal',
    fields: [
      { name: 'title', label: 'Journal Title', placeholder: 'e.g. Nature Reviews Computer Science', required: true },
      { name: 'publisher', label: 'Publisher', placeholder: 'e.g. Nature Publishing Group', required: false },
      { name: 'issn', label: 'ISSN', placeholder: 'e.g. 0028-0836', required: false },
      { name: 'volume', label: 'Volume / Issue', placeholder: 'e.g. Vol. 45, No. 3', required: false },
      { name: 'publicationDate', label: 'Publication Date', placeholder: 'e.g. March 2024', required: false },
      { name: 'subjectArea', label: 'Subject Area', placeholder: 'e.g. Artificial Intelligence', required: false },
    ]
  },
  Digital: {
    label: 'Digital Resource',
    fields: [
      { name: 'title', label: 'Resource Title', placeholder: 'e.g. IEEE Xplore Digital Library', required: true },
      { name: 'publisher', label: 'Provider', placeholder: 'e.g. IEEE', required: false },
      { name: 'url', label: 'Access URL', placeholder: 'e.g. https://ieeexplore.ieee.org', required: false },
      { name: 'accessType', label: 'Access Type', placeholder: 'e.g. Subscription / Open Access', required: false },
      { name: 'format', label: 'Format', placeholder: 'e.g. PDF, Online Database', required: false },
      { name: 'category', label: 'Category', placeholder: 'e.g. Research Database', required: false },
    ]
  }
};

function AdminDashboard() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState(TABS.DASHBOARD);
  const [stats, setStats] = useState(null);
  const [resources, setResources] = useState([]);
  const [users, setUsers] = useState([]);
  const [loans, setLoans] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [showResourceForm, setShowResourceForm] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  // Form state holds ALL possible fields; unused ones are simply empty strings
  const [resourceForm, setResourceForm] = useState({
    type: 'Book',
    // Book
    title: '', author: '', publisher: '', isbn: '', edition: '', genre: '',
    // Journal
    issn: '', volume: '', publicationDate: '', subjectArea: '',
    // Digital
    url: '', accessType: '', format: '', category: '',
  });

  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, resourceId: null });

  useEffect(() => {
    if (!isAdmin) return;
    const fetchDashboardMetrics = async () => {
      try {
        const response = await adminGetDashboard();
        if (response.data?.data) {
          const metrics = response.data.data;
          setStats(prev => ({
            ...prev,
            totalResources: metrics.totalResources ?? prev?.totalResources ?? 0,
            totalUsers: metrics.totalUsers ?? prev?.totalUsers ?? 0,
            activeLoans: metrics.activeLoans ?? prev?.activeLoans ?? 0,
            availableResources: metrics.availableResources ?? prev?.availableResources ?? 0,
            overdueLoans: metrics.overdueLoans ?? prev?.overdueLoans ?? 0,
          }));
        }
      } catch (err) {
        console.warn('[AdminDashboard] Backend metrics fetch failed:', err);
      }
    };
    fetchDashboardMetrics();
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) loadAllData();
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
      // Reset form — keep type selection, clear all values
      setResourceForm({
        type: resourceForm.type,
        title: '', author: '', publisher: '', isbn: '', edition: '', genre: '',
        issn: '', volume: '', publicationDate: '', subjectArea: '',
        url: '', accessType: '', format: '', category: '',
      });
      refreshResources();
    } catch (error) {
      toastError(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleEditResource = (resource) => {
    setEditingResource(resource);
    setResourceForm({
      type: resource.type || 'Book',
      // Common
      title: resource.title || '',
      publisher: resource.publisher || '',
      // Book fields
      author: resource.author || '',
      isbn: resource.isbn || '',
      edition: resource.edition || '',
      genre: resource.genre || '',
      // Journal fields
      issn: resource.issn || '',
      volume: resource.volume || '',
      publicationDate: resource.publicationDate || '',
      subjectArea: resource.subjectArea || '',
      // Digital fields
      url: resource.url || resource.accessUrl || '',
      accessType: resource.accessType || '',
      format: resource.format || '',
      category: resource.category || '',
    });
    setShowResourceForm(true);
  };

  const handleDeleteResource = async (id) => {
    setDeleteConfirm({ show: true, resourceId: id });
  };

  const confirmDeleteResource = async () => {
    try {
      await adminDeleteResource(deleteConfirm.resourceId);
      toastSuccess('Resource deleted');
      refreshResources();
    } catch (error) {
      toastError(error.response?.data?.message || 'Delete failed');
    } finally {
      setDeleteConfirm({ show: false, resourceId: null });
    }
  };

  const refreshResources = async () => {
    const res = await adminGetAllResources();
    if (res.data?.success) setResources(res.data.data || []);
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
      if (res.data?.success) {
        setReservations(res.data.data || []);
      }
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

  // Get current resource type config
  const currentTypeConfig = RESOURCE_TYPES[resourceForm.type] || RESOURCE_TYPES.Book;

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Manage all system data</p>
        </div>
        <Button variant="outline" onClick={loadAllData}>
          <MdRefresh className="mr-2" /> Refresh
        </Button>
      </div>

      <div className="flex gap-2 border-b pb-2">
        {[
          { key: TABS.DASHBOARD, label: 'Dashboard', icon: MdDashboard },
          { key: TABS.RESOURCES, label: 'Resources', icon: MdLibraryBooks },
          { key: TABS.USERS, label: 'Users', icon: MdPeople },
          { key: TABS.LOANS, label: 'Loans', icon: MdAssignment },
          { key: TABS.RESERVATIONS, label: 'Reservations', icon: MdEvent },
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

      {deleteConfirm.show && (
        <Card className="border-red-300 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <MdWarning className="text-red-500 text-xl" />
              <div className="flex-1">
                <p className="font-medium text-red-800">Delete this resource?</p>
                <p className="text-sm text-red-600">This action cannot be undone.</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="destructive" onClick={confirmDeleteResource}>Delete</Button>
                <Button size="sm" variant="outline" onClick={() => setDeleteConfirm({ show: false, resourceId: null })}>Cancel</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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

      {activeTab === TABS.RESOURCES && (
        <div className="space-y-4">
          {showResourceForm && (
            <Card>
              <CardHeader>
                <CardTitle>{editingResource ? 'Edit Resource' : 'Add New Resource'}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleResourceSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Resource Type</Label>
                      <Select value={resourceForm.type} onChange={(e) => setResourceForm({ ...resourceForm, type: e.target.value })}>
                        <option value="Book">Book</option>
                        <option value="Journal">Journal</option>
                        <option value="Digital">Digital Resource</option>
                      </Select>
                    </div>
                    {currentTypeConfig.fields.map(field => (
                      <div key={field.name}>
                        <Label>{field.label} {field.required && '*'}</Label>
                        <Input
                          value={resourceForm[field.name] || ''}
                          onChange={(e) => setResourceForm({ ...resourceForm, [field.name]: e.target.value })}
                          placeholder={field.placeholder}
                          required={field.required}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit">{editingResource ? 'Update' : 'Create'}</Button>
                    <Button type="button" variant="outline" onClick={() => { setShowResourceForm(false); setEditingResource(null); }}>Cancel</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">All Resources</h2>
            <Button onClick={() => setShowResourceForm(true)}><MdAdd className="mr-1" /> Add Resource</Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Author/Publisher</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resources.length > 0 ? resources.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.title}</TableCell>
                      <TableCell><Badge>{r.type}</Badge></TableCell>
                      <TableCell>{r.author || r.publisher || '-'}</TableCell>
                      <TableCell>{r.isbn || r.issn || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={r.available ? 'success' : 'destructive'}>{r.available ? 'Available' : 'Borrowed'}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="ghost" onClick={() => handleEditResource(r)}><MdEdit /></Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteResource(r.id)}><MdDelete className="text-red-500" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow><TableCell colSpan={6} className="text-center py-8">No resources found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

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
                  {users.length > 0 ? users.map(u => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        <Badge variant={u.memberType && u.memberType !== u.role ? 'info' : 'destructive'}>
                          {u.memberType && u.memberType !== u.role ? u.memberType : u.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.active ? 'success' : 'destructive'}>{u.active ? 'Active' : 'Inactive'}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => handleUserStatusToggle(u.id, u.active)}>
                          {u.active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow><TableCell colSpan={5} className="text-center py-8">No users found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

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
                          <Badge variant={l.status === 'ACTIVE' ? 'success' : 'secondary'}>{l.status}</Badge>
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

      {activeTab === TABS.RESERVATIONS && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">All Reservations</h2>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : reservations.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reservation ID</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>Member</TableHead>
                      <TableHead>Reservation Date</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reservations.map(r => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-sm">{r.id}</TableCell>
                        <TableCell>{r.resourceTitle}</TableCell>
                        <TableCell>{r.memberName || r.memberId}</TableCell>
                        <TableCell>{r.reservationDate}</TableCell>
                        <TableCell>{r.expiryDate}</TableCell>
                        <TableCell>
                          <Badge variant={r.status === 'ACTIVE' || r.status === 'PENDING' ? 'success' : 'secondary'}>
                            {r.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card><CardContent className="text-center py-8">No reservations found</CardContent></Card>
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

