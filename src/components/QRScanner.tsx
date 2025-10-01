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
  "PC-21", "PC-22", "PC-23", "PC-24", "PC-25", "PC-26", "OT-01", "PC-100", "PC-200", "PC-201", "PC-202", 
  "PC-203","PC-204", "PC-205",,
];

interface ScanResult {
  id: number;
  flight_number: string;
  flight_type: string;
  flight_name: string;
  coach_number: string;
  created_at: string;
  Status?: string;
  Verification_Status?: string;
  Accepted_time?: string;
  Rejected_time?: string;
  Rejected_Coach?: string;
  FlightCategory?: string;
  disembarked_time?: string;
  timer_start?: string;
  timer_ends?: string;
}

type AppState = 'GATE_SELECTION' | 'PROCESSING' | 'RESULT' | 'ACTION_PROCESSING' | 'ACTION_COMPLETE' | 'REJECTED' | 'REJECTION_PROCESSING' | 'REDIRECT_PROCESSING' | 'DOOR_OPENED';
type GateType = 'DOMESTIC' | 'INTERNATIONAL' | null;
type FlightCategory = 'Emergency' | 'Charter' | 'Diverted' | 'Others' | null;

interface QRScannerProps {
  coachNo: string;
}

export function QRScanner({ coachNo }: QRScannerProps) {
  const [appState, setAppState] = useState<AppState>('GATE_SELECTION');
  const [selectedGate, setSelectedGate] = useState<GateType>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [showConfirmationModal, setShowConfirmationModal] = useState<boolean>(false);
  const [showCoachPopup, setShowCoachPopup] = useState<boolean>(true);
  const [currentCoachNumber, setCurrentCoachNumber] = useState<string | null>(coachNo);
  const [isRedirecting, setIsRedirecting] = useState<boolean>(false);
  const [showGateConfirmation, setShowGateConfirmation] = useState<boolean>(false);
  const [pendingGateSelection, setPendingGateSelection] = useState<GateType>(null);
  const [showOtherOptions, setShowOtherOptions] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<FlightCategory>(null);
  const [assignedCoachesCount, setAssignedCoachesCount] = useState<number>(0);
  const [doorOpened, setDoorOpened] = useState<boolean>(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(180);
  
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(true);

  const fetchAssignedCoachesCount = useCallback(async (flightNumber: string) => {
    try {
      const { count, error } = await supabase
        .from('FlightRecords_BLR')
        .select('*', { count: 'exact', head: true })
        .eq('flight_number', flightNumber)
        .neq('Status', 'Closed');

      if (error) {
        console.error('Error fetching assigned coaches count:', error);
        return 0;
      }

      return count || 0;
    } catch (err) {
      console.error('Error in fetchAssignedCoachesCount:', err);
      return 0;
    }
  }, []);

  const fetchFlightData = useCallback(async (coach_number: string, gateType: GateType) => {
    if (!isMounted.current || !gateType) return;
    
    try {
      setAppState('PROCESSING');
      
      const { data: flightData, error: fetchError } = await supabase
        .from('FlightRecords_BLR')
        .select('*')
        .eq('coach_number', coach_number)
        .eq('Status', 'Acknowledged')
        .single();

      if (!isMounted.current) return;

      if (fetchError || !flightData) {
        console.error('Fetch error:', fetchError);
        setError(fetchError?.message || 'No acknowledged flight record found for this coach number.');
        setResult(null);
        setAppState('GATE_SELECTION');
        return;
      }

      const count = await fetchAssignedCoachesCount(flightData.flight_number);
      setAssignedCoachesCount(count);

      const flightIsDomestic = flightData.flight_type.toUpperCase().includes('DOMESTIC');
      const gateIsDomestic = gateType === 'DOMESTIC';
      
      if (flightIsDomestic !== gateIsDomestic && !showOtherOptions) {
        setResult(flightData);
        setAppState('REJECTION_PROCESSING');
        processRejection(flightData);
        return;
      }

      setResult(flightData);
      setAppState('RESULT');
    } catch (err) {
      if (!isMounted.current) return;
      console.error('Error fetching flight data:', err);
      setError('Error processing data. Please try again.');
      setAppState('GATE_SELECTION');
    }
  }, [showOtherOptions, fetchAssignedCoachesCount]);
  
  const processRejection = async (flightData: ScanResult) => {
    if (!isMounted.current || !flightData.id) return;
    
    try {
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
    setShowCoachPopup(true);
    setAppState('GATE_SELECTION');
    setSelectedGate(null);
    setShowOtherOptions(false);
    setSelectedCategory(null);
    setAssignedCoachesCount(0);
    setDoorOpened(false);
    setTimeRemaining(180);
  }, []);

  const handleGateSelection = useCallback((gateType: GateType) => {
    if (!isMounted.current) return;
    
    setPendingGateSelection(gateType);
    setShowGateConfirmation(true);
  }, []);

  const confirmGateSelection = useCallback((confirmed: boolean) => {
    if (!isMounted.current) return;
    
    setShowGateConfirmation(false);
    
    if (confirmed && pendingGateSelection) {
      setSelectedGate(pendingGateSelection);
      setShowCoachPopup(false);
      
      if (currentCoachNumber && coachNumbers.includes(currentCoachNumber)) {
        fetchFlightData(currentCoachNumber, pendingGateSelection);
      } else {
        setError('Invalid coach number. Please try again.');
        setAppState('GATE_SELECTION');
      }
    }
    
    if (!confirmed) {
      setPendingGateSelection(null);
    }
  }, [currentCoachNumber, fetchFlightData, pendingGateSelection]);

  const checkTimerStatus = useCallback(async (recordId: number) => {
    try {
      const { data, error } = await supabase
        .from('FlightRecords_BLR')
        .select('timer_start, timer_ends, disembarked_time')
        .eq('id', recordId)
        .single();

      if (error) throw error;
      if (!data) return null;

      return data;
    } catch (err) {
      console.error('Error checking timer status:', err);
      return null;
    }
  }, []);

  const confirmDisembark = async () => {
    if (!isMounted.current || !result?.id) return;
    
    try {
      // First check if disembarkation is already completed
      const timerStatus = await checkTimerStatus(result.id);
      if (timerStatus?.disembarked_time) {
        setMessage('Disembarkation already completed!');
        setAppState('ACTION_COMPLETE');
        return;
      }

      // Calculate IST time (UTC+5:30)
      const now = new Date();
      const timezoneOffset = 5.5 * 60 * 60 * 1000;
      const disembarkedTime = new Date(now.getTime() + timezoneOffset).toISOString();

      const { data: updatedData, error: updateError } = await supabase
        .from('FlightRecords_BLR')
        .update({
          Status: 'Closed',
          Verification_Status: 'Completed',
          disembarked_time: disembarkedTime,
          timer_start: null,
          timer_ends: null
        })
        .eq('id', result.id)
        .select();

      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }

      if (!updatedData || updatedData.length === 0) {
        throw new Error('No data returned after update');
      }

      setResult(updatedData[0]);
      setMessage('Disembarkation completed successfully!');
      setAppState('ACTION_COMPLETE');
      
      resetTimerRef.current = setTimeout(() => {
        if (isMounted.current) {
          resetState();
        }
      }, 2000);
    } catch (err) {
      console.error('Error confirming disembarkation:', err);
      setError('Error confirming disembarkation. Please try again.');
      setAppState('RESULT');
      setDoorOpened(false);
    }
  };

  const handleOpenDoor = useCallback(async () => {
    if (!isMounted.current || !result?.id) return;
    
    try {
      setDoorOpened(true);
      
      // Calculate timer start and end times in IST (UTC+5:30)
      const now = new Date();
      const timezoneOffset = 5.5 * 60 * 60 * 1000;
      const timerStart = new Date(now.getTime() + timezoneOffset).toISOString();
      const timerEnds = new Date(now.getTime() + timezoneOffset + (180 * 1000)).toISOString();

      const { error: updateError } = await supabase
        .from('FlightRecords_BLR')
        .update({
          timer_start: timerStart,
          timer_ends: timerEnds
        })
        .eq('id', result.id);

      if (updateError) throw updateError;

      setAppState('DOOR_OPENED');
      
      // Start polling the backend for timer completion
      const timerCheckInterval = setInterval(async () => {
        try {
          const timerStatus = await checkTimerStatus(result.id);
          if (!timerStatus) return;

          // Check if disembarked_time is set (completed by backend)
          if (timerStatus.disembarked_time) {
            clearInterval(timerCheckInterval);
            confirmDisembark();
            return;
          }

          // Update remaining time if timer_ends exists
          if (timerStatus.timer_ends) {
            const endsAt = new Date(timerStatus.timer_ends).getTime();
            const now = new Date().getTime();
            const remaining = Math.max(0, Math.floor((endsAt - now) / 1000));
            setTimeRemaining(remaining);
            
            if (remaining <= 0) {
              clearInterval(timerCheckInterval);
              confirmDisembark();
            }
          }
        } catch (err) {
          console.error('Error checking timer status:', err);
          clearInterval(timerCheckInterval);
        }
      }, 1000);

      return () => clearInterval(timerCheckInterval);
    } catch (err) {
      console.error('Error opening door:', err);
      setDoorOpened(false);
      setAppState('RESULT');
    }
  }, [result?.id, checkTimerStatus, confirmDisembark]);

  const handleConfirmation = useCallback(async (confirmed: boolean, category: FlightCategory = null) => {
    if (!isMounted.current) return;
    
    setShowConfirmationModal(false);
    if (confirmed && result) {
      setAppState('ACTION_PROCESSING');
    
      try {
        const now = new Date();
        const timezoneOffset = 5.5 * 60 * 60 * 1000;
        const acceptedTime = new Date(now.getTime() + timezoneOffset).toISOString();
        
        if (!result.id) {
          throw new Error('Cannot update record: missing record ID');
        }

        const updateData = {
          Status: 'Accepted',
          Verification_Status: 'Accepted',
          Accepted_time: acceptedTime,
          ...(category && { FlightCategory: category })
        };

        const { data: updatedData, error: updateError } = await supabase
          .from('FlightRecords_BLR')
          .update(updateData)
          .eq('id', result.id)
          .select();

        if (updateError) throw updateError;
        if (!updatedData) throw new Error('No data returned after update');

        setResult(updatedData[0]);
        setMessage('Status updated successfully!');
        
        setAppState('DOOR_OPENED');
        handleOpenDoor();
        
      } catch (err) {
        if (!isMounted.current) return;
        console.error('Error updating flight record:', err);
        setMessage(`Error updating status: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setAppState('RESULT');
      }
    }
  }, [result, handleOpenDoor]);

  useEffect(() => {
    isMounted.current = true;
    setCurrentCoachNumber(coachNo);
    
    return () => {
      isMounted.current = false;
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, [coachNo]);

  useEffect(() => {
    if (coachNo !== currentCoachNumber) {
      setCurrentCoachNumber(coachNo);
      resetState();
    }
  }, [coachNo, currentCoachNumber, resetState]);

  // Check for existing timer when component mounts with a result
  useEffect(() => {
    if (!result?.id) return;

    const checkExistingTimer = async () => {
      const timerStatus = await checkTimerStatus(result.id);
      if (!timerStatus) return;

      if (timerStatus.disembarked_time) {
        // Disembarkation already completed
        setMessage('Disembarkation already completed!');
        setAppState('ACTION_COMPLETE');
        return;
      }

      if (timerStatus.timer_ends) {
        // Timer is running on the backend
        setDoorOpened(true);
        setAppState('DOOR_OPENED');
        
        // Calculate remaining time
        const endsAt = new Date(timerStatus.timer_ends).getTime();
        const now = new Date().getTime();
        const remaining = Math.max(0, Math.floor((endsAt - now) / 1000));
        setTimeRemaining(remaining);

        // Start polling for updates
        const timerCheckInterval = setInterval(async () => {
          const updatedStatus = await checkTimerStatus(result.id);
          if (!updatedStatus) return;

          if (updatedStatus.disembarked_time) {
            clearInterval(timerCheckInterval);
            confirmDisembark();
            return;
          }

          const updatedEndsAt = new Date(updatedStatus.timer_ends).getTime();
          const updatedNow = new Date().getTime();
          const updatedRemaining = Math.max(0, Math.floor((updatedEndsAt - updatedNow) / 1000));
          setTimeRemaining(updatedRemaining);

          if (updatedRemaining <= 0) {
            clearInterval(timerCheckInterval);
            confirmDisembark();
          }
        }, 1000);

        return () => clearInterval(timerCheckInterval);
      }
    };

    checkExistingTimer();
  }, [result?.id, checkTimerStatus, confirmDisembark]);

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
        <span className="text-gray-600">Coach Number:</span>
        <span className="font-semibold">{result.coach_number}</span>
      </p>
      {assignedCoachesCount > 0 && (
        <p className="flex justify-between text-xs">
          <span className="text-gray-600">Assigned Coaches:</span>
          <span className="font-semibold text-blue-600">{assignedCoachesCount}</span>
        </p>
      )}
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
                className="w-full flex items-center justify-center py-8 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <span className="text-lg font-medium">DOMESTIC</span>
              </button>
              <button
                onClick={() => handleGateSelection('INTERNATIONAL')}
                className="w-full flex items-center justify-center py-8 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                <span className="text-lg font-medium">INTERNATIONAL</span>
              </button>
            </div>
          </div>
        );
        
      case 'PROCESSING':
        return (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mb-3"></div>
            <p className="text-gray-600 text-sm">Processing coach {currentCoachNumber}...</p>
          </div>
        );
        
      case 'RESULT':
        return result && (
          <div className="mt-4 w-full">
            <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-green-50 border border-blue-100">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-semibold text-gray-800">Flight Details</h3>
                <button 
                  onClick={resetState} 
                  className="p-1 text-gray-500 hover:bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-400"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <FlightDetails result={result} />
              
              <div className="mt-4 space-y-2">
                {!showOtherOptions && (
                  <>
                    <button
                      onClick={() => setShowConfirmationModal(true)}
                      className="w-full flex items-center justify-center bg-green-500 text-white py-2 px-3 rounded-lg hover:bg-green-600 transition-colors text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
                      disabled={result.Verification_Status === 'Accepted'}
                    >
                      {result.Verification_Status === 'Accepted' ? 'Already Accepted' : 'Confirm'}
                    </button>
                    <button
                      onClick={() => setShowOtherOptions(true)}
                      className="w-full flex items-center justify-center bg-purple-500 text-white py-2 px-3 rounded-lg hover:bg-purple-600 transition-colors text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50"
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
                      className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      className={`w-full flex items-center justify-center py-2 px-3 rounded-lg transition-colors text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                        selectedCategory 
                          ? 'bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-500' 
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed focus:ring-gray-400'
                      }`}
                    >
                      Confirm Special Category
                    </button>
                    <button
                      onClick={() => {
                        setShowOtherOptions(false);
                        setSelectedCategory(null);
                      }}
                      className="w-full flex items-center justify-center bg-gray-300 text-gray-800 py-2 px-3 rounded-lg hover:bg-gray-400 transition-colors text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
        
      case 'DOOR_OPENED':
        return result && (
          <div className="mt-4 w-full">
            <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-green-50 border border-blue-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Flight Details</h3>
              <FlightDetails result={result} />
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
                <button 
                  onClick={resetState} 
                  className="p-1 text-gray-500 hover:bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-400"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2 mb-4">
                <p className="text-red-600 font-medium text-center text-sm">
                  Go To The {result.flight_type?.toUpperCase().includes('DOMESTIC') ? 'DOMESTIC' : 'INTERNATIONAL'} Gate
                </p>
                
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <FlightDetails result={result} />
                </div>
              </div>
              
              <button
                onClick={handleRedirect}
                className="w-full flex items-center justify-center bg-blue-500 text-white py-2 px-3 rounded-lg hover:bg-blue-600 transition-colors text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                disabled={isRedirecting}
              >
                {isRedirecting ? 'Processing...' : 'Redirect'}
              </button>
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

        {showCoachPopup && currentCoachNumber && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
            <p className="text-gray-600 text-sm mb-1">Processing Coach Number</p>
            <h3 className="text-2xl font-bold text-blue-700">{currentCoachNumber}</h3>
            <p className="text-xs text-gray-500 mt-1">Please select gate type to proceed</p>
          </div>
        )}

        <div className="text-center w-full">
          {renderScreenContent()}
        </div>
      </div>

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
                className="w-full bg-blue-500 text-white py-2 px-3 rounded-lg hover:bg-blue-600 transition-colors text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Yes
              </button>
              <button
                onClick={() => confirmGateSelection(false)}
                className="w-full bg-gray-300 text-gray-800 py-2 px-3 rounded-lg hover:bg-gray-400 transition-colors text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}
      
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