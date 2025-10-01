
import React, { useState, useEffect } from 'react';
import { X, CheckCircle } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oqxpbtvzaqwznzjcwjdd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xeHBidHZ6YXF3em56amN3amRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NjI2MjQsImV4cCI6MjA3MjAzODYyNH0.E_B9WhK5QGncAyI_xnnO0gzpbWaHoBdDs4SfBQmkI9U';
const supabase = createClient(supabaseUrl, supabaseKey);

const coachNumbers = [
  "PC-01", "PC-02", "PC-03", "PC-04", "PC-05",
  "PC-06", "PC-07", "PC-08", "PC-09", "PC-10",
  "PC-11", "PC-12", "PC-13", "PC-14", "PC-15",
  "PC-16", "PC-17", "PC-18", "PC-19", "PC-20",
  "PC-21", "PC-22", "PC-23", "PC-24", "PC-25", "PC-26",
  "OT-01","PC-100", "PC-200", "PC-201", "PC-202", 
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
}

interface CoachStatusProps {
  coachNo: string;
}

export function CoachStatus({ coachNo }: CoachStatusProps) {
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isCompletingDisembark, setIsCompletingDisembark] = useState(false);
  const [message, setMessage] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [currentStatus, setCurrentStatus] = useState('');
  const [shouldPoll, setShouldPoll] = useState(true);
  const [showCoachPopup, setShowCoachPopup] = useState(true);
  const [doorOpened, setDoorOpened] = useState(false);
  const [disembarkTimer, setDisembarkTimer] = useState<NodeJS.Timeout | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(90); // 1 minute and 30 seconds in seconds
  const [isLoading, setIsLoading] = useState(false);

  // Load coach data immediately when component mounts or coachNo changes
  useEffect(() => {
    if (coachNo) {
      setShowCoachPopup(true);
      setIsLoading(true);
      // Fetch data after a short delay to show the coach number popup
      const timer = setTimeout(() => {
        fetchCoachData(coachNo);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [coachNo]);

  // Check status continuously when result exists
  useEffect(() => {
    if (!result?.id || !shouldPoll) return;

    const checkStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('FlightRecords_BLR')
          .select('Status')
          .eq('id', result.id)
          .single();

        if (!error && data?.Status) {
          setCurrentStatus(data.Status);
          // Stop polling once status is Accepted
          if (data.Status === 'Accepted') {
            setShouldPoll(false);
          }
        }
      } catch (err) {
        console.error('Error checking status:', err);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 2000);
    return () => clearInterval(interval);
  }, [result, shouldPoll]);

  // Countdown timer effect after door opened
  useEffect(() => {
    if (doorOpened && timeRemaining > 0) {
      const countdownTimer = setInterval(() => {
        setTimeRemaining(prevTime => {
          if (prevTime <= 1) {
            clearInterval(countdownTimer);
            // Auto trigger disembark when time reaches zero
            confirmDisembark();
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
      
      return () => clearInterval(countdownTimer);
    }
    
    // Clear timer when component unmounts or door is closed
    return () => {
      if (disembarkTimer) {
        clearTimeout(disembarkTimer);
      }
    };
  }, [doorOpened]);

  const fetchCoachData = async (coach_number: string) => {
    setError('');
    setCurrentStatus('');
    setShouldPoll(true);
    setShowCoachPopup(false);
    setIsLoading(true);
    
    if (!coach_number) {
      setError('No coach number provided.');
      setIsLoading(false);
      return;
    }

    if (!coachNumbers.includes(coach_number)) {
      setError('Invalid coach number.');
      setIsLoading(false);
      return;
    }

    try {
      const { data: flightData, error: fetchError } = await supabase
        .from('FlightRecords_BLR')
        .select('*')
        .eq('coach_number', coach_number)
        .eq('Status', 'Open')
        .single();

      if (fetchError) {
        console.error('Error fetching flight data:', fetchError.message);
        setError('This coach is not assigned to any gate.');
        setIsLoading(false);
        return;
      }

      if (!flightData) {
        setError('No open flight record found for this coach number.');
        setIsLoading(false);
        return;
      }

      setResult(flightData);
      setCurrentStatus(flightData.Status || '');
      setIsLoading(false);
    } catch (error) {
      console.error('Error processing coach data:', error);
      setError('Error processing coach data. Please try again.');
      setIsLoading(false);
    }
  };

  const resetView = () => {
    setResult(null);
    setError('');
    setMessage('');
    setShowConfirmation(false);
    setCurrentStatus('');
    setShouldPoll(true);
    setDoorOpened(false);
    setTimeRemaining(90); // Reset to 1 minute and 30 seconds (90 seconds)
    setIsLoading(false);
    if (disembarkTimer) {
      clearTimeout(disembarkTimer);
      setDisembarkTimer(null);
    }
  };

  const confirmCompletion = async () => {
    if (!result) return;
    
    setIsUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from('FlightRecords_BLR')
        .update({ Status: 'Acknowledged' })
        .eq('id', result.id);

      if (error) throw error;
      
      setMessage('Status updated to Acknowledged successfully!');
      setShowConfirmation(true);
    } catch (error) {
      console.error('Error updating status:', error);
      setError('Failed to update status. Please try again.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleOpenDoor = () => {
    setDoorOpened(true);
    setTimeRemaining(90); // Reset to 1 minute and 30 seconds (90 seconds)
  };

  const confirmDisembark = async () => {
    if (!result) return;
    
    // Clear the timer if it exists
    if (disembarkTimer) {
      clearTimeout(disembarkTimer);
      setDisembarkTimer(null);
    }
    
    setIsCompletingDisembark(true);
    try {
      const now = new Date();
      const timezoneOffset = 5.5 * 60 * 60 * 1000;
      const disembarkedTime = new Date(now.getTime() + timezoneOffset).toISOString();

      const { error: updateError } = await supabase
        .from('FlightRecords_BLR')
        .update({ 
          Status: 'Closed',
          Verification_Status: 'Completed', 
          disembarked_time: disembarkedTime 
        })
        .eq('id', result.id);

      if (updateError) throw updateError;

      setMessage('Disembarkation confirmed successfully!');
      setTimeout(resetView, 2000);
    } catch (error) {
      setError('Error confirming disembarkation. Please try again.');
      console.error('Error:', error);
    } finally {
      setIsCompletingDisembark(false);
    }
  };

  // Format remaining time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Coach number popup display
  if (showCoachPopup && coachNo) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-sm w-full mx-4 text-center">
          <h2 className="text-2xl font-bold mb-4">Coach Number</h2>
          <div className="bg-blue-100 p-6 rounded-lg mb-6">
            <p className="text-4xl font-bold text-blue-800">{coachNo}</p>
          </div>
          <div className="flex justify-center">
            <div className="animate-pulse flex items-center text-gray-600">
              <span className="mr-2">Loading coach data</span>
              <span className="flex">
                <span className="h-2 w-2 bg-gray-600 rounded-full mx-0.5 animate-bounce"></span>
                <span className="h-2 w-2 bg-gray-600 rounded-full mx-0.5 animate-bounce" style={{animationDelay: '0.2s'}}></span>
                <span className="h-2 w-2 bg-gray-600 rounded-full mx-0.5 animate-bounce" style={{animationDelay: '0.4s'}}></span>
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error display when no data found
  if (!result && error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-8">
          <div className="mb-4 text-center">
            <p className="text-xl font-bold">Coach Number</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">{coachNo}</p>
          </div>
          <div className="p-4 bg-red-100 text-red-800 rounded-lg">
            {error}
          </div>
          <button 
            onClick={resetView}
            className="w-full mt-6 bg-blue-500 hover:bg-blue-600 text-white py-3 px-6 rounded-lg text-center transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }
  
  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex justify-center items-center">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg max-w-md">
          <div className="mb-6">
            <p className="text-xl font-bold">Coach Number</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">{coachNo}</p>
          </div>
          <div className="flex justify-center items-center space-x-2">
            <svg className="animate-spin h-6 w-6 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-lg text-gray-600">Processing coach information...</p>
          </div>
        </div>
      </div>
    );
  }

  // No result but also no error and not loading - show completion message
  if (!result && !error && !isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex justify-center items-center">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg max-w-md">
          <div className="mb-6 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-gray-800">Process Complete</p>
          </div>
          <p className="text-gray-600 mb-6">All tasks have been completed successfully.</p>
          
        </div>
      </div>
    );
  }

  const isDomestic = result?.flight_type?.toUpperCase() === 'DOMESTIC ARRIVAL';
  const bgColor = isDomestic ? 'bg-blue-500' : 'bg-red-500';
  const textColor = 'text-white';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Flight Details */}
      {result && !showConfirmation && (
        <div className={`fixed inset-0 ${bgColor} ${textColor} p-6 flex flex-col`}>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Flight Details</h1>
            <button
              onClick={resetView}
              className="p-2 hover:bg-opacity-20 hover:bg-white rounded-full"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="bg-white bg-opacity-20 rounded-lg p-4 mb-6">
            <p className="text-sm opacity-80">Coach Number</p>
            <p className="text-3xl font-bold">{result.coach_number}</p>
          </div>
          <div className="bg-white bg-opacity-20 rounded-lg p-4 mb-6">
            <p className="text-sm opacity-80">Flight Number</p>
            <p className="text-3xl font-bold">{result.flight_number}</p>
          </div>

          <div className="space-y-5 mb-0">
            <div>
              <p className="text-sm opacity-80">Flight Type</p>
              <p className="text-2xl font-bold">
                {result.flight_type.toUpperCase()}
              </p>
            </div>
          </div>

          {(message || error) && (
            <div className={`mt-4 p-4 rounded-lg ${message ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {message || error}
            </div>
          )}

          <div className="mt-4">
            <button
              onClick={confirmCompletion}
              disabled={isUpdatingStatus}
              className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-4 px-6 rounded-lg transition-colors disabled:opacity-50"
            >
              <span className="text-lg font-medium">
                {isUpdatingStatus ? 'Processing...' : 'ACKNOWLEDGE'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Popup with Open The Door Message */}
      {showConfirmation && result && (
        <div className={`fixed inset-0 ${bgColor} ${textColor} p-6 flex flex-col justify-center items-center`}>
          <div className="bg-white bg-opacity-20 rounded-lg p-4 mb-8 w-full max-w-xs">
            <p className="text-sm opacity-80 text-center">Coach Number</p>
            <p className="text-3xl font-bold text-center">{result.coach_number}</p>
          </div>

          <div className="text-center mb-8">
            <p className="text-sm opacity-80">Flight Type</p>
            <p className="text-4xl font-bold">
              {result.flight_type.toUpperCase()}
            </p>
          </div>

          {currentStatus === 'Accepted' && (
            <>
              {!doorOpened ? (
                <button
                  onClick={handleOpenDoor}
                  className="w-full max-w-xs mb-6 bg-white text-black py-3 px-6 rounded-lg text-center hover:bg-gray-100 transition-colors"
                >
                  <p className="text-xl font-bold">Open The Door</p>
                </button>
              ) : (
                <>
                  <div className="mb-4 w-full max-w-xs bg-white bg-opacity-20 rounded-lg p-3 text-center">
                    <p className="text-sm opacity-80">Auto-disembark in</p>
                    <p className="text-2xl font-bold">{formatTime(timeRemaining)}</p>
                  </div>
                  <button
                    onClick={confirmDisembark}
                    disabled={isCompletingDisembark}
                    className="w-full max-w-xs flex items-center justify-center gap-2 bg-purple-500 hover:bg-purple-600 text-white py-4 px-6 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <span className="text-lg font-medium">
                      {isCompletingDisembark ? 'Processing...' : 'CONFIRM DISEMBARK'}
                    </span>
                  </button>
                </>
              )}
            </>
          )}

          {currentStatus !== 'Accepted' && (
            <div className="w-full max-w-xs p-4 bg-yellow-100 text-yellow-800 rounded-lg text-center">
              Waiting for status to be "Accepted"...
            </div>
          )}
        </div>
      )}
    </div>
  );
}