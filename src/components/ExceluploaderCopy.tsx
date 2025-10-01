// import React, { useState } from 'react';
// import { Upload } from 'lucide-react';
// import * as XLSX from 'xlsx';
// import { createClient, SupabaseClient } from '@supabase/supabase-js';
// import { FlightData } from '../types';

// const supabaseUrl = 'https://oqxpbtvzaqwznzjcwjdd.supabase.co';
// const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xeHBidHZ6YXF3em56amN3amRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NjI2MjQsImV4cCI6MjA3MjAzODYyNH0.E_B9WhK5QGncAyI_xnnO0gzpbWaHoBdDs4SfBQmkI9U';
// const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

// export function ExcelUploader() {
//   const [uploading, setUploading] = useState(false);
//   const [showConfirmDialog, setShowConfirmDialog] = useState(false);
//   const [uploadSuccess, setUploadSuccess] = useState(false);
//   const [clearSuccess, setClearSuccess] = useState(false);

//   const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
//     const file = event.target.files?.[0];
//     if (!file) return;

//     setUploading(true);
//     setUploadSuccess(false); // Reset success message when a new file is being uploaded
//     const reader = new FileReader();

//     reader.onload = async (e) => {
//       try {
//         const data = new Uint8Array(e.target?.result as ArrayBuffer);
//         const workbook = XLSX.read(data, { type: 'array' });
//         const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
//         const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as unknown[][];

//         // Ensure the data matches the FlightData type
//         const formattedData: FlightData[] = jsonData.slice(1).map((row) => ({
//           flightNumber: row[0] as string,
//           type: row[1] as 'domestic' | 'international',
//           flightName: row[2] as string,
//         }));

//         console.log('Data to be sent to Supabase:', formattedData);

//         await addDataToSupabase(formattedData);
//         setUploadSuccess(true); // Show success message when upload is successful
//       } catch (error) {
//         console.error('Error processing Excel file:', error);
//       } finally {
//         setUploading(false);
//       }
//     };

//     reader.onerror = () => {
//       console.error('Error reading file');
//       setUploading(false);
//     };

//     reader.readAsArrayBuffer(file);
//   };

//   const addDataToSupabase = async (data: FlightData[]) => {
//     const { error } = await supabase
//       .from('Flight_Data_BLR')
//       .insert(data);

//     if (error) {
//       console.error('Error adding data to Supabase:', error.message);
//     } else {
//       console.log('Data added successfully');
//     }
//   };

//   const clearDataFromSupabase = async () => {
//     setShowConfirmDialog(true);
//   };

//   const confirmClearData = async () => {
//     const { error } = await supabase
//       .rpc('truncate_flight_data');

//     if (error) {
//       console.error('Error deleting data from Supabase:', error.message);
//     } else {
//       console.log('Data cleared successfully');
//       setClearSuccess(true); // Show success message when data is cleared
//     }
//     setShowConfirmDialog(false);
//   };

//   return (
//     <div className="max-w-2xl mx-auto p-4 md:p-8">
//       <div className="bg-white rounded-xl shadow-lg p-4 md:p-8">
//         <div className="flex flex-col md:flex-row items-center justify-between mb-6">
//           <h2 className="text-xl md:text-2xl font-bold text-gray-800">Flight Data Management</h2>
//           <button
//             onClick={clearDataFromSupabase}
//             className="mt-4 md:mt-0 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
//           >
//             Clear Data
//           </button>
//         </div>

//         {uploading && (
//           <div className="mb-4 p-4 bg-blue-50 rounded-lg">
//             <p className="text-blue-600">Processing Excel file...</p>
//           </div>
//         )}

//         {uploadSuccess && (
//           <div className="mb-4 p-4 bg-green-50 rounded-lg">
//             <p className="text-green-600">Excel file uploaded successfully!</p>
//           </div>
//         )}

//         {clearSuccess && (
//           <div className="mb-4 p-4 bg-green-50 rounded-lg">
//             <p className="text-green-600">Data cleared successfully!</p>
//           </div>
//         )}

//         <div className="mb-6">
//           <label className="flex flex-col items-center justify-center w-full h-48 md:h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
//             <div className="flex flex-col items-center justify-center pt-5 pb-6">
//               <Upload className="w-12 h-12 mb-4 text-gray-500" />
//               <p className="mb-2 text-lg md:text-xl text-gray-500">
//                 <span className="font-semibold">Click to upload</span> or drag and drop
//               </p>
//               <p className="text-sm text-gray-500">Excel files only (.xlsx, .xls)</p>
//             </div>
//             <input
//               type="file"
//               className="hidden"
//               accept=".xlsx,.xls"
//               onChange={handleFileUpload}
//             />
//           </label>
//         </div>

//         <div className="mt-6 text-sm text-gray-600">
//           <p className="font-medium mb-2">Excel file format requirements:</p>
//           <ul className="list-disc list-inside space-y-1">
//             <li>flightNumber (e.g., AI101)</li>
//             <li>type (domestic or international)</li>
//             <li>flightName (e.g., Air India Express)</li>
//           </ul>
//         </div>
//       </div>

//       {showConfirmDialog && (
//         <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
//           <div className="bg-white rounded-xl shadow-lg p-4 md:p-8">
//             <p className="text-lg font-semibold mb-4">Are you sure you want to clear all data?</p>
//             <div className="flex justify-end space-x-4">
//               <button
//                 onClick={() => setShowConfirmDialog(false)}
//                 className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition-colors"
//               >
//                 Cancel
//               </button>
//               <button
//                 onClick={confirmClearData}
//                 className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
//               >
//                 Confirm
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
