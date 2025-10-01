//desmbark confirm page 
import React, { useState, ChangeEvent, FormEvent, useCallback } from 'react';
import { ScanBarcode, X } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oqxpbtvzaqwznzjcwjdd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xeHBidHZ6YXF3em56amN3amRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NjI2MjQsImV4cCI6MjA3MjAzODYyNH0.E_B9WhK5QGncAyI_xnnO0gzpbWaHoBdDs4SfBQmkI9U';
const supabase = createClient(supabaseUrl, supabaseKey);

const coachNumbers = [
  "PC-01", "PC-02", "PC-03", "PC-04", "PC-05",
  "PC-06", "PC-07", "PC-08", "PC-09", "PC-10",
  "PC-11", "PC-12", "PC-13", "PC-14", "PC-15",
  "PC-16", "PC-17", "PC-18", "PC-19", "PC-20",
  "PC-21", "PC-22", "PC-23", "PC-24", "PC-25", "PC-26","PC-100",
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

export function Coachoperatorf() {
  const [selectedCoach, setSelectedCoach] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [status, setStatus] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleCoachChange = useCallback(async (event: ChangeEvent<HTMLSelectElement>) => {
    const coach_number = event.target.value;
    setSelectedCoach(coach_number);
    setIsLoading(true);
    setError('');

    try {
      const { data: flightData, error: fetchError } = await supabase
        .from('FlightRecords_BLR')
        .select('*')
        .eq('coach_number', coach_number)
        .eq('Verification_Status', 'Accepted')
        .single();

      if (fetchError) {
        setError('This coach is not Accepted at any gate.');
        setResult(null);
        return;
      }

      if (!flightData) {
        setError('No Accepted flight record found for this coach number.');
        setResult(null);
        return;
      }

      setResult(flightData);
      setStatus(flightData.Status || '');
    } catch (error) {
      setError('Error processing selection. Please try again.');
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resetScanner = useCallback(() => {
    setResult(null);
    setSelectedCoach(null);
    setStatus('');
    setMessage('');
    setError('');
  }, []);

  const handleSubmit = useCallback(async (event: FormEvent) => {
    event.preventDefault();
    if (result) {
      setIsLoading(true);
      try {
        // Get the current time in Indian Standard Time (IST)
        const now = new Date();
        const timezoneOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
        const disembarkedTime = new Date(now.getTime() + timezoneOffset).toISOString();

        // Update Verification_Status to "Completed" and set disembarked_time
        const { error: updateError } = await supabase
          .from('FlightRecords_BLR')
          .update({ 
            Status: 'Closed', // Close the flight
            Verification_Status: 'Completed', 
            disembarked_time: disembarkedTime 
          })
          .eq('id', result.id);

        if (updateError) throw updateError;

        setMessage('Verification status updated successfully!');
        setTimeout(resetScanner, 2000);
      } catch (error) {
        setMessage('Error updating verification status. Please try again.');
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    }
  }, [result, resetScanner]);

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center gap-3 mb-8">
          <ScanBarcode className="w-8 h-8 text-blue-500" />
          <h2 className="text-lg font-bold text-gray-800">Confirm Disembark</h2>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-800 rounded-lg">
            {error}
          </div>
        )}

        {!result && (
          <select
            onChange={handleCoachChange}
            value={selectedCoach || ''}
            className="w-full bg-white border border-gray-300 text-gray-900 py-3 px-4 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          >
            <option value="" disabled>Select a Coach Number </option>
            {coachNumbers.map((coach) => (
              <option key={coach} value={coach}>{coach}</option>
            ))}
          </select>
        )}

        {result && (
          <div className="mt-6 animate-fade-in">
            <div className="p-6 rounded-lg bg-gradient-to-r from-blue-50 to-green-50 border border-blue-100">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold text-gray-800">Flight Details</h3>
                <button
                  onClick={resetScanner}
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Close flight details"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <p className="flex justify-between text-xs">
                  <span className="text-gray-600">Flight Number:</span>
                  <span className="font-semibold">{result.flight_number}</span>
                </p>
                <p className="flex justify-between text-xs">
                  <span className="text-gray-600">Flight Name:</span>
                  <span className="font-semibold">{result.flight_name}</span>
                </p>
                <p className="flex justify-between text-xs">
                  <span className="text-gray-600">Type:</span>
                  <span className={`font-semibold ${
                    result.flight_type?.toUpperCase() === 'DOMESTIC ARRIVAL' ? 'text-blue-600' : 'text-red-600'
                  }`}>
                    {result.flight_type.toUpperCase()}
                  </span>
                </p>
                <p className="flex justify-between text-xs">
                  <span className="text-gray-600">Coach Number:</span>
                  <span className="font-semibold">{result.coach_number}</span>
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-6">
                <div className="flex flex-col gap-3">
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Processing...' : 'Confirm Disembark'}
                  </button>
                </div>
              </form>

              {message && (
                <div className={`mt-4 p-3 rounded-lg ${
                  message.includes('successfully') ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'
                }`}>
                  {message}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}