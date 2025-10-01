import React, { useState, useEffect } from "react";
import { Search, Plane, Save } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

interface FlightData {
  id?: number;
  flight_number: string;
  flight_name: string;
  flight_type: string;
  coach_number?: string;
  created_at?: string;
  flightNumber: string;
  flightName: string;
  type: string;
  origin: string;
}

interface FlightCheckerProps {
  coachNo: string | null;
}

interface DeviceInfo {
  deviceId: string;
  ipAddress: string;
  userAgent: string;
  browserInfo: string;
  timestamp: string;
}

const supabase = createClient(
  "https://oqxpbtvzaqwznzjcwjdd.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xeHBidHZ6YXF3em56amN3amRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NjI2MjQsImV4cCI6MjA3MjAzODYyNH0.E_B9WhK5QGncAyI_xnnO0gzpbWaHoBdDs4SfBQmkI9U"
);

const validCoachNumbers = [
  "PC-01", "PC-02", "PC-03", "PC-04", "PC-05",
  "PC-06", "PC-07", "PC-08", "PC-09", "PC-10",
  "PC-11", "PC-12", "PC-13", "PC-14", "PC-15",
  "PC-16", "PC-17", "PC-18", "PC-19", "PC-20",
  "PC-21", "PC-22", "PC-23", "PC-24", "PC-25", 
  "PC-26", "OT-01", "PC-100", "PC-200", "PC-201", "PC-202", 
  "PC-203", "PC-204", "PC-205"
];

const getIndianTime = () => {
  const date = new Date();
  const indianTimeStr = date.toLocaleString("en-US", {
    timeZone: "Asia/Kolkata",
  });
  const indianTime = new Date(indianTimeStr);
  const offset = 330;
  indianTime.setMinutes(indianTime.getMinutes() + offset);
  return indianTime.toISOString();
};

// Generate a unique device fingerprint
const generateDeviceFingerprint = (): string => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Device fingerprint', 2, 2);
  }
  const canvasFingerprint = canvas.toDataURL();
  
  // Type-safe way to access navigator properties
  const nav = navigator as any;
  const deviceMemory = nav.deviceMemory || 'unknown';
  
  const fingerprint = btoa(
    navigator.userAgent +
    navigator.language +
    screen.width + 'x' + screen.height +
    screen.colorDepth +
    new Date().getTimezoneOffset() +
    canvasFingerprint.slice(0, 50) +
    (navigator.hardwareConcurrency || 'unknown') +
    deviceMemory
  ).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
  
  return fingerprint;
};

// Get IP address from external service
const getIPAddress = async (): Promise<string> => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.warn('Could not fetch IP address:', error);
    return 'unknown';
  }
};

// Get browser information
const getBrowserInfo = (): string => {
  const userAgent = navigator.userAgent;
  let browserName = 'Unknown';
  let browserVersion = 'Unknown';

  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    browserName = 'Chrome';
    const match = userAgent.match(/Chrome\/(\d+)/);
    browserVersion = match ? match[1] : 'Unknown';
  } else if (userAgent.includes('Firefox')) {
    browserName = 'Firefox';
    const match = userAgent.match(/Firefox\/(\d+)/);
    browserVersion = match ? match[1] : 'Unknown';
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    browserName = 'Safari';
    const match = userAgent.match(/Safari\/(\d+)/);
    browserVersion = match ? match[1] : 'Unknown';
  } else if (userAgent.includes('Edg')) {
    browserName = 'Edge';
    const match = userAgent.match(/Edg\/(\d+)/);
    browserVersion = match ? match[1] : 'Unknown';
  }

  return `${browserName} ${browserVersion}`;
};

// Get device information
const getDeviceInfo = async (): Promise<DeviceInfo> => {
  const deviceId = generateDeviceFingerprint();
  const ipAddress = await getIPAddress();
  const userAgent = navigator.userAgent;
  const browserInfo = getBrowserInfo();
  const timestamp = getIndianTime();

  return {
    deviceId,
    ipAddress,
    userAgent,
    browserInfo,
    timestamp
  };
};

export function FlightChecker({ coachNo }: FlightCheckerProps) {
  const [flightNumber, setFlightNumber] = useState("");
  const [coachNumber, setCoachNumber] = useState(coachNo || "");
  const [result, setResult] = useState<{
    found: boolean;
    type?: string;
    flightName?: string;
    id?: number;
    origin?: string;
  } | null>(null);
  const [flightData, setFlightData] = useState<FlightData[]>([]);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<"enterFlight" | "result">("enterFlight");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isValidCoach, setIsValidCoach] = useState(true);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);

  useEffect(() => {
    fetchFlightData();
    
    // Initialize device info
    getDeviceInfo().then(info => {
      setDeviceInfo(info);
    });
    
    // Validate initial coach number
    if (coachNo) {
      const isValid = validCoachNumbers.includes(coachNo);
      setIsValidCoach(isValid);
      if (!isValid) {
        setErrorMessage("Invalid coach number provided");
      }
    }
  }, [coachNo]);

  const fetchFlightData = async () => {
    try {
      const { data, error } = await supabase.from("Flight_Data_BLR").select("*");

      if (error) {
        throw error;
      }

      if (data) {
        setFlightData(data);
      }
    } catch (error) {
      console.error("Error loading flight data:", error);
    }
  };

  const checkCoachAvailability = async (coachNumber: string) => {
    try {
      // First validate the coach number format
      if (!validCoachNumbers.includes(coachNumber)) {
        throw new Error("Invalid coach number. Please select from the predefined list.");
      }

      const { count, error } = await supabase
        .from("FlightRecords_BLR")
        .select("*", { count: 'exact' })
        .eq('coach_number', coachNumber)
        .or('Status.eq.Open,Status.eq.Acknowledged,Status.eq.Accepted');

      if (error) {
        throw error;
      }

      return count === 0;
    } catch (error) {
      console.error("Error checking coach availability:", error);
      return false;
    }
  };

  const saveFlightRecord = async (
    flightNumber: string,
    flightType: string,
    flightName: string,
    coachNumber: string
  ) => {
    try {
      // Validate coach number before proceeding
      if (!validCoachNumbers.includes(coachNumber)) {
        throw new Error("Invalid coach number. Please select from the predefined list.");
      }

      const isCoachAvailable = await checkCoachAvailability(coachNumber);
      if (!isCoachAvailable) {
        throw new Error("This coach is already assigned to another flight. Please choose a different coach.");
      }

      const indianTime = getIndianTime();
      
      // Get fresh device info at the time of submission
      const currentDeviceInfo = await getDeviceInfo();

      const { data, error } = await supabase
        .from("FlightRecords_BLR")
        .insert([
          {
            flight_number: flightNumber,
            flight_type: flightType,
            flight_name: flightName,
            coach_number: coachNumber,
            created_at: indianTime,
            Status: "Open",
            // Device tracking fields
            device_id: currentDeviceInfo.deviceId,
            ip_address: currentDeviceInfo.ipAddress,
            user_agent: currentDeviceInfo.userAgent,
            browser_info: currentDeviceInfo.browserInfo,
            device_timestamp: currentDeviceInfo.timestamp
          },
        ])
        .select();

      if (error) {
        throw error;
      }

      return data?.[0]?.id;
    } catch (error) {
      console.error("Error saving record:", error);
      throw error;
    }
  };

  const checkFlight = () => {
    if (isProcessing) return;
    
    setErrorMessage(null);
    if (!flightData.length) {
      setResult({ found: false, type: "No flight data available" });
      setCurrentStep("result");
      return;
    }

    const flight = flightData.find(
      (f) => f.flightNumber.toLowerCase() === flightNumber.toLowerCase()
    );

    if (flight) {
      setResult({
        found: true,
        type: flight.type,
        flightName: flight.flightName,
        id: flight.id,
        origin: flight.origin,
      });
    } else {
      setResult({ found: false });
    }
    setCurrentStep("result");
  };

  const handleSubmit = async () => {
    if (isProcessing) return;
    
    setErrorMessage(null);
    
    // Final validation before submission
    if (!validCoachNumbers.includes(coachNumber)) {
      setErrorMessage("Invalid coach number. Please select from the predefined list.");
      return;
    }

    if (!result || !result.found || !coachNumber) return;

    setIsConfirmationOpen(true);
  };

  const handleConfirmedSubmit = async () => {
    setIsProcessing(true);
    setIsConfirmationOpen(false);

    if (!result) {
      setErrorMessage("No flight data available.");
      setIsProcessing(false);
      return;
    }

    if (!result.type || !result.flightName) {
      setErrorMessage("Invalid flight data. Please check the flight details.");
      setIsProcessing(false);
      return;
    }

    try {
      await saveFlightRecord(
        flightNumber,
        result.type,
        result.flightName,
        coachNumber
      );

      setSaveStatus("success");
      await fetchFlightData();
      setIsProcessing(false);
    } catch (error: any) {
      setSaveStatus("error");
      setErrorMessage(error.message || "Error saving flight record. Please try again.");
      setIsProcessing(false);
      console.error("Error saving flight record:", error);
    }
  };

  const resetForm = () => {
    setFlightNumber("");
    setResult(null);
    setCurrentStep("enterFlight");
    setErrorMessage(null);
    setSaveStatus("idle");
  };

  const resetAfterSuccess = () => {
    setFlightNumber("");
    setResult(null);
    setCurrentStep("enterFlight");
    setSaveStatus("idle");
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="space-y-6">
          {!flightData.length && (
            <div className="p-4 bg-yellow-50 rounded-lg">
              <p className="text-yellow-700">
                No flight data available. Please upload an Excel file in the
                Data Management section.
              </p>
            </div>
          )}

          {/* Step 1: Enter Flight Number */}
          {currentStep === "enterFlight" && (
            <div className="animate-fade-in">
              <div className={`mb-6 p-4 rounded-lg ${isValidCoach ? 'bg-blue-50' : 'bg-red-50 border border-red-200'}`}>
                <p className={`font-medium ${isValidCoach ? 'text-blue-800' : 'text-red-700'}`}>Coach Number:</p>
                <p className={`text-xl font-bold ${isValidCoach ? 'text-gray-800' : 'text-red-600'}`}>
                  {coachNumber}
                  {!isValidCoach && (
                    <span className="block text-sm font-normal text-red-600 mt-1">
                      Invalid coach number. Must be one of: PC-01 to PC-26
                    </span>
                  )}
                </p>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={flightNumber}
                  onChange={(e) => setFlightNumber(e.target.value.toUpperCase())}
                  onKeyPress={(e) => e.key === "Enter" && checkFlight()}
                  placeholder="Enter Flight Number (e.g., AI101)"
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  disabled={isProcessing || !isValidCoach}
                />
                <button
                  onClick={checkFlight}
                  disabled={!flightData.length || !flightNumber || isProcessing || !isValidCoach}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  <Search size={20} />
                </button>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {errorMessage}
            </div>
          )}

          {/* Step 2: Show Result */}
          {currentStep === "result" && result && (
            <div className="animate-fade-in">
              {result.found ? (
                <div className="p-6 rounded-lg bg-gradient-to-r from-blue-50 to-green-50 border border-blue-100">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">
                    Flight Details
                  </h3>
                  <div className="space-y-4">
                    <div className="grid gap-3">
                      <p className="text-sm flex items-center justify-between">
                        <span className="text-gray-600">Coach Number:</span>{" "}
                        <span className={`font-semibold ${isValidCoach ? 'text-gray-800' : 'text-red-600'}`}>
                          {coachNumber}
                          {!isValidCoach && (
                            <span className="block text-xs text-red-600">(Invalid coach)</span>
                          )}
                        </span>
                      </p>
                      <p className="text-sm flex items-center justify-between">
                        <span className="text-gray-600">Flight Number:</span>{" "}
                        <span className="font-semibold text-gray-800">
                          {flightNumber}
                        </span>
                      </p>
                      <p className="text-sm flex items-center justify-between">
                        <span className="text-gray-600">Origin:</span>{" "}
                        <span className="font-semibold text-gray-800">
                          {result.origin}
                        </span>
                      </p>
                      <p className="text-xs flex items-center justify-between">
                        <span className="text-gray-600">Type:</span>{" "}
                        <span
                          className={`font-semibold ${
                            result.type?.toLowerCase() === "domestic arrival"
                              ? "text-blue-600"
                              : "text-red-600"
                          }`}
                        >
                          {result.type?.toUpperCase()}
                        </span>
                      </p>
                    </div>

                    {saveStatus === "success" && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
                        Flight saved successfully
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentStep("enterFlight")}
                        disabled={isProcessing}
                        className="flex-1 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleSubmit}
                        disabled={!coachNumber || isProcessing || saveStatus === "success" || !isValidCoach}
                        className="flex-1 flex items-center justify-center gap-2 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        {isProcessing ? (
                          "Processing..."
                        ) : saveStatus === "success" ? (
                          "Saved!"
                        ) : (
                          <>
                            <Save size={20} />
                            Submit
                          </>
                        )}
                      </button>
                    </div>

                    {saveStatus === "success" && (
                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={resetAfterSuccess}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                        >
                          Check Another Flight
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-red-50 border border-red-100">
                  <p className="text-red-600">
                    {result.type ||
                      "Flight not found. Please check the flight number."}
                  </p>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => setCurrentStep("enterFlight")}
                      disabled={isProcessing}
                      className="flex-1 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      {isConfirmationOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-lg font-semibold mb-4">Confirm Details</h2>
            <div className="mb-4 space-y-2">
              <p><span className="font-medium">Coach:</span> {coachNumber} {!validCoachNumbers.includes(coachNumber) && <span className="text-red-500">(Invalid!)</span>}</p>
              <p><span className="font-medium">Flight:</span> {flightNumber}</p>
              <p><span className="font-medium">Type:</span> {result?.type}</p>
            </div>
            {!validCoachNumbers.includes(coachNumber) ? (
              <p className="mb-4 text-red-500">Cannot submit: Invalid coach number</p>
            ) : (
              <p className="mb-4">Are you sure you want to submit these details?</p>
            )}
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setIsConfirmationOpen(false)}
                disabled={isProcessing}
                className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400 disabled:bg-gray-200 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmedSubmit}
                disabled={isProcessing || !validCoachNumbers.includes(coachNumber)}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-green-300 disabled:cursor-not-allowed"
              >
                {isProcessing ? "Processing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}