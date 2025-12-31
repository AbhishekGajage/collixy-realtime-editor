import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Button, Typography, Paper } from '@mui/material';
import { Code as CodeIcon } from '@mui/icons-material';
import toast from 'react-hot-toast';

const TestEditor = () => {
  const { roomId } = useParams();
  const [output, setOutput] = useState('');

  const handleRunCode = () => {
    console.log('Run Code clicked'); // Check console
    setOutput(`Code executed successfully!\nRoom ID: ${roomId}\nTimestamp: ${new Date().toLocaleTimeString()}`);
    toast.success('Code executed!');
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Simple output test */}
      <Box sx={{ flex: 1, p: 2, bgcolor: '#f0f0f0' }}>
        <Typography variant="h6">Test Output Panel</Typography>
        <Button 
          variant="contained" 
          startIcon={<CodeIcon />}
          onClick={handleRunCode}
          sx={{ mt: 2 }}
        >
          Run Test Code
        </Button>
      </Box>
      
      {/* Output Panel - Simplified */}
      <Box sx={{ 
        height: '200px', 
        bgcolor: '#1e1e1e',
        borderTop: '2px solid #333'
      }}>
        <Box sx={{ 
          p: 2, 
          bgcolor: '#2d2d2d',
          height: '100%',
          overflow: 'auto'
        }}>
          <Typography sx={{ 
            color: 'white',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap'
          }}>
            {output || 'Output will appear here...'}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default TestEditor;