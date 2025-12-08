import { ReactNode, useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, Users, LayoutDashboard, ClipboardList, MessageSquare, Bell, UserCheck, Activity, Settings } from "lucide-react";
import { signOut } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useNotificationCount } from "@/hooks/useNotifications";
import { FullPageLoader } from "@/components/LoadingSpinner";

interface LayoutProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

const Layout = ({ children, requireAdmin = false }: LayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user, isAdmin, loading, profile } = useAuth();
  const { data: notificationCount = 0 } = useNotificationCount();

  // Server-side admin check - redirect if admin required but user is not admin
  useEffect(() => {
    if (!loading && requireAdmin && !isAdmin) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive"
      });
      navigate("/dashboard");
    }
  }, [loading, requireAdmin, isAdmin, navigate, toast]);

  const handleLogout = async () => {
    await signOut();
    toast({
      title: "Logged out",
      description: "You have been successfully logged out."
    });
    navigate("/auth");
  };

  const isActive = (path: string) => location.pathname === path;

  if (loading) {
    return <FullPageLoader text="Loading..." />;
  }

  // Block rendering if admin required but user is not admin
  if (requireAdmin && !isAdmin) {
    return <FullPageLoader text="Checking permissions..." />;
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-card py-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link to="/dashboard" className="flex items-center space-x-2">
                <div className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Crewvia
                </div>
              </Link>
              
              <div className="hidden md:flex space-x-4">
                <Link to="/dashboard">
                  <Button
                    variant={isActive("/dashboard") ? "default" : "ghost"}
                    className="flex items-center space-x-2"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Button>
                </Link>
                
                <Link to="/leads">
                  <Button
                    variant={isActive("/leads") ? "default" : "ghost"}
                    className="flex items-center space-x-2"
                  >
                    <ClipboardList className="h-4 w-4" />
                    <span>Leads</span>
                  </Button>
                </Link>
                
                <Link to="/members">
                  <Button
                    variant={isActive("/members") ? "default" : "ghost"}
                    className="flex items-center space-x-2"
                  >
                    <UserCheck className="h-4 w-4" />
                    <span>Members</span>
                  </Button>
                </Link>
                
                <Link to="/templates">
                  <Button
                    variant={isActive("/templates") ? "default" : "ghost"}
                    className="flex items-center space-x-2"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>Templates</span>
                  </Button>
                </Link>
                
                {isAdmin && (
                  <>
                    <Link to="/system-health">
                      <Button
                        variant={isActive("/system-health") ? "default" : "ghost"}
                        className="flex items-center space-x-2"
                      >
                        <Activity className="h-4 w-4" />
                        <span>System Health</span>
                      </Button>
                    </Link>
                    
                    <Link to="/dev-tools">
                      <Button
                        variant={isActive("/dev-tools") ? "default" : "ghost"}
                        className="flex items-center space-x-2"
                      >
                        <Settings className="h-4 w-4" />
                        <span>Dev Mode</span>
                      </Button>
                    </Link>
                    
                    <Link to="/users">
                      <Button
                        variant={isActive("/users") ? "default" : "ghost"}
                        className="flex items-center space-x-2"
                      >
                        <Users className="h-4 w-4" />
                        <span>Users</span>
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {notificationCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                    {notificationCount}
                  </Badge>
                )}
              </Button>
              
              <div className="hidden md:flex items-center space-x-2 text-sm">
                <span className="text-muted-foreground">Welcome,</span>
                <span className="font-medium">{profile?.name || 'User'}</span>
                {isAdmin && <Badge variant="outline" className="text-xs">Admin</Badge>}
              </div>
              
              <Button variant="outline" onClick={handleLogout} className="flex items-center space-x-2">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </nav>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;
