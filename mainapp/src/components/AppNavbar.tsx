import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Bell, Settings, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "../context/AuthProvider";
import Swal from "sweetalert2";

interface AppNavbarProps {
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

/**
 * AppNavbar - Top navigation bar for the application dashboard
 *
 * This component renders the top navigation bar with search functionality,
 * notifications, and user profile dropdown. It follows OOP principles by
 * encapsulating all navbar-related functionality within this component.
 *
 * @returns {JSX.Element} The AppNavbar component
 */
const AppNavbar: React.FC<AppNavbarProps> = ({
  onToggleSidebar,
  isSidebarOpen,
}) => {
  // Get user data and logout function from auth context
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // State for notification dropdown visibility
  const [showNotifications, setShowNotifications] = useState<boolean>(false);

  // State for user dropdown visibility
  const [showUserDropdown, setShowUserDropdown] = useState<boolean>(false);

  // State for mobile search visibility
  const [showMobileSearch, setShowMobileSearch] = useState<boolean>(false);

  // Refs for click outside detection
  const notificationRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  // Fallback user data if auth context user is null
  const userData = user || {
    id: "",
    name: "Guest User",
    email: "guest@example.com",
    image: "",
  };

  // Mock notifications - in a real application, these would come from a notifications service
  const notifications = [
    {
      id: 1,
      message: "Your shipment has been delivered",
      isRead: false,
      time: "5m ago",
    },
    {
      id: 2,
      message: "New shipment request received",
      isRead: true,
      time: "1h ago",
    },
    {
      id: 3,
      message: "Payment confirmed for shipment #12345",
      isRead: true,
      time: "3h ago",
    },
  ];

  // Get unread notification count
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  /**
   * Handle click outside to close dropdowns
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(event.target as Node)
      ) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /**
   * Toggle notification dropdown visibility
   * Closes user dropdown if open
   */
  const toggleNotifications = (): void => {
    setShowNotifications(!showNotifications);
    if (showUserDropdown) setShowUserDropdown(false);
  };

  /**
   * Toggle user dropdown visibility
   * Closes notifications dropdown if open
   */
  const toggleUserDropdown = (): void => {
    setShowUserDropdown(!showUserDropdown);
    if (showNotifications) setShowNotifications(false);
  };

  /**
   * Toggle mobile search visibility
   */
  const toggleMobileSearch = (): void => {
    setShowMobileSearch(!showMobileSearch);
  };

  return (
    <>
      <div className="flex justify-between items-center px-4 py-3 bg-white shadow-md h-16 relative z-40">
        {/* Left section - Mobile menu button and Welcome message */}
        <div className="flex items-center gap-3">
          {/* Mobile sidebar toggle */}
          <button
            className="lg:hidden p-2 rounded-md hover:bg-gray-100 transition-colors"
            onClick={onToggleSidebar}
            aria-label="Toggle sidebar"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Welcome message - hidden on mobile when search is active */}
          <div
            className={`welcome-section ${
              showMobileSearch ? "hidden" : "block"
            } sm:block`}
          >
            <h2 className="text-lg sm:text-xl lg:text-2xl text-gray-800 font-semibold">
              Welcome
            </h2>
          </div>
        </div>

        {/* Right section - Search, notifications, user profile */}
        <div className="flex items-center gap-2 sm:gap-3 lg:gap-5">
          {/* Desktop Search bar */}
          <div className="hidden md:block relative w-64 lg:w-80 xl:w-96">
            <input
              type="text"
              placeholder="Search by Shipment ID or destination"
              className="w-full px-4 py-2 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
              <Search size={18} />
            </button>
          </div>

          {/* Mobile search toggle */}
          <button
            className="md:hidden p-2 rounded-md hover:bg-gray-100 transition-colors"
            onClick={toggleMobileSearch}
            aria-label="Toggle search"
          >
            <Search size={20} />
          </button>

          {/* Notifications */}
          <div className="relative" ref={notificationRef}>
            <button
              className="relative p-2 rounded-md hover:bg-gray-100 transition-colors"
              onClick={toggleNotifications}
              aria-label="Notifications"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 bg-white rounded-lg shadow-xl border min-w-[280px] sm:min-w-[320px] z-50 max-h-96 overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Notifications
                  </h3>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                        !notification.isRead ? "bg-blue-50" : ""
                      }`}
                    >
                      <p className="text-sm text-gray-800 mb-1">
                        {notification.message}
                      </p>
                      <span className="text-xs text-gray-500">
                        {notification.time}
                      </span>
                    </div>
                  ))}
                </div>
                <Link
                  to="/app/notifications"
                  className="block text-center p-3 text-red-600 text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  View all notifications
                </Link>
              </div>
            )}
          </div>

          {/* User profile */}
          <div className="relative" ref={userDropdownRef}>
            <button
              className="flex items-center gap-2 p-1 rounded-md hover:bg-gray-100 transition-colors"
              onClick={toggleUserDropdown}
              aria-label="User menu"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden ring-2 ring-gray-200">
                <img
                  src={userData.image || ""}
                  alt="User"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      userData.name
                    )}&background=ef4444&color=ffffff&size=64`;
                  }}
                />
              </div>
              <span className="hidden sm:block text-sm font-medium text-gray-800 max-w-24 truncate">
                {userData.name}
              </span>
            </button>

            {showUserDropdown && (
              <div className="absolute right-0 mt-2 bg-white rounded-lg shadow-xl border min-w-[250px] z-50">
                <div className="flex items-center gap-3 p-4 border-b border-gray-200">
                  <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-gray-200">
                    <img
                      src={userData.image || ""}
                      alt="User"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          userData.name
                        )}&background=ef4444&color=ffffff&size=64`;
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-base font-medium text-gray-800 truncate">
                      {userData.name}
                    </h4>
                    <p className="text-sm text-gray-600 truncate">
                      {userData.email}
                    </p>
                  </div>
                </div>
                <div className="p-2">
                  <Link
                    to="/app/settings"
                    className="flex items-center p-3 text-gray-700 hover:bg-gray-100 rounded-md text-sm font-medium transition-colors"
                  >
                    <Settings size={18} className="mr-3" />
                    <span>Settings</span>
                  </Link>
                  <button
                    onClick={() => {
                      Swal.fire({
                        title: "Are you sure?",
                        text: "Do you really want to logout?",
                        icon: "warning",
                        showCancelButton: true,
                        confirmButtonColor: "#ef4444",
                        cancelButtonColor: "#6b7280",
                        confirmButtonText: "Yes, logout",
                        cancelButtonText: "Cancel",
                      }).then((result) => {
                        if (result.isConfirmed) {
                          logout();
                          localStorage.removeItem("isAuthenticated");
                          console.log("User logged out successfully");
                          navigate("/login");
                        }
                      });
                    }}
                    className="flex w-full items-center p-3 text-gray-700 hover:bg-gray-100 rounded-md text-sm font-medium transition-colors"
                  >
                    <LogOut size={18} className="mr-3" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile search overlay */}
      {showMobileSearch && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-white shadow-md border-b p-4 z-30">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by Shipment ID or destination"
              className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              autoFocus
            />
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              onClick={toggleMobileSearch}
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default AppNavbar;
