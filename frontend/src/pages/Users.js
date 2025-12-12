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
  Person as UserIcon,
  Code as DeveloperIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import ResizableTableCell from '../components/ResizableTableCell';
import TruncatedText from '../components/TruncatedText';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const Users = () => {
  const { showSuccess, showError } = useToast();
  const { canEditUsers } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState(false);  // View-only mode for non-admins
  const [editMode, setEditMode] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'TESTER'
  });
  const [error, setError] = useState('');
  
  const isEditable = canEditUsers();

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
      // If non-admin clicks on a user, open in view mode
      if (!isEditable) {
        setViewMode(true);
        setEditMode(false);
      } else {
        setViewMode(false);
        setEditMode(true);
      }
      setCurrentUser(user);
      setFormData({
        name: user.full_name || user.name || '',
        email: user.email,
        password: '',
        role: user.role?.toUpperCase() || 'TESTER'  // Normalize to uppercase
      });
    } else {
      // Create new user - only admins can do this
      if (!isEditable) return;
      setViewMode(false);
      setEditMode(false);
      setCurrentUser(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'TESTER'
      });
    }
    setDialogOpen(true);
    setError('');
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setViewMode(false);
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
    const roleLower = role?.toLowerCase();
    if (roleLower === 'admin') return <AdminIcon />;
    if (roleLower === 'developer') return <DeveloperIcon />;
    return <UserIcon />;
  };

  const getRoleColor = (role) => {
    const roleLower = role?.toLowerCase();
    if (roleLower === 'admin') return 'error';
    if (roleLower === 'developer') return 'secondary';
    return 'primary';
  };

  const getStatistics = () => {
    const total = users.length;
    const admins = users.filter(u => u.role?.toLowerCase() === 'admin').length;
    const developers = users.filter(u => u.role?.toLowerCase() === 'developer').length;
    const testers = users.filter(u => u.role?.toLowerCase() === 'tester').length;
    
    return { total, admins, developers, testers };
  };

  const stats = getStatistics();

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1">
            User Management
          </Typography>
          {!isEditable && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Read-only access - Contact an Admin to make changes
            </Typography>
          )}
        </Box>
        {isEditable && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add User
          </Button>
        )}
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
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Users
              </Typography>
              <Typography variant="h4">{stats.total}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Administrators
              </Typography>
              <Typography variant="h4" color="error.main">{stats.admins}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Developers
              </Typography>
              <Typography variant="h4" color="secondary.main">{stats.developers}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
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
                    <TruncatedText text={user.full_name || user.name || '-'} fontWeight="medium" />
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <TruncatedText text={user.email} />
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
                    {isEditable ? (
                      <>
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
                      </>
                    ) : (
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDialog(user);
                        }}
                        title="View details"
                      >
                        <ViewIcon />
                      </IconButton>
                    )}
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

      {/* Add/Edit/View User Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {viewMode ? 'View User Details' : (editMode ? 'Edit User' : 'Add New User')}
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
              required={!viewMode}
              sx={{ mb: 2 }}
              autoFocus={!viewMode}
              InputProps={{ readOnly: viewMode }}
              disabled={viewMode}
            />
            <TextField
              fullWidth
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required={!viewMode}
              sx={{ mb: 2 }}
              placeholder="user@centime.com"
              helperText={!viewMode && !editMode ? "Email must end with @centime.com" : ""}
              disabled={editMode || viewMode}
              InputProps={{ readOnly: viewMode || editMode }}
            />
            {!viewMode && (
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
            )}
            <FormControl fullWidth disabled={viewMode}>
              <InputLabel>Role</InputLabel>
              <Select
                name="role"
                value={formData.role}
                onChange={handleChange}
                label="Role"
                inputProps={{ readOnly: viewMode }}
              >
                <MenuItem value="TESTER">Tester</MenuItem>
                <MenuItem value="DEVELOPER">Developer</MenuItem>
                <MenuItem value="ADMIN">Admin</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>{viewMode ? 'Close' : 'Cancel'}</Button>
          {!viewMode && (
            <Button variant="contained" onClick={handleSubmit}>
              {editMode ? 'Update' : 'Create'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
        </>
      )}
    </Box>
  );
};

export default Users;
