// import { createClient } from '@supabase/supabase-js';
// const supabaseUrl = 'https://oqxpbtvzaqwznzjcwjdd.supabase.co';
// const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xeHBidHZ6YXF3em56amN3amRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NjI2MjQsImV4cCI6MjA3MjAzODYyNH0.E_B9WhK5QGncAyI_xnnO0gzpbWaHoBdDs4SfBQmkI9U';

// const supabase = createClient(supabaseUrl, supabaseKey);

// export const saveFlightRecord = async (
//   flightNumber: string,
//   flightType: string,
//   flightName: string,
//   coachNumber: string
// ) => {
//   const { data, error } = await supabase
//     .from('FlightRecords_BLR')
//     .insert([
//       {
//         flightNumber,
//         flightType,
//         flightName,
//         coachNumber,
//         createdAt: new Date().toISOString(),
//       },
//     ]);

//   if (error) {
//     throw new Error(error.message);
//   }

//   return data;
// };

// export const getFlightRecords = async () => {
//   const { data, error } = await supabase
//     .from('FlightRecords_BLR')
//     .select('*');

//   if (error) {
//     throw new Error(error.message);
//   }

//   return data;
// };

