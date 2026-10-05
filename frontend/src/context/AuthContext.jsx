
import {
    createContext,
    useContext,
    useEffect,
    useState,
} from "react";

import api from "../api/api";


// =========================================
// CONTEXT
// =========================================

const AuthContext = createContext(null);


// =========================================
// PROVIDER
// =========================================

export const AuthProvider = ({ children }) => {

    const [user, setUser] = useState(null);

    const [loading, setLoading] = useState(true);


    // =========================================
    // RÉCUPÉRER L'UTILISATEUR CONNECTÉ
    // Chargement initial de l'application
    // =========================================

    const loadUser = async () => {

        const token = localStorage.getItem("token");


        // Aucun token
        if (!token) {

            setUser(null);

            setLoading(false);

            return null;
        }


        try {

            const data = await api("/auth/me");

            setUser(data);

            return data;

        } catch (error) {

            console.error(
                "Erreur lors du chargement de l'utilisateur :",
                error
            );

            // Token invalide ou expiré
            localStorage.removeItem("token");

            setUser(null);

            return null;

        } finally {

            setLoading(false);
        }
    };


    // =========================================
    // REFRESH USER
    // Mettre à jour les informations de l'utilisateur
    // après une modification du profil
    // =========================================

    const refreshUser = async () => {

        try {

            const data = await api("/auth/me");


            // Met à jour uniquement les nouvelles
            // informations tout en conservant
            // les éventuelles autres propriétés
            setUser((previous) => ({
                ...previous,
                ...data,
            }));


            return data;

        } catch (error) {

            console.error(
                "Erreur lors de la mise à jour de l'utilisateur :",
                error
            );

            return null;
        }
    };


    // =========================================
    // CHARGEMENT INITIAL
    // =========================================

    useEffect(() => {

        loadUser();

    }, []);


    // =========================================
    // LOGIN
    // =========================================

    const login = async (
        email,
        password
    ) => {

        const data = await api(
            "/auth/login",
            {
                method: "POST",

                body: JSON.stringify({
                    email,
                    password,
                }),
            }
        );


        // Sauvegarder le token
        localStorage.setItem(
            "token",
            data.token
        );


        // Sauvegarder l'utilisateur
        setUser(data.user);


        return data.user;
    };


    // =========================================
    // LOGOUT
    // =========================================

    const logout = () => {

        localStorage.removeItem("token");

        setUser(null);
    };


    // =========================================
    // PROVIDER
    // =========================================

    return (
        <AuthContext.Provider
            value={{
                user,
                setUser,
                loading,
                login,
                logout,
                refreshUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};


// =========================================
// HOOK useAuth
// =========================================

export const useAuth = () => {

    const context = useContext(AuthContext);


    if (!context) {

        throw new Error(
            "useAuth doit être utilisé dans AuthProvider"
        );
    }


    return context;
};
