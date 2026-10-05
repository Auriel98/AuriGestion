import React, { useEffect, useState } from "react";
import { X, UserPlus, Save } from "lucide-react";
import api from "../../api/api";
import "./UserModal.css";

const UserModal = ({
    isOpen,
    onClose,
    onSuccess,
    user = null,
}) => {

    const isEdit = Boolean(user);

    const [employees, setEmployees] = useState([]);
    const [roles, setRoles] = useState([]);

    const [form, setForm] = useState({
        employee_id: "",
        email: "",
        password: "",
        role: "",
    });

    const [loading, setLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {

        if (!isOpen) return;

        setError("");

        if (isEdit) {

            setForm({
                employee_id: user.employee_id || "",
                email: user.email || "",
                password: "",
                role: user.role || "",
            });

        } else {

            setForm({
                employee_id: "",
                email: "",
                password: "",
                role: "",
            });

        }

        loadData();

    }, [isOpen, user]);

    const loadData = async () => {

        try {

            setLoadingData(true);

            const employeesResponse =
                await api.get(
                    "/users/available-employees"
                );

            setEmployees(
                employeesResponse || []
            );

            /*
             * Pour le moment les rôles sont
             * récupérés depuis les rôles standards.
             *
             * On pourra ensuite créer
             * /roles directement.
             */
            setRoles([
                {
                    slug: "directeur",
                    name: "Directeur",
                },
                {
                    slug: "rh",
                    name: "Ressources humaines",
                },
                {
                    slug: "comptable",
                    name: "Comptable",
                },
                {
                    slug: "secretaire",
                    name: "Secrétaire",
                },
            ]);

        } catch (err) {

            console.error(err);

            setError(
                err.message ||
                "Impossible de charger les données"
            );

        } finally {

            setLoadingData(false);

        }
    };

    const handleChange = (e) => {

        const {
            name,
            value,
        } = e.target;

        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));

    };

    const handleSubmit = async (e) => {

        e.preventDefault();

        setError("");

        if (!form.email) {

            setError("L'email est obligatoire.");
            return;

        }

        if (!form.role) {

            setError("Le rôle est obligatoire.");
            return;

        }

        if (!isEdit && !form.employee_id) {

            setError("Veuillez sélectionner un employé.");
            return;

        }

        if (!isEdit && !form.password) {

            setError("Le mot de passe est obligatoire.");
            return;

        }

        try {

            setLoading(true);

            if (isEdit) {

                await api.put(
                    `/users/${user.id}`,
                    {
                        email: form.email,
                        role: form.role,
                    }
                );

            } else {

                await api.post(
                    "/users",
                    {
                        employee_id:
                            form.employee_id,
                        email:
                            form.email,
                        password:
                            form.password,
                        role:
                            form.role,
                    }
                );

            }

            onSuccess();

            onClose();

        } catch (err) {

            console.error(err);

            setError(
                err.message ||
                "Une erreur est survenue."
            );

        } finally {

            setLoading(false);

        }
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div className="user-modal-overlay">

            <div className="user-modal">

                <div className="user-modal-header">

                    <div>
                        <div className="user-modal-icon">
                            {isEdit ? (
                                <Save size={20} />
                            ) : (
                                <UserPlus size={20} />
                            )}
                        </div>

                        <div>
                            <h2>
                                {isEdit
                                    ? "Modifier l'utilisateur"
                                    : "Nouvel utilisateur"}
                            </h2>

                            <p>
                                {isEdit
                                    ? "Modifier les informations du compte"
                                    : "Créer un compte pour un employé"}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="modal-close"
                        onClick={onClose}
                    >
                        <X size={20} />
                    </button>

                </div>


                <form
                    className="user-modal-form"
                    onSubmit={handleSubmit}
                >

                    {error && (
                        <div className="form-error">
                            {error}
                        </div>
                    )}


                    {!isEdit && (

                        <div className="form-group">

                            <label>
                                Employé
                            </label>

                            <select
                                name="employee_id"
                                value={form.employee_id}
                                onChange={handleChange}
                                disabled={loadingData}
                            >

                                <option value="">
                                    {loadingData
                                        ? "Chargement..."
                                        : "Sélectionner un employé"}
                                </option>

                                {employees.map(
                                    (employee) => (
                                        <option
                                            key={employee.id}
                                            value={employee.id}
                                        >
                                            {employee.last_name}{" "}
                                            {employee.first_name}
                                            {employee.position
                                                ? ` — ${employee.position}`
                                                : ""}
                                        </option>
                                    )
                                )}

                            </select>

                        </div>

                    )}


                    <div className="form-group">

                        <label>
                            Adresse email
                        </label>

                        <input
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            placeholder="exemple@entreprise.com"
                        />

                    </div>


                    {!isEdit && (

                        <div className="form-group">

                            <label>
                                Mot de passe
                            </label>

                            <input
                                type="password"
                                name="password"
                                value={form.password}
                                onChange={handleChange}
                                placeholder="Minimum 6 caractères"
                            />

                        </div>

                    )}


                    <div className="form-group">

                        <label>
                            Rôle
                        </label>

                        <select
                            name="role"
                            value={form.role}
                            onChange={handleChange}
                        >

                            <option value="">
                                Sélectionner un rôle
                            </option>

                            {roles.map((role) => (
                                <option
                                    key={role.slug}
                                    value={role.slug}
                                >
                                    {role.name}
                                </option>
                            ))}

                        </select>

                    </div>


                    <div className="user-modal-footer">

                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Annuler
                        </button>

                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={loading}
                        >
                            {loading
                                ? "Enregistrement..."
                                : isEdit
                                    ? "Enregistrer"
                                    : "Créer utilisateur"}
                        </button>

                    </div>

                </form>

            </div>

        </div>
    );
};

export default UserModal;