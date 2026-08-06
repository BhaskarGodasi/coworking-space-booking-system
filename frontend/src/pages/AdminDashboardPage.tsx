import { useState } from "react";
import { Link } from "react-router-dom";
import ApprovalQueue from "../components/ApprovalQueue";
import MaintenanceManager from "../components/MaintenanceManager";

type Tab = "approvals" | "maintenance";

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
