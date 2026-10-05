import {
    Users,
    FileText,
    CalendarCheck,
    Wallet,
} from "lucide-react";

import {
    useAuth,
} from "../context/AuthContext";


const Dashboard = () => {

    const {
        user,
    } = useAuth();


    const cards = [
        {
            title: "Employés",
            value: "0",
            icon: Users,
        },

        {
            title: "Contrats actifs",
            value: "0",
            icon: FileText,
        },

        {
            title: "Présences aujourd'hui",
            value: "0",
            icon: CalendarCheck,
        },

        {
            title: "Masse salariale",
            value: "0 FCFA",
            icon: Wallet,
        },
    ];


    return (

        <div>

            <div
                style={{
                    marginBottom: "28px",
                }}
            >

                <h2
                    style={{
                        margin: 0,
                        fontSize: "20px",
                    }}
                >
                    Bonjour {user?.first_name}
                </h2>

                <p
                    style={{
                        color: "#888",
                        fontSize: "13px",
                    }}
                >
                    Voici un aperçu de
                    l'activité de{" "}
                    {user?.company_name}.
                </p>

            </div>


            <div
                style={{
                    display: "grid",
                    gridTemplateColumns:
                        "repeat(4, 1fr)",
                    gap: "18px",
                }}
            >

                {cards.map((card) => {

                    const Icon =
                        card.icon;


                    return (

                        <div
                            key={card.title}
                            style={{
                                background:
                                    "#ffffff",
                                borderRadius:
                                    "10px",
                                padding:
                                    "20px",
                                border:
                                    "1px solid #eeeeee",
                            }}
                        >

                            <div
                                style={{
                                    display: "flex",
                                    alignItems:
                                        "center",
                                    justifyContent:
                                        "space-between",
                                }}
                            >

                                <span
                                    style={{
                                        fontSize:
                                            "12px",
                                        color:
                                            "#888",
                                    }}
                                >
                                    {card.title}
                                </span>


                                <Icon
                                    size={20}
                                    color="#f68b1e"
                                />

                            </div>


                            <strong
                                style={{
                                    display:
                                        "block",
                                    marginTop:
                                        "14px",
                                    fontSize:
                                        "24px",
                                }}
                            >
                                {card.value}
                            </strong>

                        </div>

                    );

                })}

            </div>

        </div>
    );
};


export default Dashboard;