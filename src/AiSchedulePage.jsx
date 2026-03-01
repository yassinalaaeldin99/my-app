import { useState, useEffect } from "react";
import "./AiSchedulePage.css"; // We'll add custom styles

export default function AiSchedulePage({ onBack, currentUser }) {
    const [loading, setLoading] = useState(false);
    const [scheduleState, setScheduleState] = useState(null); // original vs ai
    const [approved, setApproved] = useState(false);

    // Mock Data for AI Schedule Scenario
    const initialScenario = {
        triggerEvent: "Severe Weather Front approaching DXB",
        conflict: "3 arriving flights simultaneous with 2 departing flights due to holding patterns.",
        affectedFlights: ["EK205", "EK412", "EK508", "EK118", "EK302"],
        originalSchedule: [
            { id: "EK205", type: "DEP", time: "09:15", status: "ON TIME", gate: "A4" },
            { id: "EK508", type: "DEP", time: "09:20", status: "ON TIME", gate: "B12" },
            { id: "EK118", type: "ARR", time: "09:22", status: "EXPECTED", gate: "A7" },
            { id: "EK412", type: "DEP", time: "09:30", status: "ON TIME", gate: "C2" },
            { id: "EK302", type: "ARR", time: "09:35", status: "EXPECTED", gate: "B8" },
        ],
        aiSchedule: [
            { id: "EK205", type: "DEP", time: "09:15", status: "ON TIME", gate: "A4" },
            { id: "EK118", type: "ARR", time: "09:20", status: "PRIORITY CLEARANCE", gate: "A7", aiNote: "Expedited landing" },
            { id: "EK508", type: "DEP", time: "09:35", status: "DELAYED", gate: "B12", aiNote: "Ground hold +15m" },
            { id: "EK302", type: "ARR", time: "09:40", status: "HOLDING", gate: "C2", aiNote: "Changed gate, pattern hold +5m" },
            { id: "EK412", type: "DEP", time: "09:50", status: "DELAYED", gate: "B8", aiNote: "Ground hold +20m, new gate" },
        ]
    };

    useEffect(() => {
        // Simulate initial loading of AI data
        setLoading(true);
        setTimeout(() => {
            setScheduleState(initialScenario);
            setLoading(false);
        }, 1500);
    }, []);

    const handleReroll = () => {
        setLoading(true);
        setApproved(false);
        setTimeout(() => {
            // Create a slightly altered schedule just for demonstration
            const newSchedule = {
                ...scheduleState,
                aiSchedule: [
                    { id: "EK118", type: "ARR", time: "09:15", status: "DIVERTED", gate: "N/A", aiNote: "Diverted to DWC due to severe cell" },
                    { id: "EK205", type: "DEP", time: "09:25", status: "DELAYED", gate: "A4", aiNote: "Wait for storm cell to pass" },
                    { id: "EK508", type: "DEP", time: "09:40", status: "DELAYED", gate: "B12", aiNote: "Wait for storm cell to pass" },
                    { id: "EK302", type: "ARR", time: "09:45", status: "EXPECTED", gate: "C2", aiNote: "Standard approach" },
                    { id: "EK412", type: "DEP", time: "09:55", status: "DELAYED", gate: "B8", aiNote: "Queue sequence 3" },
                ]
            };
            setScheduleState(newSchedule);
            setLoading(false);
        }, 2000);
    };

    const handleApprove = () => {
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            setApproved(true);
        }, 800);
    };

    if (!scheduleState && loading) {
        return (
            <div className="ai-wrapper loader-container">
                <div className="radar-spinner"></div>
                <div className="loader-text">ANALYZING AIRSPACE CONFLICTS...</div>
            </div>
        );
    }

    return (
        <div className="ai-wrapper">
            {/* Header */}
            <div className="ai-header">
                <button onClick={onBack} className="ai-back-btn">← BACK TO FLEET</button>
                <div className="ai-title-group">
                    <div className="ai-system-badge">AEROSENSE-AI CORE</div>
                    <h1>INTELLIGENT SCHEDULE MANAGER</h1>
                    <div className="ai-subtitle">AUTHORIZED ADMIN ACCESS ONLY</div>
                </div>
                <div className="ai-user-info">
                    <div className="ai-status">
                        <div className="status-dot"></div>
                        SYSTEM ACTIVE
                    </div>
                    <div className="ai-admin-name">{currentUser?.name.toUpperCase()}</div>
                </div>
            </div>

            {loading ? (
                <div className="loader-container inline-loader">
                    <div className="radar-spinner"></div>
                    <div className="loader-text">RECALCULATING TRAJECTORIES...</div>
                </div>
            ) : approved ? (
                <div className="approval-success">
                    <div className="success-icon">✓</div>
                    <h2>SCHEDULE UPDATES PROPAGATED</h2>
                    <p>The AI routing suggestions have been sent to Air Traffic Control and the affected flight crews.</p>
                    <button onClick={onBack} className="ai-primary-btn outline mt-4">RETURN TO DASHBOARD</button>
                </div>
            ) : scheduleState ? (
                <div className="ai-content">
                    {/* Context Panel */}
                    <div className="ai-context-panel">
                        <div className="trigger-badge">⚠️ AI INTERVENTION REQUIRED</div>
                        <div className="trigger-reason">
                            <strong>TRIGGER:</strong> {scheduleState.triggerEvent}
                        </div>
                        <div className="conflict-desc">
                            <strong>CONFLICT:</strong> {scheduleState.conflict}
                        </div>
                        <div className="affected-flights">
                            {scheduleState.affectedFlights.map(f => <span key={f} className="flight-tag">{f}</span>)}
                        </div>
                    </div>

                    {/* Comparison Board */}
                    <div className="comparison-board">

                        {/* Original Column */}
                        <div className="schedule-col original">
                            <h3 className="col-title">ORIGINAL PLANNED SCHEDULE</h3>
                            <div className="flight-list">
                                {scheduleState.originalSchedule.map(f => (
                                    <div key={f.id} className="flight-row">
                                        <div className="f-time">{f.time}</div>
                                        <div className="f-info">
                                            <span className="f-id">{f.id}</span>
                                            <span className={`f-type ${f.type.toLowerCase()}`}>{f.type}</span>
                                        </div>
                                        <div className="f-gate">GATE {f.gate}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* AI Column */}
                        <div className="schedule-col ai-suggested">
                            <h3 className="col-title highlight">AI OPTIMIZED SCHEDULE</h3>
                            <div className="flight-list">
                                {scheduleState.aiSchedule.map(f => (
                                    <div key={f.id} className="flight-row ai-row">
                                        <div className="f-time">{f.time}</div>
                                        <div className="f-info">
                                            <span className="f-id">{f.id}</span>
                                            <span className={`f-type ${f.type.toLowerCase()}`}>{f.type}</span>
                                        </div>
                                        <div className="f-gate">GATE {f.gate}</div>
                                        {f.aiNote && <div className="ai-reasoning text-xs text-blue-300 mt-1 italic">↳ {f.aiNote}</div>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Admin Actions */}
                    <div className="ai-actions">
                        <button onClick={handleReroll} className="ai-second-btn">↺ RE-ROLL SCHEDULE</button>
                        <button onClick={handleApprove} className="ai-primary-btn">APPROVE AI CHANGES</button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
