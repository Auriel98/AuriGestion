import { useEffect, useRef, useState } from "react";

import {
    X,
    Camera,
    Trash2,
    Eye,
    EyeOff,
    UserRound,
    KeyRound,
} from "lucide-react";

import api, { API_ORIGIN } from "../../api/api";
import { useAuth } from "../../context/AuthContext";

import "./ProfileModal.css";


const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5 Mo

// Ton api.js lance déjà une Error avec le message du serveur
const getErrorMessage = (error) =>
    error?.message || "Une erreur est survenue. Réessayez.";


const ProfileModal = ({ onClose }) => {

    const { user, setUser } = useAuth();

    const fileInputRef = useRef(null);

    const [tab, setTab] = useState("infos");
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    const [form, setForm] = useState({
        personal_email: "",
        phone: "",
    });

    const [passwords, setPasswords] = useState({
        current_password: "",
        new_password: "",
        confirm_password: "",
    });

    const [showPasswords, setShowPasswords] = useState(false);

    const [feedback, setFeedback] = useState(null);

    const [savingInfos, setSavingInfos] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);
    const [photoBusy, setPhotoBusy] = useState(false);


    /* =========================================
       CHARGEMENT DU PROFIL
    ========================================= */
    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                const data = await api.get("/profile");

                if (cancelled) return;

                setProfile(data);
                setForm({
                    personal_email: data.personal_email || "",
                    phone: data.phone || "",
                });
            } catch (error) {
                if (!cancelled) {
                    setFeedback({
                        type: "error",
                        text: getErrorMessage(error),
                    });
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        load();

        return () => {
            cancelled = true;
        };
    }, []);


    /* Fermeture avec la touche Échap */
    useEffect(() => {
        const onKeyDown = (event) => {
            if (event.key === "Escape") onClose();
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [onClose]);


    /* Met à jour l'utilisateur global (sidebar + topbar) */
    const syncUser = (patch) => {
        if (typeof setUser === "function") {
            setUser({ ...user, ...patch });
        }
    };

    const changeTab = (name) => {
        setTab(name);
        setFeedback(null);
    };


    /* =========================================
       PHOTO
    ========================================= */
    const handlePhotoChange = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";

        if (!file) return;

        if (!file.type.startsWith("image/")) {
            setFeedback({
                type: "error",
                text: "Le fichier choisi n'est pas une image",
            });
            return;
        }

        if (file.size > MAX_PHOTO_SIZE) {
            setFeedback({
                type: "error",
                text: "La photo ne doit pas dépasser 5 Mo",
            });
            return;
        }

        try {
            setPhotoBusy(true);
            setFeedback(null);

            const body = new FormData();
            body.append("photo", file);

            // Pas de Content-Type : le navigateur le gère pour FormData
            const data = await api.put("/profile/photo", body);

            setProfile((prev) => ({ ...prev, photo_url: data.photo_url }));
            syncUser({ photo_url: data.photo_url });

            setFeedback({ type: "success", text: data.message });
        } catch (error) {
            setFeedback({ type: "error", text: getErrorMessage(error) });
        } finally {
            setPhotoBusy(false);
        }
    };

    const handlePhotoDelete = async () => {
        try {
            setPhotoBusy(true);
            setFeedback(null);

            const data = await api.delete("/profile/photo");

            setProfile((prev) => ({ ...prev, photo_url: null }));
            syncUser({ photo_url: null });

            setFeedback({ type: "success", text: data.message });
        } catch (error) {
            setFeedback({ type: "error", text: getErrorMessage(error) });
        } finally {
            setPhotoBusy(false);
        }
    };


    /* =========================================
       INFORMATIONS PERSONNELLES
    ========================================= */
    const handleInfosSubmit = async (event) => {
        event.preventDefault();

        try {
            setSavingInfos(true);
            setFeedback(null);

            const data = await api.put("/profile", form);

            setProfile((prev) => ({ ...prev, ...data.profile }));
            setFeedback({ type: "success", text: data.message });
        } catch (error) {
            setFeedback({ type: "error", text: getErrorMessage(error) });
        } finally {
            setSavingInfos(false);
        }
    };


    /* =========================================
       MOT DE PASSE
    ========================================= */
    const handlePasswordSubmit = async (event) => {
        event.preventDefault();

        const { current_password, new_password, confirm_password } =
            passwords;

        if (new_password.length < 6) {
            setFeedback({
                type: "error",
                text: "Le nouveau mot de passe doit contenir au moins 6 caractères",
            });
            return;
        }

        if (new_password !== confirm_password) {
            setFeedback({
                type: "error",
                text: "La confirmation ne correspond pas au nouveau mot de passe",
            });
            return;
        }

        try {
            setSavingPassword(true);
            setFeedback(null);

            const data = await api.put("/profile/password", {
                current_password,
                new_password,
            });

            setPasswords({
                current_password: "",
                new_password: "",
                confirm_password: "",
            });

            setFeedback({ type: "success", text: data.message });
        } catch (error) {
            setFeedback({ type: "error", text: getErrorMessage(error) });
        } finally {
            setSavingPassword(false);
        }
    };


    const photoUrl = profile?.photo_url
        ? `${API_ORIGIN}${profile.photo_url}`
        : null;

    const initial = (profile?.first_name || user?.first_name || "")
        .charAt(0)
        .toUpperCase();


    return (
        <div
            className="pm-overlay"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <div
                className="pm-modal"
                role="dialog"
                aria-modal="true"
                aria-label="Mon profil"
            >

                {/* ENTÊTE */}
                <div className="pm-header">

                    <div>
                        <h2>Mon profil</h2>
                        <p>Gérez vos informations personnelles</p>
                    </div>

                    <button
                        type="button"
                        className="pm-close"
                        onClick={onClose}
                        title="Fermer"
                    >
                        <X size={18} />
                    </button>

                </div>


                {loading ? (
                    <div className="pm-loading">Chargement…</div>
                ) : !profile ? (
                    <div className="pm-body">
                        {feedback && (
                            <div className={`pm-feedback ${feedback.type}`}>
                                {feedback.text}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="pm-body">

                        {/* IDENTITÉ + PHOTO */}
                        <div className="pm-identity">

                            <div className="pm-avatar">
                                {photoUrl ? (
                                    <img src={photoUrl} alt="" />
                                ) : (
                                    <span>{initial}</span>
                                )}
                            </div>

                            <div className="pm-identity-info">

                                <strong>
                                    {profile.first_name} {profile.last_name}
                                </strong>

                                <span>
                                    {profile.position || profile.role}
                                    {profile.service_name
                                        ? ` · ${profile.service_name}`
                                        : ""}
                                </span>

                                <div className="pm-photo-actions">

                                    <button
                                        type="button"
                                        className="pm-btn-light"
                                        onClick={() =>
                                            fileInputRef.current?.click()
                                        }
                                        disabled={photoBusy}
                                    >
                                        <Camera size={14} />
                                        {photoBusy
                                            ? "Envoi…"
                                            : "Changer la photo"}
                                    </button>

                                    {profile.photo_url && (
                                        <button
                                            type="button"
                                            className="pm-btn-danger"
                                            onClick={handlePhotoDelete}
                                            disabled={photoBusy}
                                            title="Supprimer la photo"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}

                                </div>

                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    hidden
                                    onChange={handlePhotoChange}
                                />

                            </div>

                        </div>


                        {/* ONGLETS */}
                        <div className="pm-tabs">

                            <button
                                type="button"
                                className={
                                    tab === "infos" ? "pm-tab active" : "pm-tab"
                                }
                                onClick={() => changeTab("infos")}
                            >
                                <UserRound size={15} />
                                Informations
                            </button>

                            <button
                                type="button"
                                className={
                                    tab === "password"
                                        ? "pm-tab active"
                                        : "pm-tab"
                                }
                                onClick={() => changeTab("password")}
                            >
                                <KeyRound size={15} />
                                Mot de passe
                            </button>

                        </div>


                        {feedback && (
                            <div className={`pm-feedback ${feedback.type}`}>
                                {feedback.text}
                            </div>
                        )}


                        {/* ONGLET INFORMATIONS */}
                        {tab === "infos" && (
                            <form onSubmit={handleInfosSubmit}>

                                <div className="pm-grid">

                                    <div className="pm-field">
                                        <label>Matricule</label>
                                        <input
                                            type="text"
                                            value={profile.matricule || ""}
                                            disabled
                                        />
                                    </div>

                                    <div className="pm-field">
                                        <label>Email professionnel</label>
                                        <input
                                            type="text"
                                            value={
                                                profile.professional_email || ""
                                            }
                                            disabled
                                        />
                                    </div>

                                    <div className="pm-field">
                                        <label>Email personnel</label>
                                        <input
                                            type="email"
                                            value={form.personal_email}
                                            onChange={(event) =>
                                                setForm({
                                                    ...form,
                                                    personal_email:
                                                        event.target.value,
                                                })
                                            }
                                            placeholder="nom@exemple.com"
                                        />
                                    </div>

                                    <div className="pm-field">
                                        <label>Téléphone</label>
                                        <input
                                            type="tel"
                                            value={form.phone}
                                            onChange={(event) =>
                                                setForm({
                                                    ...form,
                                                    phone: event.target.value,
                                                })
                                            }
                                            placeholder="+241 ..."
                                        />
                                    </div>

                                </div>

                                <p className="pm-hint">
                                    Le matricule et l'email professionnel sont
                                    gérés par votre direction.
                                </p>

                                <div className="pm-actions">
                                    <button
                                        type="button"
                                        className="pm-btn-secondary"
                                        onClick={onClose}
                                    >
                                        Fermer
                                    </button>

                                    <button
                                        type="submit"
                                        className="pm-btn-primary"
                                        disabled={savingInfos}
                                    >
                                        {savingInfos
                                            ? "Enregistrement…"
                                            : "Enregistrer"}
                                    </button>
                                </div>

                            </form>
                        )}


                        {/* ONGLET MOT DE PASSE */}
                        {tab === "password" && (
                            <form onSubmit={handlePasswordSubmit}>

                                <div className="pm-field">
                                    <label>Mot de passe actuel</label>
                                    <input
                                        type={
                                            showPasswords ? "text" : "password"
                                        }
                                        value={passwords.current_password}
                                        onChange={(event) =>
                                            setPasswords({
                                                ...passwords,
                                                current_password:
                                                    event.target.value,
                                            })
                                        }
                                        autoComplete="current-password"
                                        required
                                    />
                                </div>

                                <div className="pm-field">
                                    <label>Nouveau mot de passe</label>
                                    <input
                                        type={
                                            showPasswords ? "text" : "password"
                                        }
                                        value={passwords.new_password}
                                        onChange={(event) =>
                                            setPasswords({
                                                ...passwords,
                                                new_password:
                                                    event.target.value,
                                            })
                                        }
                                        autoComplete="new-password"
                                        required
                                    />
                                </div>

                                <div className="pm-field">
                                    <label>Confirmer le nouveau mot de passe</label>
                                    <input
                                        type={
                                            showPasswords ? "text" : "password"
                                        }
                                        value={passwords.confirm_password}
                                        onChange={(event) =>
                                            setPasswords({
                                                ...passwords,
                                                confirm_password:
                                                    event.target.value,
                                            })
                                        }
                                        autoComplete="new-password"
                                        required
                                    />
                                </div>

                                <button
                                    type="button"
                                    className="pm-toggle"
                                    onClick={() =>
                                        setShowPasswords(!showPasswords)
                                    }
                                >
                                    {showPasswords ? (
                                        <EyeOff size={14} />
                                    ) : (
                                        <Eye size={14} />
                                    )}
                                    {showPasswords
                                        ? "Masquer les mots de passe"
                                        : "Afficher les mots de passe"}
                                </button>

                                <p className="pm-hint">
                                    Minimum 6 caractères, différent de
                                    l'ancien mot de passe.
                                </p>

                                <div className="pm-actions">
                                    <button
                                        type="button"
                                        className="pm-btn-secondary"
                                        onClick={onClose}
                                    >
                                        Fermer
                                    </button>

                                    <button
                                        type="submit"
                                        className="pm-btn-primary"
                                        disabled={savingPassword}
                                    >
                                        {savingPassword
                                            ? "Modification…"
                                            : "Changer le mot de passe"}
                                    </button>
                                </div>

                            </form>
                        )}

                    </div>
                )}

            </div>
        </div>
    );
};


export default ProfileModal;