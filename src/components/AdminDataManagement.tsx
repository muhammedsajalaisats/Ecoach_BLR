import React, { useState } from 'react';
import { Download, Upload, Trash2 } from 'lucide-react';
import { getFlightRecords, saveFlightDetails, checkFlightNumberExists, clearFlightRecords } from '../db';
import * as XLSX from 'xlsx';

export function AdminDataManagement() {
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [flightDetails, setFlightDetails] = useState({
    flightName: '',
    flightNumber: '',
    flightType: '',
    origin: ''
  });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showClearConfirmation, setShowClearConfirmation] = useState(false);
  const [clearStatus, setClearStatus] = useState<'idle' | 'clearing' | 'success' | 'error'>('idle');
  const [recordCount, setRecordCount] = useState(0);

  const handleDownload = async () => {
    try {
      setDownloadStatus('loading');
      
      let allRecords: any[] = [];
      let offset = 0;
      const limit = 1000;
      let hasMore = true;

      while (hasMore) {
        const batch = await getFlightRecords(offset, limit);
        if (!batch || batch.length === 0) {
          hasMore = false;
          break;
        }
        allRecords = [...allRecords, ...batch];
        offset += batch.length;
        
        // Small delay to prevent UI freeze
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (allRecords.length === 0) {
        setDownloadStatus('error');
        setValidationError('No records found to download.');
        setTimeout(() => {
          setDownloadStatus('idle');
          setValidationError(null);
        }, 3000);
        return;
      }

      setRecordCount(allRecords.length);

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(allRecords);

      const colWidths: {wch: number}[] = [];
      const headers = Object.keys(allRecords[0] || {});
      headers.forEach((header, index) => {
        const maxLength = Math.max(
          header.length,
          ...allRecords.map(row => (row[header] ? row[header].toString().length : 0))
        );
        colWidths[index] = { wch: Math.min(maxLength + 2, 50) };
      });
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, 'Flight Records');
      XLSX.writeFile(wb, `flight_records_${new Date().toISOString().split('T')[0]}.xlsx`);

      setDownloadStatus('success');
      setTimeout(() => {
        setDownloadStatus('idle');
        setRecordCount(0);
      }, 5000);
    } catch (error) {
      console.error('Error downloading records:', error);
      setDownloadStatus('error');
      setValidationError('Failed to download records. Please try again.');
      setTimeout(() => {
        setDownloadStatus('idle');
        setValidationError(null);
      }, 3000);
    }
  };

  const handleClearConfirmation = () => setShowClearConfirmation(true);
  const handleClearDatabase = async () => {
    setShowClearConfirmation(false);
    try {
      setClearStatus('clearing');
      await clearFlightRecords();
      setClearStatus('success');
      setTimeout(() => setClearStatus('idle'), 3000);
    } catch (error) {
      console.error('Error clearing database:', error);
      setClearStatus('error');
      setTimeout(() => setClearStatus('idle'), 3000);
    }
  };

  const validateInputs = () => {
    if (!flightDetails.flightName || !flightDetails.flightNumber || !flightDetails.flightType || !flightDetails.origin) {
      setValidationError('All fields are required.');
      return false;
    }
    setValidationError(null);
    return true;
  };

  const handleSaveConfirmation = () => {
    if (!validateInputs()) return;
    setShowConfirmation(true);
  };

  const handleSave = async () => {
    setShowConfirmation(false);
    try {
      const flightExists = await checkFlightNumberExists(flightDetails.flightNumber);
      if (flightExists) {
        setValidationError('Flight number already exists.');
        setSaveStatus('idle');
        return;
      }

      setSaveStatus('saving');
      await saveFlightDetails(
        flightDetails.flightNumber,
        flightDetails.flightType,
        flightDetails.flightName,
        flightDetails.origin
      );
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
      setFlightDetails({ flightName: '', flightNumber: '', flightType: '', origin: '' });
    } catch (error) {
      console.error('Error saving flight record:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const updatedValue = name === 'flightNumber' ? value.toUpperCase() : value;
    setFlightDetails({ ...flightDetails, [name]: updatedValue });
    setValidationError(null);
  };

  const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
    const { name, value } = e.currentTarget;
    if (name === 'flightNumber' && /[a-z]/.test(value)) {
      e.currentTarget.value = value.toUpperCase();
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="space-y-8">
          {/* Add Flight Details Section */}
          <div className="p-6 rounded-lg bg-gray-50">
            <div className="flex items-center gap-2 mb-4">
              <Upload className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-semibold text-gray-800">Add Flight Details</h3>
            </div>
            
            {validationError && (
              <div className="mt-3 p-2 text-center text-red-600 bg-red-50 rounded-lg">
                {validationError}
              </div>
            )}

            <input
              type="text"
              name="flightNumber"
              value={flightDetails.flightNumber}
              onChange={handleChange}
              onInput={handleInput}
              placeholder="Flight Number"
              className="w-full p-2 mb-3 border rounded-lg"
            />
            <select
              name="flightType"
              value={flightDetails.flightType}
              onChange={handleChange}
              className="w-full p-2 mb-3 border rounded-lg"
            >
              <option value="" disabled>Select Flight Type</option>
              <option value="Domestic Arrival">Domestic Arrival</option>
              <option value="International Arrival">International Arrival</option>
            </select>
            <input
              type="text"
              name="flightName"
              value={flightDetails.flightName}
              onChange={handleChange}
              placeholder="Flight Name"
              className="w-full p-2 mb-3 border rounded-lg"
            />
            <input
              type="text"
              name="origin"
              value={flightDetails.origin}
              onChange={handleChange}
              placeholder="Origin"
              className="w-full p-2 mb-3 border rounded-lg"
            />
            <button
              onClick={handleSaveConfirmation}
              disabled={saveStatus === 'saving'}
              className="w-full flex items-center justify-center gap-2 bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-400"
            >
              {saveStatus === 'saving' ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Save Flight Details
                </>
              )}
            </button>

            {saveStatus === 'success' && (
              <div className="mt-3 p-2 text-center text-green-600 bg-green-50 rounded-lg">
                Flight details saved successfully!
              </div>
            )}
            {saveStatus === 'error' && (
              <div className="mt-3 p-2 text-center text-red-600 bg-red-50 rounded-lg">
                Error saving flight details. Please try again.
              </div>
            )}
          </div>

          {/* Download Records Section */}
          <div className="p-6 rounded-lg bg-gray-50">
            <div className="flex items-center gap-2 mb-4">
              <Download className="w-5 h-5 text-green-500" />
              <h3 className="text-lg font-semibold text-gray-800">Download Saved Records</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Download all saved flight records including flight numbers, types, names, and origins.
            </p>
            <div className="space-y-3">
              <button
                onClick={handleDownload}
                disabled={downloadStatus === 'loading'}
                className="w-full flex items-center justify-center gap-2 bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 transition-colors disabled:bg-gray-400"
              >
                {downloadStatus === 'loading' ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    Loading All Records...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Download All Records
                  </>
                )}
              </button>

              {/* <button
                onClick={handleClearConfirmation}
                disabled={clearStatus === 'clearing'}
                className="w-full flex items-center justify-center gap-2 bg-red-500 text-white py-3 px-4 rounded-lg hover:bg-red-600 transition-colors disabled:bg-gray-400"
              >
                {clearStatus === 'clearing' ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    Clearing...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-5 h-5" />
                    Clear Database
                  </>
                )}
              </button> */}

              <button
                onClick={() => window.location.href = '/coach-release'}
                className="w-full flex items-center justify-center gap-2 bg-purple-500 text-white py-3 px-4 rounded-lg hover:bg-purple-600 transition-colors"
              >
                Release Coach
              </button>
            </div>

            {downloadStatus === 'success' && (
              <div className="mt-3 p-2 text-center text-green-600 bg-green-50 rounded-lg">
                {recordCount > 0 ? `${recordCount} records downloaded successfully!` : 'Records downloaded successfully!'}
              </div>
            )}
            {downloadStatus === 'error' && (
              <div className="mt-3 p-2 text-center text-red-600 bg-red-50 rounded-lg">
                Error downloading records. Please try again.
              </div>
            )}

            {clearStatus === 'success' && (
              <div className="mt-3 p-2 text-center text-green-600 bg-green-50 rounded-lg">
                Database cleared successfully!
              </div>
            )}
            {clearStatus === 'error' && (
              <div className="mt-3 p-2 text-center text-red-600 bg-red-50 rounded-lg">
                Error clearing database. Please try again.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Confirmation Dialog */}
      {showConfirmation && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Confirm Save</h3>
            <p>Are you sure you want to save these flight details?</p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmation(false)}
                className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Database Confirmation Dialog */}
      {showClearConfirmation && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold mb-4 text-red-600">⚠️ Confirm Clear Database</h3>
            <p className="mb-2">Are you sure you want to clear all flight records from the database?</p>
            <p className="text-sm text-red-600 font-medium">This action cannot be undone!</p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setShowClearConfirmation(false)}
                className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleClearDatabase}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Yes, Clear Database
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}