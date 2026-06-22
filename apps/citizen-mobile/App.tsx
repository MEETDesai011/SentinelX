import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, 
  Image, ActivityIndicator, Alert, SafeAreaView, Dimensions 
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

export default function App() {
  const [activeScreen, setActiveScreen] = useState<'shield' | 'scan' | 'report' | 'alerts'>('shield');
  
  // State variables
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any | null>(null);
  
  const [reporterName, setReporterName] = useState('');
  const [reporterPhone, setReporterPhone] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // MOCK ACTIONS
  const handleStartScan = () => {
    setScanning(true);
    setScanResult(null);
    setTimeout(() => {
      setScanResult({
        isCounterfeit: true,
        serialNumber: "5AC982341",
        confidence: 0.94,
        failedIndicators: [
          "Security thread variance Hue check failed.",
          "Blurred watermark printing edges detected."
        ]
      });
      setScanning(false);
    }, 2500);
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
    }, 2000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* HEADER SECTION */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SENTINELX CITIZEN SHIELD</p>
        <Text style={styles.headerSubtitle}>Proactive Digital Defense</p>
      </View>

      {/* ACTIVE SCREEN RENDER */}
      <View style={styles.content}>
        
        {/* SCREEN 1: FRAUD SHIELD */}
        {activeScreen === 'shield' && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.shieldStatusCard}>
              <View style={styles.statusDotRing}>
                <View style={styles.statusDotActive} />
              </View>
              <Text style={styles.shieldStatusTitle}>Active Signal Protection</p>
              <Text style={styles.shieldStatusDesc}>Your device is protected against virtual number spoofing and deepfake voice calls.</p>
            </View>

            <View style={styles.actionCard}>
              <Text style={styles.cardHeader}>Verify Official Caller Identity</p>
              <Text style={styles.cardDesc}>Did someone call you claiming to be a CBI officer, customs department, or police commander?</p>
              <TouchableOpacity style={styles.primaryButton} onPress={() => setActiveScreen('report')}>
                <Text style={styles.buttonText}>Verify Authority Identity</p>
              </TouchableOpacity>
            </View>

            <View style={styles.threatLockNotice}>
              <Text style={styles.lockNoticeHeader}>🔒 Auto-Lock Prevention</p>
              <Text style={styles.lockNoticeDesc}>SentinelX will temporarily restrict access to UPI and banking applications on this device during verified digital arrest calls to prevent financial coercion.</p>
            </View>
          </ScrollView>
        )}

        {/* SCREEN 2: CURRENCY SCANNER */}
        {activeScreen === 'scan' && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={styles.screenHeader}>Currency Note Scanner (Pillar 2)</p>
            <Text style={styles.screenDesc}>Position the banknote inside the viewport to analyze the color-shifting thread, watermark depth, and microprinting density.</p>

            <View style={styles.cameraViewportMock}>
              {scanning ? (
                <View style={styles.scanningOverlay}>
                  <ActivityIndicator size="large" color="#008080" />
                  <Text style={styles.scanText}>Preprocessing Canny edge thresholds...</p>
                </View>
              ) : (
                <Text style={styles.cameraText}>Camera Viewport View Mockup</p>
              )}
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={handleStartScan} disabled={scanning}>
              <Text style={styles.buttonText}>{scanning ? "Scanning..." : "Start Scan Note"}</Text>
            </TouchableOpacity>

            {scanResult && (
              <View style={styles.resultCard}>
                <Text style={styles.resultTitle}>⚠️ Counterfeit Note Detected</p>
                <Text style={styles.resultSub}>Confidence Index: {(scanResult.confidence * 100).toFixed(0)}%</p>
                <Text style={styles.serialText}>Serial Extracted: {scanResult.serialNumber}</Text>
                
                <View style={styles.failedBlock}>
                  <Text style={styles.failedBlockHeader}>Failed Indicators:</Text>
                  {scanResult.failedIndicators.map((ind: string, idx: number) => (
                    <Text key={idx} style={styles.failedText}>• {ind}</p>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        )}

        {/* SCREEN 3: REPORT COMPLAINT */}
        {activeScreen === 'report' && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={styles.screenHeader}>Report Scam Attempt</p>
            <Text style={styles.screenDesc}>Log suspicious WhatsApp calls, digital arrest threats, or fraudulent payment demands directly to the cyber crime division.</Text>

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
              <Text style={styles.label}>Incident details</Text>
              <TextInput 
                style={[styles.input, styles.textArea]} 
                placeholder="Explain the incident (e.g. caller impersonated customs officer demanding bank transfer)" 
                placeholderTextColor="#64748b" 
                multiline
                numberOfLines={4}
                value={reportDetails}
                onChangeText={setReportDetails}
              />
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={handleReportSubmit} disabled={submitting}>
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Submit Report</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* SCREEN 4: ALERTS FEED */}
        {activeScreen === 'alerts' && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={styles.screenHeader}>Regional Scam Alerts</p>
            <Text style={styles.screenDesc}>Live alerts of active fraud campaigns reported near your geographic sector.</p>

            <View style={styles.alertItem}>
              <Text style={styles.alertHeader}>🚨 FedEx Drug Parcel Scam Call Activity</p>
              <Text style={styles.alertBody}>High frequency of calls impersonating Customs officers demanding KYC/money verification transfers reported in your district.</p>
              <Text style={styles.alertTime}>Reported: 10 mins ago</Text>
            </View>

            <View style={styles.alertItem}>
              <Text style={styles.alertHeader}>⚠️ Counterfeit ₹500 Notes Circulating</p>
              <Text style={styles.alertBody}>Detections reported by multiple local merchant retail outlets. Verify threads and watermarks using the Currency Scan tab.</p>
              <Text style={styles.alertTime}>Reported: 2 hours ago</Text>
            </View>
          </ScrollView>
        )}

      </View>

      {/* FOOTER NAVIGATION TABS */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveScreen('shield')}>
          <Text style={[styles.tabText, activeScreen === 'shield' && styles.tabActiveText]}>Shield</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveScreen('scan')}>
          <Text style={[styles.tabText, activeScreen === 'scan' && styles.tabActiveText]}>Scan</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveScreen('report')}>
          <Text style={[styles.tabText, activeScreen === 'report' && styles.tabActiveText]}>Report</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveScreen('alerts')}>
          <Text style={[styles.tabText, activeScreen === 'alerts' && styles.tabActiveText]}>Alerts</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#1e293b',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  headerSubtitle: {
    color: '#008080',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  shieldStatusCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
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
    marginBottom: 10,
  },
  statusDotActive: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10b981',
  },
  shieldStatusTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  shieldStatusDesc: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 16,
  },
  actionCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  cardDesc: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 6,
    marginBottom: 16,
    lineHeight: 16,
  },
  threatLockNotice: {
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    padding: 16,
    borderRadius: 12,
  },
  lockNoticeHeader: {
    color: '#ef4444',
    fontWeight: 'bold',
    fontSize: 12,
  },
  lockNoticeDesc: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 6,
    lineHeight: 15,
  },
  screenHeader: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  screenDesc: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 6,
    marginBottom: 20,
    lineHeight: 16,
  },
  cameraViewportMock: {
    height: 200,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  cameraText: {
    color: '#64748b',
    fontSize: 12,
  },
  scanningOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanText: {
    color: '#008080',
    marginTop: 10,
    fontSize: 11,
    fontWeight: 'bold',
  },
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
    fontSize: 14,
  },
  resultCard: {
    marginTop: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 12,
    padding: 16,
  },
  resultTitle: {
    color: '#ef4444',
    fontWeight: 'bold',
    fontSize: 14,
  },
  resultSub: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  serialText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 10,
  },
  failedBlock: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(239, 68, 68, 0.2)',
    paddingTop: 10,
  },
  failedBlockHeader: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  failedText: {
    color: '#cbd5e1',
    fontSize: 11,
    marginTop: 4,
  },
  formGroup: {
    marginBottom: 16,
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
    height: 100,
    textAlignVertical: 'top',
  },
  alertItem: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  alertHeader: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  alertBody: {
    color: '#cbd5e1',
    fontSize: 12,
    marginTop: 6,
    lineHeight: 16,
  },
  alertTime: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 10,
    textAlign: 'right',
  },
  footer: {
    height: 60,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    flexDirection: 'row',
    backgroundColor: '#1e293b',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tabActiveText: {
    color: '#008080',
  },
});
