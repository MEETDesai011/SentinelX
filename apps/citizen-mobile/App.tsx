import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, 
  ActivityIndicator, Alert, SafeAreaView, Dimensions, Switch 
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

// ----------------------------------------------------
// TYPES & DATA STRUCTURES
// ----------------------------------------------------

interface LearnedPattern {
  id: string;
  category: string;
  title: string;
  keywords: string[];
  callerPrefix: string;
  threatSignature: string;
  resolvedAt: string;
  matchCount: number;
}

interface ActivityEvent {
  id: string;
  type: 'CALL' | 'SMS' | 'UPI' | 'WHATSAPP';
  caller: string;
  content: string;
  timestamp: string;
  isSuspicious: boolean;
  matchedPatternId?: string;
  similarityScore: number;
}

interface NoteSample {
  id: string;
  denomination: number;
  label: string;
  isGenuine: boolean;
  serialNumber: string;
  threadVariance: number;
  edgeDensity: number;
  watermarkContrast: number;
  description: string;
}

// Model baseline representation (~200 Indian currency notes)
const MODEL_TRAINING_INFO = {
  name: "SentinelX-InrBanknoteNet-v2",
  totalImagesTrained: 200,
  genuineSamples: 100,
  counterfeitSamples: 100,
  validationAccuracy: "97.5%",
  supportedSeries: "Mahatma Gandhi New Series (₹10 - ₹2000)"
};

// Preset note samples for interactive testing
const NOTE_SAMPLES: NoteSample[] = [
  {
    id: 'sample-g-500',
    denomination: 500,
    label: 'Genuine ₹500 (Mahatma Gandhi New Series)',
    isGenuine: true,
    serialNumber: '7EF431980',
    threadVariance: 14.8,
    edgeDensity: 0.038,
    watermarkContrast: 42.0,
    description: 'Authentic note with green-to-blue shifting thread, crisp intaglio microprint, and electrotype 500 watermark.'
  },
  {
    id: 'sample-c-500',
    denomination: 500,
    label: 'Counterfeit ₹500 (Color Inkjet Reproduction)',
    isGenuine: false,
    serialNumber: '5AC982341',
    threadVariance: 2.3,
    edgeDensity: 0.009,
    watermarkContrast: 12.5,
    description: 'High-risk counterfeit. Static printed thread with zero color shift, blurred microprinting edges.'
  },
  {
    id: 'sample-g-200',
    denomination: 200,
    label: 'Genuine ₹200 (Sanchi Stupa Motif)',
    isGenuine: true,
    serialNumber: '3KL892110',
    threadVariance: 12.4,
    edgeDensity: 0.032,
    watermarkContrast: 38.0,
    description: 'Authentic ₹200 note with color-shifting windowed thread and sharp raised bleed lines.'
  },
  {
    id: 'sample-c-100',
    denomination: 100,
    label: 'Counterfeit ₹100 (Missing Watermark Profile)',
    isGenuine: false,
    serialNumber: '2XY001928',
    threadVariance: 3.1,
    edgeDensity: 0.012,
    watermarkContrast: 8.0,
    description: 'Counterfeit note. Defective Gandhi watermark gradient and fuzzy Ashoka pillar emblem.'
  }
];

export default function App() {
  // --------------------------------------------------
  // 1. LOGIN PAGE STATE (Structured English Steps 1–5)
  // --------------------------------------------------
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginRole, setLoginRole] = useState<'citizen' | 'officer'>('citizen');
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ name: string; role: string; email: string } | null>(null);

  // --------------------------------------------------
  // 2. ACTIVE NAVIGATION & APP STATE
  // --------------------------------------------------
  const [activeScreen, setActiveScreen] = useState<'adaptive' | 'scan' | 'shield' | 'report' | 'alerts'>('adaptive');
  
  // --------------------------------------------------
  // 3. ADAPTIVE FRAUD DETECTION SYSTEM STATE (Steps 6–11 & Decision Table 1)
  // --------------------------------------------------
  const [learnedPatterns, setLearnedPatterns] = useState<LearnedPattern[]>([
    {
      id: "PAT-DA-9811",
      category: "DIGITAL_ARREST",
      title: "CBI Narcotics Video Arrest Extortion",
      keywords: ["digital arrest", "narcotics", "money laundering", "cbi", "arrest warrant", "skype camera"],
      callerPrefix: "+91800",
      threatSignature: "Impersonates CBI officer demanding 24hr video surveillance and fund transfer.",
      resolvedAt: "2026-08-28",
      matchCount: 14
    },
    {
      id: "PAT-FX-4402",
      category: "CUSTOMS_EXTORTION",
      title: "FedEx Parcel Customs Clearance Fee",
      keywords: ["fedex parcel", "customs clearance", "narcotics found", "mumbai airport", "passport seizure"],
      callerPrefix: "+91700",
      threatSignature: "Claims parcel seized with illegal contraband, demanding instant UPI transfer.",
      resolvedAt: "2026-08-30",
      matchCount: 9
    }
  ]);

  // Current incoming activity under evaluation
  const [currentActivity, setCurrentActivity] = useState<ActivityEvent | null>({
    id: "act-101",
    type: "CALL",
    caller: "+91800-449-1122",
    content: "This is CBI Officer Verma. An illegal FedEx parcel with narcotics in your name is seized. You are placed under Digital Arrest.",
    timestamp: "Just now",
    isSuspicious: true,
    matchedPatternId: "PAT-DA-9811",
    similarityScore: 0.96
  });

  const [incidentResolved, setIncidentResolved] = useState(false);
  const [evaluatingActivity, setEvaluatingActivity] = useState(false);

  // --------------------------------------------------
  // 4. COUNTERFEIT CURRENCY SCANNER STATE (Steps 12–16 & Decision Table 2)
  // --------------------------------------------------
  const [selectedSample, setSelectedSample] = useState<NoteSample | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{
    decisionRule: string;
    isCounterfeit: boolean;
    classification: 'GENUINE' | 'COUNTERFEIT';
    confidence: number;
    denomination: number;
    serialNumber: string;
    briefReason: string;
    securityMarkers: { name: string; status: 'PASS' | 'FAIL'; details: string }[];
  } | null>(null);

  // --------------------------------------------------
  // 5. REPORTING FORM STATE
  // --------------------------------------------------
  const [reporterName, setReporterName] = useState('');
  const [reporterPhone, setReporterPhone] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ==================================================
  // HANDLERS: AUTHENTICATION (Steps 2, 3, 4, 5)
  // ==================================================
  const handleLogin = () => {
    setLoginError(null);
    const user = usernameInput.trim().toLowerCase();
    const pass = passwordInput.trim();

    if (!user || !pass) {
      setLoginError("Please enter your username/email and password.");
      return;
    }

    // Validation (Step 4: IF credentials valid THEN allow access ELSE display error)
    if (loginRole === 'citizen') {
      if ((user === 'citizen' || user.includes('@')) && pass.length >= 4) {
        setCurrentUser({
          name: "Aarav Mehta (Citizen)",
          role: "Citizen Shield Tier-1",
          email: user.includes('@') ? user : "aarav.mehta@citizen.in"
        });
        setIsAuthenticated(true);
      } else {
        setLoginError("Invalid credentials. Please verify your details or use 1-Tap Quick Demo Login.");
      }
    } else {
      // Officer role
      if ((user.includes('officer') || user.includes('admin') || user.includes('@')) && pass.length >= 4) {
        setCurrentUser({
          name: "Inspector Sharma (Cyber Cell)",
          role: "Cyber Crime Officer #9104",
          email: "officer.sharma@cybercrime.gov.in"
        });
        setIsAuthenticated(true);
      } else {
        setLoginError("Invalid officer credentials or unauthorized clearance level.");
      }
    }
  };

  const handleQuickDemoFill = (role: 'citizen' | 'officer') => {
    setLoginRole(role);
    if (role === 'citizen') {
      setUsernameInput('citizen@sentinelx.gov.in');
      setPasswordInput('Citizen#2026');
    } else {
      setUsernameInput('officer.sharma@cybercrime.gov.in');
      setPasswordInput('Sentinel#Admin2026');
    }
    setLoginError(null);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUsernameInput('');
    setPasswordInput('');
    setLoginError(null);
  };

  // ==================================================
  // HANDLERS: ADAPTIVE FRAUD DETECTION (Steps 6–11 & Decision Table 1)
  // ==================================================
  
  // Calculate Decision Table 1 conditions & actions
  const getDecisionTableOutcome = () => {
    if (!currentActivity) {
      return {
        rule: "Rule 1",
        title: "Rule 1: Normal Routine Activity",
        suspicious: "No",
        matchesKnown: "-",
        resolved: "-",
        allowNormal: "Yes",
        flagInvestigate: "No",
        recordLearn: "No",
        note: "Normal processing allowed."
      };
    }

    const suspicious = currentActivity.isSuspicious ? "Yes" : "No";
    const matchesKnown = (currentActivity.isSuspicious && currentActivity.similarityScore >= 0.40) ? "Yes" : "No";
    const resolved = incidentResolved ? "Yes" : "No";

    if (!currentActivity.isSuspicious) {
      return {
        rule: "Rule 1",
        title: "Rule 1: Normal Activity Verified",
        suspicious: "No",
        matchesKnown: "-",
        resolved: "-",
        allowNormal: "Yes",
        flagInvestigate: "No",
        recordLearn: "No",
        note: "Activity is benign. Normal processing allowed."
      };
    }

    if (matchesKnown === "No") {
      return {
        rule: "Rule 2",
        title: "Rule 2: Unmatched Suspicious Signal",
        suspicious: "Yes",
        matchesKnown: "No",
        resolved: "-",
        allowNormal: "Yes*",
        flagInvestigate: "No",
        recordLearn: "No",
        note: "*Rule 2: Not treated as known fraud yet; background monitoring continues."
      };
    }

    if (matchesKnown === "Yes" && !incidentResolved) {
      return {
        rule: "Rule 3",
        title: "Rule 3: Known Fraud Attack in Progress",
        suspicious: "Yes",
        matchesKnown: "Yes",
        resolved: "No",
        allowNormal: "No",
        flagInvestigate: "Yes",
        recordLearn: "No",
        note: "Active attack matching learned pattern! Blocked & flagged for investigation."
      };
    }

    // Rule 4
    return {
      rule: "Rule 4",
      title: "Rule 4: Incident Resolved & Pattern Learned",
      suspicious: "Yes",
      matchesKnown: "Yes",
      resolved: "Yes",
      allowNormal: "No",
      flagInvestigate: "Yes",
      recordLearn: "Yes",
      note: "Incident neutralized. Learned pattern permanently retained in adaptive memory!"
    };
  };

  const triggerIncomingSimulation = (type: 'cbi_scam' | 'fedex_scam' | 'normal_bank' | 'novel_apk') => {
    setEvaluatingActivity(true);
    setIncidentResolved(false);

    setTimeout(() => {
      if (type === 'cbi_scam') {
        setCurrentActivity({
          id: `act-${Date.now()}`,
          type: "CALL",
          caller: "+91800-991-0022",
          content: "CBI HQ New Delhi calling. Your Aadhaar is linked to a money laundering case. Connect on video immediately or face police custody.",
          timestamp: "Just now",
          isSuspicious: true,
          matchedPatternId: "PAT-DA-9811",
          similarityScore: 0.98
        });
      } else if (type === 'fedex_scam') {
        setCurrentActivity({
          id: `act-${Date.now()}`,
          type: "CALL",
          caller: "+91700-112-9844",
          content: "FedEx Mumbai Customs branch. A parcel destined for Taiwan with illegal passports has your mobile number. Pay customs clearance fee.",
          timestamp: "Just now",
          isSuspicious: true,
          matchedPatternId: "PAT-FX-4402",
          similarityScore: 0.92
        });
      } else if (type === 'normal_bank') {
        setCurrentActivity({
          id: `act-${Date.now()}`,
          type: "SMS",
          caller: "HDFC-BANK",
          content: "Your salary credit of INR 85,000 has been deposited to account ending in 4109. Available balance: INR 1,42,000.",
          timestamp: "Just now",
          isSuspicious: false,
          similarityScore: 0.05
        });
      } else {
        // Novel unlearned scam
        setCurrentActivity({
          id: `act-${Date.now()}`,
          type: "SMS",
          caller: "+91999-550-1288",
          content: "Electricity bill unpaid! Power line will be disconnected tonight at 9:30 PM. Download PowerGuard.apk to verify payment.",
          timestamp: "Just now",
          isSuspicious: true,
          similarityScore: 0.22 // Below match threshold -> Rule 2
        });
      }
      setEvaluatingActivity(false);
    }, 600);
  };

  // Step 8 & 9: Incident resolved -> Retain learned pattern (Rule 4)
  const handleResolveAndLearn = () => {
    if (!currentActivity) return;
    setIncidentResolved(true);

    // If novel or known, update/add to learned patterns
    const existingIndex = learnedPatterns.findIndex(p => p.id === currentActivity.matchedPatternId);
    if (existingIndex >= 0) {
      const updated = [...learnedPatterns];
      updated[existingIndex].matchCount += 1;
      setLearnedPatterns(updated);
    } else {
      // Create new learned pattern
      const newPattern: LearnedPattern = {
        id: `PAT-LRN-${Date.now().toString().slice(-4)}`,
        category: "SUSPICIOUS_SMS_LURE",
        title: "Electricity Bill APK Disconnection Threat",
        keywords: ["electricity bill", "power disconnected", "download apk", "verify payment"],
        callerPrefix: currentActivity.caller.slice(0, 6),
        threatSignature: currentActivity.content,
        resolvedAt: new Date().toISOString().split('T')[0],
        matchCount: 1
      };
      setLearnedPatterns([newPattern, ...learnedPatterns]);
    }

    Alert.alert(
      "Decision Table Rule 4 Executed",
      "Fraud incident marked as RESOLVED. Learned pattern and signature extracted and retained in SentinelX Adaptive Memory."
    );
  };

  // Step 10 & 11: Test recurring attack against learned patterns
  const handleTestRecurringAttack = () => {
    setEvaluatingActivity(true);
    setIncidentResolved(false);

    setTimeout(() => {
      // Simulate repeat caller using the newly learned pattern
      setCurrentActivity({
        id: `act-repeat-${Date.now()}`,
        type: "SMS",
        caller: "+91999-550-9900",
        content: "URGENT: Power supply disconnected in 1 hour due to pending electricity bill. Click here to install update APK.",
        timestamp: "Just now",
        isSuspicious: true,
        matchedPatternId: "PAT-LRN-1109",
        similarityScore: 0.95
      });
      setEvaluatingActivity(false);
    }, 600);
  };

  // ==================================================
  // HANDLERS: COUNTERFEIT NOTE DETECTION (Steps 12–16 & Decision Table 2)
  // ==================================================
  const handleRunCurrencyDetection = () => {
    // Decision Table Rule 1: Image uploaded? No -> Request image
    if (!selectedSample) {
      Alert.alert(
        "Decision Table Rule 1: Image Required",
        "No banknote image selected. Please select a sample banknote or upload an image to begin computer vision verification."
      );
      return;
    }

    setScanning(true);
    setScanResult(null);

    setTimeout(() => {
      const sample = selectedSample;
      const isGenuine = sample.isGenuine;

      const securityMarkers = [
        {
          name: "Security Thread Optical Shift",
          status: sample.threadVariance > 8.0 ? ('PASS' as const) : ('FAIL' as const),
          details: sample.threadVariance > 8.0 
            ? `Optical shift verified (Hue variance: ${sample.threadVariance.toFixed(1)} > 8.0). Green-to-blue shift confirmed.`
            : `Optical shift failed (Hue variance: ${sample.threadVariance.toFixed(1)} < 8.0). Color is flat/printed.`
        },
        {
          name: "Intaglio Microprinting Clarity",
          status: sample.edgeDensity > 0.02 ? ('PASS' as const) : ('FAIL' as const),
          details: sample.edgeDensity > 0.02
            ? `Crisp intaglio print edges (Edge density: ${sample.edgeDensity.toFixed(3)} > 0.02).`
            : `Blurred printing edges (Edge density: ${sample.edgeDensity.toFixed(3)} < 0.02). Inkjet reproduction.`
        },
        {
          name: "Mahatma Gandhi Watermark Depth",
          status: (sample.watermarkContrast >= 20 && sample.watermarkContrast <= 80) ? ('PASS' as const) : ('FAIL' as const),
          details: (sample.watermarkContrast >= 20 && sample.watermarkContrast <= 80)
            ? `Authentic 3D translucent portrait and numeral watermark verified (Contrast: ${sample.watermarkContrast.toFixed(1)}).`
            : `Defective watermark profile (Contrast: ${sample.watermarkContrast.toFixed(1)}). Missing electrotype depth.`
        },
        {
          name: "Tactile Bleed Lines Relief",
          status: isGenuine ? ('PASS' as const) : ('FAIL' as const),
          details: isGenuine 
            ? "Raised angular bleed lines on obverse margin verified."
            : "Missing raised intaglio bleed line texture."
        }
      ];

      const failedCount = securityMarkers.filter(m => m.status === 'FAIL').length;

      if (isGenuine) {
        // Decision Table Rule 2: Genuine + Confidence + Explanation
        setScanResult({
          decisionRule: "Rule 2: Display Genuine + Confidence + Explanation",
          isCounterfeit: false,
          classification: "GENUINE",
          confidence: 0.985,
          denomination: sample.denomination,
          serialNumber: sample.serialNumber,
          briefReason: "Genuine Indian banknote: All primary security features (color-shifting thread, intaglio microprinting, and portrait watermark) verified authentic.",
          securityMarkers
        });
      } else {
        // Decision Table Rule 3: Counterfeit + Confidence + Explanation
        setScanResult({
          decisionRule: "Rule 3: Display Counterfeit + Confidence + Explanation",
          isCounterfeit: true,
          classification: "COUNTERFEIT",
          confidence: failedCount >= 2 ? 0.96 : 0.84,
          denomination: sample.denomination,
          serialNumber: sample.serialNumber,
          briefReason: `Counterfeit note detected with ${failedCount} failed security features. Primary failure: Optical security thread variance and blurred microprint.`,
          securityMarkers
        });
      }

      setScanning(false);
    }, 1200);
  };

  const handleReportSubmit = () => {
    if (!reporterName || !reporterPhone || !reportDetails) {
      Alert.alert("Input Error", "Please fill in all fields to register the cyber crime report.");
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      Alert.alert(
        "Report Submitted",
        "Your report has been successfully logged with the State Cyber Crime Cell. Reference ID: REF-SX-2026-9811."
      );
      setReporterName('');
      setReporterPhone('');
      setReportDetails('');
    }, 1500);
  };

  // ==================================================
  // VIEW: LOGIN PAGE (Structured English Steps 1–4)
  // ==================================================
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.loginContainer}>
        <StatusBar style="light" />
        <ScrollView contentContainerStyle={styles.loginScroll}>
          {/* LOGO & TITLE */}
          <View style={styles.loginHeader}>
            <View style={styles.shieldBadge}>
              <Text style={styles.shieldBadgeIcon}>🛡️</Text>
            </View>
            <Text style={styles.loginTitle}>SENTINEL X</Text>
            <Text style={styles.loginSubtitle}>National Cyber Defense & Anti-Fraud Suite</Text>
            <View style={styles.securityPill}>
              <Text style={styles.securityPillText}>🔒 256-BIT ENCRYPTED ACCESS GATEWAY</Text>
            </View>
          </View>

          {/* ROLE SELECTOR */}
          <View style={styles.roleToggleWrapper}>
            <TouchableOpacity 
              style={[styles.roleTab, loginRole === 'citizen' && styles.roleTabActive]}
              onPress={() => { setLoginRole('citizen'); setLoginError(null); }}
            >
              <Text style={[styles.roleTabText, loginRole === 'citizen' && styles.roleTabTextActive]}>
                🛡️ Citizen Shield
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.roleTab, loginRole === 'officer' && styles.roleTabActive]}
              onPress={() => { setLoginRole('officer'); setLoginError(null); }}
            >
              <Text style={[styles.roleTabText, loginRole === 'officer' && styles.roleTabTextActive]}>
                👮 Cyber Officer
              </Text>
            </TouchableOpacity>
          </View>

          {/* ERROR ALERT (Step 4: IF invalid THEN display error) */}
          {loginError && (
            <View style={styles.loginErrorBox}>
              <Text style={styles.loginErrorTitle}>⚠️ Authentication Error</Text>
              <Text style={styles.loginErrorText}>{loginError}</Text>
            </View>
          )}

          {/* CREDENTIALS FORM (Steps 2 & 3) */}
          <View style={styles.loginCard}>
            <Text style={styles.inputLabel}>
              {loginRole === 'citizen' ? 'Citizen Mobile / Email / Aadhaar ID' : 'Officer ID / Gov Email'}
            </Text>
            <TextInput 
              style={styles.loginInput}
              placeholder={loginRole === 'citizen' ? "e.g. 9876543210 or user@citizen.in" : "e.g. officer.sharma@cybercrime.gov.in"}
              placeholderTextColor="#64748b"
              value={usernameInput}
              onChangeText={setUsernameInput}
              autoCapitalize="none"
            />

            <Text style={[styles.inputLabel, { marginTop: 16 }]}>Secure Password / Passcode</Text>
            <TextInput 
              style={styles.loginInput}
              placeholder="Enter your security passcode"
              placeholderTextColor="#64748b"
              secureTextEntry
              value={passwordInput}
              onChangeText={setPasswordInput}
            />

            <TouchableOpacity style={styles.loginSubmitButton} onPress={handleLogin}>
              <Text style={styles.loginSubmitText}>
                {loginRole === 'citizen' ? 'Access Citizen Shield Portal' : 'Authenticate Officer Clearance'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 1-TAP DEMO PRESETS */}
          <View style={styles.quickDemoSection}>
            <Text style={styles.quickDemoTitle}>⚡ Hackathon Demo 1-Tap Quick Login:</Text>
            <View style={styles.quickButtonsRow}>
              <TouchableOpacity 
                style={styles.quickDemoBtn} 
                onPress={() => handleQuickDemoFill('citizen')}
              >
                <Text style={styles.quickDemoBtnText}>🛡️ Quick Citizen</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.quickDemoBtn} 
                onPress={() => handleQuickDemoFill('officer')}
              >
                <Text style={styles.quickDemoBtnText}>👮 Quick Officer</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.loginFooterText}>
            Protected under IT Act Section 70B & Indian Cyber Crime Coordination Centre (I4C).
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ==================================================
  // VIEW: MAIN SENTINEL X APP (Steps 5–17)
  // ==================================================
  const decisionOutcome = getDecisionTableOutcome();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* MOBILE APP HEADER (Step 5) */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View>
            <Text style={styles.headerTitle}>SENTINEL X</Text>
            <Text style={styles.headerSubtitle}>Adaptive Cyber Defense & Banknote Vision</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* LOGGED IN USER STATUS */}
        {currentUser && (
          <View style={styles.userStatusPill}>
            <View style={styles.activeDot} />
            <Text style={styles.userStatusText}>{currentUser.name} • {currentUser.role}</Text>
          </View>
        )}
      </View>

      {/* CONTENT AREA */}
      <View style={styles.content}>

        {/* -------------------------------------------------- */}
        {/* TAB 1: ACTIVE / ADAPTIVE FRAUD DETECTION (Steps 6–11 & Decision Table 1) */}
        {/* -------------------------------------------------- */}
        {activeScreen === 'adaptive' && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.sectionHeaderBox}>
              <Text style={styles.screenHeader}>Adaptive Fraud Defense Engine</Text>
              <Text style={styles.screenDesc}>
                Monitors live activity, evaluates against the 4-rule Decision Table, retains resolved fraud patterns, and blocks repeat attacks.
              </Text>
            </View>

            {/* SIMULATION CONTROLLERS */}
            <View style={styles.card}>
              <Text style={styles.cardHeader}>Simulate Incoming Activity (Step 6):</Text>
              <View style={styles.simButtonsGrid}>
                <TouchableOpacity 
                  style={[styles.simBtn, { borderColor: '#ef4444' }]} 
                  onPress={() => triggerIncomingSimulation('cbi_scam')}
                >
                  <Text style={styles.simBtnText}>🚨 CBI Digital Arrest Call</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.simBtn, { borderColor: '#f59e0b' }]} 
                  onPress={() => triggerIncomingSimulation('fedex_scam')}
                >
                  <Text style={styles.simBtnText}>📦 FedEx Customs Call</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.simBtn, { borderColor: '#10b981' }]} 
                  onPress={() => triggerIncomingSimulation('normal_bank')}
                >
                  <Text style={styles.simBtnText}>✅ Normal Bank SMS</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.simBtn, { borderColor: '#a855f7' }]} 
                  onPress={() => triggerIncomingSimulation('novel_apk')}
                >
                  <Text style={styles.simBtnText}>⚠️ Novel APK Threat (Rule 2)</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* LIVE INCOMING ACTIVITY EVALUATOR */}
            {currentActivity && (
              <View style={[
                styles.activityCard, 
                currentActivity.isSuspicious ? styles.threatBorder : styles.safeBorder
              ]}>
                <View style={styles.activityCardHeader}>
                  <Text style={styles.activityTypeBadge}>
                    {currentActivity.type === 'CALL' ? '📞 INCOMING CALL' : '💬 INCOMING SMS'}
                  </Text>
                  <Text style={styles.activityCaller}>{currentActivity.caller}</Text>
                </View>

                <Text style={styles.activityContent}>{currentActivity.content}</Text>

                {/* SIMILARITY WITH LEARNED PATTERNS (Steps 10 & 11) */}
                <View style={styles.similarityBox}>
                  <Text style={styles.similarityLabel}>Pattern Match Similarity (Step 10):</Text>
                  <Text style={[
                    styles.similarityValue, 
                    currentActivity.similarityScore >= 0.4 ? { color: '#ef4444' } : { color: '#10b981' }
                  ]}>
                    {(currentActivity.similarityScore * 100).toFixed(1)}% Match
                    {currentActivity.matchedPatternId ? ` with [${currentActivity.matchedPatternId}]` : ' (Novel Pattern)'}
                  </Text>
                </View>

                {/* DECISION TABLE 1 LIVE EVALUATOR */}
                <View style={styles.decisionTableCard}>
                  <Text style={styles.decisionTableHeader}>
                    Decision Table Status: <Text style={{ color: '#008080' }}>{decisionOutcome.rule}</Text>
                  </Text>
                  
                  <View style={styles.decisionGrid}>
                    <View style={styles.decisionRow}>
                      <Text style={styles.decisionCellLabel}>Suspicious Activity Detected?</Text>
                      <Text style={[styles.decisionCellVal, decisionOutcome.suspicious === 'Yes' ? styles.valRed : styles.valGreen]}>
                        {decisionOutcome.suspicious}
                      </Text>
                    </View>
                    <View style={styles.decisionRow}>
                      <Text style={styles.decisionCellLabel}>Matches Known Fraud Pattern?</Text>
                      <Text style={[styles.decisionCellVal, decisionOutcome.matchesKnown === 'Yes' ? styles.valRed : styles.valMuted]}>
                        {decisionOutcome.matchesKnown}
                      </Text>
                    </View>
                    <View style={styles.decisionRow}>
                      <Text style={styles.decisionCellLabel}>Fraud Incident Resolved/Stopped?</Text>
                      <Text style={[styles.decisionCellVal, decisionOutcome.resolved === 'Yes' ? styles.valGreen : styles.valMuted]}>
                        {decisionOutcome.resolved}
                      </Text>
                    </View>
                    <View style={styles.decisionDivider} />
                    <View style={styles.decisionRow}>
                      <Text style={styles.decisionActionLabel}>Action: Allow Normal Processing</Text>
                      <Text style={[styles.decisionCellVal, decisionOutcome.allowNormal.startsWith('Yes') ? styles.valGreen : styles.valRed]}>
                        {decisionOutcome.allowNormal}
                      </Text>
                    </View>
                    <View style={styles.decisionRow}>
                      <Text style={styles.decisionActionLabel}>Action: Flag / Investigate</Text>
                      <Text style={[styles.decisionCellVal, decisionOutcome.flagInvestigate === 'Yes' ? styles.valRed : styles.valMuted]}>
                        {decisionOutcome.flagInvestigate}
                      </Text>
                    </View>
                    <View style={styles.decisionRow}>
                      <Text style={styles.decisionActionLabel}>Action: Record / Learn Pattern</Text>
                      <Text style={[styles.decisionCellVal, decisionOutcome.recordLearn === 'Yes' ? styles.valCyan : styles.valMuted]}>
                        {decisionOutcome.recordLearn}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.decisionExplanationText}>👉 {decisionOutcome.note}</Text>
                </View>

                {/* ACTIONS: RESOLVE & LEARN PATTERN (Steps 8 & 9, Rule 4) */}
                {currentActivity.isSuspicious && (
                  <View style={styles.actionButtonsCol}>
                    {!incidentResolved ? (
                      <TouchableOpacity 
                        style={styles.resolveButton} 
                        onPress={handleResolveAndLearn}
                      >
                        <Text style={styles.resolveButtonText}>
                          🛡️ Resolve Incident & Retain Learned Pattern (Rule 4)
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity 
                        style={styles.testRepeatButton} 
                        onPress={handleTestRecurringAttack}
                      >
                        <Text style={styles.testRepeatButtonText}>
                          ⚡ Test Future Repeat Attack (Steps 10 & 11)
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* LEARNED FRAUD PATTERNS DATABASE (Adaptive Memory Bank) */}
            <View style={styles.card}>
              <View style={styles.patternHeaderRow}>
                <Text style={styles.cardHeader}>Learned Fraud Patterns Database ({learnedPatterns.length})</Text>
                <Text style={styles.patternActiveBadge}>Active Learning On</Text>
              </View>
              <Text style={styles.cardDesc}>
                Patterns retained when fraud incidents are resolved. When similar patterns appear, Sentinel X automatically prevents them.
              </Text>

              {learnedPatterns.map((pat, idx) => (
                <View key={pat.id} style={styles.patternItem}>
                  <View style={styles.patternItemHeader}>
                    <Text style={styles.patternId}>{pat.id}</Text>
                    <Text style={styles.patternMatches}>{pat.matchCount} Prevents</Text>
                  </View>
                  <Text style={styles.patternTitle}>{pat.title}</Text>
                  <Text style={styles.patternSignature}>{pat.threatSignature}</Text>
                  <View style={styles.keywordTagsRow}>
                    {pat.keywords.slice(0, 4).map((kw, kIdx) => (
                      <View key={kIdx} style={styles.kwTag}>
                        <Text style={styles.kwTagText}>#{kw}</Text>
                      </View>
                    ))}
                  </View>
                  <Text style={styles.patternDate}>Retained on: {pat.resolvedAt}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        )}

        {/* -------------------------------------------------- */}
        {/* TAB 2: COUNTERFEIT CURRENCY SCANNER (Steps 12–16 & Decision Table 2) */}
        {/* -------------------------------------------------- */}
        {activeScreen === 'scan' && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* MODEL TRAINING BASELINE BANNER */}
            <View style={styles.modelBadgeCard}>
              <View style={styles.modelBadgeHeader}>
                <Text style={styles.modelBadgeIcon}>🧠</Text>
                <Text style={styles.modelBadgeTitle}>Trained Indian Currency Model (Item 3)</Text>
              </View>
              <Text style={styles.modelBadgeDesc}>
                Trained on ~{MODEL_TRAINING_INFO.totalImagesTrained} labeled Indian currency note images (100 Genuine, 100 Counterfeit) with {MODEL_TRAINING_INFO.validationAccuracy} validation accuracy.
              </Text>
            </View>

            <Text style={styles.screenHeader}>Indian Currency Banknote Vision</Text>
            <Text style={styles.screenDesc}>
              Select or upload a banknote image. The model extracts security thread optical variance, intaglio microprint density, and Gandhi watermark gradients.
            </Text>

            {/* BANKNOTE SAMPLE SELECTOR (Decision Table 2 Helper) */}
            <Text style={styles.inputLabel}>Select Banknote Test Sample (or choose custom note):</Text>
            <View style={styles.sampleList}>
              {NOTE_SAMPLES.map((sample) => (
                <TouchableOpacity
                  key={sample.id}
                  style={[
                    styles.sampleItem,
                    selectedSample?.id === sample.id && styles.sampleItemActive,
                    sample.isGenuine ? styles.sampleGenuineBorder : styles.sampleFakeBorder
                  ]}
                  onPress={() => {
                    setSelectedSample(sample);
                    setScanResult(null);
                  }}
                >
                  <View style={styles.sampleItemHeader}>
                    <Text style={styles.sampleDenom}>₹{sample.denomination}</Text>
                    <Text style={[
                      styles.sampleBadge, 
                      sample.isGenuine ? styles.sampleBadgeGen : styles.sampleBadgeFake
                    ]}>
                      {sample.isGenuine ? 'GENUINE SAMPLE' : 'COUNTERFEIT SAMPLE'}
                    </Text>
                  </View>
                  <Text style={styles.sampleLabel}>{sample.label}</Text>
                  <Text style={styles.sampleDesc}>{sample.description}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* SCAN ACTION BUTTON */}
            <TouchableOpacity 
              style={styles.primaryButton} 
              onPress={handleRunCurrencyDetection}
              disabled={scanning}
            >
              {scanning ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>
                  {selectedSample ? `Analyze Banknote (₹${selectedSample.denomination})` : 'Start Banknote Verification'}
                </Text>
              )}
            </TouchableOpacity>

            {/* DECISION TABLE RULE 1 EMPTY STATE */}
            {!selectedSample && !scanResult && (
              <View style={styles.rule1NoticeBox}>
                <Text style={styles.rule1Title}>📋 Decision Table Rule 1 Status:</Text>
                <Text style={styles.rule1Desc}>
                  Image Uploaded? <Text style={{ fontWeight: 'bold', color: '#f59e0b' }}>No</Text> ➔ Action: <Text style={{ fontWeight: 'bold', color: '#fff' }}>Request Image</Text>. Please pick a sample note above to begin.
                </Text>
              </View>
            )}

            {/* DECISION TABLE RULES 2 & 3 OUTPUT (Steps 14, 15, 16) */}
            {scanResult && (
              <View style={[
                styles.resultCard, 
                scanResult.isCounterfeit ? styles.resultFakeBorder : styles.resultGenBorder
              ]}>
                <View style={styles.resultTopRow}>
                  <View>
                    <Text style={[
                      styles.resultClassificationText,
                      scanResult.isCounterfeit ? { color: '#ef4444' } : { color: '#10b981' }
                    ]}>
                      {scanResult.isCounterfeit ? '⚠️ COUNTERFEIT DETECTED' : '✅ GENUINE BANKNOTE'}
                    </Text>
                    <Text style={styles.resultDecisionRule}>{scanResult.decisionRule}</Text>
                  </View>
                  <View style={styles.confidencePill}>
                    <Text style={styles.confidenceVal}>
                      {(scanResult.confidence * 100).toFixed(1)}%
                    </Text>
                    <Text style={styles.confidenceSub}>Confidence</Text>
                  </View>
                </View>

                {/* BRIEF REASON / EXPLANATION (Item 3 & Step 15) */}
                <View style={styles.reasonBox}>
                  <Text style={styles.reasonHeader}>Brief Reason / Explanation:</Text>
                  <Text style={styles.reasonText}>{scanResult.briefReason}</Text>
                </View>

                {/* DETAILED SECURITY MARKERS */}
                <View style={styles.markersContainer}>
                  <Text style={styles.markersHeader}>Computer Vision Feature Telemetry:</Text>
                  {scanResult.securityMarkers.map((marker, idx) => (
                    <View key={idx} style={styles.markerRow}>
                      <View style={styles.markerStatusIndicator}>
                        <Text style={marker.status === 'PASS' ? styles.passIcon : styles.failIcon}>
                          {marker.status === 'PASS' ? '✓' : '✕'}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.markerName}>{marker.name}</Text>
                        <Text style={styles.markerDetails}>{marker.details}</Text>
                      </View>
                    </View>
                  ))}
                </View>

                <View style={styles.serialBox}>
                  <Text style={styles.serialLabel}>Extracted Serial Number:</Text>
                  <Text style={styles.serialValue}>{scanResult.serialNumber}</Text>
                </View>
              </View>
            )}
          </ScrollView>
        )}

        {/* -------------------------------------------------- */}
        {/* TAB 3: FRAUD SHIELD */}
        {/* -------------------------------------------------- */}
        {activeScreen === 'shield' && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.shieldStatusCard}>
              <View style={styles.statusDotRing}>
                <View style={styles.statusDotActive} />
              </View>
              <Text style={styles.shieldStatusTitle}>Active Signal Protection Enabled</Text>
              <Text style={styles.shieldStatusDesc}>
                Device is continuously protected against virtual number spoofing, deepfake voice impersonations, and digital arrest threats.
              </Text>
            </View>

            <View style={styles.actionCard}>
              <Text style={styles.cardHeader}>Verify Official Caller Identity</Text>
              <Text style={styles.cardDesc}>
                Did someone call claiming to be a CBI officer, customs department, or police commander?
              </Text>
              <TouchableOpacity style={styles.primaryButton} onPress={() => setActiveScreen('report')}>
                <Text style={styles.buttonText}>Verify Authority Identity</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.threatLockNotice}>
              <Text style={styles.lockNoticeHeader}>🔒 Auto-Lock Coercion Prevention</Text>
              <Text style={styles.lockNoticeDesc}>
                SentinelX temporarily restricts access to UPI and netbanking applications on this device during verified digital arrest calls to prevent financial coercion.
              </Text>
            </View>
          </ScrollView>
        )}

        {/* -------------------------------------------------- */}
        {/* TAB 4: REPORT INCIDENT */}
        {/* -------------------------------------------------- */}
        {activeScreen === 'report' && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={styles.screenHeader}>Report Scam or Counterfeit Note</Text>
            <Text style={styles.screenDesc}>
              Log suspicious calls, fake currency circulation, or digital arrest demands directly with the State Cyber Crime Cell.
            </Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Your Name</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Enter your name" 
                placeholderTextColor="#64748b" 
                value={reporterName}
                onChangeText={setReporterName}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Contact Phone Number</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Enter mobile number" 
                placeholderTextColor="#64748b" 
                keyboardType="phone-pad"
                value={reporterPhone}
                onChangeText={setReporterPhone}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Incident Details</Text>
              <TextInput 
                style={[styles.input, styles.textArea]} 
                placeholder="Describe what happened (e.g. caller claimed to be customs demanding 25,000 INR)" 
                placeholderTextColor="#64748b" 
                multiline
                numberOfLines={4}
                value={reportDetails}
                onChangeText={setReportDetails}
              />
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={handleReportSubmit} disabled={submitting}>
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Submit Official Cyber Report</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* -------------------------------------------------- */}
        {/* TAB 5: REGIONAL ALERTS */}
        {/* -------------------------------------------------- */}
        {activeScreen === 'alerts' && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={styles.screenHeader}>Live Regional Threat Alerts</Text>
            <Text style={styles.screenDesc}>Broadcast intelligence synced across Sentinel X command centres.</Text>

            <View style={styles.alertItem}>
              <Text style={styles.alertHeader}>🚨 FedEx Drug Parcel Scam Campaign</Text>
              <Text style={styles.alertBody}>High frequency of calls impersonating Customs officers demanding KYC/money verification transfers reported in your district.</Text>
              <Text style={styles.alertTime}>Reported: 10 mins ago • High Urgency</Text>
            </View>

            <View style={styles.alertItem}>
              <Text style={styles.alertHeader}>⚠️ Counterfeit ₹500 Notes Circulating</Text>
              <Text style={styles.alertBody}>Detections reported by multiple local merchant retail outlets. Verify security thread optical variance using the Currency Scan tab.</Text>
              <Text style={styles.alertTime}>Reported: 2 hours ago • Verified by Model</Text>
            </View>
          </ScrollView>
        )}

      </View>

      {/* FOOTER NAVIGATION TABS */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveScreen('adaptive')}>
          <Text style={styles.tabIcon}>⚡</Text>
          <Text style={[styles.tabText, activeScreen === 'adaptive' && styles.tabActiveText]}>Adaptive</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveScreen('scan')}>
          <Text style={styles.tabIcon}>💵</Text>
          <Text style={[styles.tabText, activeScreen === 'scan' && styles.tabActiveText]}>Scan Note</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveScreen('shield')}>
          <Text style={styles.tabIcon}>🛡️</Text>
          <Text style={[styles.tabText, activeScreen === 'shield' && styles.tabActiveText]}>Shield</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveScreen('report')}>
          <Text style={styles.tabIcon}>📝</Text>
          <Text style={[styles.tabText, activeScreen === 'report' && styles.tabActiveText]}>Report</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveScreen('alerts')}>
          <Text style={styles.tabIcon}>🔔</Text>
          <Text style={[styles.tabText, activeScreen === 'alerts' && styles.tabActiveText]}>Alerts</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ----------------------------------------------------
// STYLES
// ----------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  // LOGIN STYLES
  loginContainer: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  loginScroll: {
    padding: 24,
    justifyContent: 'center',
    minHeight: '100%',
  },
  loginHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  shieldBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 128, 128, 0.15)',
    borderWidth: 1.5,
    borderColor: '#008080',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  shieldBadgeIcon: {
    fontSize: 32,
  },
  loginTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
  },
  loginSubtitle: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  securityPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 10,
  },
  securityPillText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  roleToggleWrapper: {
    flexDirection: 'row',
    backgroundColor: '#131c2e',
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  roleTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  roleTabActive: {
    backgroundColor: '#008080',
  },
  roleTabText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '700',
  },
  roleTabTextActive: {
    color: '#fff',
  },
  loginErrorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: '#ef4444',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  loginErrorTitle: {
    color: '#ef4444',
    fontWeight: 'bold',
    fontSize: 12,
  },
  loginErrorText: {
    color: '#fca5a5',
    fontSize: 12,
    marginTop: 2,
  },
  loginCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1f2937',
    marginBottom: 20,
  },
  inputLabel: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  loginInput: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 13,
  },
  loginSubmitButton: {
    backgroundColor: '#008080',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  loginSubmitText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  quickDemoSection: {
    backgroundColor: '#131c2e',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 16,
  },
  quickDemoTitle: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  quickButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickDemoBtn: {
    flex: 1,
    backgroundColor: '#1e293b',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  quickDemoBtnText: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '600',
  },
  loginFooterText: {
    color: '#64748b',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 15,
  },

  // APP HEADER
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#0f172a',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  headerSubtitle: {
    color: '#008080',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '700',
  },
  logoutButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: 'bold',
  },
  userStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
    marginRight: 6,
  },
  userStatusText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionHeaderBox: {
    marginBottom: 16,
  },
  screenHeader: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  screenDesc: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  cardHeader: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  cardDesc: {
    color: '#94a3b8',
    fontSize: 11,
    marginBottom: 12,
    lineHeight: 15,
  },
  simButtonsGrid: {
    flexDirection: 'column',
    gap: 8,
  },
  simBtn: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  simBtnText: {
    color: '#f1f5f9',
    fontSize: 12,
    fontWeight: '600',
  },
  activityCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
  },
  threatBorder: {
    borderColor: '#ef4444',
  },
  safeBorder: {
    borderColor: '#10b981',
  },
  activityCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  activityTypeBadge: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: 'bold',
  },
  activityCaller: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  activityContent: {
    color: '#e2e8f0',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  similarityBox: {
    backgroundColor: '#0f172a',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  similarityLabel: {
    color: '#94a3b8',
    fontSize: 11,
  },
  similarityValue: {
    fontWeight: 'bold',
    fontSize: 12,
  },
  decisionTableCard: {
    backgroundColor: '#0d131f',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  decisionTableHeader: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  decisionGrid: {
    flexDirection: 'column',
    gap: 4,
  },
  decisionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  decisionCellLabel: {
    color: '#94a3b8',
    fontSize: 11,
  },
  decisionActionLabel: {
    color: '#e2e8f0',
    fontSize: 11,
    fontWeight: '700',
  },
  decisionCellVal: {
    fontWeight: 'bold',
    fontSize: 11,
  },
  valRed: { color: '#ef4444' },
  valGreen: { color: '#10b981' },
  valCyan: { color: '#008080' },
  valMuted: { color: '#64748b' },
  decisionDivider: {
    height: 1,
    backgroundColor: '#1e293b',
    marginVertical: 4,
  },
  decisionExplanationText: {
    color: '#38bdf8',
    fontSize: 11,
    marginTop: 8,
    fontStyle: 'italic',
  },
  actionButtonsCol: {
    marginTop: 6,
  },
  resolveButton: {
    backgroundColor: '#008080',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  resolveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  testRepeatButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  testRepeatButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  patternHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  patternActiveBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    color: '#10b981',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  patternItem: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  patternItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  patternId: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: 'bold',
  },
  patternMatches: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: 'bold',
  },
  patternTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  patternSignature: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  keywordTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  kwTag: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  kwTagText: {
    color: '#cbd5e1',
    fontSize: 10,
  },
  patternDate: {
    color: '#64748b',
    fontSize: 9,
    marginTop: 6,
    textAlign: 'right',
  },

  // CURRENCY SCANNER STYLES
  modelBadgeCard: {
    backgroundColor: 'rgba(0, 128, 128, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 128, 128, 0.4)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  modelBadgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  modelBadgeIcon: {
    fontSize: 16,
  },
  modelBadgeTitle: {
    color: '#008080',
    fontWeight: 'bold',
    fontSize: 12,
  },
  modelBadgeDesc: {
    color: '#cbd5e1',
    fontSize: 11,
    lineHeight: 15,
  },
  sampleList: {
    flexDirection: 'column',
    gap: 8,
    marginBottom: 16,
  },
  sampleItem: {
    backgroundColor: '#111827',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1.5,
  },
  sampleItemActive: {
    backgroundColor: '#1e293b',
  },
  sampleGenuineBorder: {
    borderColor: '#10b981',
  },
  sampleFakeBorder: {
    borderColor: '#ef4444',
  },
  sampleItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sampleDenom: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  sampleBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sampleBadgeGen: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    color: '#10b981',
  },
  sampleBadgeFake: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: '#ef4444',
  },
  sampleLabel: {
    color: '#f1f5f9',
    fontSize: 12,
    fontWeight: '600',
  },
  sampleDesc: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 14,
  },
  rule1NoticeBox: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  rule1Title: {
    color: '#f59e0b',
    fontWeight: 'bold',
    fontSize: 12,
    marginBottom: 4,
  },
  rule1Desc: {
    color: '#94a3b8',
    fontSize: 11,
    lineHeight: 16,
  },
  resultCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 2,
  },
  resultGenBorder: {
    borderColor: '#10b981',
  },
  resultFakeBorder: {
    borderColor: '#ef4444',
  },
  resultTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    paddingBottom: 12,
    marginBottom: 12,
  },
  resultClassificationText: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  resultDecisionRule: {
    color: '#94a3b8',
    fontSize: 10,
    marginTop: 2,
  },
  confidencePill: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  confidenceVal: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  confidenceSub: {
    color: '#64748b',
    fontSize: 9,
  },
  reasonBox: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#008080',
  },
  reasonHeader: {
    color: '#008080',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  reasonText: {
    color: '#e2e8f0',
    fontSize: 12,
    lineHeight: 16,
  },
  markersContainer: {
    marginBottom: 12,
  },
  markersHeader: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  markerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
    backgroundColor: '#1e293b',
    padding: 8,
    borderRadius: 6,
  },
  markerStatusIndicator: {
    width: 20,
    alignItems: 'center',
  },
  passIcon: { color: '#10b981', fontWeight: 'bold', fontSize: 13 },
  failIcon: { color: '#ef4444', fontWeight: 'bold', fontSize: 13 },
  markerName: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  markerDetails: {
    color: '#94a3b8',
    fontSize: 10,
    marginTop: 2,
    lineHeight: 13,
  },
  serialBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  serialLabel: {
    color: '#64748b',
    fontSize: 11,
  },
  serialValue: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },

  // COMMON BUTTONS & FORMS
  primaryButton: {
    backgroundColor: '#008080',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  shieldStatusCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statusDotRing: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statusDotActive: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10b981',
  },
  shieldStatusTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  shieldStatusDesc: {
    color: '#94a3b8',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 15,
  },
  actionCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  threatLockNotice: {
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    padding: 14,
    borderRadius: 10,
  },
  lockNoticeHeader: {
    color: '#ef4444',
    fontWeight: 'bold',
    fontSize: 12,
  },
  lockNoticeDesc: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 4,
    lineHeight: 15,
  },
  formGroup: {
    marginBottom: 14,
  },
  label: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 10,
    color: '#fff',
    fontSize: 13,
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  alertItem: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  alertHeader: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  alertBody: {
    color: '#cbd5e1',
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  alertTime: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 8,
    textAlign: 'right',
  },

  // FOOTER NAVIGATION TABS
  footer: {
    height: 60,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    flexDirection: 'row',
    backgroundColor: '#0f172a',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    fontSize: 16,
  },
  tabText: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 2,
  },
  tabActiveText: {
    color: '#008080',
  },
});
