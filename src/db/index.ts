import { createClient } from '@supabase/supabase-js';

// Create a single supabase client for interacting with your database
const supabaseUrl = 'https://oqxpbtvzaqwznzjcwjdd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xeHBidHZ6YXF3em56amN3amRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NjI2MjQsImV4cCI6MjA3MjAzODYyNH0.E_B9WhK5QGncAyI_xnnO0gzpbWaHoBdDs4SfBQmkI9U';

const supabase = createClient(supabaseUrl, supabaseKey);

export const saveFlightRecord = async (
  flightNumber: string,
  flightType: string,
  flightName: string,
  coachNumber: string
) => {
  const { data, error } = await supabase
    .from('FlightRecords_BLR')
    .insert([
      {
        flightNumber,
        flightType,
        flightName,
        coachNumber,
        createdAt: new Date().toISOString(),
      },
    ]);

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const getFlightRecords = async (offset: number = 0, limit: number = 1000) => {
  const { data, error } = await supabase
    .from('FlightRecords_BLR')
    .select('*')
    .range(offset, offset + limit - 1);

  if (error) throw new Error(error.message);
  return data;
};

export const saveFlightDetails = async (
  flightNumber: string,
  type: string,
  flightName: string,
  origin: string
) => {
  try {
    const { data, error } = await supabase
      .from('Flight_Data_BLR')
      .insert([
        { flightNumber, type, flightName, origin } // Ensure all fields are included
      ]);

    if (error) {
      console.error('Error saving flight details:', error);
      throw error;
    }

    console.log('Flight details saved successfully:', data);
    return data;
  } catch (error) {
    console.error('Error in saveFlightDetails:', error);
    throw error;
  }
};

export const checkFlightNumberExists = async (flightNumber: string) => {
  const { data, error } = await supabase
    .from('Flight_Data_BLR')
    .select('flightNumber')
    .eq('flightNumber', flightNumber);
     
  if (error) {
    throw error;
  }

  return data.length > 0;
};

// New function to clear all data from flightRecords table
export const clearFlightRecords = async () => {
  try {
    const { error } = await supabase
      .from('FlightRecords_BLR')
      .delete()
      .neq('id', 0); // This condition will match all rows (assuming id is never 0)

    if (error) {
      console.error('Error clearing flight records:', error);
      throw error;
    }

    console.log('All flight records cleared successfully');
    return { success: true, message: 'All flight records deleted' };
  } catch (error) {
    console.error('Error in clearFlightRecords:', error);
    throw error;
  }
};