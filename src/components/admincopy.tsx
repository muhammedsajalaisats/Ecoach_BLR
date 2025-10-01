// import React, { useState } from 'react';
// import { Database, Download, Upload } from 'lucide-react';
// import { ExcelUploader } from './ExcelUploader';
// import { getFlightRecords } from '../db';
// import * as XLSX from 'xlsx';

// export function AdminDataManagement() {
//   const [downloadStatus, setDownloadStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

//   const handleDownload = async () => {
//     try {
//       setDownloadStatus('loading');
//       const records = await getFlightRecords();
      
//       // Create workbook and worksheet
//       const wb = XLSX.utils.book_new();
//       const ws = XLSX.utils.json_to_sheet(records);

//       // Add worksheet to workbook
//       XLSX.utils.book_append_sheet(wb, ws, 'Flight Records');

//       // Generate Excel file
//       XLSX.writeFile(wb, `flight_records_${new Date().toISOString().split('T')[0]}.xlsx`);
      
//       setDownloadStatus('success');
//       setTimeout(() => setDownloadStatus('idle'), 3000);
//     } catch (error) {
//       console.error('Error downloading records:', error);
//       setDownloadStatus('error');
//       setTimeout(() => setDownloadStatus('idle'), 3000);
//     }
//   };

//   return (
//     <div className="max-w-2xl mx-auto p-8">
//       <div className="bg-white rounded-xl shadow-lg p-8">
//         <div className="flex items-center gap-3 mb-8">
//           <Database className="w-8 h-8 text-blue-500" />
//           <h2 className="text-2xl font-bold text-gray-800">Data Management</h2>
//         </div>

//         <div className="space-y-8">
//           {/* Upload Section */}
//           <div className="p-6 rounded-lg bg-gray-50">
//             <div className="flex items-center gap-2 mb-4">
//               <Upload className="w-5 h-5 text-blue-500" />
//               <h3 className="text-lg font-semibold text-gray-800">Upload Flight Data</h3>
//             </div>
//             <ExcelUploader />
//           </div>

//           {/* Download Section */}
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
//