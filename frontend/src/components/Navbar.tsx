import { Link, useLocation } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import { Menu, X, LogOut } from "lucide-react";
import { useState } from "react";
import logo from "@/assets/logo.png";

import { useNavigate } from "react-router-dom";
import api from "@/lib/api";

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const userString = localStorage.getItem("user");
  const user = userString ? JSON.parse(userString) : null;
  const isAdmin = user?.role === "ADMIN";

  const currentNavItems = [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Appointments", path: "/appointments" },
    { label: "Patients", path: "/users" },
    { label: "Predictions", path: "/predictions" },
    ...(isAdmin ? [{ label: "Doctors", path: "/doctors" }] : []),
  ];

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem("refresh_token");
      if (refreshToken) {
        await api.post("/auth/logout/", { refresh: refreshToken });
      }
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      localStorage.clear();
      setMenuOpen(false);
      // Use replace: true to remove current entry from history
      navigate("/login", { replace: true });
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <img
            src={logo}
            alt="Health Sphere"
            className="h-9 w-auto object-contain"
          />
          <span className="font-display text-lg font-bold text-foreground">
            Health Sphere
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {currentNavItems
            .filter(
              (item) =>
                !(item.label === "Dashboard" && location.pathname === "/"),
            )
            .map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${
                  location.pathname === item.path
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {item.label}
              </Link>
            ))}
          <div className="ml-2 mr-2">
            <ThemeToggle />
          </div>
          {location.pathname === "/" ? (
            <Link
              to="/login"
              className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white bg-primary transition-all hover:bg-primary/90 shadow-sm"
            >
              Login
            </Link>
          ) : (
            <button
              onClick={handleLogout}
              className="ml-1 flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          )}
        </nav>

        {/* Mobile toggle */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
          >
            {menuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-border bg-background p-4 md:hidden">
          {currentNavItems
            .filter(
              (item) =>
                !(item.label === "Dashboard" && location.pathname === "/"),
            )
            .map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMenuOpen(false)}
                className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  location.pathname === item.path
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent"
                }`}
              >
                {item.label}
              </Link>
            ))}
          {location.pathname === "/" ? (
            <Link
              to="/login"
              onClick={() => setMenuOpen(false)}
              className="mt-2 flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
            >
              Login
            </Link>
          ) : (
            <button
              onClick={handleLogout}
              className="mt-1 flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          )}
        </div>
      )}
    </header>
  );
}
