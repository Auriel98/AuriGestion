import { useState } from "react";

import {
    Mail,
    Lock,
    LogIn,
    Eye,
    EyeOff,
    BarChart3,
    Users,
    UserCog,
    FileText,
    CalendarCheck,
    CalendarDays,
    SlidersHorizontal,
    Contact,
    Receipt,
    ShieldCheck,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

import "./Login.css";


const FEATURES = [
    {
        icon: BarChart3,
        title: "Tableau de bord",
        text: "Vue générale de votre activité et indicateurs clés",
    },
    {
        icon: Users,
        title: "Employés",
        text: "Gestion complète des employés et de leurs informations",
    },
    {
        icon: UserCog,
        title: "Utilisateurs",
        text: "Gestion des comptes et des accès utilisateurs",
    },
    {
        icon: FileText,
        title: "Contrats",
        text: "Création et suivi des contrats de travail",
    },
    {
        icon: CalendarCheck,
        title: "Présence",
        text: "Suivi des présences et absences",
    },
    {
        icon: CalendarDays,
        title: "Périodes de paie",
        text: "Gérer les périodes de paie et générer automatiquement les bulletins de salaire",
    },
    {
        icon: SlidersHorizontal,
        title: "Paramètres de paie",
        text: "Taux, taxes et retenues",
    },
    {
        icon: Contact,
        title: "Clients",
        text: "Gestion de votre base clients et contacts",
    },
    {
        icon: Receipt,
        title: "Devis & Factures",
        text: "Création, suivi et gestion des devis et factures",
    },
];


const Login = () => {

    const navigate = useNavigate();

    const { login } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [remember, setRemember] = useState(true);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);


    const handleSubmit = async (event) => {

        event.preventDefault();

        setError("");
        setLoading(true);

        try {

            await login(email, password);

            navigate("/");

        } catch (err) {

            setError(err.message);

        } finally {

            setLoading(false);
        }
    };


    return (

        <div className="login-page">

            {/* ===== Colonne gauche ===== */}
            <section className="login-showcase">

                <div className="showcase-circle" />

                <div className="login-brand">

                    <img
                        className="brand-logo"
                        src="/logo-auritech.png"
                        alt="AuriTech"
                    />

                    <div>
                        <h1>
                            Gestion <span>d'entreprise</span>
                        </h1>
                        <p>Gérer efficacement votre entreprise</p>
                    </div>

                </div>


                <h2 className="showcase-title">
                    La gestion de votre entreprise{" "}
                    <span>simplifiée</span>
                </h2>

                <p className="showcase-text">
                    AuriGestion vous accompagne au quotidien pour gérer
                    efficacement vos ressources, votre équipe et votre
                    activité.
                </p>


                <ul className="feature-list">

                    {FEATURES.map(({ icon: Icon, title, text }) => (

                        <li key={title}>

                            <div className="feature-icon">
                                <Icon size={22} />
                            </div>

                            <div>
                                <strong>{title}</strong>
                                <span>{text}</span>
                            </div>

                        </li>

                    ))}

                </ul>


                <div className="showcase-secure">

                    <ShieldCheck size={24} />

                    <div>
                        <strong>Sécurisé à 100%</strong>
                        <span>Vos données sont chiffrées et protégées</span>
                    </div>

                </div>


                <img
                    className="showcase-visual"
                    src="/login-mockup.png"
                    alt=""
                />

            </section>


            {/* ===== Colonne droite ===== */}
            <section className="login-panel">

                <div className="login-card">

                    <div className="lock-badge">
                        <Lock size={30} />
                    </div>


                    <div className="login-title">
                        <h2>Bienvenue</h2>
                        <p>Connectez-vous à votre espace</p>
                    </div>


                    {error && (
                        <div className="login-error">{error}</div>
                    )}


                    <form onSubmit={handleSubmit}>

                        <label>Adresse email</label>

                        <div className="input-wrapper">

                            <span className="input-icon">
                                <Mail size={19} />
                            </span>

                            <input
                                type="email"
                                value={email}
                                placeholder="Entrez votre adresse email"
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />

                        </div>


                        <label>Mot de passe</label>

                        <div className="input-wrapper">

                            <span className="input-icon">
                                <Lock size={19} />
                            </span>

                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                placeholder="Entrez votre mot de passe"
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />

                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword
                                    ? <EyeOff size={19} />
                                    : <Eye size={19} />
                                }
                            </button>

                        </div>


                        <div className="login-options">

                            <label className="remember">
                                <input
                                    type="checkbox"
                                    checked={remember}
                                    onChange={(e) => setRemember(e.target.checked)}
                                />
                                Se souvenir de moi
                            </label>

                            <a href="#" className="forgot">
                                Mot de passe oublié ?
                            </a>

                        </div>


                        <button
                            type="submit"
                            className="login-button"
                            disabled={loading}
                        >
                            <LogIn size={20} />
                            {loading ? "Connexion..." : "Se connecter"}
                        </button>

                    </form>


                    <div className="secure-box">

                        <div className="secure-icon">
                            <ShieldCheck size={22} />
                        </div>

                        <div>
                            <strong>Accès sécurisé</strong>
                            <span>
                                Seuls les utilisateurs autorisés peuvent
                                accéder à cette plateforme.
                            </span>
                        </div>

                    </div>


                    <div className="login-footer">
                        © 2026 AuriGestion · Tous droits réservés
                    </div>

                </div>

            </section>

        </div>
    );
};


export default Login;