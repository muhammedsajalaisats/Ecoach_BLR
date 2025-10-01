// Load dependencies
const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const cron = require('node-cron');
require('dotenv').config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://oqxpbtvzaqwznzjcwjdd.supabase.co',
  process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xeHBidHZ6YXF3em56amN3amRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NjI2MjQsImV4cCI6MjA3MjAzODYyNH0.E_B9WhK5QGncAyI_xnnO0gzpbWaHoBdDs4SfBQmkI9U'
);

// Define path to Vite build output
const distPath = path.resolve(__dirname, '../dist');
const indexFile = path.join(distPath, 'index.html');

// Middleware setup
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (JS, CSS, assets from Vite build)
app.use(express.static(distPath));

// Utility function to get current IST time
function getCurrentIST() {
  const now = new Date();
  const timezoneOffset = 5.5 * 60 * 60 * 1000; // IST offset (UTC+5:30)
  return new Date(now.getTime() + timezoneOffset);
}

// API routes
app.get('/api/health', (req, res) => {
  res.json({ message: '✅ Server is running!' });
});

app.get('/api/users', (req, res) => {
  res.json([
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
  ]);
});

// Timer management API endpoints
app.post('/api/start-timer', async (req, res) => {
  try {
    const { recordId } = req.body;
    
    if (!recordId) {
      return res.status(400).json({ error: 'Record ID is required' });
    }

    const currentTime = getCurrentIST();
    const endsAt = new Date(currentTime.getTime() + (180 * 1000)); // 3 minutes from now

    const { data, error } = await supabase
      .from('FlightRecords_BLR')
      .update({
        timer_start: currentTime.toISOString(),
        timer_ends: endsAt.toISOString()
      })
      .eq('id', recordId)
      .select();

    if (error) throw error;

    res.json({
      success: true,
      timer_start: currentTime.toISOString(),
      timer_ends: endsAt.toISOString(),
      record: data[0]
    });
  } catch (err) {
    console.error('Error starting timer:', err);
    res.status(500).json({ error: 'Failed to start timer' });
  }
});

app.get('/api/check-timer/:recordId', async (req, res) => {
  try {
    const { recordId } = req.params;
    
    if (!recordId) {
      return res.status(400).json({ error: 'Record ID is required' });
    }

    const { data, error } = await supabase
      .from('FlightRecords_BLR')
      .select('timer_start, timer_ends, disembarked_time')
      .eq('id', recordId)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Record not found' });

    let remainingSeconds = 0;
    if (data.timer_ends && !data.disembarked_time) {
      const endsAt = new Date(data.timer_ends).getTime();
      const now = getCurrentIST().getTime();
      remainingSeconds = Math.max(0, Math.floor((endsAt - now) / 1000));
    }

    res.json({
      timer_start: data.timer_start,
      timer_ends: data.timer_ends,
      disembarked_time: data.disembarked_time,
      remaining_seconds: remainingSeconds
    });
  } catch (err) {
    console.error('Error checking timer:', err);
    res.status(500).json({ error: 'Failed to check timer status' });
  }
});

app.post('/api/complete-disembarkation', async (req, res) => {
  try {
    const { recordId } = req.body;
    
    if (!recordId) {
      return res.status(400).json({ error: 'Record ID is required' });
    }

    const currentTime = getCurrentIST().toISOString();

    const { data, error } = await supabase
      .from('FlightRecords_BLR')
      .update({
        Status: 'Closed',
        Verification_Status: 'Completed',
        disembarked_time: currentTime,
        timer_start: null,
        timer_ends: null
      })
      .eq('id', recordId)
      .select();

    if (error) throw error;

    res.json({
      success: true,
      disembarked_time: currentTime,
      record: data[0]
    });
  } catch (err) {
    console.error('Error completing disembarkation:', err);
    res.status(500).json({ error: 'Failed to complete disembarkation' });
  }
});

// Function to complete disembarkation for expired timers
async function completeExpiredDisembarkations() {
  try {
    const currentTime = getCurrentIST().toISOString();

    // Find records where timer has expired but disembarkation isn't completed
    const { data: expiredRecords, error: fetchError } = await supabase
      .from('FlightRecords_BLR')
      .select('id, timer_ends, Status, disembarked_time')
      .lt('timer_ends', currentTime)
      .is('disembarked_time', null);

    if (fetchError) {
      console.error('Error fetching expired records:', fetchError);
      return;
    }

    if (!expiredRecords || expiredRecords.length === 0) {
      return;
    }

    console.log(`Found ${expiredRecords.length} expired records to process`);

    // Complete disembarkation for each expired record
    for (const record of expiredRecords) {
      // Skip if already closed
      if (record.Status === 'Closed') {
        console.log(`Record ${record.id} already closed, skipping`);
        continue;
      }

      try {
        // Use the record's timer_ends time as disembarked_time, not current time
        const disembarkedTime = record.timer_ends;

        const { error: updateError } = await supabase
          .from('FlightRecords_BLR')
          .update({
            Status: 'Closed',
            Verification_Status: 'Completed',
            disembarked_time: disembarkedTime,
            timer_start: null,
            timer_ends: null
          })
          .eq('id', record.id);

        if (updateError) {
          console.error(`Error updating record ${record.id}:`, updateError);
        } else {
          console.log(`Successfully completed disembarkation for record ${record.id} with timer end time: ${disembarkedTime}`);
        }
      } catch (err) {
        console.error(`Error processing record ${record.id}:`, err);
      }
    }
  } catch (err) {
    console.error('Error in completeExpiredDisembarkations:', err);
  }
}

// Schedule the job to run every minute
cron.schedule('* * * * *', completeExpiredDisembarkations);

// Frontend routing fallback (for React Router)
// Serve index.html on unmatched routes except those starting with /api/
app.get(/^\/(?!api\/).*/, (req, res) => {
  res.sendFile(indexFile, err => {
    if (err) {
      console.error('⚠️ Failed to send index.html:', err.message);
      res.status(500).send('Frontend routing error');
    }
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('🛑 Server error:', err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Express server is live at http://localhost:${PORT}`);
  console.log('⏱️ Timer service started. Checking for expired disembarkations every minute...');
});