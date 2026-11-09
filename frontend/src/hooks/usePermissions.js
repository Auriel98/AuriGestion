import { useAuth } from "../context/AuthContext";
import { hasPermission } from "../config/permissions";

export const usePermissions = () => {
    const { user } = useAuth();

    const role = typeof user?.role === "object" ? user.role?.slug : user?.role;

    const can = (permission) => hasPermission(role, permission);
    const canAny = (list) => list.some(can);
    const canAll = (list) => list.every(can);

    return { role, can, canAny, canAll };
};