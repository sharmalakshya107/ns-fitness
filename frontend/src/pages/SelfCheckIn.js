import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MapPin, Clock, AlertCircle } from 'lucide-react';
import API_URL from '../config';

function SelfCheckIn() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    phone: '',
    email: ''
  });
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Auto-detect location when page loads
    getLocation();
    
    // Load saved credentials from localStorage
    const savedPhone = localStorage.getItem('checkin_phone');
    const savedEmail = localStorage.getItem('checkin_email');
    if (savedPhone || savedEmail) {
      setFormData({
        phone: savedPhone || '',
        email: savedEmail || ''
      });
    }

    // Detect iOS device
    const isIOSDevice = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    
    setIsIOS(isIOSDevice);

    // Listen for PWA install prompt (Android)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if app is already installed
    if (isInStandaloneMode) {
      setShowInstallButton(false);
      setShowIOSInstructions(false);
    } else if (isIOSDevice) {
      // Show iOS instructions if on iOS and not installed
      setShowIOSInstructions(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      toast.success('App installed! Find it on your home screen! 🎉');
      setShowInstallButton(false);
    }
    
    setDeferredPrompt(null);
  };

  const getLocation = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setGettingLocation(true);

    // Check permission state first
    try {
      const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
      
      // If permission is denied, show helpful instructions
      if (permissionStatus.state === 'denied') {
        setGettingLocation(false);
        showPermissionDeniedHelp();
        return;
      }
    } catch (err) {
      console.log('Permission API not supported, continuing with geolocation');
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        setGettingLocation(false);
        toast.success('📍 Location detected!');
      },
      (error) => {
        setGettingLocation(false);
        console.error('Location error:', error);
        
        // Handle different error types
        if (error.code === 1) {
          // PERMISSION_DENIED
          showPermissionDeniedHelp();
        } else if (error.code === 2) {
          // POSITION_UNAVAILABLE (GPS off or weak signal)
          showGPSOffHelp();
        } else if (error.code === 3) {
          // TIMEOUT
          toast.error('Location request timed out. Please try again.', {
            duration: 5000,
            icon: '⏱️'
          });
        } else {
          toast.error('Unable to get your location. Please check your settings.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  const showPermissionDeniedHelp = () => {
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isChrome = /Chrome/i.test(navigator.userAgent);
    const isSafari = /Safari/i.test(navigator.userAgent) && !isChrome;

    let instructions = '';
    
    if (isAndroid && isChrome) {
      instructions = `
📱 Android Chrome Instructions:

1. Click the 🔒 lock icon (left of URL)
2. Click "Permissions"
3. Find "Location" → Change to "Allow"
4. Refresh this page
5. Click "Get Location" again

OR

Settings → Site Settings → Location → Find this site → Allow
      `.trim();
    } else if (isIOS && isSafari) {
      instructions = `
📱 iPhone Safari Instructions:

1. Go to iPhone Settings
2. Scroll down → Find "Safari"
3. Tap "Location"
4. Select "Ask" or "Allow"
5. Come back & refresh this page
6. Allow location when asked

Note: Location must be ON in Settings → Privacy → Location Services
      `.trim();
    } else {
      instructions = `
🌐 Browser Instructions:

1. Click the 🔒 lock/info icon near the URL
2. Find "Location" or "Permissions"
3. Change to "Allow"
4. Refresh this page
5. Try again

Make sure your device's Location/GPS is also turned ON!
      `.trim();
    }

    toast.error(instructions, {
      duration: 15000,
      style: {
        background: '#FEE2E2',
        color: '#991B1B',
        fontWeight: '600',
        padding: '20px',
        borderRadius: '12px',
        border: '2px solid #DC2626',
        maxWidth: '500px',
        whiteSpace: 'pre-line',
        fontSize: '13px',
        lineHeight: '1.6'
      }
    });
  };

  const showGPSOffHelp = () => {
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

    let instructions = '';
    
    if (isAndroid) {
      instructions = `
📍 Your GPS/Location is OFF!

Android Steps:
1. Swipe down from top (notification panel)
2. Find "Location" icon 📍
3. Tap it to turn ON
4. Come back to this page
5. Click "Get Location" again

OR

Settings → Location → Turn ON
      `.trim();
    } else if (isIOS) {
      instructions = `
📍 Your Location Services are OFF!

iPhone Steps:
1. Go to Settings
2. Tap "Privacy & Security"
3. Tap "Location Services"
4. Turn it ON (green)
5. Come back to this page
6. Click "Get Location" again
      `.trim();
    } else {
      instructions = `
📍 Your GPS/Location is OFF!

Please:
1. Turn ON Location/GPS in your phone settings
2. Come back to this page
3. Try again
      `.trim();
    }

    toast.error(instructions, {
      duration: 12000,
      style: {
        background: '#FEF3C7',
        color: '#92400E',
        fontWeight: '600',
        padding: '20px',
        borderRadius: '12px',
        border: '2px solid #F59E0B',
        maxWidth: '500px',
        whiteSpace: 'pre-line',
        fontSize: '13px',
        lineHeight: '1.6'
      },
      icon: '📍'
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.phone || !formData.email) {
      toast.error('Please enter both phone number and email');
      return;
    }

    if (!location) {
      toast.error('Please allow location access to mark attendance');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/public/self-checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone: formData.phone,
          email: formData.email,
          latitude: location.latitude,
          longitude: location.longitude
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Save credentials to localStorage for next time
        localStorage.setItem('checkin_phone', formData.phone);
        localStorage.setItem('checkin_email', formData.email);
        
        toast.success(data.message);
        // Show success details
        setTimeout(() => {
          navigate('/check-in-success', { 
            state: { 
              data: data.data 
            } 
          });
        }, 1000);
      } else {
        // Show detailed error message
        const errorMessage = data.message || 'Failed to mark attendance';
        
        // Create a more visible error display for expired/blocked members
        if (errorMessage.includes('expired') || errorMessage.includes('trial period')) {
          toast.error(errorMessage, {
            duration: 6000,
            style: {
              background: '#FEE2E2',
              color: '#991B1B',
              fontWeight: '600',
              padding: '16px',
              borderRadius: '8px',
              border: '2px solid #DC2626'
            }
          });
        } else {
          toast.error(errorMessage);
        }
      }
    } catch (error) {
      console.error('Check-in error:', error);
      toast.error('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <img 
            src="/logo.png" 
            alt="NS Fitness Logo" 
            className="mx-auto h-20 w-20 object-contain mb-4"
          />
          <h1 className="text-3xl font-bold text-gray-800 mb-2">NS Fitness</h1>
          <p className="text-gray-600">Self Check-In</p>
        </div>

        {/* Install App Button - PWA (Android) */}
        {showInstallButton && (
          <div className="mb-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl shadow-lg p-4 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-bold text-sm mb-1">📱 Install NS Fitness App</p>
                <p className="text-xs opacity-90">Quick check-in without QR code scanning!</p>
              </div>
              <button
                onClick={handleInstallClick}
                className="ml-3 bg-white text-green-600 font-bold px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors text-sm shadow-md"
              >
                Install
              </button>
            </div>
          </div>
        )}

        {/* iOS Install Instructions */}
        {showIOSInstructions && (
          <div className="mb-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-2xl shadow-lg p-5">
            <div className="flex items-start gap-3">
              <div className="text-3xl">🍎</div>
              <div className="flex-1">
                <p className="font-bold text-base mb-2">📱 iPhone Users: Install NS Fitness App</p>
                <p className="text-xs opacity-90 mb-3">No QR scanning needed after installation!</p>
                
                <div className="bg-white bg-opacity-20 rounded-lg p-3 text-xs space-y-2">
                  <p className="font-semibold text-sm">🔹 Follow these steps:</p>
                  <ol className="space-y-1.5 pl-4">
                    <li>1️⃣ Tap the <strong>Share</strong> button 📤 (bottom of Safari)</li>
                    <li>2️⃣ Scroll down and find <strong>"Add to Home Screen"</strong></li>
                    <li>3️⃣ Tap <strong>"Add"</strong> (top right corner)</li>
                    <li>4️⃣ Done! App icon on your home screen! ✅</li>
                  </ol>
                  <p className="text-xs opacity-80 mt-2 italic">
                    ⚠️ Note: Must use Safari browser (not Chrome)
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Form Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Location Status */}
          <div className={`mb-6 p-4 rounded-lg ${location ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
            <div className="flex items-center gap-3">
              <MapPin className={`w-5 h-5 ${location ? 'text-green-600' : 'text-yellow-600'}`} />
              <div className="flex-1">
                <p className={`text-sm font-medium ${location ? 'text-green-800' : 'text-yellow-800'}`}>
                  {location ? '📍 Location Detected' : '📍 Getting Location...'}
                </p>
                {!location && !gettingLocation && (
                  <button 
                    onClick={getLocation}
                    className="text-xs text-blue-600 hover:underline mt-1"
                  >
                    Retry
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Info Alert */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">How it works:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Enter your registered phone & email</li>
                  <li>Must be at gym location</li>
                  <li>Attendance marked automatically</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number *
              </label>
              <input
                type="tel"
                name="phone"
                id="phone"
                autoComplete="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="Enter your phone number"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                id="email"
                autoComplete="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="Enter your email"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || !location || gettingLocation}
              className={`w-full py-4 rounded-lg font-semibold text-white transition-all ${
                loading || !location || gettingLocation
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-500 hover:bg-green-600 active:scale-95'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Clock className="w-5 h-5 animate-spin" />
                  Marking Attendance...
                </span>
              ) : !location ? (
                'Waiting for Location...'
              ) : (
                'Mark My Attendance'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-center text-sm text-gray-600">
              Need help? Contact gym admin
            </p>
            <p className="text-center text-xs text-gray-500 mt-2">
              📞 +91-7737326829
            </p>
          </div>
        </div>

        {/* Help Section */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            First time? <a href="/register" className="text-blue-600 hover:underline">Register here</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default SelfCheckIn;

