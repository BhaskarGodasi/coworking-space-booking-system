import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import SpaceListPage from "./pages/SpaceListPage";
import SpaceDetailsPage from "./pages/SpaceDetailsPage";
import MyBookingsPage from "./pages/MyBookingsPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import NotFoundPage from "./pages/NotFoundPage";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import GuestRoute from "./components/GuestRoute";
import { useSessionRestore } from "./hooks/useSessionRestore";
import { MainLayout } from "./components/layout/MainLayout";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import AdminSpacesPage from "./pages/AdminSpacesPage";
import AdminBookingsPage from "./pages/AdminBookingsPage";
import AdminMaintenancePage from "./pages/AdminMaintenancePage";

function App() {
  useSessionRestore();

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Marketing & Browsing Routes */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/spaces" element={<SpaceListPage />} />
          <Route path="/spaces/:id" element={<SpaceDetailsPage />} />
          <Route
            path="/login"
            element={
              <GuestRoute>
                <LoginPage />
              </GuestRoute>
            }
          />
          <Route
            path="/register"
            element={
              <GuestRoute>
                <RegisterPage />
              </GuestRoute>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        {/* Member Dashboard Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<MyBookingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        {/* Admin Dashboard Routes */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <DashboardLayout />
            </AdminRoute>
          }
        >
          <Route index element={<AdminDashboardPage />} />
          <Route path="spaces" element={<AdminSpacesPage />} />
          <Route path="bookings" element={<AdminBookingsPage />} />
          <Route path="maintenance" element={<AdminMaintenancePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
