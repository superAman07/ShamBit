import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { addCustomerNote } from '@/store/slices/customerSlice';
import { CustomerNote } from '@/types/customer';
import { formatDateTime } from '@/utils/formatters';

interface NotesTabProps {
  customerId: string;
  notes: CustomerNote[];
}

export const NotesTab: React.FC<NotesTabProps> = ({ customerId, notes }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error } = useSelector((state: RootState) => state.customers);

  const [noteText, setNoteText] = useState('');
  const [validationError, setValidationError] = useState('');

  const handleAddNote = async () => {
    // Validate note length
    if (!noteText.trim()) {
      setValidationError('Note cannot be empty');
      return;
    }

    if (noteText.length > 1000) {
      setValidationError('Note must not exceed 1000 characters');
      return;
    }

    setValidationError('');
    
    const result = await dispatch(addCustomerNote({ customerId, noteText: noteText.trim() }));
    
    if (!error.noteAction && result.meta.requestStatus === 'fulfilled') {
      setNoteText('');
    }
  };

  const handleNoteTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNoteText(value);
    
    if (value.length > 1000) {
      setValidationError('Note must not exceed 1000 characters');
    } else {
      setValidationError('');
    }
  };

  return (
    <Box>
      {/* Add Note Form */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Add New Note
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={4}
          label="Note"
          value={noteText}
          onChange={handleNoteTextChange}
          placeholder="Enter your note here..."
          helperText={`${noteText.length}/1000 characters`}
          error={Boolean(validationError)}
          disabled={loading.noteAction}
        />
        {validationError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {validationError}
          </Alert>
        )}
        {error.noteAction && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error.noteAction}
          </Alert>
        )}
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            startIcon={loading.noteAction ? <CircularProgress size={16} /> : <AddIcon />}
            onClick={handleAddNote}
            disabled={!noteText.trim() || Boolean(validationError) || loading.noteAction}
          >
            Add Note
          </Button>
        </Box>
      </Paper>

      {/* Notes List */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Notes History
        </Typography>
        {notes.length === 0 ? (
          <Typography variant="body2" color="textSecondary">
            No notes added yet.
          </Typography>
        ) : (
          <List>
            {notes.map((note, index) => (
              <React.Fragment key={note.id}>
                <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle2" fontWeight="medium">
                          {note.adminName}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {formatDateTime(note.createdAt)}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {note.noteText}
                      </Typography>
                    }
                  />
                </ListItem>
                {index < notes.length - 1 && <Divider component="li" />}
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
};
