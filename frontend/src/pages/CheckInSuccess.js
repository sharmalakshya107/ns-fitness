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

            {/* Location */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Distance from Gym</p>
                <p className="font-semibold text-gray-800">{data.distance} meters</p>
              </div>
            </div>
          </div>

          {/* Late Warning */}
          {isLate && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> You arrived after your batch time ({data.batchTime}). 
                Your attendance is marked as LATE but counts as present.
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => navigate('/check-in')}
            className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors"
          >
            Done
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-lg border border-gray-300 transition-colors"
          >
            Back to Home
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

