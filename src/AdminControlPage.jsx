import React, { useState, useEffect } from "react";

export default function AdminControlPage({ currentUser, flights, setFlights, aircraftRequests, setAircraftRequests, onBack }) {
    const [activeTab, setActiveTab] = useState("requests"); // "requests" | "flights"
    // For adding flights
    const [newFlight, setNewFlight] = useState({ id: "", route: "", aircraft: "", status: "BOARDING" });

    // Initialize with 10 realistic requests if empty
    React.useEffect(() => {
        if (aircraftRequests.length === 0) {
            const initialRequests = [
                { id: 101, flightId: "EK001", type: "Takeoff", time: "14:05 UTC" },
                { id: 102, flightId: "QR015", type: "Landing", time: "14:12 UTC" },
                { id: 103, flightId: "EY045", type: "Diagnostics", time: "14:15 UTC" },
                { id: 104, flightId: "BA109", type: "Takeoff", time: "14:22 UTC" },
                { id: 105, flightId: "AF443", type: "Maintenance", time: "14:30 UTC" },
                { id: 106, flightId: "LH400", type: "Landing", time: "14:35 UTC" },
                { id: 107, flightId: "CX252", type: "Takeoff", time: "14:40 UTC" },
                { id: 108, flightId: "SQ321", type: "Repair", time: "14:45 UTC" },
                { id: 109, flightId: "JL047", type: "Landing", time: "14:50 UTC" },
                { id: 110, flightId: "QF001", type: "Takeoff", time: "14:55 UTC" }
            ];
            setAircraftRequests(initialRequests);

            // Sync flight statuses with requests
            setFlights(prev => {
                const newFlights = [...prev];
                initialRequests.forEach(req => {
                    const flightIdx = newFlights.findIndex(f => f.id === req.flightId);
                    if (flightIdx > -1) {
                        newFlights[flightIdx].status = "WAITING";
                    }
                });
                return newFlights;
            });
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps


    const handleApprove = (reqId, flightId, action) => {
        // Determine new status based on action
        let newStatus = "EN ROUTE";
        if (action === "Takeoff") newStatus = "EN ROUTE";
        else if (action === "Landing") newStatus = "ARRIVED";
        else if (action === "Maintenance" || action === "Repair") newStatus = "IN MAINTENANCE";
        else if (action === "Diagnostics") newStatus = "DIAGNOSTICS";

        // Update flight status
        setFlights(prev => prev.map(f => f.id === flightId ? { ...f, status: newStatus } : f));
        // Remove request from queue
        setAircraftRequests(prev => prev.filter(r => r.id !== reqId));
    };

    const handleDeny = (reqId, flightId) => {
        setFlights(prev => prev.map(f => f.id === flightId ? { ...f, status: "DENIED" } : f));
        setAircraftRequests(prev => prev.filter(r => r.id !== reqId));
    };

    const handleAddFlight = () => {
        if (!newFlight.id || !newFlight.route) return;
        const flightData = {
            ...newFlight,
            progress: 0, fuel: 0, co2: 0, risk: 10,
            duration: "0h", distance: "0 NM", altitude: "—",
            passengers: 0, departure: "TBD", arrival: "TBD", color: "#00e5c0"
        };
        setFlights([flightData, ...flights]);
        setNewFlight({ id: "", route: "", aircraft: "", status: "BOARDING" });
    };



    return (
        <div style={{ minHeight: "100vh", background: "#070c14", fontFamily: "'Outfit',sans-serif", color: "#e0e8f0", padding: "40px", position: "relative", overflow: "hidden" }}>
            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: translateY(0) } }
                @keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: .6 } }
                @keyframes gridPulse { 0%, 100% { opacity: 0.03 } 50% { opacity: 0.06 } }
                @keyframes slideInRight { from { opacity: 0; transform: translateX(20px) } to { opacity: 1; transform: translateX(0) } }
                .tab-btn { background: none; border: none; font-size: 14px; font-weight: 700; cursor: pointer; padding-bottom: 8px; font-family: 'DM Mono', monospace; letter-spacing: 1.5px; transition: all .3s; }
                .glass-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; padding: 24px; backdrop-filter: blur(12px); box-shadow: 0 8px 32px rgba(0,0,0,0.2); transition: transform 0.2s, box-shadow 0.2s; }
                .glass-card:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(0,0,0,0.3); border-color: rgba(255,255,255,0.1); }
                .action-btn { border-radius: 8px; font-weight: 700; cursor: pointer; transition: all .2s; font-family: 'Outfit', sans-serif; letter-spacing: 1px; }
                .action-btn:hover { transform: translateY(-1px); filter: brightness(1.2); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
                ::-webkit-scrollbar { width: 6px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: rgba(0, 229, 192, 0.2); border-radius: 10px; }
            `}</style>
            <div style={{ position: "fixed", inset: 0, backgroundImage: "linear-gradient(rgba(0,118,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,118,255,0.03) 1px,transparent 1px)", backgroundSize: "48px 48px", animation: "gridPulse 5s ease infinite", pointerEvents: "none" }} />
            <div style={{ position: "fixed", top: "-20%", right: "-10%", width: "50%", height: "50%", background: "radial-gradient(circle, rgba(0,118,255,0.08) 0%, transparent 60%)", pointerEvents: "none", filter: "blur(60px)" }} />
            <div style={{ position: "fixed", bottom: "-20%", left: "-10%", width: "50%", height: "50%", background: "radial-gradient(circle, rgba(0,229,192,0.05) 0%, transparent 60%)", pointerEvents: "none", filter: "blur(60px)" }} />

            <div style={{ position: "relative", zIndex: 10, maxWidth: "1200px", margin: "0 auto", animation: "fadeIn .6s ease" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px" }}>
                    <button onClick={onBack} className="action-btn" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#aaa", padding: "10px 20px" }}>
                        ← BACK TO DASHBOARD
                    </button>
                    <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 24, fontWeight: 800 }}>AIRCRAFT CONTROL CENTER</div>
                        <div style={{ fontSize: 12, color: "#ff3b5c", fontFamily: "'DM Mono',monospace", letterSpacing: 2 }}>ADMINISTRATOR ACCESS ONLY</div>
                    </div>
                </div>

                <div style={{ display: "flex", gap: "32px", marginBottom: "40px", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "12px", position: "relative", zIndex: 10 }}>
                    <button
                        className="tab-btn"
                        onClick={() => setActiveTab("requests")}
                        style={{ color: activeTab === "requests" ? "#00e5c0" : "#666", borderBottom: activeTab === "requests" ? "2px solid #00e5c0" : "2px solid transparent" }}>
                        AIRCRAFT REQUESTS ({aircraftRequests.length})
                    </button>
                    <button
                        className="tab-btn"
                        onClick={() => setActiveTab("flights")}
                        style={{ color: activeTab === "flights" ? "#0076ff" : "#666", borderBottom: activeTab === "flights" ? "2px solid #0076ff" : "2px solid transparent" }}>
                        FLEET MANAGEMENT
                    </button>
                </div>

                <div style={{ position: "relative", zIndex: 10 }}>
                    {activeTab === "requests" && (
                        <div style={{ animation: "fadeIn .4s ease" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "24px", alignItems: "center" }}>
                                <h3 style={{ fontSize: 20, color: "#fff", fontWeight: 700, letterSpacing: 1 }}>Pending Operational Approvals</h3>
                            </div>

                            {aircraftRequests.length === 0 ? (
                                <div className="glass-card" style={{ padding: "60px", textAlign: "center", color: "#666", fontSize: 16, letterSpacing: 2, fontFamily: "'DM Mono',monospace" }}>
                                    <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.5 }}>✓</div>
                                    NO PENDING REQUESTS IN QUEUE
                                </div>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                                    {aircraftRequests.map((req, i) => (
                                        <div key={req.id} className="glass-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderLeft: `4px solid ${req.type === 'Takeoff' ? '#00e5c0' : req.type === 'Landing' ? '#0076ff' : req.type === 'Maintenance' || req.type === 'Repair' ? '#f5a623' : '#ff3b5c'}`, animation: `slideInRight .4s ease ${i * 0.1}s both`, padding: "20px 24px" }}>
                                            <div>
                                                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                                                    <div style={{ fontSize: 24, fontWeight: 800, color: "#e0e8f0" }}>{req.flightId}</div>
                                                    <div style={{ fontSize: 11, background: "rgba(255,255,255,0.05)", padding: "4px 10px", borderRadius: 12, color: req.type === 'Takeoff' ? '#00e5c0' : req.type === 'Landing' ? '#0076ff' : req.type === 'Maintenance' || req.type === 'Repair' ? '#f5a623' : '#ff3b5c', fontFamily: "'DM Mono',monospace", letterSpacing: 1, border: `1px solid ${req.type === 'Takeoff' ? 'rgba(0,229,192,0.3)' : req.type === 'Landing' ? 'rgba(0,118,255,0.3)' : req.type === 'Maintenance' || req.type === 'Repair' ? 'rgba(245,166,35,0.3)' : 'rgba(255,59,92,0.3)'}` }}>
                                                        {req.type.toUpperCase()}
                                                    </div>
                                                </div>
                                                <div style={{ fontSize: 11, color: "#666", fontFamily: "'DM Mono',monospace", letterSpacing: 1 }}>
                                                    REQUESTED AT: <span style={{ color: "#aaa" }}>{req.time}</span>
                                                </div>
                                            </div>
                                            <div style={{ display: "flex", gap: "12px" }}>
                                                <button onClick={() => handleApprove(req.id, req.flightId, req.type)} className="action-btn" style={{ background: req.type === 'Takeoff' ? "rgba(0,229,192,0.15)" : req.type === 'Landing' ? "rgba(0,118,255,0.15)" : "rgba(245,166,35,0.15)", border: `1px solid ${req.type === 'Takeoff' ? "#00e5c0" : req.type === 'Landing' ? "#0076ff" : "#f5a623"}`, color: req.type === 'Takeoff' ? "#00e5c0" : req.type === 'Landing' ? "#0076ff" : "#f5a623", padding: "10px 20px" }}>
                                                    APPROVE
                                                </button>
                                                {(req.type !== "Maintenance" && req.type !== "Diagnostics" && req.type !== "Repair") && (
                                                    <button onClick={() => handleApprove(req.id, req.flightId, "Diagnostics")} className="action-btn" style={{ background: "rgba(255,59,92,0.1)", border: "1px solid #ff3b5c", color: "#ff3b5c", padding: "10px 20px" }}>
                                                        DIVERT TO DIAGNOSTICS
                                                    </button>
                                                )}
                                                <button onClick={() => handleDeny(req.id, req.flightId)} className="action-btn" style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#888", padding: "10px 20px" }}>
                                                    DENY
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "flights" && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "32px", animation: "fadeIn .4s ease" }}>
                            {/* Add Flight Form */}
                            <div className="glass-card" style={{ alignSelf: "start" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "24px" }}>
                                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#0076ff", animation: "pulse 2s infinite" }} />
                                    <h3 style={{ fontSize: 16, color: "#0076ff", fontFamily: "'DM Mono',monospace", letterSpacing: 2 }}>ADD NEW FLIGHT</h3>
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                                    <input value={newFlight.id} onChange={e => setNewFlight({ ...newFlight, id: e.target.value })} placeholder="Flight ID (e.g. EK999)" style={{ padding: "14px 16px", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", borderRadius: "8px", fontFamily: "'DM Mono',monospace", fontSize: 13, outline: "none", transition: "border .2s" }} onFocus={(e) => e.target.style.borderColor = "rgba(0,118,255,0.5)"} onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
                                    <input value={newFlight.route} onChange={e => setNewFlight({ ...newFlight, route: e.target.value })} placeholder="Route (e.g. DXB → LAX)" style={{ padding: "14px 16px", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", borderRadius: "8px", fontFamily: "'DM Mono',monospace", fontSize: 13, outline: "none", transition: "border .2s" }} onFocus={(e) => e.target.style.borderColor = "rgba(0,118,255,0.5)"} onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
                                    <input value={newFlight.aircraft} onChange={e => setNewFlight({ ...newFlight, aircraft: e.target.value })} placeholder="Aircraft (e.g. A380)" style={{ padding: "14px 16px", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", borderRadius: "8px", fontFamily: "'DM Mono',monospace", fontSize: 13, outline: "none", transition: "border .2s" }} onFocus={(e) => e.target.style.borderColor = "rgba(0,118,255,0.5)"} onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.1)"} />
                                    <button onClick={handleAddFlight} className="action-btn" style={{ background: "linear-gradient(135deg,rgba(0,118,255,0.15),rgba(0,229,192,0.15))", border: "1px solid rgba(0,118,255,0.4)", color: "#00e5c0", padding: "14px", marginTop: 8 }}>
                                        INITIALIZE FLIGHT PLAN →
                                    </button>
                                </div>
                            </div>

                            {/* Live Control Interface */}
                            <div className="glass-card" style={{ maxHeight: "70vh", overflowY: "auto", padding: "32px", display: "flex", flexDirection: "column", gap: 24 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <h3 style={{ fontSize: 16, color: "#ccc", fontFamily: "'DM Mono',monospace", letterSpacing: 2 }}>LIVE CONTROL INTERFACE</h3>
                                    <div style={{ fontSize: 11, color: "#666", fontFamily: "'DM Mono',monospace" }}>{flights.length} ASSETS LOGGED</div>
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                                    {flights.map((f, i) => (
                                        <div key={f.id} style={{ display: "flex", flexDirection: "column", gap: 16, padding: "24px", background: "rgba(0,0,0,0.3)", borderRadius: "12px", borderLeft: f.status === "WAITING" ? "4px solid #f5a623" : f.status === "DENIED" || f.status === "DIAGNOSTICS" ? "4px solid #ff3b5c" : "4px solid #00e5c0", animation: `fadeIn .3s ease ${i * 0.05}s both`, transition: "background .2s" }}>

                                            {/* Header */}
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                                <div>
                                                    <div style={{ display: "flex", gap: "16px", alignItems: "center", marginBottom: 8 }}>
                                                        <div style={{ fontSize: 24, fontWeight: 800 }}>{f.id}</div>
                                                        <div style={{ fontSize: 11, color: "#00e5c0", fontFamily: "'DM Mono',monospace", background: "rgba(0,229,192,0.1)", padding: "4px 8px", borderRadius: 4, border: "1px solid rgba(0,229,192,0.3)" }}>{f.aircraft}</div>
                                                    </div>
                                                    <div style={{ fontSize: 13, color: "#aaa", fontFamily: "'DM Mono',monospace", letterSpacing: 1 }}>{f.route} <span style={{ color: "#555", margin: "0 8px" }}>|</span> ALT: {f.altitude}</div>
                                                </div>
                                                <select
                                                    value={f.status}
                                                    onChange={(e) => setFlights(prev => prev.map(fl => fl.id === f.id ? { ...fl, status: e.target.value } : fl))}
                                                    style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.15)", color: f.status === 'WAITING' ? '#f5a623' : f.status === 'EN ROUTE' ? '#00e5c0' : f.status === 'ARRIVED' ? '#555' : f.status === 'DENIED' || f.status === 'DIAGNOSTICS' ? '#ff3b5c' : '#0076ff', padding: "8px 14px", borderRadius: "6px", fontSize: 11, fontFamily: "'DM Mono',monospace", outline: "none", cursor: "pointer", fontWeight: 700, letterSpacing: 1 }}>
                                                    <option value="BOARDING">BOARDING</option>
                                                    <option value="WAITING">WAITING</option>
                                                    <option value="EN ROUTE">EN ROUTE</option>
                                                    <option value="ARRIVED">ARRIVED</option>
                                                    <option value="IN MAINTENANCE">IN MAINTENANCE</option>
                                                    <option value="DIAGNOSTICS">DIAGNOSTICS</option>
                                                    <option value="DENIED">DENIED</option>
                                                </select>
                                            </div>

                                            {/* Telemetry Sliders */}
                                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, background: "rgba(255,255,255,0.02)", padding: 16, borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)" }}>
                                                {/* Progress Slider */}
                                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#888", fontFamily: "'DM Mono',monospace", letterSpacing: 1 }}>
                                                        <span>PROGRESS</span>
                                                        <span style={{ color: "#00e5c0" }}>{Math.round(f.progress || 0)}%</span>
                                                    </div>
                                                    <input type="range" min="0" max="100" value={f.progress || 0} onChange={(e) => setFlights(prev => prev.map(fl => fl.id === f.id ? { ...fl, progress: Number(e.target.value) } : fl))} style={{ width: "100%", accentColor: "#00e5c0", cursor: "pointer" }} />
                                                </div>

                                                {/* Fuel Slider */}
                                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#888", fontFamily: "'DM Mono',monospace", letterSpacing: 1 }}>
                                                        <span>FUEL LEVEL</span>
                                                        <span style={{ color: (f.fuel || 0) < 20 ? "#ff3b5c" : "#0076ff" }}>{Math.round(f.fuel || 0)}%</span>
                                                    </div>
                                                    <input type="range" min="0" max="100" value={f.fuel || 0} onChange={(e) => setFlights(prev => prev.map(fl => fl.id === f.id ? { ...fl, fuel: Number(e.target.value) } : fl))} style={{ width: "100%", accentColor: (f.fuel || 0) < 20 ? "#ff3b5c" : "#0076ff", cursor: "pointer" }} />
                                                </div>

                                                {/* Risk Slider */}
                                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#888", fontFamily: "'DM Mono',monospace", letterSpacing: 1 }}>
                                                        <span>RISK PROFILE</span>
                                                        <span style={{ color: (f.risk || 0) > 70 ? "#ff3b5c" : (f.risk || 0) > 40 ? "#f5a623" : "#00e5c0" }}>{Math.round(f.risk || 0)}/100</span>
                                                    </div>
                                                    <input type="range" min="0" max="100" value={f.risk || 0} onChange={(e) => setFlights(prev => prev.map(fl => fl.id === f.id ? { ...fl, risk: Number(e.target.value) } : fl))} style={{ width: "100%", accentColor: (f.risk || 0) > 70 ? "#ff3b5c" : (f.risk || 0) > 40 ? "#f5a623" : "#00e5c0", cursor: "pointer" }} />
                                                </div>
                                            </div>

                                            {/* Quick Actions */}
                                            <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                                                <button onClick={() => setFlights(prev => prev.map(fl => fl.id === f.id ? { ...fl, fuel: 100 } : fl))} className="action-btn" style={{ flex: 1, padding: "10px", background: "rgba(0,118,255,0.1)", border: "1px solid rgba(0,118,255,0.3)", color: "#0076ff", fontSize: 11, letterSpacing: 1 }}>
                                                    ⚡ FORCE REFUEL
                                                </button>
                                                <button onClick={() => setFlights(prev => prev.map(fl => fl.id === f.id ? { ...fl, status: "DIAGNOSTICS", risk: 99 } : fl))} className="action-btn" style={{ flex: 1, padding: "10px", background: "rgba(255,59,92,0.1)", border: "1px solid rgba(255,59,92,0.3)", color: "#ff3b5c", fontSize: 11, letterSpacing: 1 }}>
                                                    🚨 EMERGENCY DIVERT
                                                </button>
                                            </div>

                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
