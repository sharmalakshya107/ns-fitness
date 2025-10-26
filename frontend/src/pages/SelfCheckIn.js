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

    // Listen for PWA install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallButton(false);
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

  const getLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        setGettingLocation(false);
        toast.success('Location detected!');
      },
      (error) => {
        setGettingLocation(false);
        console.error('Location error:', error);
        toast.error('Unable to get your location. Please enable location access.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
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

        {/* Install App Button - PWA */}
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

