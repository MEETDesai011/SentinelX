import React, { useState, useEffect } from 'react';
import { 
  Shield, AlertTriangle, Users, MapPin, Search, Activity, FileText, 
  Map, DollarSign, Upload, Bell, ChevronRight, Cpu, RefreshCw, Play
} from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';

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

const PLANNED_AGENT_LIST = [
  { name: "CarrierInterceptorAgent", objective: "Detect CLI spoofing & Intercept VoIP routing", status: "PLANNED", load: "0%", model: "Core Network IMS Interceptor" },
  { name: "IccIDSyncAgent", objective: "Verify SIM registration against central DB", status: "PLANNED", load: "0%", model: "Sanchar Saathi Sync" },
  { name: "DeviceTelemetryAgent", objective: "Identify device IMEI modifications", status: "PLANNED", load: "0%", model: "CEIR Database Sync" },
  { name: "DeepfakeAcousticAgent", objective: "Analyze voice packets for synthetic features", status: "PLANNED", load: "0%", model: "Acoustic ViT Deepfake Classifier" },
  { name: "BhashiniBridgeAgent", objective: "Dynamic translation layer for regional dialects", status: "PLANNED", load: "0%", model: "Bhashini Translation API" },
  { name: "PostalRouteAgent", objective: "Track counterfeit note source parcels", status: "PLANNED", load: "0%", model: "India Post API Sync" },
  { name: "RegulatorySyncAgent", objective: "Report frozen accounts directly to MHA cyber bureau", status: "PLANNED", load: "0%", model: "MHA Bureau Sync" },
  { name: "MHAAlertAgent", objective: "Broadcast scam warnings to nearby mobile towers", status: "PLANNED", load: "0%", model: "Cell Broadcast Bridge" },
  { name: "BankApiWebhookAgent", objective: "Sync freezes to non-partner bank accounts", status: "PLANNED", load: "0%", model: "NPCI API Gateway v3" },
  { name: "AutomatedTriageAgent", objective: "Categorize incoming citizen reports automatically", status: "PLANNED", load: "0%", model: "LLaMA-3-8B Fine-tuned" }
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
  const [activeTab, setActiveTab] = useState<'home' | 'triage' | 'scam' | 'graph' | 'currency' | 'reports' | 'evidence' | 'agents'>('home');
  const [sessions, setSessions] = useState(INITIAL_SESSIONS);
  const [activeSessionId, setActiveSessionId] = useState<string>("SESS-8921");
  const [currencyFile, setCurrencyFile] = useState<string | null>(null);
  const [currencyResult, setCurrencyResult] = useState<any | null>(null);
  const [scanning, setScanning] = useState(false);

  // Live Incident Simulator States
  const [simStep, setSimStep] = useState<number>(0);
  const [simActive, setSimActive] = useState<boolean>(false);
  const [simTranscript, setSimTranscript] = useState<string>("");

  // Incident simulator timer loop
  useEffect(() => {
    let interval: any;
    if (simActive) {
      interval = setInterval(() => {
        setSimStep(prev => {
          if (prev >= 6) {
            setSimActive(false);
            clearInterval(interval);
            return 6;
          }
          const nextStep = prev + 1;
          if (nextStep === 1) {
            setSimTranscript("Transcript (Connecting...): Incoming secure VoIP citizen tunnel established. Audio feed sync active...");
          } else if (nextStep === 2) {
            setSimTranscript("Transcript: 'This is Inspector Raghavan from CBI Headquarters. A parcel containing illicit narcotics was registered under your Aadhaar ID. Transfer all bank funds to our verification vault immediately or face arrest.'");
          }
          return nextStep;
        });
      }, 4500);
    }
    return () => clearInterval(interval);
  }, [simActive]);
  
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
              onClick={() => setActiveTab('triage')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === 'triage' ? 'bg-red-500/10 text-red-400 border-l-4 border-red-500' : 'text-red-400/80 hover:bg-slate-800 hover:text-red-400'}`}
            >
              <Play className="w-5 h-5 animate-pulse" />
              Incident Simulator
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
                  
                  {/* React-Leaflet India Heatmap (Pillar 4 MVP) */}
                  <div className="h-96 w-full rounded-lg border border-slate-700 bg-slate-950 relative overflow-hidden">
                    <div style={{ height: '100%', width: '100%', filter: 'invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%)' }}>
                      <MapContainer center={[20.5937, 78.9629]} zoom={5} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                        <TileLayer
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        />
                        {HOTSPOT_PINS.map((pin, i) => (
                          <CircleMarker
                            key={i}
                            center={[pin.lat, pin.lng]}
                            radius={8}
                            fillColor={pin.score > 0.90 ? "#ef4444" : "#f59e0b"}
                            color="#0f172a"
                            weight={2}
                            fillOpacity={0.85}
                          >
                            <Popup>
                              <div className="text-slate-900 p-1 font-sans">
                                <p className="font-bold text-xs">{pin.city} - {pin.type}</p>
                                <p className="text-[10px] text-slate-600 mt-0.5">{pin.desc}</p>
                                <p className="text-teal-600 font-bold text-[10px] mt-0.5">Threat Index: {(pin.score * 100).toFixed(0)}%</p>
                              </div>
                            </Popup>
                          </CircleMarker>
                        ))}
                      </MapContainer>
                    </div>
                    {/* Map Legend Overlay */}
                    <div className="absolute bottom-4 left-4 bg-slate-900/95 border border-slate-800 p-3 rounded-lg text-xs space-y-1 z-[1000]">
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

          {/* TAB 1.5: LIVE INCIDENT SIMULATOR (WOW FLOW SCREEN) */}
          {activeTab === 'triage' && (
            <div className="space-y-8">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Play className="w-6 h-6 text-red-500 animate-pulse" />
                    SentinelX V7 Coercive Cyber Incident Pipeline Simulator
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Traces a unified multi-pillar response flow in real-time, bridging citizen speech ingestion, deep NLP scoring, inter-bank block webhooks, and geocoded mapping.
                  </p>
                </div>
                
                <button
                  onClick={() => {
                    setSimActive(true);
                    setSimStep(0);
                    setSimTranscript("Initializing secure connection...");
                  }}
                  disabled={simActive}
                  className={`px-5 py-3 rounded-lg font-bold text-sm tracking-wide transition-all shadow-lg flex items-center gap-2 ${simActive ? 'bg-slate-850 text-slate-500 cursor-not-allowed' : 'bg-red-650 hover:bg-red-600 text-white animate-bounce'}`}
                >
                  <RefreshCw className={`w-4 h-4 ${simActive ? 'animate-spin' : ''}`} />
                  {simActive ? 'Simulation Running...' : 'Initiate Active Mitigation Demo'}
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* TIMELINE STEPPER (Left Panel) */}
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg space-y-6">
                  <h4 className="font-bold text-sm text-slate-400 uppercase tracking-wider">Mitigation Pipeline Stages</h4>
                  
                  <div className="relative border-l border-slate-800 ml-3 pl-6 space-y-6">
                    
                    {/* STEP 1 */}
                    <div className="relative">
                      <span className={`absolute -left-9 top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${simStep >= 1 ? 'bg-red-500 text-white' : 'bg-slate-850 text-slate-500'}`}>1</span>
                      <p className={`text-sm font-semibold transition-all ${simStep >= 1 ? 'text-white' : 'text-slate-500'}`}>Citizen Call Ingestion</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Ingesting live voice stream from user mobile node</p>
                    </div>

                    {/* STEP 2 */}
                    <div className="relative">
                      <span className={`absolute -left-9 top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${simStep >= 2 ? 'bg-red-500 text-white' : 'bg-slate-850 text-slate-500'}`}>2</span>
                      <p className={`text-sm font-semibold transition-all ${simStep >= 2 ? 'text-white' : 'text-slate-500'}`}>AI Scam Trigger Verdict</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">NLP trigger checks & voice deepfake scoring</p>
                    </div>

                    {/* STEP 3 */}
                    <div className="relative">
                      <span className={`absolute -left-9 top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${simStep >= 3 ? 'bg-red-500 text-white' : 'bg-slate-850 text-slate-500'}`}>3</span>
                      <p className={`text-sm font-semibold transition-all ${simStep >= 3 ? 'text-white' : 'text-slate-500'}`}>Multi-Hop Trail Traversed</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Neo4j query traces money flow routes</p>
                    </div>

                    {/* STEP 4 */}
                    <div className="relative">
                      <span className={`absolute -left-9 top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${simStep >= 4 ? 'bg-red-500 text-white' : 'bg-slate-850 text-slate-500'}`}>4</span>
                      <p className={`text-sm font-semibold transition-all ${simStep >= 4 ? 'text-white' : 'text-slate-500'}`}>Inter-Bank Isolation</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Hold placed on Hop 1 & Hop 2 accounts</p>
                    </div>

                    {/* STEP 5 */}
                    <div className="relative">
                      <span className={`absolute -left-9 top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${simStep >= 5 ? 'bg-red-500 text-white' : 'bg-slate-850 text-slate-500'}`}>5</span>
                      <p className={`text-sm font-semibold transition-all ${simStep >= 5 ? 'text-white' : 'text-slate-500'}`}>Evidence Packaged & Signed</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">PDF ledger signed using secure HSM keys</p>
                    </div>

                    {/* STEP 6 */}
                    <div className="relative">
                      <span className={`absolute -left-9 top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${simStep >= 6 ? 'bg-red-500 text-white' : 'bg-slate-850 text-slate-500'}`}>6</span>
                      <p className={`text-sm font-semibold transition-all ${simStep >= 6 ? 'text-white' : 'text-slate-500'}`}>Geospatial Hotspot Mapped</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Flashed caller IMEI/BTS coordinates on map</p>
                    </div>

                  </div>
                </div>

                {/* TELEMETRY VISUALIZATION (Right Panel) */}
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg lg:col-span-2 flex flex-col justify-between min-h-[480px]">
                  
                  {/* DEFAULT / STEP 0 */}
                  {simStep === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-4 my-auto">
                      <Activity className="w-16 h-16 text-slate-750 animate-pulse" />
                      <p className="text-slate-300 font-semibold text-lg">System Armed - Awaiting Simulation</p>
                      <p className="text-xs text-slate-500 max-w-sm">Click "Initiate Active Mitigation Demo" above to witness the coordinated actor response in one unified loop.</p>
                    </div>
                  )}

                  {/* STEP 1: VOICE CALL INGESTION */}
                  {simStep === 1 && (
                    <div className="space-y-6 my-auto">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                        <span className="bg-blue-500/10 text-blue-400 text-xs px-2.5 py-1 rounded font-bold">1. VoIP Stream Ingestion</span>
                        <span className="text-slate-500 text-xs font-mono">Caller ID: +91 98765 00112</span>
                      </div>
                      
                      <div className="bg-slate-950 border border-slate-850 p-5 rounded-lg flex items-center gap-4">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                        <p className="text-xs font-mono text-emerald-450">CONNECTING SECURE VOICE TRANSCRIPT CHANNEL...</p>
                      </div>

                      <div className="bg-slate-950 border border-slate-850 p-4 rounded text-sm text-slate-300 italic font-mono h-32 overflow-y-auto">
                        "{simTranscript}"
                      </div>
                    </div>
                  )}

                  {/* STEP 2: AI SCAM VERDICT */}
                  {simStep === 2 && (
                    <div className="space-y-6 my-auto">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                        <span className="bg-red-500/10 text-red-400 text-xs px-2.5 py-1 rounded font-bold">2. NLP & Deepfake Consensus</span>
                        <span className="text-slate-500 text-xs font-mono">Verdict: CRITICAL (96% Risk)</span>
                      </div>

                      <div className="bg-slate-950 border border-slate-850 p-4 rounded-lg text-xs leading-relaxed space-y-2">
                        <p className="font-bold text-white uppercase tracking-wider text-[10px] text-slate-400">Linguistic Script Triggers Checked:</p>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <span className="bg-red-500/20 border border-red-500/40 text-red-400 px-2 py-0.5 rounded text-[10px] font-bold">CBI (Match: 0.95)</span>
                          <span className="bg-red-500/20 border border-red-500/40 text-red-400 px-2 py-0.5 rounded text-[10px] font-bold">arrest (Match: 0.92)</span>
                          <span className="bg-red-500/20 border border-red-500/40 text-red-400 px-2 py-0.5 rounded text-[10px] font-bold">narcotics (Match: 0.88)</span>
                          <span className="bg-red-500/20 border border-red-500/40 text-red-400 px-2 py-0.5 rounded text-[10px] font-bold">verification vault (Match: 0.96)</span>
                        </div>
                      </div>

                      <div className="bg-slate-950 border border-slate-850 p-4 rounded text-xs text-slate-300 font-mono h-32 overflow-y-auto leading-relaxed">
                        "Transcript: 'This is Inspector Raghavan from <b className="text-red-400 underline">CBI</b> Headquarters. A parcel containing illicit <b className="text-red-400 underline">narcotics</b> was registered under your Aadhaar ID. Transfer all bank funds to our <b className="text-red-400 underline">verification vault</b> immediately or face <b className="text-red-400 underline">arrest</b>.'"
                      </div>
                    </div>
                  )}

                  {/* STEP 3: FRAUD GRAPH TRAVERSAL */}
                  {simStep === 3 && (
                    <div className="space-y-6 my-auto">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                        <span className="bg-teal-500/10 text-teal-400 text-xs px-2.5 py-1 rounded font-bold">3. Neo4j Multi-Hop Flow Tracing</span>
                        <span className="text-slate-500 text-xs font-mono">Consolidation Pattern: MATCHED</span>
                      </div>

                      <div className="h-56 bg-slate-950 border border-slate-850 rounded-lg relative overflow-hidden flex items-center justify-center">
                        <svg className="w-full h-full" viewBox="0 0 600 200">
                          <line x1="80" y1="100" x2="200" y2="60" stroke="#ef4444" strokeWidth="2" strokeDasharray="4" />
                          <line x1="200" y1="60" x2="340" y2="60" stroke="#ef4444" strokeWidth="2" strokeDasharray="4" />
                          <line x1="340" y1="60" x2="480" y2="100" stroke="#ef4444" strokeWidth="2" />
                          
                          <circle cx="80" cy="100" r="22" fill="#4b5563" />
                          <text x="80" y="103" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">Complainant (SBI)</text>
                          
                          <circle cx="200" cy="60" r="22" fill="#ef4444" />
                          <text x="200" y="63" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">Mule 1 (HDFC)</text>
                          <text x="200" y="96" textAnchor="middle" fill="#8892b0" fontSize="7">BA-HDFC-9921</text>
                          
                          <circle cx="340" cy="60" r="22" fill="#ef4444" />
                          <text x="340" y="63" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">Mule 2 (ICICI)</text>
                          <text x="340" y="96" textAnchor="middle" fill="#8892b0" fontSize="7">BA-ICICI-8812</text>
                          
                          <circle cx="480" cy="100" r="22" fill="#ef4444" />
                          <text x="480" y="103" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">Cash Out (BOB)</text>
                          
                          <text x="140" y="70" textAnchor="middle" fill="#ef4444" fontSize="7" fontWeight="bold">₹2,50,000</text>
                          <text x="270" y="50" textAnchor="middle" fill="#ef4444" fontSize="7" fontWeight="bold">₹2,40,000</text>
                          <text x="410" y="75" textAnchor="middle" fill="#ef4444" fontSize="7" fontWeight="bold">₹2,35,000</text>
                        </svg>
                      </div>
                    </div>
                  )}

                  {/* STEP 4: INTER-BANK ACTION (LOCKDOWN) */}
                  {simStep === 4 && (
                    <div className="space-y-6 my-auto">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                        <span className="bg-amber-500/10 text-amber-400 text-xs px-2.5 py-1 rounded font-bold">4. NPCI Inter-Bank Webhooks</span>
                        <span className="text-slate-500 text-xs font-mono">Freezing Action: ACTIVE</span>
                      </div>

                      <div className="space-y-3 font-mono text-[10px]">
                        <div className="border border-teal-500/35 bg-teal-500/5 p-3 rounded flex justify-between items-center">
                          <div>
                            <p className="text-teal-400 font-bold">POST http://api.hdfc.com/v1/accounts/BA-HDFC-9921/freeze</p>
                            <p className="text-slate-500 text-[9px] mt-1">Payload: {"{hold_amount: 240000.0, incident_ref: 'SX-SIM-001'}"}</p>
                          </div>
                          <span className="bg-teal-500/20 text-teal-400 border border-teal-500/40 px-2 py-0.5 rounded font-bold">200 OK</span>
                        </div>

                        <div className="border border-teal-500/35 bg-teal-500/5 p-3 rounded flex justify-between items-center">
                          <div>
                            <p className="text-teal-400 font-bold">POST http://api.icici.com/v1/accounts/BA-ICICI-8812/freeze</p>
                            <p className="text-slate-500 text-[9px] mt-1">Payload: {"{hold_amount: 235000.0, incident_ref: 'SX-SIM-001'}"}</p>
                          </div>
                          <span className="bg-teal-500/20 text-teal-400 border border-teal-500/40 px-2 py-0.5 rounded font-bold">200 OK</span>
                        </div>

                        <div className="bg-red-950/20 border border-red-500/30 p-3 rounded flex justify-between items-center">
                          <span className="text-red-400 font-bold uppercase tracking-wider text-[9px]">Total Blocked Capital</span>
                          <span className="text-red-400 font-extrabold text-sm">₹2,40,000 (Hop 1 Freezing Secured)</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 5: EVIDENCE LEDGER PDF */}
                  {simStep === 5 && (
                    <div className="space-y-6 my-auto">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                        <span className="bg-violet-500/10 text-violet-400 text-xs px-2.5 py-1 rounded font-bold">5. Evidence Package Generation</span>
                        <span className="text-slate-500 text-xs font-mono">Sec 65B Compliant</span>
                      </div>

                      <div className="border border-slate-300 bg-white text-slate-850 p-4 rounded space-y-4 max-h-56 overflow-y-auto text-[10px]">
                        <div className="flex justify-between items-center border-b border-slate-350 pb-2">
                          <h5 className="font-extrabold text-slate-900">SENTINELX DIGITAL FORENSIC REPORT</h5>
                          <span className="text-emerald-600 font-bold border border-emerald-500 px-1 py-0.5 text-[8px] uppercase rounded">Legally Signed</span>
                        </div>
                        <table className="w-full text-left border-collapse border border-slate-300">
                          <tbody>
                            <tr className="bg-slate-50 border-b border-slate-300">
                              <td className="p-1 font-bold">Case Reference</td>
                              <td className="p-1">SX-CASE-SIM-2026-9811</td>
                            </tr>
                            <tr className="border-b border-slate-300">
                              <td className="p-1 font-bold">AI Verdict</td>
                              <td className="p-1 text-red-650 font-bold">CRITICAL DIGITAL ARREST PATTERN MATCHED</td>
                            </tr>
                            <tr className="bg-slate-50 border-b border-slate-300">
                              <td className="p-1 font-bold">SHA-256 Checksum</td>
                              <td className="p-1 font-mono text-[9px]">4a9b2c3d8e9f1a2b3c4d5e6f7a8b9c0d1e2f3a4b...</td>
                            </tr>
                          </tbody>
                        </table>
                        <p className="leading-relaxed text-slate-500 italic">
                          "This document details critical audio metadata, transcript script indexes, and NPCI interbank transfer links, sealed cryptographically to ensure chain of custody under Section 65B of the Indian Evidence Act."
                        </p>
                      </div>
                    </div>
                  )}

                  {/* STEP 6: GEOSPATIAL MAP INCIDENT PINS */}
                  {simStep === 6 && (
                    <div className="space-y-6 my-auto">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                        <span className="bg-red-500/10 text-red-400 text-xs px-2.5 py-1 rounded font-bold">6. Geospatial Threat Mapping</span>
                        <span className="text-slate-500 text-xs font-mono">Location: Noida, Sec 62</span>
                      </div>

                      {/* React Leaflet mini-map centering on Noida/Delhi coordinates */}
                      <div className="h-56 w-full rounded-lg border border-slate-800 bg-slate-950 relative overflow-hidden">
                        <div style={{ height: '100%', width: '100%', filter: 'invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%)' }}>
                          <MapContainer center={[28.6139, 77.2090]} zoom={8} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                            <TileLayer
                              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <CircleMarker
                              center={[28.5355, 77.3910]} // Noida call center
                              radius={14}
                              fillColor="#ef4444"
                              color="#0f172a"
                              weight={2}
                              fillOpacity={0.7}
                            >
                              <Popup>
                                <div className="text-slate-900 font-sans p-1 text-xs">
                                  <p className="font-bold text-red-650">Simulated Scam Call Cell</p>
                                  <p className="text-[10px] mt-0.5">Noida Sec 62 Centroid Node</p>
                                </div>
                              </Popup>
                            </CircleMarker>
                          </MapContainer>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP PROGRESS METER */}
                  {simStep > 0 && (
                    <div className="pt-4 border-t border-slate-800">
                      <div className="flex justify-between text-xs text-slate-500 mb-1">
                        <span>Simulation Progress</span>
                        <span>{Math.round((simStep / 6) * 100)}%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-red-500 h-full transition-all duration-500" 
                          style={{ width: `${(simStep / 6) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

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
            <div className="space-y-8">
              {/* Active MVP Agents Section */}
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <h4 className="font-bold text-lg text-white">SentinelMesh Actor Network Heartbeats (MVP Layer)</h4>
                    <p className="text-xs text-slate-400 mt-1">Core decentralized agents executing active mitigation scripts on local sandbox containers.</p>
                  </div>
                  <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2.5 py-1 rounded-full font-medium">7 Active Actors</span>
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

              {/* Planned Enterprise Agents Section */}
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <h4 className="font-bold text-lg text-white">Enterprise Production Expansion Network</h4>
                    <p className="text-xs text-slate-400 mt-1">Stubs and API interfaces prepared for full national deployment integrations.</p>
                  </div>
                  <span className="bg-blue-500/10 text-blue-400 text-xs px-2.5 py-1 rounded-full font-medium">10 Planned Actors</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {PLANNED_AGENT_LIST.map((agent, index) => (
                    <div key={index} className="bg-slate-800/40 border border-slate-850 p-5 rounded-lg space-y-4 relative overflow-hidden opacity-60">
                      <div className="flex justify-between items-start">
                        <div>
                          <h5 className="font-bold text-slate-300 text-sm">{agent.name}</h5>
                          <p className="text-[10px] text-slate-500 mt-1">{agent.objective}</p>
                        </div>
                        <span className="bg-slate-800 text-slate-500 text-[10px] px-2 py-0.5 rounded font-bold uppercase border border-slate-700">
                          {agent.status}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-xs pt-3 border-t border-slate-800">
                        <div>
                          <p className="text-slate-600">Core Weight Load</p>
                          <p className="font-bold text-slate-500 mt-1">{agent.load}</p>
                        </div>
                        <div>
                          <p className="text-slate-600">Target Spec</p>
                          <p className="font-bold text-slate-500 mt-1 truncate">{agent.model}</p>
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
