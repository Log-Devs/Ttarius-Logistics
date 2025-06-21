import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Package,
  Clock,
  Settings,
  Headphones,
  Info,
  LogOut,
} from "lucide-react";
import { useAuth } from "../context/AuthProvider";
import Swal from "sweetalert2";

/**
 * Sidebar - Navigation sidebar component for the application
 *
 * This component renders the red sidebar with navigation links to different sections
 * of the application. It implements OOP principles by encapsulating all sidebar-related
 * functionality within this component.
 *
 * @returns {JSX.Element} The Sidebar component
 */
const Sidebar: React.FC = () => {
  // Navigation hook for programmatic navigation
  const navigate = useNavigate();

  // Get user data and logout function from auth context
  const { user, logout } = useAuth();

  // Fallback user data if auth context user is null
  const userData = user || {
    name: "Guest User",
    email: "guest@example.com",
    image: "",
  };

  /**
   * Handle logout functionality
   * Uses the AuthProvider context to logout and redirects user to login page
   */
  const handleLogout = () => {
    // Call the logout function from auth context
    logout();

    // Also clear any additional auth data that might be in localStorage
    localStorage.removeItem("isAuthenticated");

    // Log the logout action
    console.log("User logged out successfully");

    // Redirect to login page
    navigate("/login");
  };

  /**
   * Navigation menu items configuration
   */
  const navigationItems = [
    { to: "/app/dashboard", icon: BarChart3, label: "Dashboard" },
    { to: "/app/submit-shipment", icon: Package, label: "Submit Shipment" },
    { to: "/app/shipment-history", icon: Clock, label: "Shipment History" },
    { to: "/app/settings", icon: Settings, label: "Settings" },
  ];

  /**
   * Footer navigation items configuration
   */
  const footerItems = [
    { to: "/app/support", icon: Headphones, label: "Support" },
    { to: "/app/about", icon: Info, label: "About" },
  ];

  /**
   * Render the sidebar component with navigation links
   */
  return (
    <div className="w-64 bg-red-600 text-white flex flex-col h-full overflow-y-auto shadow-lg transition-all duration-300 ease-in-out lg:w-64 md:w-60 sm:w-56">
      {/* Logo and app name */}
      <div className="p-6 text-center border-red-500/20">
        <h1 className="text-2xl font-bold m-0 tracking-wide">Logistics.</h1>
      </div>

      {/* User profile section */}
      <div className="flex flex-col items-center p-6 border-red-500/20">
        <div className="w-16 h-16 rounded-full overflow-hidden mb-3 ring-2 ring-white/20 transition-transform duration-200 hover:scale-105">
          <img
            src={userData.image || ""}
            alt="User Avatar"
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                userData.name
              )}&background=ef4444&color=ffffff&size=64`;
            }}
          />
        </div>
        <div className="text-center">
          <h3 className="m-0 text-base font-semibold truncate max-w-full">
            {userData.name}
          </h3>
          <p className="mt-1 text-xs opacity-80 truncate max-w-full">
            {userData.email}
          </p>
        </div>
      </div>

      {/* Navigation menu */}
      <nav className="flex-1 py-4">
        {navigationItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center px-6 py-3 text-white no-underline transition-all duration-200 group ${
                  isActive
                    ? "bg-white/15 border-l-4 border-white shadow-lg"
                    : "hover:bg-white/10 hover:translate-x-1"
                }`
              }
            >
              <IconComponent
                size={20}
                className="mr-4 transition-transform duration-200 group-hover:scale-110"
              />
              <span className="font-medium text-sm">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer navigation */}
      <div className="py-4 border-t border-red-500/20">
        {footerItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className="flex items-center px-6 py-3 text-white no-underline transition-all duration-200 group hover:bg-white/10 hover:translate-x-1"
            >
              <IconComponent
                size={20}
                className="mr-4 transition-transform duration-200 group-hover:scale-110"
              />
              <span className="font-medium text-sm">{item.label}</span>
            </NavLink>
          );
        })}

        {/* Logout button */}
        <button
          onClick={() => {
            Swal.fire({
              title: "Are you sure?",
              text: "Do you want to log out?",
              icon: "warning",
              showCancelButton: true,
              confirmButtonColor: "#ef4444",
              cancelButtonColor: "#6b7280",
              confirmButtonText: "Yes, log out",
              cancelButtonText: "Cancel",
            }).then((result: any) => {
              if (result.isConfirmed) {
                handleLogout();
              }
            });
          }}
          className="w-full flex items-center px-6 py-3 text-white bg-transparent border-0 cursor-pointer text-left text-sm font-medium hover:bg-white/10 transition-all duration-200 group hover:translate-x-1"
        >
          <LogOut
            size={20}
            className="mr-4 transition-transform duration-200 group-hover:scale-110"
          />
          <span>Log out</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
