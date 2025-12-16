import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    IconButton,
    Button,
    TextField,
    MenuItem,
    Pagination,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    Tooltip,
    CircularProgress
} from '@mui/material';
import {
    Delete as DeleteIcon,
    Download as DownloadIcon,
    Email as EmailIcon,
    TrendingUp as TrendingUpIcon,
    People as PeopleIcon,
    Today as TodayIcon
} from '@mui/icons-material';
import { newsletterService } from '../../services/newsletterService';
import { NewsletterSignup, NewsletterStats } from '../../types/newsletter';
import { formatDate } from '../../utils/dateUtils';

export const NewsletterDashboard: React.FC = () => {
    const [signups, setSignups] = useState<NewsletterSignup[]>([]);
    const [stats, setStats] = useState<NewsletterStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'unsubscribed'>('all');
    const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; signup: NewsletterSignup | null }>({
        open: false,
        signup: null
    });
    const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const limit = 25;

    useEffect(() => {
        loadData();
    }, [page, statusFilter]);

    const loadData = async () => {
        try {
            setLoading(true);
            
            // Try to load stats (public endpoint)
            try {
                const statsResponse = await newsletterService.getStats();
                if (statsResponse.success) {
                    setStats(statsResponse.data);
                }
            } catch (error) {
                console.error('Failed to load newsletter stats:', error);
            }

            // Try to load signups (requires authentication)
            try {
                const signupsResponse = await newsletterService.getSignups({
                    page,
                    limit,
                    status: statusFilter === 'all' ? undefined : statusFilter
                });

                if (signupsResponse.success) {
                    setSignups(signupsResponse.data.signups);
                    setTotalPages(Math.ceil(signupsResponse.data.total / limit));
                }
            } catch (error: any) {
                console.error('Failed to load newsletter signups:', error);
                if (error.response?.status === 401) {
                    setAlert({ type: 'error', message: 'Please log in to view newsletter signups' });
                } else {
                    setAlert({ type: 'error', message: 'Failed to load newsletter signups' });
                }
            }
        } catch (error) {
            console.error('Failed to load newsletter data:', error);
            setAlert({ type: 'error', message: 'Failed to load newsletter data' });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteDialog.signup) return;

        try {
            const response = await newsletterService.deleteSignup(deleteDialog.signup.id);
            if (response.success) {
                setAlert({ type: 'success', message: 'Newsletter signup deleted successfully' });
                loadData();
            }
        } catch (error) {
            setAlert({ type: 'error', message: 'Failed to delete newsletter signup' });
        } finally {
            setDeleteDialog({ open: false, signup: null });
        }
    };

    const handleExport = async () => {
        try {
            const blob = await newsletterService.exportSignups(
                statusFilter === 'all' ? undefined : statusFilter
            );
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `newsletter-signups-${statusFilter}-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            setAlert({ type: 'success', message: 'Newsletter signups exported successfully' });
        } catch (error) {
            setAlert({ type: 'error', message: 'Failed to export newsletter signups' });
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'success';
            case 'unsubscribed':
                return 'default';
            default:
                return 'default';
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                Newsletter Management
            </Typography>

            {alert && (
                <Alert 
                    severity={alert.type} 
                    onClose={() => setAlert(null)}
                    sx={{ mb: 3 }}
                >
                    {alert.message}
                </Alert>
            )}

            {/* Statistics Cards */}
            {stats && (
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <PeopleIcon color="primary" sx={{ mr: 2 }} />
                                    <Box>
                                        <Typography color="textSecondary" gutterBottom>
                                            Total Signups
                                        </Typography>
                                        <Typography variant="h5">
                                            {stats.total.toLocaleString()}
                                        </Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <EmailIcon color="success" sx={{ mr: 2 }} />
                                    <Box>
                                        <Typography color="textSecondary" gutterBottom>
                                            Active Subscribers
                                        </Typography>
                                        <Typography variant="h5">
                                            {stats.active.toLocaleString()}
                                        </Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <TodayIcon color="info" sx={{ mr: 2 }} />
                                    <Box>
                                        <Typography color="textSecondary" gutterBottom>
                                            Today's Signups
                                        </Typography>
                                        <Typography variant="h5">
                                            {stats.todaySignups.toLocaleString()}
                                        </Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <TrendingUpIcon color="warning" sx={{ mr: 2 }} />
                                    <Box>
                                        <Typography color="textSecondary" gutterBottom>
                                            This Month
                                        </Typography>
                                        <Typography variant="h5">
                                            {stats.monthlySignups.toLocaleString()}
                                        </Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            {/* Filters and Actions */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <TextField
                    select
                    label="Status Filter"
                    value={statusFilter}
                    onChange={(e) => {
                        setStatusFilter(e.target.value as any);
                        setPage(1);
                    }}
                    sx={{ minWidth: 150 }}
                >
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="unsubscribed">Unsubscribed</MenuItem>
                </TextField>

                <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={handleExport}
                >
                    Export CSV
                </Button>
            </Box>

            {/* Newsletter Signups Table */}
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Newsletter Signups
                    </Typography>
                    
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <>
                            <TableContainer component={Paper} variant="outlined">
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Email</TableCell>
                                            <TableCell>Status</TableCell>
                                            <TableCell>Source</TableCell>
                                            <TableCell>Subscribed Date</TableCell>
                                            <TableCell>Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {signups.map((signup) => (
                                            <TableRow key={signup.id}>
                                                <TableCell>
                                                    <Typography variant="body2">
                                                        {signup.email}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={signup.status}
                                                        color={getStatusColor(signup.status) as any}
                                                        size="small"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" color="textSecondary">
                                                        {signup.source}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">
                                                        {formatDate(signup.subscribed_at)}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Tooltip title="Delete signup">
                                                        <IconButton
                                                            size="small"
                                                            color="error"
                                                            onClick={() => setDeleteDialog({ open: true, signup })}
                                                        >
                                                            <DeleteIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            {/* Pagination */}
                            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                                <Pagination
                                    count={totalPages}
                                    page={page}
                                    onChange={(_, newPage) => setPage(newPage)}
                                    color="primary"
                                />
                            </Box>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={deleteDialog.open}
                onClose={() => setDeleteDialog({ open: false, signup: null })}
            >
                <DialogTitle>Confirm Delete</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete the newsletter signup for{' '}
                        <strong>{deleteDialog.signup?.email}</strong>?
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialog({ open: false, signup: null })}>
                        Cancel
                    </Button>
                    <Button onClick={handleDelete} color="error" variant="contained">
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};