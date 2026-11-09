import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { usePermissions } from "../../hooks/usePermissions";

const ProtectedRoute = ({ children, permission }) => {
    const { user, loading } = useAuth();
    const { can } = usePermissions();

    if (loading) {
        return <div>Chargement...</div>;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (permission && !can(permission)) {
        return (
            <div style={{ padding: 40, textAlign: "center" }}>
                <h2>Accès refusé</h2>
                <p>Vous n'avez pas les droits pour accéder à cette page.</p>
            </div>
        );
    }

    return children;
};

export default ProtectedRoute;