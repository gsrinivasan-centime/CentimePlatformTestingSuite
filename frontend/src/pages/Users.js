import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AdminPanelSettings as AdminIcon,
  Person as UserIcon
} from '@mui/icons-material';
import ResizableTableCell from '../components/ResizableTableCell';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

const Users = () => {
  const { showSuccess, showError } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'TESTER'
  });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/users/');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (user = null) => {
    if (user) {
      setEditMode(true);
      setCurrentUser(user);
      setFormData({
        name: user.full_name || user.name || '',
        email: user.email,
        password: '',
        role: user.role
      });
    } else {
      setEditMode(false);
      setCurrentUser(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'tester'
      });
    }
    setDialogOpen(true);
    setError('');
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditMode(false);
    setCurrentUser(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'TESTER'
    });
    setError('');
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const validateEmail = (email) => {
    return email.endsWith('@centime.com');
  };

  const handleSubmit = async () => {
    // Validation for new users
    if (!editMode) {
      if (!formData.name || !formData.name.trim() || !formData.email || !formData.email.trim()) {
        setError('Name and email are required');
        return;
      }

      if (!validateEmail(formData.email)) {
        setError('Email must end with @centime.com');
        return;
      }

      if (!formData.password) {
        setError('Password is required for new users');
        return;
      }
    }

    try {
      const submitData = { ...formData };
      
      // Map 'name' to 'full_name' for backend
      if (submitData.name) {
        submitData.full_name = submitData.name;
        delete submitData.name;
      }
      
      // Remove password field if empty in edit mode
      if (editMode && !formData.password) {
        delete submitData.password;
      }
      
      // Remove email field in edit mode (can't change email)
      if (editMode) {
        delete submitData.email;
      }

      if (editMode) {
        await api.put(`/users/${currentUser.id}/`, submitData);
        showSuccess('User updated successfully');
      } else {
        await api.post('/users/', submitData);
        showSuccess('User created successfully! A verification email has been sent to ' + formData.email);
      }
      
      fetchUsers();
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving user:', error);
      console.error('Error response:', error.response?.data);
      
      // Handle validation errors from FastAPI
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        
        // If detail is an array (validation errors)
        if (Array.isArray(detail)) {
          const errorMessages = detail.map(err => {
            const field = err.loc?.[1] || err.loc?.[0] || 'field';
            return `${field}: ${err.msg}`;
          }).join(', ');
          setError(errorMessages);
        } else {
          // If detail is a string
          setError(detail);
        }
      } else {
        setError('Failed to save user');
      }
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/users/${id}/`);
      fetchUsers();
      showSuccess('User deleted successfully');
    } catch (error) {
      console.error('Error deleting user:', error);
      showError('Failed to delete user: ' + (error.response?.data?.detail || error.message));
    }
  };

  const getRoleIcon = (role) => {
    return role?.toLowerCase() === 'admin' ? <AdminIcon /> : <UserIcon />;
  };

  const getRoleColor = (role) => {
    return role?.toLowerCase() === 'admin' ? 'error' : 'primary';
  };

  const getStatistics = () => {
    const total = users.length;
    const admins = users.filter(u => u.role?.toLowerCase() === 'admin').length;
    const testers = users.filter(u => u.role?.toLowerCase() === 'tester').length;
    
    return { total, admins, testers };
  };

  const stats = getStatistics();

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          User Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add User
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Statistics Cards */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Users
              </Typography>
              <Typography variant="h4">{stats.total}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Administrators
              </Typography>
              <Typography variant="h4" color="error.main">{stats.admins}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Testers
              </Typography>
              <Typography variant="h4" color="primary.main">{stats.testers}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper>
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 900, tableLayout: 'fixed' }}>
            <TableHead>
              <TableRow>
                <ResizableTableCell minWidth={60} initialWidth={80} isHeader>ID</ResizableTableCell>
                <ResizableTableCell minWidth={150} initialWidth={180} isHeader>Name</ResizableTableCell>
                <ResizableTableCell minWidth={200} initialWidth={250} isHeader>Email</ResizableTableCell>
                <ResizableTableCell minWidth={120} initialWidth={120} isHeader>Role</ResizableTableCell>
                <ResizableTableCell minWidth={120} initialWidth={140} isHeader>Created At</ResizableTableCell>
                <ResizableTableCell minWidth={120} initialWidth={130} isHeader>Actions</ResizableTableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow 
                  key={user.id} 
                  hover
                  onClick={() => handleOpenDialog(user)}
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    }
                  }}
                >
                  <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.id}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <Typography variant="body1" fontWeight="medium">
                      {user.full_name || user.name || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <Typography variant="body2">
                      {user.email}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <Chip
                      icon={getRoleIcon(user.role)}
                      label={user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase() : 'Tester'}
                      color={getRoleColor(user.role)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user.created_at 
                      ? new Date(user.created_at).toLocaleDateString()
                      : 'N/A'}
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDialog(user);
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(user.id);
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body2" color="textSecondary" sx={{ py: 3 }}>
                      No users found. Click "Add User" to create one.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Add/Edit User Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editMode ? 'Edit User' : 'Add New User'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <TextField
              fullWidth
              label="Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              sx={{ mb: 2 }}
              autoFocus
            />
            <TextField
              fullWidth
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              sx={{ mb: 2 }}
              placeholder="user@centime.com"
              helperText="Email must end with @centime.com"
              disabled={editMode}
            />
            <TextField
              fullWidth
              label={editMode ? 'New Password (leave blank to keep current)' : 'Password'}
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required={!editMode}
              sx={{ mb: 2 }}
              helperText={editMode ? 'Leave blank to keep current password' : ''}
            />
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                name="role"
                value={formData.role}
                onChange={handleChange}
                label="Role"
              >
                <MenuItem value="tester">Tester</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>
            {editMode ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
        </>
      )}
    </Box>
  );
};

export default Users;
