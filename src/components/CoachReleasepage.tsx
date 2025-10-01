import React, { useState, ChangeEvent, FormEvent } from 'react';
import { ScanBarcode, X, AlertCircle } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with proper headers
const supabaseUrl = 'https://oqxpbtvzaqwznzjcwjdd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xeHBidHZ6YXF3em56amN3amRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NjI2MjQsImV4cCI6MjA3MjAzODYyNH0.E_B9WhK5QGncAyI_xnnO0gzpbWaHoBdDs4SfBQmkI9U';

const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  }
});

// Coach numbers array
const coachNumbers = [
   "PC-01", "PC-02", "PC-03", "PC-04", "PC-05", "PC-06", "PC-07", "PC-08", "PC-09", "PC-10",
  "PC-11", "PC-12", "PC-13", "PC-14", "PC-15", "PC-16", "PC-17", "PC-18", "PC-19", "PC-20",
  "PC-21", "PC-22", "PC-23", "PC-24", "PC-25", "PC-26", "OT-01",
];

export function CoachReleasePage() {
  // State management
  const [selectedCoach, setSelectedCoach] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  const [showError, setShowError] = useState<boolean>(false);
  const [confirmationMessage, setConfirmationMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleCoachChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setSelectedCoach(event.target.value);
    setShowSuccess(false);
    setShowError(false);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedCoach) {
      setErrorMessage('Please select a coach number');
      setShowError(true);
      return;
    }
    setConfirmationMessage(`Are you sure you want to release Coach ${selectedCoach}?`);
    setShowConfirmation(true);
  };

  const confirmAction = async () => {
    setShowConfirmation(false);
    setIsLoading(true);
    setShowError(false);
    
    try {
      // First, find the most recent record for the selected coach
      const { data: latestRecord, error: fetchError } = await supabase
        .from('FlightRecords_BLR')
        .select('id, coach_number, Status')
        .eq('coach_number', selectedCoach)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError) {
        throw new Error(fetchError.message || 'Failed to fetch coach record');
      }

      if (!latestRecord || !latestRecord.id) {
        throw new Error(`No active record found for Coach ${selectedCoach}`);
      }

      if (latestRecord.Status === 'Closed') {
        throw new Error(`Coach ${selectedCoach} is already released`);
      }

      // Then update the status of that record
      const { error: updateError } = await supabase
        .from('FlightRecords_BLR')
        .update({ 
          Status: 'Closed',
          Verification_Status : 'Completed'
        })
        .eq('id', latestRecord.id);

      if (updateError) {
        throw new Error(updateError.message || 'Failed to update coach status');
      }

      setConfirmationMessage(`Coach ${selectedCoach} has been successfully released!`);
      setShowSuccess(true);
      
      // Reset form after 3 seconds
      setTimeout(() => {
        setShowSuccess(false);
        setSelectedCoach(null);
      }, 3000);
    } catch (error) {
      console.error('Error updating record:', error);
      setErrorMessage(error instanceof Error ? error.message : 'An unexpected error occurred');
      setShowError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const cancelAction = () => {
    setShowConfirmation(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="bg-white rounded-xl shadow-lg p-8 relative">
        <div className="flex items-center gap-3 mb-8">
          <ScanBarcode className="w-8 h-8 text-blue-500" />
          <h2 className="text-lg font-bold text-gray-800">Release Coach</h2>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="coach-select" className="block text-sm font-medium text-gray-700 mb-1">
              Coach Number
            </label>
            <select
              id="coach-select"
              onChange={handleCoachChange}
              value={selectedCoach || ''}
              className="w-full bg-white border border-gray-300 text-gray-900 py-3 px-4 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading || showSuccess}
              required
            >
              <option value="" disabled>Select a Coach Number</option>
              {coachNumbers.map((coach) => (
                <option key={coach} value={coach}>{coach}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            disabled={isLoading || !selectedCoach || showSuccess}
          >
            {isLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              'Release Coach'
            )}
          </button>
        </form>

        {/* Confirmation Dialog */}
        {showConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
              <div className="flex items-start gap-3 mb-4">
                <AlertCircle className="w-6 h-6 text-yellow-500 mt-0.5" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Confirm Action</h3>
                  <p className="text-sm text-gray-600 mt-1">{confirmationMessage}</p>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={cancelAction}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAction}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Yes, Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {showSuccess && (
          <div className="mt-6 animate-fade-in">
            <div className="p-6 rounded-lg bg-gradient-to-r from-green-50 to-blue-50 border border-green-200">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold text-gray-800">Success</h3>
                <button
                  onClick={() => setShowSuccess(false)}
                  className="p-1 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Close confirmation"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-gray-700">{confirmationMessage}</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {showError && (
          <div className="mt-6 animate-fade-in">
            <div className="p-6 rounded-lg bg-gradient-to-r from-red-50 to-pink-50 border border-red-200">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold text-gray-800">Error</h3>
                <button
                  onClick={() => setShowError(false)}
                  className="p-1 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Close error message"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-gray-700">{errorMessage}</p>
              <button
                onClick={() => setShowConfirmation(true)}
                className="mt-3 text-sm text-blue-600 hover:text-blue-800"
              >
                Try again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}