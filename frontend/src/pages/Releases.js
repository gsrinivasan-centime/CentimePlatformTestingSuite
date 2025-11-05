import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  LinearProgress,
  Alert,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CompleteIcon,
  Schedule as ScheduledIcon,
  HourglassEmpty as InProgressIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import api from '../services/api';
import ResizableTableCell from '../components/ResizableTableCell';

const Releases = () => {
  const navigate = useNavigate();
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentRelease, setCurrentRelease] = useState(null);
  const [formData, setFormData] = useState({
    version: '',
    name: '',
    description: '',
    release_date: new Date()
  });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchReleases();
  }, []);

  const fetchReleases = async () => {
    setLoading(true);
    try {
      const response = await api.get('/releases');
      setReleases(response.data);
    } catch (error) {
      console.error('Error fetching releases:', error);
      setError('Failed to fetch releases');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (release = null) => {
    if (release) {
      setEditMode(true);
      setCurrentRelease(release);
      setFormData({
        version: release.version,
        name: release.name,
        description: release.description || '',
        release_date: new Date(release.release_date)
      });
    } else {
      setEditMode(false);
      setCurrentRelease(null);
      setFormData({
        version: '',
        name: '',
        description: '',
        release_date: new Date()
      });
    }
    setDialogOpen(true);
    setError('');
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditMode(false);
    setCurrentRelease(null);
    setFormData({
      version: '',
      name: '',
      description: '',
      release_date: new Date()
    });
    setError('');
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleDateChange = (date) => {
    setFormData({
      ...formData,
      release_date: date
    });
  };

  const handleSubmit = async () => {
    if (!formData.version.trim() || !formData.name.trim()) {
      setError('Version and name are required');
      return;
    }

    try {
      const submitData = {
        ...formData,
        release_date: formData.release_date.toISOString()
      };

      if (editMode) {
        await api.put(`/releases/${currentRelease.id}`, submitData);
      } else {
        await api.post('/releases', submitData);
      }
      
      fetchReleases();
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving release:', error);
      setError(error.response?.data?.detail || 'Failed to save release');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this release? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/releases/${id}`);
      fetchReleases();
    } catch (error) {
      console.error('Error deleting release:', error);
      alert('Failed to delete release: ' + (error.response?.data?.detail || error.message));
    }
  };

  const getStatusIcon = (release) => {
    const releaseDate = new Date(release.release_date);
    const today = new Date();
    
    if (releaseDate < today) {
      return <CompleteIcon />;
    } else if (releaseDate.toDateString() === today.toDateString()) {
      return <InProgressIcon />;
    } else {
      return <ScheduledIcon />;
    }
  };

  const getStatusColor = (release) => {
    const releaseDate = new Date(release.release_date);
    const today = new Date();
    
    if (releaseDate < today) {
      return 'success';
    } else if (releaseDate.toDateString() === today.toDateString()) {
      return 'warning';
    } else {
      return 'info';
    }
  };

  const getStatusLabel = (release) => {
    const releaseDate = new Date(release.release_date);
    const today = new Date();
    
    if (releaseDate < today) {
      return 'Released';
    } else if (releaseDate.toDateString() === today.toDateString()) {
      return 'Releasing Today';
    } else {
      return 'Scheduled';
    }
  };

  const calculateProgress = (release) => {
    // Return progress from backend (based on test case execution)
    return release.progress || 0;
  };

  const getStatistics = () => {
    const total = releases.length;
    const released = releases.filter(r => new Date(r.release_date) < new Date()).length;
    const scheduled = releases.filter(r => new Date(r.release_date) >= new Date()).length;
    
    return { total, released, scheduled };
  };

  const stats = getStatistics();

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Release Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Release
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Releases
              </Typography>
              <Typography variant="h4">{stats.total}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Released
              </Typography>
              <Typography variant="h4" color="success.main">{stats.released}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Scheduled
              </Typography>
              <Typography variant="h4" color="info.main">{stats.scheduled}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper>
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 1100, tableLayout: 'fixed' }}>
            <TableHead>
              <TableRow>
                <ResizableTableCell minWidth={100} initialWidth={120} isHeader>Version</ResizableTableCell>
                <ResizableTableCell minWidth={150} initialWidth={180} isHeader>Name</ResizableTableCell>
                <ResizableTableCell minWidth={250} initialWidth={300} isHeader>Description</ResizableTableCell>
                <ResizableTableCell minWidth={120} initialWidth={140} isHeader>Release Date</ResizableTableCell>
                <ResizableTableCell minWidth={120} initialWidth={120} isHeader>Status</ResizableTableCell>
                <ResizableTableCell minWidth={150} initialWidth={180} isHeader>Progress</ResizableTableCell>
                <ResizableTableCell minWidth={120} initialWidth={130} isHeader>Actions</ResizableTableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {releases.map((release) => (
                <TableRow 
                  key={release.id} 
                  hover
                  onClick={() => navigate(`/releases/${release.id}`)}
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    }
                  }}
                >
                  <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <Typography 
                      variant="body1" 
                      fontWeight="bold"
                      sx={{ 
                        color: 'primary.main',
                      }}
                    >
                      {release.version}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <Typography variant="body1">
                      {release.name}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <Typography variant="body2" color="textSecondary">
                      {release.description || 'No description'}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {new Date(release.release_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <Chip
                      icon={getStatusIcon(release)}
                      label={getStatusLabel(release)}
                      color={getStatusColor(release)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box sx={{ width: '100%', mr: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={calculateProgress(release)}
                          color={getStatusColor(release)}
                        />
                      </Box>
                      <Box sx={{ minWidth: 35 }}>
                        <Typography variant="body2" color="textSecondary">
                          {calculateProgress(release)}%
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <IconButton
                      size="small"
                      color="info"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/releases/${release.id}`);
                      }}
                      title="View Release Management"
                    >
                      <ViewIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDialog(release);
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(release.id);
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {releases.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography variant="body2" color="textSecondary" sx={{ py: 3 }}>
                      No releases found. Click "Add Release" to create one.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Add/Edit Release Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editMode ? 'Edit Release' : 'Add New Release'}
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
              label="Version"
              name="version"
              value={formData.version}
              onChange={handleChange}
              required
              sx={{ mb: 2 }}
              placeholder="e.g., v1.0.0"
              autoFocus
            />
            <TextField
              fullWidth
              label="Release Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              sx={{ mb: 2 }}
              placeholder="e.g., Spring Release"
            />
            <TextField
              fullWidth
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              multiline
              rows={3}
              sx={{ mb: 2 }}
              placeholder="Enter release description..."
            />
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Release Date"
                value={formData.release_date}
                onChange={handleDateChange}
                renderInput={(params) => <TextField {...params} fullWidth />}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </LocalizationProvider>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>
            {editMode ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Releases;
