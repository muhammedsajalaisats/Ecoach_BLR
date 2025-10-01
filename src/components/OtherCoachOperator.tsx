import React, { useState, useEffect } from 'react';
import { X, Search, CheckCircle, ChevronLeft } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { useParams, useNavigate } from 'react-router-dom';

const supabaseUrl = 'https://oqxpbtvzaqwznzjcwjdd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xeHBidHZ6YXF3em56amN3amRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NjI2MjQsImV4cCI6MjA3MjAzODYyNH0.E_B9WhK5QGncAyI_xnnO0gzpbWaHoBdDs4SfBQmkI9U';
const supabase = createClient(supabaseUrl, supabaseKey);

interface FlightRecord {
  id: number;
  flight_number: string;
  flight_type: string;
  flight_name: string;
  coach_number: string;
  created_at: string;
  Status: string;
  Verification_Status?: string;
  Other_Coach_Name?: string;
  Other_Coach_Number?: string;
}

export function OtherCoachStatus() {
  const { flightNumber: flightNumberParam } = useParams<{ flightNumber: string }>();
  const navigate = useNavigate();
  const [flightNumber, setFlightNumber] = useState<string>(flightNumberParam || '');
  const [searchResults, setSearchResults] = useState<FlightRecord[]>([]);
  const [selectedCoach, setSelectedCoach] = useState<FlightRecord | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showFlightInput, setShowFlightInput] = useState(!flightNumberParam);

  // Automatically search for flights when flightNumberParam is present
  useEffect(() => {
    if (flightNumberParam) {
      setFlightNumber(flightNumberParam);
      searchFlights(flightNumberParam);
    }
  }, [flightNumberParam]);

  const searchFlights = async (flightNum?: string) => {
    const flightToSearch = flightNum || flightNumber.trim();
    setError('');
    setIsLoading(true);
    
    if (!flightToSearch) {
      setError('Please enter a flight number');
      setIsLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('FlightRecords_BLR')
        .select('*')
        .eq('flight_number', flightToSearch)
        .eq('Status', 'Open')
        .eq('coach_number', 'OT-01'); // Filter for OT-01 coaches only

      if (fetchError) {
        console.error('Error fetching flight data:', fetchError.message);
        setError('Error fetching flight data. Please try again.');
        setIsLoading(false);
        return;
      }

      if (!data || data.length === 0) {
        setError('No open coaches found for this flight number.');
        setSearchResults([]);
        setIsLoading(false);
        return;
      }

      setSearchResults(data);
      setShowFlightInput(false);
    } catch (error) {
      console.error('Error processing flight data:', error);
      setError('Error processing flight data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectCoach = (coach: FlightRecord) => {
    setSelectedCoach(coach);
  };

  const confirmAcknowledgment = async () => {
    if (!selectedCoach) return;
    
    setIsUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from('FlightRecords_BLR')
        .update({ Status: 'Acknowledged' })
        .eq('id', selectedCoach.id);

      if (error) throw error;
      
      setMessage(`Coach ${selectedCoach.Other_Coach_Number || selectedCoach.coach_number} acknowledged successfully!`);
      
      // After successful acknowledgment, refresh the list of open flights
      setTimeout(async () => {
        // Remove the acknowledged coach from the list
        setSearchResults(prev => prev.filter(item => item.id !== selectedCoach.id));
        setSelectedCoach(null);
        
        // If no more coaches left, go back to flight search
        if (searchResults.length <= 1) {
          resetView();
        }
      }, 2000);
    } catch (error) {
      console.error('Error updating status:', error);
      setError('Failed to update status. Please try again.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const resetView = () => {
    setFlightNumber('');
    setSearchResults([]);
    setSelectedCoach(null);
    setError('');
    setMessage('');
    setShowFlightInput(true);
    navigate('/other-coach-status');
  };

  // Flight input screen (only shown if no flight number in URL)
  if (showFlightInput) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-100 p-4">
        <div className="max-w-md w-full mx-auto mt-16">
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-6">
              <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">Coach Acknowledgment</h1>
              <p className="text-gray-600 text-center mb-6">Enter flight number to begin</p>
              
              <div className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    id="flightNumber"
                    value={flightNumber}
                    onChange={(e) => setFlightNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. AI123"
                    className="w-full p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg shadow-sm"
                    onKeyPress={(e) => e.key === 'Enter' && searchFlights()}
                  />
                  {flightNumber && (
                    <button 
                      onClick={() => setFlightNumber('')}
                      className="absolute right-14 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                  <button 
                    onClick={() => searchFlights()}
                    disabled={isLoading}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    <Search className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              {error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg mb-4 text-sm flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}
              
              <button
                onClick={() => searchFlights()}
                disabled={isLoading || !flightNumber.trim()}
                className={`w-full flex items-center justify-center gap-2 py-3 px-6 rounded-lg transition-colors ${
                  isLoading || !flightNumber.trim() 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <span className="h-2 w-2 bg-white rounded-full mx-0.5 animate-bounce"></span>
                    <span className="h-2 w-2 bg-white rounded-full mx-0.5 animate-bounce" style={{animationDelay: '0.2s'}}></span>
                    <span className="h-2 w-2 bg-white rounded-full mx-0.5 animate-bounce" style={{animationDelay: '0.4s'}}></span>
                  </span>
                ) : (
                  <span className="text-lg font-medium">Search Coaches</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading state while fetching data
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex justify-center items-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-lg text-gray-600">Loading flight {flightNumber}...</p>
        </div>
      </div>
    );
  }

  // Coach selection screen for a flight
  if (searchResults.length > 0 && !selectedCoach) {
    const firstRecord = searchResults[0];
    const isDomestic = firstRecord?.flight_type?.toUpperCase() === 'DOMESTIC ARRIVAL';
    const headerBgColor = isDomestic ? 'bg-blue-600' : 'bg-red-600';
    
    return (
      <div className="min-h-screen bg-gray-50">
        <div className={`${headerBgColor} text-white p-6 shadow-md`}>
          <div className="flex items-center mb-6">
            <button 
              onClick={resetView} 
              className="mr-4 p-1 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-xl font-bold">{firstRecord.flight_number}</h1>
              <p className="text-sm opacity-90">{firstRecord.flight_type.toUpperCase()}</p>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">Select Coach</h2>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              {searchResults.length} coaches
            </span>
          </div>
          
          {message && (
            <div className="p-3 bg-green-50 text-green-700 rounded-lg mb-4 flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              {message}
            </div>
          )}
          
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}
          
          <div className="space-y-3">
            {searchResults.map((record) => (
              <button
                key={record.id}
                onClick={() => selectCoach(record)}
                className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-all"
              >
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-3 ${
                    record.Status === 'Open' ? 'bg-green-500' : 'bg-yellow-500'
                  }`}></div>
                  <div>
                    <p className="text-lg font-medium text-left">{record.Other_Coach_Name || 'Other Coach'}</p>
                    <p className="text-sm text-gray-500 text-left">Coach Number: {record.Other_Coach_Number || 'N/A'}</p>
                  </div>
                </div>
                <div className="text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Coach details and acknowledgment screen
  if (selectedCoach) {
    const isDomestic = selectedCoach?.flight_type?.toUpperCase() === 'DOMESTIC ARRIVAL';
    const bgColor = isDomestic ? 'bg-blue-600' : 'bg-red-600';
    const textColor = 'text-white';

    return (
      <div className="min-h-screen bg-gray-50">
        <div className={`${bgColor} ${textColor} p-6`}>
          <div className="flex items-center mb-6">
            <button
              onClick={() => setSelectedCoach(null)}
              className="mr-4 p-1 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold">Coach Details</h1>
          </div>

          <div className="bg-white bg-opacity-20 rounded-xl p-4 mb-4">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm opacity-80">Flight Number</p>
              <p className="text-lg font-bold">{selectedCoach.flight_number}</p>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-sm opacity-80">Coach Name</p>
              <p className="text-lg font-bold">{selectedCoach.Other_Coach_Name || 'N/A'}</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
            <div className="space-y-4">
              <div className="flex justify-between">
                <p className="text-gray-600">Flight Type</p>
                <p className="font-medium">{selectedCoach.flight_type.toUpperCase()}</p>
              </div>
              <div className="flex justify-between">
                <p className="text-gray-600">Coach Number</p>
                <p className="font-medium">{selectedCoach.Other_Coach_Number || 'N/A'}</p>
              </div>
              <div className="flex justify-between">
                <p className="text-gray-600">Status</p>
                <p className="font-medium">{selectedCoach.Status}</p>
              </div>
            </div>
          </div>

          {(message || error) && (
            <div className={`p-3 rounded-lg mb-6 flex items-center ${
              message ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {message ? (
                <CheckCircle className="w-5 h-5 mr-2" />
              ) : (
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {message || error}
            </div>
          )}

          <button
            onClick={confirmAcknowledgment}
            disabled={isUpdatingStatus}
            className={`w-full flex items-center justify-center gap-2 py-4 px-6 rounded-lg transition-colors ${
              isUpdatingStatus 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-700 text-white shadow-md'
            }`}
          >
            {isUpdatingStatus ? (
              <span className="flex items-center">
                Processing
                <span className="ml-2 flex">
                  <span className="h-2 w-2 bg-white rounded-full mx-0.5 animate-bounce"></span>
                  <span className="h-2 w-2 bg-white rounded-full mx-0.5 animate-bounce" style={{animationDelay: '0.2s'}}></span>
                  <span className="h-2 w-2 bg-white rounded-full mx-0.5 animate-bounce" style={{animationDelay: '0.4s'}}></span>
                </span>
              </span>
            ) : (
              <span className="text-lg font-medium flex items-center">
                ACKNOWLEDGE COACH
                <CheckCircle className="ml-2 w-5 h-5" />
              </span>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Fallback state when no coaches found
  return (
    <div className="min-h-screen bg-gray-50 p-8 flex justify-center items-center">
      <div className="text-center max-w-md">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="text-xl font-bold text-gray-800 mb-2">No Coaches Found</h2>
          <p className="text-gray-600 mb-6">No open coaches were found for flight {flightNumber}.</p>
          <button
            onClick={resetView}
            className="w-full py-3 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Search Another Flight
          </button>
        </div>
      </div>
    </div>
  );
}