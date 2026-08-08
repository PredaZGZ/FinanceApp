import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/components/common/auth-context";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  PieChart,
  Landmark,
  ArrowRightLeft,
  TrendingUp,
  LineChart,
  Upload,
  Banknote
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/" },
    { icon: LineChart, label: "Portfolio", path: "/portfolio" },
    { icon: Landmark, label: "Net Worth", path: "/networth" },
    { icon: ArrowRightLeft, label: "Transactions", path: "/transactions" },
    { icon: PieChart, label: "Reports", path: "/reports" },
    { icon: Banknote, label: "Salaries", path: "/salary" },
    { icon: Upload, label: "Import Data", path: "/import" },
  ];

  return (
    <div className="h-screen w-full bg-background text-foreground flex overflow-hidden">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 flex flex-col",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
          <div className="font-bold text-lg flex items-center gap-2 text-sidebar-foreground">
            <div className="p-1.5 bg-sidebar-primary rounded-md text-sidebar-primary-foreground">
              <TrendingUp className="w-4 h-4" />
            </div>
            FinanceApp
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto md:hidden text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 flex flex-col gap-1 p-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path} onClick={() => setIsMobileMenuOpen(false)}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-3 font-medium transition-all duration-200",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                      : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                  )}
                >
                  <item.icon className={cn("h-4 w-4", isActive ? "text-sidebar-primary" : "text-sidebar-foreground/50")} />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <Button
            variant="ghost"
            className="w-full gap-2 text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10 justify-start"
            onClick={async () => {
              await logout();
              navigate("/login");
            }}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
        <header className="h-16 border-b border-border flex items-center justify-between px-4 md:px-8 bg-background z-30">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden -ml-2 text-muted-foreground"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold tracking-tight">
              {navItems.find(i => i.path === location.pathname)?.label || "Dashboard"}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {user?.profileImage ? (
              <img src={user.profileImage} alt="Profile" className="h-8 w-8 rounded-full border border-border object-cover" />
            ) : (
              <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-xs font-medium border border-border">
                {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "U"}
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 flex flex-col overflow-y-auto">
          <div className="max-w-[1600px] mx-auto w-full h-full">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
