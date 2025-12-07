import React from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
} from '@mui/material';
import {
  Block as BlockIcon,
  CheckCircle as UnblockIcon,
  Verified as VerifiedIcon,
} from '@mui/icons-material';
import { ActivityLogEntry } from '@/types/customer';
import { formatDateTime } from '@/utils/formatters';

interface ActivityLogTimelineProps {
  activityLog: ActivityLogEntry[];
}

export const ActivityLogTimeline: React.FC<ActivityLogTimelineProps> = ({ activityLog }) => {
  if (activityLog.length === 0) {
    return (
      <Typography variant="body2" color="textSecondary">
        No activity recorded yet.
      </Typography>
    );
  }

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'block':
        return <BlockIcon />;
      case 'unblock':
        return <UnblockIcon />;
      case 'verification_change':
        return <VerifiedIcon />;
      default:
        return null;
    }
  };

  const getActionColor = (actionType: string): string => {
    switch (actionType) {
      case 'block':
        return '#f44336';
      case 'unblock':
        return '#4caf50';
      case 'verification_change':
        return '#2196f3';
      default:
        return '#9e9e9e';
    }
  };

  const getActionLabel = (actionType: string): string => {
    switch (actionType) {
      case 'block':
        return 'Blocked';
      case 'unblock':
        return 'Unblocked';
      case 'verification_change':
        return 'Verification Changed';
      default:
        return actionType;
    }
  };

  return (
    <List>
      {activityLog.map((entry) => (
        <ListItem key={entry.id} alignItems="flex-start" sx={{ py: 2 }}>
          <ListItemIcon>
            <Avatar sx={{ bgcolor: getActionColor(entry.actionType), width: 40, height: 40 }}>
              {getActionIcon(entry.actionType)}
            </Avatar>
          </ListItemIcon>
          <ListItemText
            primary={
              <Box>
                <Typography variant="body2" fontWeight="medium">
                  {getActionLabel(entry.actionType)}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {formatDateTime(entry.createdAt)}
                </Typography>
              </Box>
            }
            secondary={
              <Box sx={{ mt: 0.5 }}>
                <Typography variant="body2" color="textSecondary">
                  By: {entry.adminName}
                </Typography>
                {entry.reason && (
                  <Typography variant="body2" color="textSecondary">
                    Reason: {entry.reason}
                  </Typography>
                )}
                {entry.actionType === 'verification_change' && entry.oldValue && entry.newValue && (
                  <Typography variant="body2" color="textSecondary">
                    Changed from {entry.oldValue} to {entry.newValue}
                  </Typography>
                )}
                {entry.ipAddress && (
                  <Typography variant="caption" color="textSecondary">
                    IP: {entry.ipAddress}
                  </Typography>
                )}
              </Box>
            }
          />
        </ListItem>
      ))}
    </List>
  );
};
