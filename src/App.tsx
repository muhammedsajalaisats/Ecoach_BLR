import React, { useEffect, useState } from 'react';
import { FlightChecker } from './components/FlightChecker';
import { OtherCoachFlightChecker } from './components/OtherCoachDispatchStaff';
import { OtherCoachStatus } from './components/OtherCoachOperator';
import { OtherArrival } from './components/OtherArrivalGateStaff';
import { AdminDataManagement } from './components/AdminDataManagement';
import { QRScanner } from './components/QRScanner';
import { Login } from './components/Login';
import { Navbar } from './components/Navbar';
import { CoachStatus } from './components/CoachStatus';
import { Coachoperatorf } from './components/CoachOperator';
import { SuperDataManagement } from './components/superadmin';
import { CoachReleasePage } from './components/CoachReleasepage';
import { createClient } from '@supabase/supabase-js';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';

const supabase = createClient(
  'https://oqxpbtvzaqwznzjcwjdd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xeHBidHZ6YXF3em56amN3amRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NjI2MjQsImV4cCI6MjA3MjAzODYyNH0.E_B9WhK5QGncAyI_xnnO0gzpbWaHoBdDs4SfBQmkI9U'
);

declare module './components/QRScanner' {
  interface QRScannerProps {
    coachNo: string;
  }
}

function AppContent() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'check' | 'upload' | 'scan' | 'status' | 'super' | 'coachoperator' | 'othercoach' | 'othercoachstatus' | 'otherarrival' | 'coachrelease'>('check');
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const [coachNo, setCoachNo] = useState<string>('');
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we're on a route that should set a specific tab
    if (location.pathname.startsWith('/other-coach-status')) {
      setActiveTab('othercoachstatus');
    } else if (location.pathname === '/coach-release') {
      setActiveTab('coachrelease');
    }
  }, [location]);

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const coachNoParam = queryParams.get('coach_number') || queryParams.get('CoachNo') || '';
    setCoachNo(coachNoParam);

    if (coachNoParam === 'OT-01') {
      setActiveTab('othercoach');
      setIsLoading(false);
      setInitialLoadComplete(true);
    } else if (coachNoParam) {
      checkFlightStatus(coachNoParam);
    } else {
      setIsLoading(false);
      setInitialLoadComplete(true);
    }
  }, []);

  const checkFlightStatus = async (coachNumber: string) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('FlightRecords_BLR')
        .select('Status, created_at')
        .eq('coach_number', coachNumber)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        setStatus(data[0].Status || null);
        
        if (data[0].Status === 'Open') {
          setActiveTab('status');
        } else if (data[0].Status === 'Acknowledged') {
          setActiveTab('scan');
        } else if (data[0].Status === 'Arrived') {
          setActiveTab('otherarrival');
        } else {
          setActiveTab('check');
        }
      } else {
        setStatus(null);
        setActiveTab('check');
      }
    } catch (error) {
      console.error('Error fetching flight status:', error);
      setActiveTab('check');
    } finally {
      setIsLoading(false);
      setInitialLoadComplete(true);
    }
  };

  const handleNavigateToOtherCoachStatus = () => {
    setActiveTab('othercoachstatus');
    navigate('/other-coach-status');
  };

  const handleNavigateToCoachRelease = () => {
    setActiveTab('coachrelease');
    navigate('/coach-release');
  };

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    if (tab === 'othercoachstatus') {
      navigate('/other-coach-status');
    } else if (tab === 'coachrelease') {
      navigate('/coach-release');
    } else {
      navigate('/');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="animate-pulse text-xl font-semibold text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!initialLoadComplete) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar activeTab={activeTab} onTabChange={handleTabChange} />
      
      <div className="animate-fade-in pt-8">
        {activeTab === 'check' && <FlightChecker coachNo={coachNo} />}
        {activeTab === 'scan' && <QRScanner coachNo={coachNo} />}
        {activeTab === 'upload' && (!isUserLoggedIn ? <Login onLogin={() => setIsUserLoggedIn(true)} /> : <AdminDataManagement />)}
        {activeTab === 'status' && <CoachStatus coachNo={coachNo} />}
        {activeTab === 'coachoperator' && <Coachoperatorf />}
        {activeTab === 'super' && (!isUserLoggedIn ? <Login onLogin={() => setIsUserLoggedIn(true)} /> : <SuperDataManagement />)}
        {activeTab === 'othercoach' && (
          <OtherCoachFlightChecker 
            coachNo={coachNo} 
            onNavigateToStatus={handleNavigateToOtherCoachStatus} 
          />
        )}
        {activeTab === 'othercoachstatus' && <OtherCoachStatus />}
        {activeTab === 'otherarrival' && <OtherArrival />}
        {activeTab === 'coachrelease' && <CoachReleasePage />}
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AppContent />} />
        <Route path="/other-coach-status" element={<AppContent />} />
        <Route path="/other-coach-status/:flightNumber" element={<AppContent />} />
        <Route path="/coach-release" element={<AppContent />} />
      </Routes>
    </Router>
  );
}

export default App;