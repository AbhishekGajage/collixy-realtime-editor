import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  TextField,
  Paper,
  Card,
  CardContent,
  Grid,
  IconButton,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  ContentCopy as CopyIcon,
  Logout as LogoutIcon,
  Home as HomeIcon,
  Add as AddIcon,
  Groups as GroupsIcon,
  Code as CodeIcon
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

const Dashboard = () => {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [user, setUser] = useState(null);
  const [rooms] = useState([
    { id: '1', name: 'React Project', members: 3, lastActive: '2 min ago' },
    { id: '2', name: 'Node.js Backend', members: 2, lastActive: '1 hour ago' },
    { id: '3', name: 'UI Design', members: 5, lastActive: '5 min ago' },
  ]);

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUser(JSON.parse(storedUser));
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const handleCreateRoom = () => {
    const newRoomId = uuidv4().split('-')[0];
    toast.success(`Room created: ${newRoomId}`);
    navigate(`/editor/${newRoomId}`);
  };

  const handleJoinRoom = () => {
    if (roomId.trim()) {
      navigate(`/editor/${roomId.trim()}`);
    } else {
      toast.error('Please enter a room ID');
    }
  };

  const handleCopyRoomId = (id) => {
    navigator.clipboard.writeText(id);
    toast.success('Room ID copied to clipboard!');
  };


  const features = [
    {
      icon: <GroupsIcon sx={{ fontSize: 40 }} />,
      title: 'Team Collaboration',
      description: 'Edit code simultaneously with your team in real-time'
    },
    {
      icon: <CodeIcon sx={{ fontSize: 40 }} />,
      title: 'Powerful Editor',
      description: 'Syntax highlighting, auto-completion, multi-language support'
    }
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      {/* Navbar */}
      <Paper elevation={1} sx={{ borderRadius: 0 }}>
        <Container>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            py: 2
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#764ba2' }}>
                COLLIXY
              </Typography>
              <Button 
                startIcon={<HomeIcon />} 
                onClick={() => navigate('/dashboard')}
                sx={{ textTransform: 'none' }}
              >
                Home
              </Button>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip 
                avatar={<Avatar>{user?.name?.charAt(0) || 'U'}</Avatar>}
                label={user?.name || 'User'}
                variant="outlined"
              />
              <IconButton onClick={handleLogout} color="error">
                <LogoutIcon />
              </IconButton>
            </Box>
          </Box>
        </Container>
      </Paper>

      {/* Hero Section */}
      <Container sx={{ py: 6, textAlign: 'center' }}>
        <Typography variant="h2" sx={{ fontWeight: 'bold', mb: 2, color: '#333' }}>
          Welcome, {user?.name || 'User'}!
        </Typography>
        <Typography variant="h5" sx={{ mb: 4, color: 'text.secondary' }}>
          Start coding with your team in real-time
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 6 }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            onClick={handleCreateRoom}
            sx={{
              px: 4,
              py: 1.5,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            }}
          >
            Create New Room
          </Button>
          
          <Button
            variant="outlined"
            size="large"
            onClick={() => setOpenDialog(true)}
            sx={{ px: 4, py: 1.5 }}
          >
            Join Existing Room
          </Button>
        </Box>

        {/* Join Room Input */}
        <Paper sx={{ p: 3, maxWidth: 600, mx: 'auto', mb: 6 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Join a Room
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              placeholder="Paste room ID here"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              size="small"
            />
            <Button 
              variant="contained" 
              onClick={handleJoinRoom}
              sx={{ whiteSpace: 'nowrap' }}
            >
              Connect
            </Button>
          </Box>
        </Paper>
      </Container>

      {/* Features & Recent Rooms */}
      <Container>
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Typography variant="h5" sx={{ mb: 3 }}>
              Features
            </Typography>
            <Grid container spacing={2}>
              {features.map((feature, index) => (
                <Grid item xs={12} key={index}>
                  <Card>
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ color: '#764ba2' }}>
                        {feature.icon}
                      </Box>
                      <Box>
                        <Typography variant="h6">{feature.title}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {feature.description}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="h5" sx={{ mb: 3 }}>
              Recent Rooms
            </Typography>
            <Grid container spacing={2}>
              {rooms.map((room) => (
                <Grid item xs={12} key={room.id}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <Box>
                          <Typography variant="h6">{room.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {room.members} members • {room.lastActive}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton 
                            size="small" 
                            onClick={() => handleCopyRoomId(room.id)}
                          >
                            <CopyIcon fontSize="small" />
                          </IconButton>
                          <Button 
                            size="small" 
                            onClick={() => navigate(`/editor/${room.id}`)}
                          >
                            Join
                          </Button>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Grid>
        </Grid>
      </Container>

      {/* Join Room Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Join Room</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Room ID"
            fullWidth
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="Paste room ID here"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleJoinRoom} variant="contained">
            Connect
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Dashboard;