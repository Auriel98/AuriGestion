import React from "react";
import { LayoutDashboard } from "lucide-react";
import "./StatCard.css";

const StatCard = ({
    label,
    value,
    icon,
    description,
}) => {
    const Icon = icon || LayoutDashboard;

    return (
        <div className="stat-card">

            <div className="stat-card-content">

                <div>
                    <p className="stat-card-label">
                        {label}
                    </p>

                    <h3 className="stat-card-value">
                        {value}
                    </h3>

                    {description && (
                        <p className="stat-card-description">
                            {description}
                        </p>
                    )}
                </div>

                <div className="stat-card-icon">
                    <Icon size={21} strokeWidth={2} />
                </div>

            </div>

        </div>
    );
};

export default StatCard;