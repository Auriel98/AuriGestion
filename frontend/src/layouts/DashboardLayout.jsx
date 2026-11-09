import { useEffect, useRef, useState } from "react";

import {
    NavLink,
    useLocation,
} from "react-router-dom";

import {
    LayoutDashboard,
    Users,
    UserRoundCog,
    UserRound,
    FileText,
    CalendarCheck,
    CalendarRange,
    Settings,
    Landmark,
    Receipt,
    BriefcaseBusiness,
    ChartColumn,
    ScrollText,
    LogOut,
    ChevronRight,
    ChevronDown,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { usePermissions } from "../hooks/usePermissions";
import { API_ORIGIN } from "../api/api";
import ProfileModal from "../components/profile/ProfileModal";

import "./DashboardLayout.css";
import "./TopbarUser.css";


/*
 * MENU PRINCIPAL
 *
 * Chaque entrée peut avoir :
 *  - `permission` : l'entrée n'est visible que si l'utilisateur
 *    possède cette permission (sans `permission` : visible par tous)
 *  - `isActive(pathname)` : logique d'activation personnalisée
 *
 * Un groupe sans aucune entrée visible n'est pas affiché.
 */
const MENU = [
    {
        title: "PRINCIPAL",
        items: [
            {
                label: "Tableau de bord",
                subtitle: "Vue générale de votre activité",
                path: "/",
                icon: LayoutDashboard,
            },
        ],
    },

    {
        title: "RESSOURCES HUMAINES",
        items: [
            {
                label: "Employés",
                subtitle: "Gestion des employés",
                path: "/employees",
                icon: Users,
                permission: "employees:read",
            },

            {
                label: "Utilisateurs",
                subtitle: "Gestion des comptes utilisateurs",
                path: "/users",
                icon: UserRoundCog,
                permission: "users:read",
            },

            {
                label: "Contrats",
                subtitle: "Gestion des contrats",
                path: "/contracts",
                icon: FileText,
                permission: "contracts:read",
            },

            {
                label: "Présence",
                subtitle: "Suivi des présences",
                path: "/attendance",
                icon: CalendarCheck,
                permission: "attendance:read",
            },
        ],
    },

    {
        title: "PAIE",
        items: [
            {
                label: "Périodes de paie",
                subtitle: "Créer et gérer les périodes",
                path: "/paie/periodes",
                icon: CalendarRange,
                permission: "payroll:read",

                isActive: (pathname) =>
                    pathname === "/paie/periodes" ||
                    /^\/paie\/periodes\/[^/]+\/bulletins/.test(pathname),
            },

            {
                label: "Paramètres de paie",
                subtitle: "Taux, taxes et retenues",
                path: "/paie/parametres",
                icon: Settings,
                permission: "payroll:read",
            },

            {
                label: "Charges patronales",
                subtitle: "Aperçu des cotisations patronales par employé",
                path: "/paie/charges-patronales",
                icon: Landmark,
                permission: "payroll:read",
            },
        ],
    },

    {
        title: "GESTION",
        items: [
            {
                label: "Clients",
                subtitle: "Gestion des clients",
                path: "/clients",
                icon: Users,
                permission: "clients:read",
            },

            {
                label: "Devis",
                subtitle: "Créer et gérer les devis",
                path: "/devis",
                icon: FileText,
                permission: "quotes:read",
            },

            {
                label: "Marchés",
                subtitle: "Suivi des marchés et budgets",
                path: "/marches",
                icon: BriefcaseBusiness,
                permission: "markets:read",
            },

            {
                label: "Dépenses",
                subtitle: "Suivi des dépenses",
                path: "/depenses",
                icon: Receipt,
                permission: "expenses:read",
            },

            {
                label: "Factures",
                subtitle: "Facturation clients",
                path: "/factures",
                icon: Receipt,
                permission: "invoices:read",
            },

            {
                label: "Budget & Rentabilité",
                subtitle: "Analyse du budget et de la rentabilité",
                path: "/budget",
                icon: ChartColumn,
                permission: "budget:read",
            },
        ],
    },

    {
        title: "ADMINISTRATION",
        items: [
            {
                label: "Journal d'audit",
                subtitle: "Historique des actions des utilisateurs",
                path: "/audit",
                icon: ScrollText,
                permission: "audit:read",
            },
        ],
    },
];


/*
 * Pages absentes du menu latéral,
 * mais qui doivent afficher un titre dans la topbar.
 */
const EXTRA_PAGES = [
    {
        label: "Mon entreprise",
        subtitle: "Informations et logo de l'entreprise",
        path: "/entreprise",
    },
];


const isItemActive = (item, pathname) => {
    if (item.isActive) {
        return item.isActive(pathname);
    }

    return item.path === "/"
        ? pathname === "/"
        : pathname.startsWith(item.path);
};


const DashboardLayout = ({ children }) => {

    const { user, logout } = useAuth();
    const { can } = usePermissions();
    const location = useLocation();

    // Fenêtre « Mon profil » et petit menu du header
    const [profileOpen, setProfileOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);


    /*
     * Ferme le menu du header quand on clique ailleurs
     * ou qu'on appuie sur Échap.
     */
    useEffect(() => {
        if (!menuOpen) return;

        const onMouseDown = (event) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(event.target)
            ) {
                setMenuOpen(false);
            }
        };

        const onKeyDown = (event) => {
            if (event.key === "Escape") setMenuOpen(false);
        };

        document.addEventListener("mousedown", onMouseDown);
        document.addEventListener("keydown", onKeyDown);

        return () => {
            document.removeEventListener("mousedown", onMouseDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [menuOpen]);


    /*
     * Menu filtré selon les permissions du rôle :
     * 1. on garde uniquement les entrées autorisées
     * 2. on retire les groupes devenus vides
     */
    const visibleMenu = MENU
        .map((section) => ({
            ...section,
            items: section.items.filter(
                (item) => !item.permission || can(item.permission)
            ),
        }))
        .filter((section) => section.items.length > 0);


    /*
     * Recherche de l'élément actuellement actif
     * pour afficher son titre et son sous-titre dans la topbar.
     */
    const currentItem =
        MENU
            .flatMap((section) => section.items)
            .find((item) =>
                isItemActive(item, location.pathname)
            ) ||
        EXTRA_PAGES.find((page) =>
            location.pathname.startsWith(page.path)
        );


    /*
     * URL de la photo de profil.
     */
    const getPhotoUrl = () => {
        if (!user?.photo_url) {
            return null;
        }

        return `${API_ORIGIN}${user.photo_url}`;
    };


    return (
        <div className="app-layout">

            {/* =========================================
                SIDEBAR
            ========================================= */}
            <aside className="sidebar">

                {/* BRAND */}
                <div className="sidebar-brand">

                    <div className="sidebar-logo">
                        AG
                    </div>

                    <div>
                        <strong>AuriGestion</strong>
                        <span>Gestion d'entreprise</span>
                    </div>

                </div>


                {/* =====================================
                    ENTREPRISE
                ===================================== */}
                {can("company:read") && (
                    <NavLink
                        to="/entreprise"
                        className={
                            location.pathname.startsWith("/entreprise")
                                ? "company-box active"
                                : "company-box"
                        }
                        title="Voir et modifier l'entreprise"
                    >

                        <div className="company-icon">

                            {user?.company_logo ? (
                                <img
                                    src={`${API_ORIGIN}${user.company_logo}`}
                                    alt=""
                                    className="company-icon-img"
                                />
                            ) : (
                                <BriefcaseBusiness size={18} />
                            )}

                        </div>


                        <div>
                            <span>Entreprise</span>
                            <strong>
                                {user?.company_name}
                            </strong>
                        </div>


                        <ChevronRight size={16} />

                    </NavLink>
                )}


                {/* =====================================
                    MENU
                ===================================== */}
                <nav className="sidebar-menu">

                    {visibleMenu.map((section) => (
                        <div key={section.title}>

                            <p className="menu-title">
                                {section.title}
                            </p>


                            {section.items.map((item) => {

                                const Icon = item.icon;

                                return (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        className={
                                            isItemActive(
                                                item,
                                                location.pathname
                                            )
                                                ? "menu-item active"
                                                : "menu-item"
                                        }
                                    >

                                        <Icon size={19} />

                                        <span>
                                            {item.label}
                                        </span>

                                    </NavLink>
                                );
                            })}

                        </div>
                    ))}

                </nav>

            </aside>


            {/* =========================================
                CONTENU PRINCIPAL
            ========================================= */}
            <main className="main-content">

                {/* TOPBAR */}
                <header className="topbar">

                    <div>

                        <h1>
                            {currentItem?.label || "Tableau de bord"}
                        </h1>

                        <p>
                            {currentItem?.subtitle || ""}
                        </p>

                    </div>


                    {/* =================================
                        UTILISATEUR : profil + déconnexion
                    ================================= */}
                    <div className="topbar-user" ref={menuRef}>

                        <button
                            type="button"
                            className="topbar-user-btn"
                            onClick={() => setMenuOpen((open) => !open)}
                            aria-haspopup="menu"
                            aria-expanded={menuOpen}
                        >

                            <div className="user-photo small">

                                {getPhotoUrl() ? (
                                    <img
                                        src={getPhotoUrl()}
                                        alt=""
                                    />
                                ) : (
                                    <span>
                                        {user?.first_name
                                            ?.charAt(0)
                                            .toUpperCase()}
                                    </span>
                                )}

                            </div>


                            <div className="topbar-user-text">

                                <strong>
                                    {user?.first_name} {user?.last_name}
                                </strong>

                                <span>
                                    {user?.role}
                                </span>

                            </div>


                            <ChevronDown size={16} />

                        </button>


                        {menuOpen && (
                            <div className="topbar-menu" role="menu">

                                <div className="topbar-menu-head">

                                    <strong>
                                        {user?.first_name} {user?.last_name}
                                    </strong>

                                    <span>
                                        {user?.role}
                                    </span>

                                </div>


                                <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => {
                                        setMenuOpen(false);
                                        setProfileOpen(true);
                                    }}
                                >
                                    <UserRound size={16} />
                                    Mon profil
                                </button>


                                <button
                                    type="button"
                                    role="menuitem"
                                    className="danger"
                                    onClick={logout}
                                >
                                    <LogOut size={16} />
                                    Déconnexion
                                </button>

                            </div>
                        )}

                    </div>

                </header>


                {/* =====================================
                    PAGE
                ===================================== */}
                <section className="page-content">
                    {children}
                </section>

            </main>


            {/* =========================================
                FENÊTRE « MON PROFIL »
            ========================================= */}
            {profileOpen && (
                <ProfileModal
                    onClose={() => setProfileOpen(false)}
                />
            )}

        </div>
    );
};


export default DashboardLayout;