import {
    NavLink,
    useLocation,
} from "react-router-dom";

import {
    LayoutDashboard,
    Users,
    UserRoundCog,
    FileText,
    CalendarCheck,
    CalendarRange,
    Settings,
    Receipt,
    BriefcaseBusiness,
    LogOut,
    ChevronRight,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { API_ORIGIN } from "../api/api";
import ProfilePhoto from "../components/profile/ProfilePhoto";

import "./DashboardLayout.css";


/*
 * Chaque entrée peut avoir une fonction `isActive(pathname)`.
 * Sans elle, l'entrée est active quand l'URL commence par son path.
 *
 * Nécessaire pour la paie : les bulletins s'ouvrent depuis une période
 * sur /paie/periodes/:id/bulletins, et doivent garder l'entrée
 * « Périodes de paie » active.
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
            },
            {
                label: "Utilisateurs",
                subtitle: "Gestion des comptes utilisateurs",
                path: "/users",
                icon: UserRoundCog,
            },
            {
                label: "Contrats",
                subtitle: "Gestion des contrats",
                path: "/contracts",
                icon: FileText,
            },
            {
                label: "Présence",
                subtitle: "Suivi des présences",
                path: "/attendance",
                icon: CalendarCheck,
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
                isActive: (pathname) =>
                    pathname === "/paie/periodes" ||
                    /^\/paie\/periodes\/[^/]+\/bulletins/.test(pathname),
            },
            {
                label: "Paramètres de paie",
                subtitle: "Taux, taxes et retenues",
                path: "/paie/parametres",
                icon: Settings,
            },
        ],
    },
    {
        title: "GESTION",
        items: [
            {
                label: "Devis & Factures",
                subtitle: "Devis et factures",
                path: "/invoices",
                icon: Receipt,
            },
        ],
    },
];


/*
 * Pages absentes du menu latéral, mais qui doivent
 * afficher un titre dans la topbar.
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
    const location = useLocation();

    const currentItem =
        MENU.flatMap((s) => s.items).find((item) =>
            isItemActive(item, location.pathname)
        ) ||
        EXTRA_PAGES.find((page) => location.pathname.startsWith(page.path));

    const getPhotoUrl = () => {
        if (!user?.photo_url) {
            return null;
        }
        return `${API_ORIGIN}${user.photo_url}`;
    };

    return (
        <div className="app-layout">

            {/* SIDEBAR */}
            <aside className="sidebar">

                {/* BRAND */}
                <div className="sidebar-brand">
                    <div className="sidebar-logo">AG</div>
                    <div>
                        <strong>AuriGestion</strong>
                        <span>Gestion d'entreprise</span>
                    </div>
                </div>

                {/* ENTREPRISE */}
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
                        <strong>{user?.company_name}</strong>
                    </div>
                    <ChevronRight size={16} />
                </NavLink>

                {/* MENU */}
                <nav className="sidebar-menu">
                    {MENU.map((section) => (
                        <div key={section.title}>

                            <p className="menu-title">{section.title}</p>

                            {section.items.map((item) => {
                                const Icon = item.icon;

                                return (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        className={
                                            isItemActive(item, location.pathname)
                                                ? "menu-item active"
                                                : "menu-item"
                                        }
                                    >
                                        <Icon size={19} />
                                        <span>{item.label}</span>
                                    </NavLink>
                                );
                            })}

                        </div>
                    ))}
                </nav>

                {/* USER */}
                <div className="sidebar-user">

                    <ProfilePhoto />

                    <div className="user-info">
                        <strong>
                            {user?.first_name} {user?.last_name}
                        </strong>
                        <span>{user?.role}</span>
                    </div>

                    <button onClick={logout} title="Déconnexion">
                        <LogOut size={18} />
                    </button>

                </div>

            </aside>

            {/* CONTENU */}
            <main className="main-content">

                <header className="topbar">

                    <div>
                        <h1>{currentItem?.label || "Tableau de bord"}</h1>
                        <p>{currentItem?.subtitle || ""}</p>
                    </div>

                    <div className="topbar-user">
                        <div className="user-photo small">
                            {getPhotoUrl() ? (
                                <img src={getPhotoUrl()} alt="" />
                            ) : (
                                <span>
                                    {user?.first_name?.charAt(0).toUpperCase()}
                                </span>
                            )}
                        </div>
                    </div>

                </header>

                <section className="page-content">
                    {children}
                </section>

            </main>

        </div>
    );
};

export default DashboardLayout;