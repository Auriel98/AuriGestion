import { useAuth } from "../context/AuthContext";
import StatisticsCards from "../components/dashboard/StatisticsCards";
import WorkforceEvolution from "../components/dashboard/WorkforceEvolution";
import DepartmentDistribution from "../components/dashboard/DepartmentDistribution";
import QuickActions from "../components/dashboard/QuickActions";
import RecentActivities from "../components/dashboard/RecentActivities";
import LatestEmployees from "../components/dashboard/LatestEmployees";
import UpcomingDeadlines from "../components/dashboard/UpcomingDeadlines";
import "./Dashboard.css";

const Dashboard = () => {
    const { user } = useAuth();

    const firstName = user?.first_name || "Admin";
    const companyName = user?.company_name || "votre entreprise";

    return (
        <main className="dashboard-page">
            <div className="dashboard-page-header">
                <div className="dashboard-heading">
                    

                    <p className="dashboard-page-description">
                        Bonjour {firstName}, voici un aperçu de l'activité de{" "}
                        {companyName}.
                    </p>
                </div>
            </div>

            <section
                className="dashboard-statistics-section"
                aria-label="Statistiques de l'entreprise"
            >
                <StatisticsCards />
            </section>

            <section
                className="dashboard-main-grid"
                aria-label="Vue d'ensemble"
            >
                <div className="dashboard-workforce-area">
                    <WorkforceEvolution />
                </div>

                <div className="dashboard-distribution-area">
                    <DepartmentDistribution />
                </div>

                <div className="dashboard-quick-actions-area">
                    <QuickActions />
                </div>
            </section>

            <section
                className="dashboard-bottom-grid"
                aria-label="Activités et suivi"
            >
                <div className="dashboard-activities-area">
                    <RecentActivities />
                </div>

                <div className="dashboard-latest-employees-area">
                    <LatestEmployees />
                </div>

                <div className="dashboard-deadlines-area">
                    <UpcomingDeadlines />
                </div>
            </section>
        </main>
    );
};

export default Dashboard;