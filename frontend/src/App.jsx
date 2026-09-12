// frontend/src/App.jsx
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { ThemeProvider } from './Context/ThemeContext.jsx'; 
import { UserProvider } from './Context/userContext.jsx';
import AuthCallback from './pages/AuthCallback';
import Dashboard from './pages/Dashboard';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CreateRoom from './pages/CreateRoom.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { Toaster } from 'react-hot-toast';
import JoinRoom from './pages/JoinRoom.jsx';
function App() {
  return (
    <ThemeProvider>
      <UserProvider>
        <Toaster
        position="top-center"
        reverseOrder={false}
        gutter={8}
        containerClassName=""
        containerStyle={{}}
        toastOptions={{
          // Define default options
          className: '',
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          // Default options for specific types
          success: {
            duration: 3000,
            theme: {
              primary: 'green',
              secondary: 'black',
            },
          },
        }}
      />
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
              <Dashboard />
              </ProtectedRoute>
              } />
            <Route path="/dashboard/room/create" element={
              <ProtectedRoute>
              <CreateRoom/>
              </ProtectedRoute>
              } />

              <Route path="/dashboard/room/join" element={
              <ProtectedRoute>
              <JoinRoom/>
              </ProtectedRoute>
              } />

            {/* Shareable invite link. CreateRoom's "share" button hands out this
                URL, and JoinRoom reads :roomId from the params and auto-joins. */}
            <Route path="/room/:roomId" element={
              <ProtectedRoute>
              <JoinRoom/>
              </ProtectedRoute>
              } />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Router>
      </UserProvider>
    </ThemeProvider>
  );
}

export default App;