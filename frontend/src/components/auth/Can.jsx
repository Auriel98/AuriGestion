import { usePermissions } from "../../hooks/usePermissions";

const Can = ({ permission, anyOf, children, fallback = null }) => {
    const { can, canAny } = usePermissions();

    const allowed = permission ? can(permission) : canAny(anyOf || []);

    return allowed ? children : fallback;
};

export default Can;