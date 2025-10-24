import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, Clock, Users, MapPin } from 'lucide-react';

function CheckInSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const data = location.state?.data;

  if (!data) {
    navigate('/check-in');
    return null;
  }

  const isLate = data.status === 'late';

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        {/* Success Animation */}
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full mb-4 animate-bounce ${
            isLate ? 'bg-yellow-500' : 'bg-green-500'
          }`}>
            <CheckCircle className="w-16 h-16 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            {isLate ? '⏰ Marked as LATE' : '✅ Check-In Successful!'}
          </h1>
          <p className="text-gray-600">
            Welcome, {data.memberName}!
          </p>
        </div>

        {/* Details Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Attendance Details</h2>
          
          <div className="space-y-4">
            {/* Status */}
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isLate ? 'bg-yellow-100' : 'bg-green-100'
              }`}>
                <Clock className={`w-5 h-5 ${isLate ? 'text-yellow-600' : 'text-green-600'}`} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className={`font-semibold ${isLate ? 'text-yellow-600' : 'text-green-600'}`}>
                  {data.status.toUpperCase()}
                </p>
              </div>
            </div>

            {/* Batch Info */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Batch</p>
                <p className="font-semibold text-gray-800">{data.batchName}</p>
                <p className="text-xs text-gray-500">{data.batchTime}</p>
              </div>
            </div>

            {/* Check-in Time */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Check-in Time</p>
                <p className="font-semibold text-gray-800">{data.checkInTime}</p>
              </div>
            </div>

            {/* Location Verification */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Location</p>
                <p className="font-semibold text-green-600 flex items-center gap-1">
                  ✓ Inside Gym
                  <span className="text-xs font-normal text-gray-500">
                    ({data.distance}m)
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Birthday Message */}
          {data.birthdayMessage && (
            <div className="mt-6 p-6 bg-gradient-to-r from-pink-50 to-purple-50 border-2 border-pink-300 rounded-lg">
              <h3 className="text-xl font-bold text-pink-700 mb-3 text-center">
                {data.birthdayMessage.title}
              </h3>
              <p className="text-center text-gray-700 whitespace-pre-line">
                {data.birthdayMessage.message}
              </p>
            </div>
          )}

          {/* Late Warning */}
          {data.lateWarning && (
            <div className="mt-6 p-4 bg-red-50 border-2 border-red-300 rounded-lg">
              <h3 className="text-lg font-bold text-red-800 mb-3 flex items-center gap-2">
                ⚠️ Late Check-in Warning
              </h3>
              <div className="space-y-2 text-sm text-red-900">
                <p className="font-semibold">
                  Be on time! Continuous violations can lead to:
                </p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li>Membership termination</li>
                  <li>Trimming of your batch timing</li>
                </ul>
                <div className="mt-4 pt-4 border-t border-red-200">
                  <p className="font-semibold">Your Batch Details:</p>
                  <p className="mt-1">
                    <span className="font-medium">{data.batchName}</span><br />
                    Timing: {data.batchTime}
                  </p>
                </div>
                <div className="mt-4 pt-4 border-t border-red-200 bg-red-100 -mx-4 -mb-4 p-4 rounded-b-lg">
                  <p className="font-semibold text-center">
                    📞 For batch change, contact:<br />
                    <span className="text-lg">Nagendra Sain (Bunty)</span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div>
          <button
            onClick={() => navigate('/check-in')}
            className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors shadow-lg"
          >
            ✓ Done
          </button>
        </div>

        {/* Footer Message */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            🏋️ Have a great workout session!
          </p>
        </div>
      </div>
    </div>
  );
}

export default CheckInSuccess;

