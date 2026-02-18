import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { EngagementProvider } from '@/context/EngagementContext';
import LandingPage from './pages/landing/LandingPage';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Dashboard Pages
import DashboardLayout from './pages/dashboard/DashboardLayout';
import Dashboard from './pages/dashboard/Dashboard';
import Trending from './pages/dashboard/Trending';
import Bookmarks from './pages/dashboard/Bookmarks';
import Settings from './pages/dashboard/Settings';
import Profile from './pages/dashboard/Profile';
import CalendarPage from './pages/dashboard/Calendar';
import { loadBriefboardSettings, shouldShowBriefboard } from '@/utils/briefboard';

// Profile Pages
import ProfileDirectory from './pages/profiles/ProfileDirectory';
import ProfileDetail from './pages/profiles/ProfileDetail';
import ProfileEdit from './pages/profiles/ProfileEdit';

// Marketing Pages
import MarketingDashboard from './pages/marketing/MarketingDashboard';
import CreateCampaign from './pages/marketing/CreateCampaign';

// Messages & Connections
import Messages from './pages/messages/Messages';
import Connections from './pages/connections/Connections';

// Social Feed & Marketplace
import TheHub from './pages/feed/TheHub';
import Marketplace from './pages/marketplace/Marketplace';

// Investment & Mentorship
import Investments from './pages/investments/Investments';
import Mentorship from './pages/mentorship/Mentorship';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--brand-primary)] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Public Route (redirect if authenticated)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--brand-primary)] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const BriefboardGate = () => {
  const { user } = useAuth();
  const settings = loadBriefboardSettings(user?.id);
  const shouldShow = shouldShowBriefboard(settings, user?.id);

  if (shouldShow) {
    return <Navigate to="/dashboard/briefboard" replace />;
  }

  return <Navigate to="/dashboard/feed" replace />;
};

// App Routes
const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />

      {/* Protected Dashboard Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<BriefboardGate />} />
        <Route path="briefboard" element={<Dashboard />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="profiles" element={<ProfileDirectory />} />
        <Route path="profiles/:id" element={<ProfileDetail />} />
        <Route path="profile" element={<Profile />} />
        <Route path="profile/edit" element={<ProfileEdit />} />
        <Route path="trending" element={<Trending />} />
        <Route path="connections" element={<Connections />} />
        <Route path="messages" element={<Messages />} />
        <Route path="marketing" element={<MarketingDashboard />} />
        <Route path="marketing/create" element={<CreateCampaign />} />
        
        {/* Social Feed & Marketplace */}
        <Route path="feed" element={<TheHub />} />
        <Route path="marketplace" element={<Marketplace />} />
        
        {/* Investment & Mentorship */}
        <Route path="investments" element={<Investments />} />
        <Route path="mentorship" element={<Mentorship />} />
        <Route path="bookmarks" element={<Bookmarks />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <BrowserRouter>
      <EngagementProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </EngagementProvider>
    </BrowserRouter>
  );
}

export default App;
