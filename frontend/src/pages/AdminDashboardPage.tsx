import { useState } from "react";
import { Link } from "react-router-dom";
import ApprovalQueue from "../components/ApprovalQueue";
import MaintenanceManager from "../components/MaintenanceManager";
import SpaceManager from "../components/SpaceManager";
import AllBookingsManager from "../components/AllBookingsManager";

type Tab = "approvals" | "bookings" | "spaces" | "maintenance";

function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>("approvals");

  return (
    <div>
      <Link to="/">Back to spaces</Link>
      <h1>Admin Dashboard</h1>

      <nav>
        <button
          type="button"
          aria-current={activeTab === "approvals"}
          onClick={() => setActiveTab("approvals")}
        >
          Approvals
        </button>
        <button
          type="button"
          aria-current={activeTab === "bookings"}
          onClick={() => setActiveTab("bookings")}
        >
          All Bookings
        </button>
        <button
          type="button"
          aria-current={activeTab === "spaces"}
          onClick={() => setActiveTab("spaces")}
        >
          Spaces
        </button>
        <button
          type="button"
          aria-current={activeTab === "maintenance"}
          onClick={() => setActiveTab("maintenance")}
        >
          Maintenance
        </button>
      </nav>

      {activeTab === "approvals" && (
        <section>
          <h2>Pending Bookings</h2>
          <ApprovalQueue />
        </section>
      )}

      {activeTab === "bookings" && (
        <section>
          <h2>All Bookings</h2>
          <AllBookingsManager />
        </section>
      )}

      {activeTab === "spaces" && (
        <section>
          <h2>Spaces</h2>
          <SpaceManager />
        </section>
      )}

      {activeTab === "maintenance" && (
        <section>
          <h2>Maintenance</h2>
          <MaintenanceManager />
        </section>
      )}
    </div>
  );
}

export default AdminDashboardPage;
