import React, { useState, useCallback, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://oqxpbtvzaqwznzjcwjdd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xeHBidHZ6YXF3em56amN3amRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NjI2MjQsImV4cCI6MjA3MjAzODYyNH0.E_B9WhK5QGncAyI_xnnO0gzpbWaHoBdDs4SfBQmkI9U'
);

const coachNumbers = [
  "PC-01", "PC-02", "PC-03", "PC-04", "PC-05", "PC-06", "PC-07", "PC-08", "PC-09", "PC-10",
  "PC-11", "PC-12", "PC-13", "PC-14", "PC-15", "PC-16", "PC-17", "PC-18", "PC-19", "PC-20",
  "PC-21", "PC-22", "PC-23", "PC-24", "PC-25", "PC-26", "OT-01","PC-100",
];

interface ScanResult {
  id: number;
  flight_number: string;
  flight_type: string;
  flight_name: string;
  coach_number: string;
  Other_Coach_Name: string;
  Other_Coach_Number: string;
  created_at: string;
  Status?: string;
  Verification_Status?: string;
  Accepted_time?: string;
  disembarked_time?: string;
  Rejected_time?: string;
  Rejected_Coach?: string;
  FlightCategory?: string;
}

type AppState = 'GATE_SELECTION' | 'FLIGHT_NUMBER_INPUT' | 'COACH_SELECTION' | 'PROCESSING' | 'RESULT' | 
                'ACTION_PROCESSING' | 'ACTION_COMPLETE' | 'REJECTED' | 'REJECTION_PROCESSING' | 
                'REDIRECT_PROCESSING' | 'WRONG_GATE_COACH_SELECTION';
type GateType = 'DOMESTIC' | 'INTERNATIONAL' | null;
type FlightCategory = 'Emergency' | 'Charter' | 'Diverted' | 'Others' | null;

export function OtherArrival() {
  const [appState, setAppState] = useState<AppState>('GATE_SELECTION');
  const [selectedGate, setSelectedGate] = useState<GateType>(null);
  const [flightNumber, setFlightNumber] = useState<string>('');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [showConfirmationModal, setShowConfirmationModal] = useState<boolean>(false);
  const [isRedirecting, setIsRedirecting] = useState<boolean>(false);
  const [showGateConfirmation, setShowGateConfirmation] = useState<boolean>(false);
  const [pendingGateSelection, setPendingGateSelection] = useState<GateType>(null);
  const [showOtherOptions, setShowOtherOptions] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<FlightCategory>(null);
  const [acknowledgedCoaches, setAcknowledgedCoaches] = useState<ScanResult[]>([]);
  const [selectedCoach, setSelectedCoach] = useState<ScanResult | null>(null);
  const [wrongGateCoaches, setWrongGateCoaches] = useState<ScanResult[]>([]);
  
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(true);
  const flightNumberInputRef = useRef<HTMLInputElement>(null);

  const fetchAcknowledgedCoaches = useCallback(async (flightNumber: string, gateType: GateType) => {
    if (!isMounted.current || !gateType) return;
    
    try {
      setAppState('PROCESSING');
      
      const { data: flightData, error: fetchError } = await supabase
        .from('FlightRecords_BLR')
        .select('*')
        .eq('flight_number', flightNumber)
        .eq('Status', 'Acknowledged');

      if (!isMounted.current) return;

      if (fetchError || !flightData || flightData.length === 0) {
        console.error('Fetch error:', fetchError);
        setError(fetchError?.message || 'No acknowledged coaches found for this flight number.');
        setAppState('FLIGHT_NUMBER_INPUT');
        return;
      }

      // Separate coaches into correct gate and wrong gate
      const correctGateCoaches: ScanResult[] = [];
      const wrongGateCoaches: ScanResult[] = [];
      
      flightData.forEach(record => {
        const isDomestic = record.flight_type.toUpperCase().includes('DOMESTIC');
        if ((gateType === 'DOMESTIC' && isDomestic) || (gateType === 'INTERNATIONAL' && !isDomestic)) {
          correctGateCoaches.push(record);
        } else {
          wrongGateCoaches.push(record);
        }
      });

      if (wrongGateCoaches.length > 0) {
        setWrongGateCoaches(wrongGateCoaches);
      }

      if (correctGateCoaches.length === 0 && wrongGateCoaches.length > 0) {
        // All coaches are for wrong gate - go directly to wrong gate flow
        setAppState('WRONG_GATE_COACH_SELECTION');
        return;
      }

      setAcknowledgedCoaches(correctGateCoaches);
      setAppState(correctGateCoaches.length > 0 ? 'COACH_SELECTION' : 'FLIGHT_NUMBER_INPUT');
    } catch (err) {
      if (!isMounted.current) return;
      console.error('Error fetching flight data:', err);
      setError('Error processing data. Please try again.');
      setAppState('FLIGHT_NUMBER_INPUT');
    }
  }, []);

  const handleCoachSelection = useCallback((coach: ScanResult) => {
    setSelectedCoach(coach);
    setResult(coach);
    setAppState('RESULT');
  }, []);

  const handleWrongGateCoachSelection = useCallback((coach: ScanResult) => {
    setSelectedCoach(coach);
    setResult(coach);
    setAppState('REJECTION_PROCESSING');
    processRejection(coach);
  }, []);

  const processRejection = async (flightData: ScanResult) => {
    if (!isMounted.current || !flightData.id) return;
    
    try {
      // Calculate IST time (UTC+5:30)
      const now = new Date();
      const timezoneOffset = 5.5 * 60 * 60 * 1000;
      const rejectedTime = new Date(now.getTime() + timezoneOffset).toISOString();
      
      const { data: updatedData, error: updateError } = await supabase
        .from('FlightRecords_BLR')
        .update({
          Verification_Status: 'Rejected',
          Rejected_Coach: 'Rejected',
          Rejected_time: rejectedTime
        })
        .eq('id', flightData.id)
        .select();
      
      if (!isMounted.current) return;
      
      if (updateError) {
        console.error('Supabase update error:', updateError);
        throw new Error(updateError.message || 'Database update failed');
      }
      
      if (updatedData && updatedData.length > 0) {
        setResult(updatedData[0]);
      }
      
      setAppState('REJECTED');
    } catch (err) {
      console.error('Rejection process error:', err);
      if (!isMounted.current) return;
      setAppState('REJECTED');
    }
  };

  const handleRedirect = async () => {
    if (!isMounted.current || !result || !result.id) {
      console.error("Cannot redirect: Missing result or result ID");
      return;
    }
    
    try {
      setIsRedirecting(true);
      setAppState('REDIRECT_PROCESSING');
      
      // Calculate IST time (UTC+5:30)
      const now = new Date();
      const timezoneOffset = 5.5 * 60 * 60 * 1000;
      const redirectTime = new Date(now.getTime() + timezoneOffset).toISOString();
      
      const updateResult = await supabase
        .from('FlightRecords_BLR')
        .update({
          Rejected_Coach: 'Redirected',
          Rejected_time: redirectTime
        })
        .eq('id', result.id);
      
      if (updateResult.error) {
        throw new Error(`Database update failed: ${updateResult.error.message}`);
      }
      
      setMessage('Redirection recorded successfully!');
      
      resetTimerRef.current = setTimeout(() => {
        if (isMounted.current) {
          resetState();
        }
      }, 2000);
      
    } catch (err) {
      console.error('Error during redirect process:', err);
      setError(`Failed to update redirection status: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      if (isMounted.current) {
        setIsRedirecting(false);
        if (appState === 'REDIRECT_PROCESSING') {
          setAppState('REJECTED');
        }
      }
    }
  };
  
  const resetState = useCallback(() => {
    if (!isMounted.current) return;
    
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
    
    setResult(null);
    setMessage('');
    setError('');
    setShowConfirmationModal(false);
    setAppState('GATE_SELECTION');
    setSelectedGate(null);
    setShowOtherOptions(false);
    setSelectedCategory(null);
    setFlightNumber('');
    setAcknowledgedCoaches([]);
    setSelectedCoach(null);
    setWrongGateCoaches([]);
  }, []);

  const handleGateSelection = useCallback((gateType: GateType) => {
    if (!isMounted.current) return;
    
    // Store pending gate selection and show confirmation modal
    setPendingGateSelection(gateType);
    setShowGateConfirmation(true);
  }, []);

  const confirmGateSelection = useCallback((confirmed: boolean) => {
    if (!isMounted.current) return;
    
    setShowGateConfirmation(false);
    
    if (confirmed && pendingGateSelection) {
      setSelectedGate(pendingGateSelection);
      setAppState('FLIGHT_NUMBER_INPUT');
      setTimeout(() => {
        if (flightNumberInputRef.current) {
          flightNumberInputRef.current.focus();
        }
      }, 100);
    }
    
    // Reset pending selection if cancelled
    if (!confirmed) {
      setPendingGateSelection(null);
    }
  }, [pendingGateSelection]);

  const handleFlightNumberSubmit = useCallback(() => {
    if (!flightNumber.trim()) {
      setError('Please enter a flight number');
      return;
    }
    if (selectedGate) {
      fetchAcknowledgedCoaches(flightNumber, selectedGate);
    }
  }, [flightNumber, selectedGate, fetchAcknowledgedCoaches]);

  const handleConfirmation = useCallback(async (confirmed: boolean, category: FlightCategory = null) => {
    if (!isMounted.current) return;
    
    setShowConfirmationModal(false);
    if (confirmed && result) {
      setAppState('ACTION_PROCESSING');
    
      try {
        // Calculate IST time (UTC+5:30)
        const now = new Date();
        const timezoneOffset = 5.5 * 60 * 60 * 1000;
        const acceptedTime = new Date(now.getTime() + timezoneOffset).toISOString();
        
        // Calculate disembarked time (accepted time + 2 minutes)
        const disembarkedTime = new Date(new Date(acceptedTime).getTime() + 2 * 60 * 1000).toISOString();
        
        if (!result.id) {
          throw new Error('Cannot update record: missing record ID');
        }

        interface UpdateData {
          Status: string;
          Verification_Status: string;
          Accepted_time: string;
          disembarked_time: string;
          FlightCategory?: string;
        }

        const updateData: UpdateData = {
          Status: 'Closed',
          Verification_Status: 'Accepted',
          Accepted_time: acceptedTime,
          disembarked_time: disembarkedTime
        };

        if (category) {
          updateData.FlightCategory = category;
        }

        const { data: updatedData, error: updateError } = await supabase
          .from('FlightRecords_BLR')
          .update(updateData)
          .eq('id', result.id)
          .select();

        if (updateError || !updatedData || updatedData.length === 0) {
          throw updateError || new Error('No data returned after update');
        }

        setResult(updatedData[0]);
        setMessage('Status updated successfully!');
        setAppState('ACTION_COMPLETE');
        
        resetTimerRef.current = setTimeout(() => {
          if (isMounted.current) resetState();
        }, 2000);
      } catch (err) {
        if (!isMounted.current) return;
        console.error('Error updating flight record:', err);
        setMessage(`Error updating status: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setAppState('RESULT');
      }
    }
  }, [result, resetState]);

  useEffect(() => {
    isMounted.current = true;
    
    return () => {
      isMounted.current = false;
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  const FlightDetails = ({ result }: { result: ScanResult }) => (
    <div className="space-y-2">
      <p className="flex justify-between text-xs">
        <span className="text-gray-600">Flight Number:</span>
        <span className="font-semibold">{result.flight_number}</span>
      </p>
      <p className="flex justify-between text-xs">
        <span className="text-gray-600">Type:</span>
        <span className={`font-semibold ${
          result.flight_type?.toUpperCase().includes('DOMESTIC') ? 'text-blue-600' : 'text-red-600'
        }`}>
          {result.flight_type.toUpperCase()}
        </span>
      </p>
      <p className="flex justify-between text-xs">
        <span className="text-gray-600">Coach Name:</span>
        <span className="font-semibold">{result.Other_Coach_Name || 'N/A'}</span>
      </p>
      <p className="flex justify-between text-xs">
        <span className="text-gray-600">Coach Number:</span>
        <span className="font-semibold">{result.Other_Coach_Number || 'N/A'}</span>
      </p>
      {result.Verification_Status && (
        <p className="flex justify-between text-xs">
          <span className="text-gray-600">Status:</span>
          <span className={`font-semibold ${
            result.Verification_Status === 'Accepted' ? 'text-green-600' : 'text-red-600'
          }`}>
            {result.Verification_Status.toUpperCase()}
          </span>
        </p>
      )}
      {result.FlightCategory && (
        <p className="flex justify-between text-xs">
          <span className="text-gray-600">Category:</span>
          <span className="font-semibold text-purple-600">
            {result.FlightCategory.toUpperCase()}
          </span>
        </p>
      )}
    </div>
  );

  const renderScreenContent = () => {
    switch (appState) {
      case 'GATE_SELECTION':
        return (
          <div className="flex flex-col items-center py-4 px-2">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Select Gate Type</h2>
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <button
                onClick={() => handleGateSelection('DOMESTIC')}
                className="w-full flex items-center justify-center py-8 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                <span className="text-lg font-medium">DOMESTIC</span>
              </button>
              <button
                onClick={() => handleGateSelection('INTERNATIONAL')}
                className="w-full flex items-center justify-center py-8 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                <span className="text-lg font-medium">INTERNATIONAL</span>
              </button>
            </div>
          </div>
        );
        
      case 'FLIGHT_NUMBER_INPUT':
        return (
          <div className="flex flex-col items-center py-4 px-2">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Enter Flight Number for {selectedGate === 'DOMESTIC' ? 'Domestic' : 'International'} Arrival
            </h2>
            <div className="w-full max-w-md">
              <input
                ref={flightNumberInputRef}
                type="text"
                value={flightNumber}
                onChange={(e) => setFlightNumber(e.target.value.toUpperCase())}
                placeholder="Enter flight number (e.g., AI101)"
                className="w-full p-3 border border-gray-300 rounded-lg mb-3 text-center text-lg"
                onKeyDown={(e) => e.key === 'Enter' && handleFlightNumberSubmit()}
              />
              <button
                onClick={handleFlightNumberSubmit}
                className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Search
              </button>
              <button
                onClick={() => setAppState('GATE_SELECTION')}
                className="w-full mt-2 bg-gray-300 text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Back
              </button>
            </div>
          </div>
        );
        
      case 'COACH_SELECTION':
        return (
          <div className="flex flex-col items-center py-4 px-2">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Select Coach for {flightNumber}
            </h2>
            <p className="text-gray-600 mb-4 text-sm">
              Found {acknowledgedCoaches.length} acknowledged coach{acknowledgedCoaches.length !== 1 ? 'es' : ''}
            </p>
            
            <div className="w-full max-w-md space-y-2">
              {acknowledgedCoaches.map((coach) => (
                <button
                  key={coach.id}
                  onClick={() => handleCoachSelection(coach)}
                  className="w-full p-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{coach.Other_Coach_Name || 'N/A'}</div>
                      <div className="text-xs text-gray-500">{coach.Other_Coach_Number || 'N/A'}</div>
                    </div>
                    <span className="text-xs text-gray-500">
                      {coach.flight_type.toUpperCase().includes('DOMESTIC') ? 'Domestic' : 'International'}
                    </span>
                  </div>
                </button>
              ))}
              <button
                onClick={() => setAppState('FLIGHT_NUMBER_INPUT')}
                className="w-full mt-2 bg-gray-300 text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Back
              </button>
            </div>
          </div>
        );

      case 'WRONG_GATE_COACH_SELECTION':
        return (
          <div className="flex flex-col items-center py-4 px-2">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Wrong Gate Detected for {flightNumber}
            </h2>
            <p className="text-red-600 mb-4 text-sm">
              These coaches are for {selectedGate === 'DOMESTIC' ? 'International' : 'Domestic'} arrivals
            </p>
            
            <div className="w-full max-w-md space-y-2">
              {wrongGateCoaches.map((coach) => (
                <button
                  key={coach.id}
                  onClick={() => handleWrongGateCoachSelection(coach)}
                  className="w-full p-3 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors text-left"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{coach.Other_Coach_Name || 'N/A'}</div>
                      <div className="text-xs text-red-500">{coach.Other_Coach_Number || 'N/A'}</div>
                    </div>
                    <span className="text-xs text-red-500">
                      {coach.flight_type.toUpperCase().includes('DOMESTIC') ? 'Domestic' : 'International'}
                    </span>
                  </div>
                </button>
              ))}
              <button
                onClick={() => setAppState('FLIGHT_NUMBER_INPUT')}
                className="w-full mt-2 bg-gray-300 text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Back
              </button>
            </div>
          </div>
        );
        
      case 'PROCESSING':
        return (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mb-3"></div>
            <p className="text-gray-600 text-sm">Processing flight {flightNumber}...</p>
          </div>
        );
        
      case 'REJECTION_PROCESSING':
        return result && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-red-500 mb-3"></div>
            <p className="text-red-600 text-sm">
              Processing rejection for {result.Other_Coach_Name || result.Other_Coach_Number || 'coach'}...
            </p>
          </div>
        );
        
      case 'REDIRECT_PROCESSING':
        return result && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mb-3"></div>
            <p className="text-blue-600 text-sm">
              Updating redirection status for {result.Other_Coach_Name || result.Other_Coach_Number || 'coach'}...
            </p>
          </div>
        );
        
      case 'RESULT':
        return result && (
          <div className="mt-4 w-full">
            <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-green-50 border border-blue-100">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-semibold text-gray-800">Flight Details</h3>
                <button onClick={resetState} className="p-1 text-gray-500 hover:bg-gray-100 rounded-full">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <FlightDetails result={result} />
              
              <div className="mt-4 space-y-2">
                {!showOtherOptions && (
                  <>
                    <button
                      onClick={() => setShowConfirmationModal(true)}
                      className="w-full flex items-center justify-center bg-green-500 text-white py-2 px-3 rounded-lg hover:bg-green-600 transition-colors text-sm"
                      disabled={result.Verification_Status === 'Accepted'}
                    >
                      {result.Verification_Status === 'Accepted' ? 'Already Accepted' : 'Confirm'}
                    </button>
                    <button
                      onClick={() => setShowOtherOptions(true)}
                      className="w-full flex items-center justify-center bg-purple-500 text-white py-2 px-3 rounded-lg hover:bg-purple-600 transition-colors text-sm"
                      disabled={result.Verification_Status === 'Accepted'}
                    >
                      Other
                    </button>
                  </>
                )}
                {showOtherOptions && (
                  <div className="space-y-2">
                    <select
                      value={selectedCategory || ''}
                      onChange={(e) => setSelectedCategory(e.target.value as FlightCategory)}
                      className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="">Select a category</option>
                      <option value="Emergency">Emergency</option>
                      <option value="Charter">Charter</option>
                      <option value="Diverted">Diverted</option>
                      <option value="Others">Others</option>
                    </select>
                    <button
                      onClick={() => handleConfirmation(true, selectedCategory)}
                      disabled={!selectedCategory}
                      className={`w-full flex items-center justify-center py-2 px-3 rounded-lg transition-colors text-sm ${
                        selectedCategory ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      Confirm Special Category
                    </button>
                    <button
                      onClick={() => {
                        setShowOtherOptions(false);
                        setSelectedCategory(null);
                      }}
                      className="w-full flex items-center justify-center bg-gray-300 text-gray-800 py-2 px-3 rounded-lg hover:bg-gray-400 transition-colors text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
        
      case 'ACTION_PROCESSING':
        return result && (
          <div className="mt-4 w-full">
            <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-green-50 border border-blue-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Flight Details</h3>
              <FlightDetails result={result} />
              <div className="mt-4 flex justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
              </div>
              <p className="text-center mt-3 text-gray-600 text-sm">Processing, please wait...</p>
            </div>
          </div>
        );
        
      case 'ACTION_COMPLETE':
        return result && (
          <div className="mt-4 w-full">
            <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-green-50 border border-blue-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Flight Details</h3>
              <FlightDetails result={result} />
              <div className={`mt-4 p-2 rounded-lg text-sm ${
                message.includes('successfully') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {message}
              </div>
            </div>
          </div>
        );
        
      case 'REJECTED':
        return result && (
          <div className="mt-4 w-full">
            <div className="p-4 rounded-lg bg-gradient-to-r from-red-50 to-orange-50 border border-red-100">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-semibold text-gray-800">Wrong Gate Detected</h3>
                <button onClick={resetState} className="p-1 text-gray-500 hover:bg-gray-100 rounded-full">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2 mb-4">
                <p className="text-red-600 font-medium text-center text-sm">
                  Go To The {result.flight_type?.toUpperCase().includes('DOMESTIC') ? 'DOMESTIC' : 'INTERNATIONAL'} Gate
                </p>
                
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <FlightDetails result={result} />
                  
                  {result.Rejected_time && (
                    <p className="flex justify-between text-xs mt-1">
                      <span className="text-gray-600">Rejected at:</span>
                      <span className="font-semibold">
                        {new Date(result.Rejected_time).toLocaleString()}
                      </span>
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={handleRedirect}
                  className="flex-1 bg-blue-500 text-white py-2 px-3 rounded-lg hover:bg-blue-600 transition-colors text-sm"
                  disabled={isRedirecting}
                >
                  {isRedirecting ? 'Processing...' : 'Redirect'}
                </button>
                <button
                  onClick={resetState}
                  className="flex-1 bg-gray-300 text-gray-800 py-2 px-3 rounded-lg hover:bg-gray-400 transition-colors text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-2 w-full">
      <div className="bg-white rounded-xl shadow-lg p-4 w-full">
        {error && (
          <div className="mb-3 p-2 bg-red-100 text-red-800 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="text-center w-full">
          {renderScreenContent()}
        </div>
      </div>

      {/* Gate Type Confirmation Modal */}
      {showGateConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 z-50">
          <div className="bg-white rounded-lg p-4 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Confirm Gate Selection</h3>
            <p className="text-gray-600 mb-4 text-sm">
              Are you sure you want to select {pendingGateSelection === 'DOMESTIC' ? 'DOMESTIC' : 'INTERNATIONAL'} gate?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => confirmGateSelection(true)}
                className="w-full bg-blue-500 text-white py-2 px-3 rounded-lg hover:bg-blue-600 transition-colors text-sm"
              >
                Yes
              </button>
              <button
                onClick={() => confirmGateSelection(false)}
                className="w-full bg-gray-300 text-gray-800 py-2 px-3 rounded-lg hover:bg-gray-400 transition-colors text-sm"
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Flight Confirmation Modal */}
      {showConfirmationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 z-50">
          <div className="bg-white rounded-lg p-4 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Confirm Flight Type</h3>
            <p className="text-gray-600 mb-4 text-sm">
              This is a {result?.flight_type?.toUpperCase().includes('DOMESTIC') ? 'Domestic Arrival' : 'International Arrival'} flight. Are you sure you want to accept?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleConfirmation(true)}
                className="w-full bg-green-500 text-white py-2 px-3 rounded-lg hover:bg-green-600 transition-colors text-sm"
              >
                Accept
              </button>
              <button
                onClick={() => handleConfirmation(false)}
                className="w-full bg-gray-300 text-gray-800 py-2 px-3 rounded-lg hover:bg-gray-400 transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}