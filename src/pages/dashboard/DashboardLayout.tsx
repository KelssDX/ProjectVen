import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { VendromLogo } from '@/components/VendromLogo';
import { Input } from '@/components/ui/input';
import CalendarPanel from '@/components/dashboard/CalendarPanel';
import CalendarPanelDrawer from '@/components/dashboard/CalendarPanelDrawer';
import { CalendarPanelProvider, useCalendarPanel } from '@/context/CalendarPanelContext';
import {
  Users,
  TrendingUp,
  MessageSquare,
  Settings,
  Bell,
  Menu,
  X,
  LogOut,
  ChevronDown,
  ShoppingBag,
  DollarSign,
  GraduationCap,
  Bookmark,
  Compass,
  Landmark,
  Megaphone,
  Search,
  Newspaper,
  CalendarDays,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const DashboardLayoutInner = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isOpen: isCalendarOpen, closePanel } = useCalendarPanel();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navigation = [
    { name: 'Briefboard', href: '/dashboard/briefboard', icon: Newspaper },
    { name: 'The Hub', href: '/dashboard/feed', icon: Landmark },
    { name: 'Marketplace', href: '/dashboard/marketplace', icon: ShoppingBag },
    { name: 'Messages', href: '/dashboard/messages', icon: MessageSquare, badge: '5' },
    { name: 'Trending', href: '/dashboard/trending', icon: TrendingUp },
    { name: 'Profile', href: '/dashboard/profile', icon: Compass },
    { name: 'My Network', href: '/dashboard/connections', icon: Users },
    { name: 'Calendar', href: '/dashboard/calendar', icon: CalendarDays },
    { name: 'Investments', href: '/dashboard/investments', icon: DollarSign },
    { name: 'Mentorship', href: '/dashboard/mentorship', icon: GraduationCap },
    { name: 'Promote', href: '/dashboard/marketing', icon: Megaphone },
    { name: 'Bookmarks', href: '/dashboard/bookmarks', icon: Bookmark },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-card border-r border-border transition-all duration-300 h-screen ${
          isSidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-border">
          <Link to="/dashboard/briefboard" className="flex items-center gap-2">
            <VendromLogo size={60} showText={isSidebarOpen} textClassName="text-foreground" />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-hidden">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive(item.href)
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {isSidebarOpen && (
                <span className="font-medium flex-1">{item.name}</span>
              )}
              {isSidebarOpen && item.badge && (
                <span className="bg-[var(--brand-secondary)] text-white text-xs font-medium px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* Toggle button */}
        <div className="p-3 border-t border-border">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-muted transition-colors"
          >
            {isSidebarOpen ? (
              <>
                <ChevronDown className="w-5 h-5 rotate-90" />
                <span className="ml-2 text-sm text-muted-foreground">Collapse</span>
              </>
            ) : (
              <ChevronDown className="w-5 h-5 -rotate-90" />
            )}
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-card shadow-xl">
            <div className="h-16 flex items-center justify-between px-4 border-b border-border">
              <Link to="/dashboard/briefboard" className="flex items-center gap-2">
                <VendromLogo size={60} />
              </Link>
              <button onClick={() => setIsMobileMenuOpen(false)}>
                <X className="w-6 h-6 text-muted-foreground" />
              </button>
            </div>
            <nav className="p-3 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive(item.href)
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Header */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-muted"
            >
              <Menu className="w-6 h-6 text-muted-foreground" />
            </button>

            {/* Global Search */}
            <div className="hidden md:flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search Vendrom..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm w-64"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <Avatar className="w-8 h-8">
                  <AvatarImage src={user?.avatar} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:block font-medium text-foreground">
                  {user?.firstName} {user?.lastName}
                </span>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-3 py-2">
                <p className="font-medium">{user?.firstName} {user?.lastName}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/dashboard/profile" className="cursor-pointer">
                  <Compass className="w-4 h-4 mr-2" />
                  My Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/dashboard/bookmarks" className="cursor-pointer">
                  <Bookmark className="w-4 h-4 mr-2" />
                  Bookmarks
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/dashboard/settings" className="cursor-pointer">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Link>
              </DropdownMenuItem>
                <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

        {/* Page Content */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <Outlet />
          </main>
          {isCalendarOpen && (
            <aside className="hidden lg:flex w-80 border-l border-border bg-card flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="text-sm font-semibold text-foreground">Calendar</span>
                <Button variant="ghost" size="icon" onClick={closePanel}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <CalendarPanel />
              </div>
            </aside>
          )}
        </div>
      </div>
      <CalendarPanelDrawer
        open={isCalendarOpen}
        onClose={closePanel}
        className="lg:hidden"
        overlayClassName="lg:hidden"
      />
    </div>
  );
};

const DashboardLayout = () => (
  <CalendarPanelProvider>
    <DashboardLayoutInner />
  </CalendarPanelProvider>
);

export default DashboardLayout;
