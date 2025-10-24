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

  // Debug: Log the data to see what we're getting
  console.log('Check-in success data:', data);
  console.log('endDate:', data.endDate);
  console.log('membershipStatus:', data.membershipStatus);

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

          {/* Membership Info - Redesigned */}
          {data.membershipStatus !== 'pending' && data.endDate ? (
            <div className="mt-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl shadow-sm">
              {(() => {
                const today = new Date();
                const expiryDate = new Date(data.endDate);
                const daysRemaining = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
                
                console.log('Rendering membership card - Days remaining:', daysRemaining);
                
                return (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white text-xl">
                          📅
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 font-medium">Membership Status</p>
                          <p className="text-sm font-bold text-gray-800">
                            {daysRemaining >= 0 && daysRemaining <= 7 ? 'Expiring Soon' : 'Active'}
                          </p>
                        </div>
                      </div>
                      {daysRemaining >= 0 && daysRemaining <= 7 ? (
                        <span className="px-3 py-1.5 bg-yellow-400 text-yellow-900 text-xs font-bold rounded-full shadow-sm">
                          ⚠️ Renew
                        </span>
                      ) : (
                        <span className="px-3 py-1.5 bg-green-500 text-white text-xs font-bold rounded-full shadow-sm">
                          ✓ Active
                        </span>
                      )}
                    </div>
                    
                    <div className="bg-white rounded-lg p-4 border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Expires On</p>
                          <p className="text-lg font-bold text-gray-900">
                            {new Date(data.endDate).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500 mb-1">Days Left</p>
                          <p className={`text-2xl font-extrabold ${
                            daysRemaining <= 7 ? 'text-red-600' : 
                            daysRemaining <= 15 ? 'text-yellow-600' : 
                            'text-green-600'
                          }`}>
                            {daysRemaining >= 0 ? daysRemaining : 0}
                          </p>
                        </div>
                      </div>
                      
                      {daysRemaining === 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-sm font-semibold text-red-600 text-center">
                            ⚠️ Last day! Renew today to continue
                          </p>
                        </div>
                      )}
                      {daysRemaining === 1 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-sm font-semibold text-orange-600 text-center">
                            ⚠️ Expires tomorrow! Please renew
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          ) : (
            data.membershipStatus !== 'pending' && (
              <div className="mt-6 p-4 bg-gray-50 border border-gray-300 rounded-lg">
                <p className="text-sm text-gray-600 text-center">
                  ⚠️ Membership end date not set. Please contact admin.
                </p>
                <p className="text-xs text-gray-500 text-center mt-1">
                  Debug: endDate={data.endDate ? 'exists' : 'null'}, status={data.membershipStatus}
                </p>
              </div>
            )
          )}

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

          {/* Expiry Warning (Expiring within 7 days) */}
          {data.expiryWarning && (
            <div className="mt-6 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
              <h3 className="text-lg font-bold text-yellow-800 mb-3 flex items-center gap-2">
                ⚠️ Renewal Reminder
              </h3>
              <div className="space-y-2 text-sm text-yellow-900">
                <p className="font-semibold text-base text-red-600">
                  {data.expiryWarning.message}
                </p>
                <p className="mt-2">
                  Expiry Date: <span className="font-bold">
                    {new Date(data.expiryWarning.expiryDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </p>
                <p className="mt-3">
                  Renew now to avoid any interruption in your gym access!
                </p>
                <div className="mt-4 pt-4 border-t border-yellow-200 bg-yellow-100 -mx-4 -mb-4 p-4 rounded-b-lg">
                  <p className="font-semibold text-center">
                    📞 Renew Now - Contact:<br />
                    <span className="text-lg">Nagendra Sain (Bunty)</span><br />
                    <span className="text-sm">📱 +91-7737326829</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Free Trial Warning (Pending Membership) */}
          {data.trialWarning && (
            <div className="mt-6 p-4 bg-purple-50 border-2 border-purple-300 rounded-lg">
              <h3 className="text-lg font-bold text-purple-800 mb-3 flex items-center gap-2">
                🎁 Free Trial Period
              </h3>
              <div className="space-y-2 text-sm text-purple-900">
                <p className="font-semibold text-base">
                  You're on a {data.trialWarning.totalTrialDays}-day free trial! (Day {data.trialWarning.daysPassed})
                </p>
                <p className="text-green-700 font-bold">
                  ⏰ Trial Days Remaining: {data.trialWarning.daysRemaining}
                </p>
                <p className="mt-3">
                  Enjoying the gym? Complete your payment to continue after the trial period!
                </p>
                <div className="mt-4 pt-4 border-t border-purple-200 bg-purple-100 -mx-4 -mb-4 p-4 rounded-b-lg">
                  <p className="font-semibold text-center">
                    📞 Join Full Membership - Contact:<br />
                    <span className="text-lg">Nagendra Sain (Bunty)</span><br />
                    <span className="text-sm">📱 +91-7737326829</span>
                  </p>
                </div>
              </div>
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

