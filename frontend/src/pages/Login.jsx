import {
    useState,
} from "react";

import {
    Mail,
    Lock,
    LogIn,
    Eye,
    EyeOff,
} from "lucide-react";

import {
    useNavigate,
} from "react-router-dom";

import {
    useAuth,
} from "../context/AuthContext";

import "./Login.css";


const Login = () => {

    const navigate =
        useNavigate();


    const {
        login,
    } = useAuth();


    const [email, setEmail] =
        useState("");


    const [password, setPassword] =
        useState("");


    const [showPassword,
        setShowPassword] =
        useState(false);


    const [error, setError] =
        useState("");


    const [loading, setLoading] =
        useState(false);


    const handleSubmit =
        async (event) => {

            event.preventDefault();

            setError("");
            setLoading(true);


            try {

                await login(
                    email,
                    password
                );


                navigate("/");

            } catch (error) {

                setError(
                    error.message
                );

            } finally {

                setLoading(false);
            }
        };


    return (

        <div className="login-page">

            <div className="login-card">

                <div className="login-brand">

                    <div className="brand-mark">
                        AG
                    </div>

                    <div>

                        <h1>
                            AuriGestion
                        </h1>

                        <p>
                            Gestion d'entreprise
                        </p>

                    </div>

                </div>


                <div className="login-title">

                    <h2>
                        Bienvenue
                    </h2>

                    <p>
                        Connectez-vous à votre espace
                    </p>

                </div>


                {error && (

                    <div className="login-error">
                        {error}
                    </div>

                )}


                <form
                    onSubmit={handleSubmit}
                >

                    <label>
                        Adresse email
                    </label>


                    <div className="input-wrapper">

                        <Mail size={19} />

                        <input
                            type="email"
                            value={email}
                            placeholder="exemple@entreprise.ga"
                            onChange={(event) =>
                                setEmail(
                                    event.target.value
                                )
                            }
                            required
                        />

                    </div>


                    <label>
                        Mot de passe
                    </label>


                    <div className="input-wrapper">

                        <Lock size={19} />

                        <input
                            type={
                                showPassword
                                    ? "text"
                                    : "password"
                            }
                            value={password}
                            placeholder="Votre mot de passe"
                            onChange={(event) =>
                                setPassword(
                                    event.target.value
                                )
                            }
                            required
                        />


                        <button
                            type="button"
                            className="password-toggle"
                            onClick={() =>
                                setShowPassword(
                                    !showPassword
                                )
                            }
                        >

                            {showPassword
                                ? <EyeOff size={18} />
                                : <Eye size={18} />
                            }

                        </button>

                    </div>


                    <button
                        type="submit"
                        className="login-button"
                        disabled={loading}
                    >

                        <LogIn size={19} />

                        {loading
                            ? "Connexion..."
                            : "Se connecter"
                        }

                    </button>

                </form>


                <div className="login-footer">
                    AuriGestion · Gestion d'entreprise
                </div>

            </div>

        </div>
    );
};


export default Login;