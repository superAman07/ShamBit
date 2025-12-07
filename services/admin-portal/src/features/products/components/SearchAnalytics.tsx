/**
 * Search Analytics Component
 * Displays search performance metrics and insights for admin dashboard
 */

import React, { useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Grid,
  List,
  ListItem,
  ListItemText,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
} from '@mui/material'
import {
  TrendingUp as TrendingUpIcon,
  Search as SearchIcon,
  Speed as SpeedIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'

export interface SearchAnalytics {
  popularQueries: Array<{
    query: string
    count: number
    avgResultCount: number
  }>
  searchTrends: Array<{
    date: string
    searchCount: number
    uniqueQueries: number
  }>
  noResultQueries: Array<{
    query: string
    count: number
    lastSearched: Date
  }>
  categorySearchDistribution: Array<{
    categoryId: string
    categoryName: string
    searchCount: number
  }>
  performanceMetrics: {
    avgExecutionTime: number
    cacheHitRate: number
    totalSearches: number
  }
}

interface Props {
  analytics?: SearchAnalytics
  loading?: boolean
  onRefresh?: () => void
  dateRange?: { start: Date; end: Date }
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

export const SearchAnalytics: React.FC<Props> = ({
  analytics,
  loading = false,
  onRefresh,
  dateRange: _dateRange,
}) => {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const getPerformanceColor = (avgTime: number) => {
    if (avgTime < 100) return 'success'
    if (avgTime < 500) return 'warning'
    return 'error'
  }

  const getCacheHitRateColor = (rate: number) => {
    if (rate > 0.8) return 'success'
    if (rate > 0.6) return 'warning'
    return 'error'
  }

  if (loading) {
    return (
      <Card>
        <CardHeader title="Search Analytics" />
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
            <LinearProgress sx={{ width: '50%' }} />
          </Box>
        </CardContent>
      </Card>
    )
  }

  if (!analytics || !analytics.performanceMetrics) {
    return (
      <Card>
        <CardHeader title="Search Analytics" />
        <CardContent>
          <Typography color="text.secondary" align="center">
            No analytics data available
          </Typography>
        </CardContent>
      </Card>
    )
  }

  // Provide safe defaults for arrays
  const popularQueries = analytics.popularQueries || []
  const searchTrends = analytics.searchTrends || []
  const noResultQueries = analytics.noResultQueries || []
  const categorySearchDistribution = analytics.categorySearchDistribution || []

  return (
    <>
      <Grid container spacing={3}>
        {/* Performance Metrics */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader
              title="Performance Metrics"
              action={
                <Tooltip title="Refresh Analytics">
                  <IconButton onClick={onRefresh} disabled={loading}>
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
              }
            />
            <CardContent>
              <Stack spacing={2}>
                <Box>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <SpeedIcon color="action" />
                    <Typography variant="body2" color="text.secondary">
                      Avg Response Time
                    </Typography>
                  </Stack>
                  <Typography variant="h6" color={getPerformanceColor(analytics.performanceMetrics.avgExecutionTime)}>
                    {formatDuration(analytics.performanceMetrics.avgExecutionTime)}
                  </Typography>
                </Box>

                <Box>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <TrendingUpIcon color="action" />
                    <Typography variant="body2" color="text.secondary">
                      Cache Hit Rate
                    </Typography>
                  </Stack>
                  <Typography variant="h6" color={getCacheHitRateColor(analytics.performanceMetrics.cacheHitRate)}>
                    {(analytics.performanceMetrics.cacheHitRate * 100).toFixed(1)}%
                  </Typography>
                </Box>

                <Box>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <SearchIcon color="action" />
                    <Typography variant="body2" color="text.secondary">
                      Total Searches
                    </Typography>
                  </Stack>
                  <Typography variant="h6">
                    {analytics.performanceMetrics.totalSearches.toLocaleString()}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Popular Queries */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardHeader title="Popular Search Queries" />
            <CardContent>
              <List dense>
                {popularQueries.slice(0, 5).map((query, index) => (
                  <ListItem key={query.query} divider={index < 4}>
                    <ListItemText
                      primary={
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography variant="body1">{query.query}</Typography>
                          <Chip label={`${query.count} searches`} size="small" />
                        </Stack>
                      }
                      secondary={`Avg ${query.avgResultCount} results per search`}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Search Trends Chart */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardHeader title="Search Trends" />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={searchTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={formatDate} />
                  <YAxis />
                  <RechartsTooltip labelFormatter={formatDate} />
                  <Line
                    type="monotone"
                    dataKey="searchCount"
                    stroke="#8884d8"
                    strokeWidth={2}
                    name="Total Searches"
                  />
                  <Line
                    type="monotone"
                    dataKey="uniqueQueries"
                    stroke="#82ca9d"
                    strokeWidth={2}
                    name="Unique Queries"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Category Distribution */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader title="Category Search Distribution" />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categorySearchDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(props: any) => `${props.categoryName || ''} ${((props.percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="searchCount"
                  >
                    {categorySearchDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* No Results Queries */}
        <Grid item xs={12}>
          <Card>
            <CardHeader
              title="Queries with No Results"
              action={
                <Tooltip title="These queries might indicate missing products or search issues">
                  <IconButton>
                    <InfoIcon />
                  </IconButton>
                </Tooltip>
              }
            />
            <CardContent>
              {noResultQueries.length > 0 ? (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Query</TableCell>
                        <TableCell align="right">Search Count</TableCell>
                        <TableCell align="right">Last Searched</TableCell>
                        <TableCell align="center">Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {noResultQueries.map((query) => (
                        <TableRow key={query.query}>
                          <TableCell>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <WarningIcon color="warning" fontSize="small" />
                              <Typography variant="body2">{query.query}</Typography>
                            </Stack>
                          </TableCell>
                          <TableCell align="right">
                            <Chip label={query.count} size="small" color="warning" />
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" color="text.secondary">
                              {new Date(query.lastSearched).toLocaleDateString()}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Button
                              size="small"
                              onClick={() => {
                                setSelectedMetric(query.query)
                                setDetailsOpen(true)
                              }}
                            >
                              Investigate
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography color="text.secondary" align="center">
                  Great! All search queries are returning results.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Search Volume by Category */}
        <Grid item xs={12}>
          <Card>
            <CardHeader title="Search Volume by Category" />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categorySearchDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="categoryName" />
                  <YAxis />
                  <RechartsTooltip />
                  <Bar dataKey="searchCount" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Search Query Analysis: "{selectedMetric}"</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Typography variant="body1">
              This query has been searched multiple times but returned no results. Consider:
            </Typography>
            <List>
              <ListItem>
                <ListItemText primary="• Adding products that match this search term" />
              </ListItem>
              <ListItem>
                <ListItemText primary="• Updating product keywords and descriptions" />
              </ListItem>
              <ListItem>
                <ListItemText primary="• Checking for spelling variations or synonyms" />
              </ListItem>
              <ListItem>
                <ListItemText primary="• Reviewing search algorithm configuration" />
              </ListItem>
            </List>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
          <Button variant="contained" onClick={() => setDetailsOpen(false)}>
            Create Product
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}