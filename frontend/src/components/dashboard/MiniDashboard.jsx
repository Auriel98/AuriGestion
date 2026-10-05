import React from "react";
import StatCard from "./StatCard";
import "./MiniDashboard.css";

const MiniDashboard = ({ stats = [] }) => {

    return (
        <div className="mini-dashboard">

            {stats.map((stat, index) => (
                <StatCard
                    key={stat.label || index}
                    {...stat}
                />
            ))}

        </div>
    );
};

export default MiniDashboard;