// import React, { useState } from 'react';
// import { Database, Download, Upload } from 'lucide-react';
// import { ExcelUploader } from './ExcelUploader';
// import { getFlightRecords, saveFlightDetails, checkFlightNumberExists } from '../db'; // Import the new function
// import * as XLSX from 'xlsx';



// export function AdminDataManagement() {
//   const [downloadStatus, setDownloadStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
//   const [flightDetails, setFlightDetails] = useState({ flightName: '', flightNumber: '', flightType: '' });
//   const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
//   const [validationError, setValidationError] = useState<string | null>(null);

//   const handleDownload = async () => {
//     try {
//       setDownloadStatus('loading');
//       const records = await getFlightRecords();

//       const wb = XLSX.utils.book_new();
//       const ws = XLSX.utils.json_to_sheet(records);

//       XLSX.utils.book_append_sheet(wb, ws, 'Flight Records');
//       XLSX.writeFile(wb, `flight_records_${new Date().toISOString().split('T')[0]}.xlsx`);

//       setDownloadStatus('success');
//       setTimeout(() => setDownloadStatus('idle'), 3000);
//     } catch (error) {
//       console.error('Error downloading records:', error);
//       setDownloadStatus('error');
//       setTimeout(() => setDownloadStatus('idle'), 3000);
//     }
//   };

//   const validateInputs = () => {
//     if (!flightDetails.flightName || !flightDetails.flightNumber || !flightDetails.flightType) {
//       setValidationError('All fields are required.');
//       return false;
//     }
//     setValidationError(null);
//     return true;
//   };

//   const handleSave = async () => {
//     if (!validateInputs()) {
//       return;
//     }

//     try {
//       // Check if flight number exists
//       const flightExists = await checkFlightNumberExists(flightDetails.flightNumber);
//       if (flightExists) {
//         setValidationError('Flight number already exists.');
//         setSaveStatus('idle');
//         return;
//       }

//       setSaveStatus('saving');
//       await saveFlightDetails(
//         flightDetails.flightNumber,
//         flightDetails.flightType,
//         flightDetails.flightName
//       );
//       setSaveStatus('success');
//       setTimeout(() => setSaveStatus('idle'), 3000);
//       setFlightDetails({ flightName: '', flightNumber: '', flightType: '' });
//     } catch (error) {
//       console.error('Error saving flight record:', error);
//       setSaveStatus('error');
//       setTimeout(() => setSaveStatus('idle'), 3000);
//     }
//   };

//   const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     setFlightDetails({ ...flightDetails, [e.target.name]: e.target.value });
//     setValidationError(null); // Reset validation error on input change
//   };

//   return (
//     <div className="max-w-2xl mx-auto p-8">
//       <div className="bg-white rounded-xl shadow-lg p-8">
//         <div className="flex items-center gap-3 mb-8">
//           <Database className="w-8 h-8 text-blue-500" />
//           <h2 className="text-2xl font-bold text-gray-800">Data Management</h2>
//         </div>

//         <div className="space-y-8">
//           <div className="p-6 rounded-lg bg-gray-50">
//             <div className="flex items-center gap-2 mb-4">
//               <Upload className="w-5 h-5 text-blue-500" />
//               <h3 className="text-lg font-semibold text-gray-800">Upload Flight Data</h3>
//             </div>
//             <ExcelUploader />
//           </div>

//           <div className="p-6 rounded-lg bg-gray-50">
//             <div className="flex items-center gap-2 mb-4">
//               <Upload className="w-5 h-5 text-blue-500" />
//               <h3 className="text-lg font-semibold text-gray-800">Add Flight Details</h3>
//             </div>
//             {validationError && (
//               <div className="mt-3 p-2 text-center text-red-600 bg-red-50 rounded-lg">
//                 {validationError}
//               </div>
//             )}
//             <input
//               type="text"
//               name="flightName"
//               value={flightDetails.flightName}
//               onChange={handleChange}
//               placeholder="Flight Name"
//               className="w-full p-2 mb-3 border rounded-lg"
//             />
//             <input
//               type="text"
//               name="flightNumber"
//               value={flightDetails.flightNumber}
//               onChange={handleChange}
//               placeholder="Flight Number"
//               className="w-full p-2 mb-3 border rounded-lg"
//             />
//             <input
//               type="text"
//               name="flightType"
//               value={flightDetails.flightType}
//               onChange={handleChange}
//               placeholder="Flight Type"
//               className="w-full p-2 mb-3 border rounded-lg"
//             />
//             <button
//               onClick={handleSave}
//               disabled={saveStatus === 'saving'}
//               className="w-full flex items-center justify-center gap-2 bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-400"
//             >
//               {saveStatus === 'saving' ? (
//                 <>
//                   <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
//                   Saving...
//                 </>
//               ) : (
//                 <>
//                   <Upload className="w-5 h-5" />
//                   Save Flight Details
//                 </>
//               )}
//             </button>

//             {saveStatus === 'success' && (
//               <div className="mt-3 p-2 text-center text-green-600 bg-green-50 rounded-lg">
//                 Flight details saved successfully!
//               </div>
//             )}
//             {saveStatus === 'error' && (
//               <div className="mt-3 p-2 text-center text-red-600 bg-red-50 rounded-lg">
//                 Error saving flight details. Please try again.
//               </div>
//             )}
//           </div>

//           <div className="p-6 rounded-lg bg-gray-50">
//             <div className="flex items-center gap-2 mb-4">
//               <Download className="w-5 h-5 text-green-500" />
//               <h3 className="text-lg font-semibold text-gray-800">Download Saved Records</h3>
//             </div>
//             <p className="text-gray-600 mb-4">
//               Download all saved flight records including flight numbers, types, names, and coach numbers.
//             </p>
//             <button
//               onClick={handleDownload}
//               disabled={downloadStatus === 'loading'}
//               className="w-full flex items-center justify-center gap-2 bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 transition-colors disabled:bg-gray-400"
//             >
//               {downloadStatus === 'loading' ? (
//                 <>
//                   <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
//                   Processing...
//                 </>
//               ) : (
//                 <>
//                   <Download className="w-5 h-5" />
//                   Download Excel File
//                 </>
//               )}
//             </button>

//             {downloadStatus === 'success' && (
//               <div className="mt-3 p-2 text-center text-green-600 bg-green-50 rounded-lg">
//                 Records downloaded successfully!
//               </div>
//             )}
//             {downloadStatus === 'error' && (
//               <div className="mt-3 p-2 text-center text-red-600 bg-red-50 rounded-lg">
//                 Error downloading records. Please try again.
//               </div>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
