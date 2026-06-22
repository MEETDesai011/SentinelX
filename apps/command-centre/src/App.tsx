import React, { useState, useEffect } from 'react';
import { 
  Shield, AlertTriangle, Users, MapPin, Search, Activity, FileText, 
  Map, DollarSign, Upload, Bell, CheckCircle2, ChevronRight, Play, Cpu, 
  TrendingUp, RefreshCw, XCircle, FileSpreadsheet
} from 'lucide-react';

// --- MOCK DATA FOR MVP VIEWS ---

const INITIAL_KPIS = [
  { title: "Active Scam Streams", value: "3", change: "+12%", trend: "up", icon: Activity, color: "text-amber-500" },
  { title: "Prevented Capital Loss", value: "₹6.4 Crores", change: "+18%", trend: "up", icon: DollarSign, color: "text-emerald-500" },
  { title: "Scam Networks Traced", value: "42", change: "+5%", trend: "up", icon: Users, color: "text-teal-400" },
  { title: "Dismantled Rings", value: "11", change: "+2", trend: "up", icon: Shield, color: "text-blue-500" }
];

const INITIAL_SESSIONS = [
  { id: "SESS-8921", caller: "+919876500112", risk: 0.94, impersonating: "CBI Officer Raghavan", status: "LOCK_BANK_APPS", timestamp: "17:42:01", transcript: "You are under digital arrest. Do not disconnect the camera. Transfer your account balance to CBI verification vault." },
  { id: "SESS-8922", caller: "+919123499218", risk: 0.72, impersonating: "FedEx / Customs", status: "WARN_CITIZEN", timestamp: "17:44:32", transcript: "We found illegal drugs in a package sent under your Aadhaar card number. Pay 45000 rupees clearance fee." },
  { id: "SESS-8923", caller: "+918889997771", risk: 0.35, impersonating: "TRAI Compliance", status: "MONITORING", timestamp: "17:45:10", transcript: "Your SIM card will be deactivated in 2 hours due to illegal advertising. Confirm details to keep active." }
];

const INITIAL_REPORTS = [
  { id: "REP-401", reporter: "Rajesh Sharma", phone: "+919811223344", detail: "Extorted via WhatsApp video call by impersonator in police uniform.", location: "Mumbai", date: "22 Jun 17:15", status: "INVESTIGATING" },
  { id: "REP-402", reporter: "Sunita Vyas", phone: "+919922003344", detail: "Received fraudulent call from FedEx Customs demanding package clearance transfer.", location: "Noida", date: "22 Jun 16:30", status: "RESOLVED" },
  { id: "REP-403", reporter: "Mohan Lal", phone: "+919321456789", detail: "UPI money mule account request for online task group.", location: "Salt Lake, Kolkata", date: "22 Jun 15:45", status: "OPEN" }
];

const AGENT_LIST = [
  { name: "ScamPatternAgent", objective: "Detect transcript scripts", status: "ACTIVE", load: "14%", model: "DistilBERT Multilingual" },
  { name: "CurrencyVisionAgent", objective: "Scan security features", status: "ACTIVE", load: "2%", model: "EfficientNet ViT" },
  { name: "FraudGraphAgent", objective: "Neo4j path traversal", status: "ACTIVE", load: "8%", model: "GraphSAGE GDS" },
  { name: "CitizenShieldAgent", objective: "Citizen translation", status: "ACTIVE", load: "11%", model: "Bhashini REST Bridge" },
  { name: "EvidencePackagerAgent", objective: "Assemble legal packages", status: "IDLE", load: "0%", model: "HSM Signer" },
  { name: "ThreatFusionAgent", objective: "Scam score consensus", status: "ACTIVE", load: "22%", model: "MCDA Ensemble" },
  { name: "OrchestratorAgent", objective: "Direct mesh state machine", status: "ACTIVE", load: "5%", model: "Ray Event Queue" }
];

const HOTSPOT_PINS = [
  { type: "DIGITAL_ARREST", lat: 19.0760, lng: 72.8777, score: 0.92, desc: "Bandra East Call Centroid", city: "Mumbai" },
  { type: "COUNTERFEIT", lat: 18.9220, lng: 72.8347, score: 0.85, desc: "Colaba Retailer Scan Node", city: "Mumbai" },
  { type: "FRAUD_NETWORK", lat: 19.2183, lng: 72.9781, score: 0.97, desc: "Thane ATM Cash Out Group", city: "Thane" },
  { type: "DIGITAL_ARREST", lat: 28.6139, lng: 77.2090, score: 0.89, desc: "ED Impersonation Centroid", city: "Delhi" },
  { type: "COUNTERFEIT", lat: 28.5355, lng: 77.3910, score: 0.94, desc: "Noida Sec 62 Retail Node", city: "Noida" },
  { type: "FRAUD_NETWORK", lat: 22.5726, lng: 88.3639, score: 0.98, desc: "Mule Bank Registry", city: "Kolkata" },
  { type: "DIGITAL_ARREST", lat: 12.9716, lng: 77.5946, score: 0.76, desc: "Customs extortion centroid", city: "Bengaluru" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'scam' | 'graph' | 'currency' | 'reports' | 'evidence' | 'agents'>('home');
  const [sessions, setSessions] = useState(INITIAL_SESSIONS);
  const [activeSessionId, setActiveSessionId] = useState<string>("SESS-8921");
  const [currencyFile, setCurrencyFile] = useState<string | null>(null);
  const [currencyResult, setCurrencyResult] = useState<any | null>(null);
  const [scanning, setScanning] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  
  // Real-time call transcript stream simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setSessions(prev => prev.map(sess => {
        if (sess.id === "SESS-8921" && sess.risk < 0.99) {
          const sentences = [
            "We are transferring you to the lock-up officer. Keep your hands visible.",
            "Do not call your family members. This case is high-security confidential.",
            "Our audit bank account is open. Send the funds now to avoid jail."
          ];
          const randomText = sentences[Math.floor(Math.random() * sentences.length)];
          return {
            ...sess,
            transcript: sess.transcript + " " + randomText,
            risk: Math.min(sess.risk + 0.01, 1.0)
          };
        }
        return sess;
      }));
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  const activeSessionDetails = sessions.find(s => s.id === activeSessionId) || sessions[0];

  const handleCurrencyUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setScanning(true);
      setCurrencyFile(URL.createObjectURL(e.target.files[0]));
      setTimeout(() => {
        setCurrencyResult({
          isCounterfeit: true,
          confidence: 0.94,
          denomination: 500,
          serialNumber: "5AC982341",
          failedMarkers: [
            { marker: "security_thread_variance", details: "Optical shift variance hue failed. Color remained green." },
            { marker: "microprint_clarity", details: "Fuzzy edge density print detected." }
          ]
        });
        setScanning(false);
      }, 2000);
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between">
        <div>
          <div className="p-6 flex items-center gap-3 border-b border-slate-800">
            <Shield className="w-8 h-8 text-teal-400" />
            <div>
              <h1 className="font-bold text-lg tracking-wide text-white">SENTINELX</h1>
              <p className="text-xs text-slate-400">V7 ULTIMATE MVP</p>
            </div>
          </div>
          
          <nav className="p-4 space-y-1">
            <button 
              onClick={() => setActiveTab('home')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'home' ? 'bg-teal-500/10 text-teal-400 border-l-4 border-teal-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <Map className="w-5 h-5" />
              Command Home
            </button>
            <button 
              onClick={() => setActiveTab('scam')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'scam' ? 'bg-teal-500/10 text-teal-400 border-l-4 border-teal-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <Activity className="w-5 h-5" />
              Scam Monitor
            </button>
            <button 
              onClick={() => setActiveTab('graph')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'graph' ? 'bg-teal-500/10 text-teal-400 border-l-4 border-teal-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <Users className="w-5 h-5" />
              Fraud Graph
            </button>
            <button 
              onClick={() => setActiveTab('currency')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'currency' ? 'bg-teal-500/10 text-teal-400 border-l-4 border-teal-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <DollarSign className="w-5 h-5" />
              Counterfeit Vision
            </button>
            <button 
              onClick={() => setActiveTab('reports')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'reports' ? 'bg-teal-500/10 text-teal-400 border-l-4 border-teal-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <Bell className="w-5 h-5" />
              Citizen Inbox
            </button>
            <button 
              onClick={() => setActiveTab('evidence')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'evidence' ? 'bg-teal-500/10 text-teal-400 border-l-4 border-teal-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <FileText className="w-5 h-5" />
              Evidence Packages
            </button>
            <button 
              onClick={() => setActiveTab('agents')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'agents' ? 'bg-teal-500/10 text-teal-400 border-l-4 border-teal-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <Cpu className="w-5 h-5" />
              Agent Status
            </button>
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
            <div className="text-xs text-slate-300">
              <p className="font-semibold">MHA Secure Tunnel</p>
              <p className="text-slate-500">Connected - 127.0.0.1</p>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTAINER WORKSPACE */}
      <main className="flex-1 flex flex-col overflow-hidden">
        
        {/* HEADER BAR */}
        <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-white capitalize">
              {activeTab === 'home' ? 'National Threat Command Dashboard' : activeTab + ' Workspace'}
            </h2>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search phone, case number..." 
                className="bg-slate-800 text-sm pl-10 pr-4 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-teal-400 w-64 text-slate-200"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <p className="text-xs font-medium text-slate-400">Database Uptime: 99.999%</p>
            </div>
          </div>
        </header>

        {/* WORKSPACE PAGES PANEL */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-950">
          
          {/* TAB 1: COMMAND HOME (GEOSPATIAL INTRUSION HEATMAP VIEW) */}
          {activeTab === 'home' && (
            <div className="space-y-8">
              {/* KPIs GRID */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {INITIAL_KPIS.map((kpi, idx) => (
                  <div key={idx} className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg relative overflow-hidden">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{kpi.title}</p>
                        <h3 className="text-2xl font-bold text-white mt-2">{kpi.value}</h3>
                      </div>
                      <div className={`p-3 rounded-lg bg-slate-800 ${kpi.color}`}>
                        <kpi.icon className="w-6 h-6" />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs">
                      <span className="text-emerald-400 font-bold">{kpi.change}</span>
                      <span className="text-slate-500">from last 24h</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* MAP INTERACTIVE & CURRENT STREAM */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* GEOSPATIAL INTELLIGENCE MAP VIEW (PILLAR 4 MVP) */}
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg lg:col-span-2">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-semibold text-lg text-white flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-teal-400" />
                      Geospatial Fraud Intrusion Zones (Pillar 4 Heatmap)
                    </h4>
                    <span className="bg-teal-500/10 text-teal-400 text-xs px-2.5 py-1 rounded-full font-medium">Live Pins</span>
                  </div>
                  
                  {/* Vector SVG India Map Projection Simulator */}
                  <div className="h-96 w-full rounded-lg border border-slate-700 bg-slate-950 relative overflow-hidden flex items-center justify-center">
                    <svg className="absolute w-full h-full text-slate-800" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="0.5">
                      <path d="M50 5 L70 30 L80 60 L60 90 L40 90 L20 70 L15 50 L30 20 Z" fill="#1e293b" fillOpacity="0.3" stroke="#334155" strokeWidth="1" />
                      <grid />
                    </svg>
                    
                    {/* Render active pins */}
                    {HOTSPOT_PINS.map((pin, i) => {
                      // Project coordinates onto 100x100 SVG space
                      // Lat range approx 8 to 37 -> Y coordinates
                      // Lng range approx 68 to 97 -> X coordinates
                      const x = ((pin.lng - 68) / 29) * 80 + 10;
                      const y = (1 - (pin.lat - 8) / 29) * 80 + 10;
                      
                      const isHigh = pin.score > 0.90;
                      const color = isHigh ? "fill-red-500 stroke-red-400" : "fill-amber-500 stroke-amber-400";
                      
                      return (
                        <div 
                          key={i} 
                          className="absolute group cursor-pointer"
                          style={{ left: `${x}%`, top: `${y}%` }}
                        >
                          <div className={`w-3.5 h-3.5 rounded-full ${isHigh ? 'bg-red-500' : 'bg-amber-500'} border-2 border-slate-900 relative shadow-lg`}>
                            <span className="absolute -inset-1 rounded-full bg-red-400 animate-ping opacity-75"></span>
                          </div>
                          {/* Tooltip */}
                          <div className="hidden group-hover:block absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 p-2.5 rounded-lg shadow-xl text-xs z-50 w-44">
                            <p className="font-bold text-white">{pin.city} - {pin.type}</p>
                            <p className="text-slate-400 mt-1">{pin.desc}</p>
                            <p className="text-teal-400 font-semibold mt-1">Hazard Index: {(pin.score * 100).toFixed(0)}%</p>
                          </div>
                        </div>
                      );
                    })}
                    <div className="absolute bottom-4 left-4 bg-slate-900/90 border border-slate-800 p-3 rounded-lg text-xs space-y-1">
                      <p className="font-bold text-white">Legend</p>
                      <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Critical threat (Score &gt; 90)</div>
                      <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Moderate threat (Score &lt; 90)</div>
                    </div>
                  </div>
                </div>

                {/* RECENT ALERTS */}
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg flex flex-col justify-between">
                  <div>
                    <h4 className="font-semibold text-lg text-white mb-4 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                      Critical Active Threats
                    </h4>
                    
                    <div className="space-y-4">
                      {sessions.map((sess, idx) => (
                        <div key={idx} className="border-l-4 border-red-500 bg-slate-850 p-4 rounded-r-lg space-y-2">
                          <div className="flex justify-between items-start">
                            <span className="font-bold text-sm text-white">{sess.caller}</span>
                            <span className="bg-red-500/10 text-red-400 text-xs px-2 py-0.5 rounded font-bold">{(sess.risk * 100).toFixed(0)}% Threat</span>
                          </div>
                          <p className="text-xs text-slate-400 line-clamp-2">"{sess.transcript}"</p>
                          <div className="flex justify-between items-center text-xs mt-2 pt-2 border-t border-slate-800 text-slate-500">
                            <span>Status: <b className="text-red-400">{sess.status}</b></span>
                            <span>{sess.timestamp}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => setActiveTab('scam')}
                    className="w-full mt-4 bg-slate-800 hover:bg-slate-700 py-2.5 rounded-lg text-sm text-slate-300 font-semibold transition-all flex items-center justify-center gap-2"
                  >
                    View All Active Sessions
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: SCAM MONITOR */}
          {activeTab === 'scam' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* SESSIONS LIST */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-lg p-6 space-y-4">
                <h4 className="font-bold text-lg text-white mb-4">Live Analysis Streams</h4>
                <div className="space-y-3">
                  {sessions.map((s) => (
                    <div 
                      key={s.id} 
                      onClick={() => setActiveSessionId(s.id)}
                      className={`p-4 rounded-lg cursor-pointer border transition-all ${s.id === activeSessionId ? 'bg-teal-500/10 border-teal-400' : 'bg-slate-800 border-slate-750 hover:bg-slate-750'}`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-white text-sm">{s.caller}</span>
                        <span className={`text-xs px-2 py-0.5 rounded font-bold ${s.risk > 0.8 ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>
                          {(s.risk * 100).toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-2 line-clamp-1">"{s.transcript}"</p>
                      <div className="flex justify-between items-center text-[10px] text-slate-500 mt-2">
                        <span>{s.impersonating}</span>
                        <span>{s.timestamp}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* DETAILS PANEL */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-lg p-6 lg:col-span-2 space-y-6">
                <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="font-bold text-xl text-white">{activeSessionDetails.caller}</h3>
                    <p className="text-xs text-slate-400 mt-1">Session ID: {activeSessionDetails.id} | Timestamp: {activeSessionDetails.timestamp}</p>
                  </div>
                  <div className="text-right">
                    <span className="bg-red-500/10 text-red-400 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                      {(activeSessionDetails.risk * 100).toFixed(0)}% Composite Risk
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-slate-800 p-4 rounded-lg">
                    <p className="text-slate-500 text-xs font-semibold uppercase">Target official</p>
                    <p className="font-bold text-white mt-1">{activeSessionDetails.impersonating}</p>
                  </div>
                  <div className="bg-slate-800 p-4 rounded-lg">
                    <p className="text-slate-500 text-xs font-semibold uppercase">Action Directive</p>
                    <p className="font-bold text-red-400 mt-1">{activeSessionDetails.status}</p>
                  </div>
                  <div className="bg-slate-800 p-4 rounded-lg">
                    <p className="text-slate-500 text-xs font-semibold uppercase">Mitigation Agent</p>
                    <p className="font-bold text-teal-400 mt-1">Orchestrator V7</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h5 className="font-semibold text-white text-sm">Speech Transcript Stream (Updated live every 5s)</h5>
                  <div className="bg-slate-955 p-4 rounded-lg border border-slate-800 h-44 overflow-y-auto text-sm leading-relaxed text-slate-300 font-mono">
                    "{activeSessionDetails.transcript}"
                  </div>
                </div>

                {activeSessionDetails.risk > 0.75 && (
                  <div className="border border-red-500/30 bg-red-500/5 p-4 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="text-red-400 font-semibold text-sm">Intrusion Mitigation Initiated</p>
                      <p className="text-slate-400 text-xs mt-1">UPI Apps locked, hold webhook issued to HDFC & ICICI bank networks.</p>
                    </div>
                    <button 
                      onClick={() => setActiveTab('evidence')}
                      className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded text-xs transition-all"
                    >
                      Inspect Evidence Package
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: FRAUD GRAPH NETWORK EXPLORER */}
          {activeTab === 'graph' && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-bold text-lg text-white">NPCI/Mule Transaction Multi-Hop Network Tracing</h4>
                  <span className="text-xs text-slate-500">Seed Node: BA-SBI-1002 (complainant account)</span>
                </div>
                
                {/* SVG Visual Node mapping projection */}
                <div className="h-96 bg-slate-950 border border-slate-700 rounded-lg relative overflow-hidden flex items-center justify-center">
                  <svg className="w-full h-full" viewBox="0 0 800 400">
                    {/* Render connection lines */}
                    <line x1="150" y1="200" x2="320" y2="120" stroke="#BF616A" strokeWidth="2" strokeDasharray="5" />
                    <line x1="320" y1="120" x2="480" y2="120" stroke="#BF616A" strokeWidth="2" strokeDasharray="5" />
                    <line x1="480" y1="120" x2="650" y2="200" stroke="#BF616A" strokeWidth="2" />
                    <line x1="320" y1="120" x2="320" y2="280" stroke="#4C566A" strokeWidth="1" />

                    {/* Node 1: Victim */}
                    <circle cx="150" cy="200" r="28" fill="#4C566A" />
                    <text x="150" y="205" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">VICTIM (SBI)</text>
                    <text x="150" y="240" textAnchor="middle" fill="#8892b0" fontSize="9">BA-SBI-1002</text>

                    {/* Node 2: 1st Hop Mule */}
                    <circle cx="320" cy="120" r="28" fill="#BF616A" />
                    <text x="320" y="125" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">MULE 1 (HDFC)</text>
                    <text x="320" y="80" textAnchor="middle" fill="#8892b0" fontSize="9">BA-HDFC-9921</text>

                    {/* Node 3: 2nd Hop Mule */}
                    <circle cx="480" cy="120" r="28" fill="#BF616A" />
                    <text x="480" y="125" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">MULE 2 (ICICI)</text>
                    <text x="480" y="80" textAnchor="middle" fill="#8892b0" fontSize="9">BA-ICICI-8812</text>

                    {/* Node 4: Cash Out operator */}
                    <circle cx="650" cy="200" r="28" fill="#BF616A" />
                    <text x="650" y="205" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">ATM CASH OUT</text>
                    <text x="650" y="240" textAnchor="middle" fill="#8892b0" fontSize="9">BA-BOB-7761 (BOB)</text>

                    {/* Node 5: Connected Device info */}
                    <rect x="270" y="280" width="100" height="40" rx="6" fill="#2E3440" stroke="#3B4252" />
                    <text x="320" y="295" textAnchor="middle" fill="#81A1C1" fontSize="8" fontWeight="bold">IMEI-88772299</text>
                    <text x="320" y="310" textAnchor="middle" fill="#D8DEE9" fontSize="8">OnePlus 11 Model</text>

                    {/* Edge labels */}
                    <text x="235" y="150" textAnchor="middle" fill="#BF616A" fontSize="8" fontWeight="bold">₹2,50,000</text>
                    <text x="400" y="110" textAnchor="middle" fill="#BF616A" fontSize="8" fontWeight="bold">₹2,40,000</text>
                    <text x="565" y="150" textAnchor="middle" fill="#BF616A" fontSize="8" fontWeight="bold">₹2,35,000</text>
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: COUNTERFEIT CAMERA SCANNER */}
          {activeTab === 'currency' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* SCAN CONTROLLER */}
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg space-y-6">
                <h4 className="font-bold text-lg text-white">Upload Banknote Image (Pillar 2 MVP)</h4>
                <p className="text-xs text-slate-400">Upload a high-resolution scan of an Indian ₹500 currency noteobverse to verify thread and watermark clarity indices.</p>

                <div className="border-2 border-dashed border-slate-700 hover:border-teal-400 rounded-lg p-10 flex flex-col items-center justify-center cursor-pointer transition-all relative">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleCurrencyUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Upload className="w-12 h-12 text-slate-500 mb-3" />
                  <p className="text-sm font-semibold text-slate-300">Click to upload files</p>
                  <p className="text-xs text-slate-500 mt-1">PNG, JPG up to 10MB</p>
                </div>

                {currencyFile && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-400">Uploaded file preview:</p>
                    <div className="h-44 w-full rounded-lg overflow-hidden border border-slate-750 bg-slate-950 flex items-center justify-center">
                      <img src={currencyFile} alt="note preview" className="h-full object-contain" />
                    </div>
                  </div>
                )}
              </div>

              {/* RESPONSE METRICS PANEL */}
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg">
                <h4 className="font-bold text-lg text-white mb-4">Vision Telemetry & Results</h4>
                
                {scanning && (
                  <div className="flex flex-col items-center justify-center h-64 space-y-4">
                    <RefreshCw className="w-8 h-8 text-teal-400 animate-spin" />
                    <p className="text-sm text-slate-400">Running Canny edge filters and Hue variance classifiers...</p>
                  </div>
                )}

                {!scanning && !currencyResult && (
                  <div className="flex flex-col items-center justify-center h-64 text-slate-500 text-xs">
                    <DollarSign className="w-12 h-12 mb-2 text-slate-700" />
                    Upload an image to start verification telemetry.
                  </div>
                )}

                {currencyResult && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                      <div>
                        <span className="bg-red-500/10 text-red-400 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                          Counterfeit Detected
                        </span>
                      </div>
                      <span className="text-xs text-slate-400">Confidence: {(currencyResult.confidence * 100).toFixed(0)}%</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-slate-800 p-3 rounded">
                        <p className="text-slate-500 text-xs">Detected Denomination</p>
                        <p className="font-bold text-white mt-1">₹{currencyResult.denomination}</p>
                      </div>
                      <div className="bg-slate-800 p-3 rounded">
                        <p className="text-slate-500 text-xs">Serial Number</p>
                        <p className="font-bold text-white mt-1">{currencyResult.serialNumber}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Failed Security Indicators</p>
                      {currencyResult.failedMarkers.map((marker: any, idx: number) => (
                        <div key={idx} className="border-l-4 border-red-500 bg-slate-850 p-3 rounded-r">
                          <p className="text-sm font-bold text-white capitalize">{marker.marker.replace(/_/g, ' ')}</p>
                          <p className="text-xs text-slate-400 mt-1">{marker.details}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: CITIZEN COMPLAINT INBOX */}
          {activeTab === 'reports' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-lg p-6 space-y-4">
              <h4 className="font-bold text-lg text-white mb-4">Citizen Incident Inbox</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold">
                      <th className="py-3 px-4">Reporter ID</th>
                      <th className="py-3 px-4">Name</th>
                      <th className="py-3 px-4">Details</th>
                      <th className="py-3 px-4">Location</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-slate-800">
                    {INITIAL_REPORTS.map((rep) => (
                      <tr key={rep.id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-mono font-bold text-teal-400">{rep.id}</td>
                        <td className="py-3 px-4 font-semibold">{rep.reporter} <br/><span className="text-xs text-slate-500 font-normal">{rep.phone}</span></td>
                        <td className="py-3 px-4 max-w-sm truncate">{rep.detail}</td>
                        <td className="py-3 px-4">{rep.location}</td>
                        <td className="py-3 px-4 text-xs text-slate-500">{rep.date}</td>
                        <td className="py-3 px-4">
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${rep.status === 'RESOLVED' ? 'bg-emerald-500/10 text-emerald-400' : rep.status === 'INVESTIGATING' ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-700/50 text-slate-400'}`}>
                            {rep.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: EVIDENCE VIEWER */}
          {activeTab === 'evidence' && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                  <div>
                    <h4 className="font-bold text-lg text-white">Digital Evidence Package Viewer (Section 65B compliant)</h4>
                    <p className="text-xs text-slate-400">Signed cryptographically using SentinelX Threat Fusion Unit HSM Private Key.</p>
                  </div>
                  <span className="bg-emerald-500/10 text-emerald-400 text-xs px-3 py-1 rounded-full font-bold">
                    Signature Valid
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs bg-slate-850 p-4 rounded-lg">
                  <div>
                    <p className="text-slate-500">SHA-256 HASH VERIFICATION</p>
                    <p className="font-mono text-white font-bold mt-1">4a9b2c3d8e9f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b</p>
                  </div>
                  <div>
                    <p className="text-slate-500">DIGITAL SIGNATURE HEX</p>
                    <p className="font-mono text-white font-bold mt-1">a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2</p>
                  </div>
                </div>

                {/* Simulated PDF Layout */}
                <div className="border border-slate-800 bg-white text-slate-800 p-8 rounded-lg min-h-[400px] space-y-6">
                  <div className="flex justify-between items-center border-b-2 border-slate-300 pb-4">
                    <div>
                      <h1 className="text-lg font-bold">SENTINELX PUBLIC SAFETY FORENSIC LEDGER</h1>
                      <p className="text-[10px] text-slate-500 uppercase font-semibold">Digital Evidence Package (DEP) — Case Ref: SX-2026-0041</p>
                    </div>
                    <span className="border-2 border-emerald-500 text-emerald-500 text-[10px] font-bold px-2 py-1 uppercase rounded">
                      Legally Signed
                    </span>
                  </div>

                  <table className="w-full text-xs text-left border-collapse border border-slate-300">
                    <tbody>
                      <tr className="bg-slate-50 border-b border-slate-300">
                        <td className="p-2.5 font-bold w-1/3">Incident Classification</td>
                        <td className="p-2.5">DIGITAL_ARREST (CBI Impersonation)</td>
                      </tr>
                      <tr className="border-b border-slate-300">
                        <td className="p-2.5 font-bold">Primary Complainant</td>
                        <td className="p-2.5">Rajesh Sharma (+919811223344)</td>
                      </tr>
                      <tr className="bg-slate-50 border-b border-slate-300">
                        <td className="p-2.5 font-bold">Analysis Metrics</td>
                        <td className="p-2.5">Scam Score: 0.94 | Synthetic Voice Match: 0.88</td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="space-y-2">
                    <p className="text-xs font-bold border-b border-slate-200 pb-1">I. Coercive Script Transcripts</p>
                    <p className="text-[11px] font-mono leading-relaxed text-slate-700 bg-slate-50 p-3 rounded">
                      "You are under digital arrest. Do not disconnect the camera. We found narcotics in your package shipped to Cambodia. You must verify your funds by sending them to our safety locker account."
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-bold border-b border-slate-200 pb-1">II. Trace Flow Hop Coordinates</p>
                    <table className="w-full text-[10px] text-left border-collapse border border-slate-300">
                      <thead>
                        <tr className="bg-slate-800 text-white font-bold">
                          <th className="p-2">Tx ID</th>
                          <th className="p-2">From Account</th>
                          <th className="p-2">To Account</th>
                          <th className="p-2">Amount</th>
                          <th className="p-2">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-slate-300">
                          <td className="p-2">TXN-001</td>
                          <td className="p-2">BA-SBI-1002</td>
                          <td className="p-2 font-semibold">BA-HDFC-9921 (Flagged Mule)</td>
                          <td className="p-2 font-bold text-red-600">INR 2,50,000.00</td>
                          <td className="p-2">2026-06-22 17:35:00</td>
                        </tr>
                        <tr className="bg-slate-50">
                          <td className="p-2">TXN-002</td>
                          <td className="p-2">BA-HDFC-9921</td>
                          <td className="p-2 font-semibold">BA-ICICI-8812 (Flagged Mule)</td>
                          <td className="p-2 font-bold text-red-600">INR 2,40,000.00</td>
                          <td className="p-2">2026-06-22 17:38:00</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: AGENT MONITOR */}
          {activeTab === 'agents' && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-bold text-lg text-white">SentinelMesh Actor Network Heartbeats</h4>
                  <span className="bg-teal-500/10 text-teal-400 text-xs px-2.5 py-1 rounded-full font-medium">7 Active Actors</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {AGENT_LIST.map((agent, index) => (
                    <div key={index} className="bg-slate-800 border border-slate-750 p-5 rounded-lg space-y-4 relative overflow-hidden">
                      <div className="flex justify-between items-start">
                        <div>
                          <h5 className="font-bold text-white text-sm">{agent.name}</h5>
                          <p className="text-[10px] text-slate-400 mt-1">{agent.objective}</p>
                        </div>
                        <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-0.5 rounded font-bold uppercase">
                          {agent.status}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-xs pt-3 border-t border-slate-700">
                        <div>
                          <p className="text-slate-500">Core Weight Load</p>
                          <p className="font-bold text-white mt-1">{agent.load}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Target Model</p>
                          <p className="font-bold text-teal-400 mt-1">{agent.model}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>

      </main>

    </div>
  );
}
