import { useState } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const CheckTicket = ({ onClose }) => {
  const [bookingReference, setBookingReference] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [booking, setBooking] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!bookingReference.trim()) {
      setError('Please enter a booking reference');
      return;
    }

    setLoading(true);
    setError('');
    setBooking(null);
    setCancelSuccess(false);

    try {
      const response = await axios.get(`${API_URL}/bookings/reference/${encodeURIComponent(bookingReference.trim())}`);
      
      if (response.data) {
        setBooking(response.data);
      } else {
        setError('Booking not found');
      }
    } catch (err) {
      console.error('Error fetching booking:', err);
      
      if (err.response) {
        setError(err.response.data?.error || err.response.data?.message || 'Booking not found');
      } else if (err.request) {
        setError('Network error: Could not reach server. Please check if backend is running on port 5000.');
      } else {
        setError('An error occurred while fetching booking details');
      }
      setBooking(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!booking || !booking.booking_reference) {
      setError('Invalid booking information');
      return;
    }

    // Confirm cancellation
    const confirmed = window.confirm(
      `Are you sure you want to cancel this booking?\n\n` +
      `Booking Reference: ${booking.booking_reference}\n` +
      `Flight: ${booking.flight_number} - ${booking.airline}\n` +
      `Route: ${booking.origin} → ${booking.destination}\n\n` +
      `This action cannot be undone.`
    );

    if (!confirmed) return;

    setCancelling(true);
    setError('');
    setCancelSuccess(false);

    try {
      const bookingRef = booking.booking_reference?.trim();
      
      if (!bookingRef) {
        throw new Error('Invalid booking reference');
      }

      const response = await axios.put(
        `${API_URL}/bookings/cancel/${encodeURIComponent(bookingRef)}`,
        {},
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000 // 10 second timeout
        }
      );
      
      if (response.data) {
        if (response.data.booking) {
          setBooking(response.data.booking);
        } else if (response.data.message) {
          // If response structure is different, try to refetch
          const refetchResponse = await axios.get(`${API_URL}/bookings/reference/${encodeURIComponent(bookingRef)}`);
          if (refetchResponse.data) {
            setBooking(refetchResponse.data);
          }
        }
        setCancelSuccess(true);
        
        // Show success message for 5 seconds
        setTimeout(() => {
          setCancelSuccess(false);
        }, 5000);
      } else {
        setError('Unexpected response from server');
      }
    } catch (err) {
      console.error('Cancel booking error:', err);
      
      // Better error handling
      if (err.response) {
        // Server responded with error status
        const errorMsg = err.response.data?.error || 
                        err.response.data?.message || 
                        `Server error: ${err.response.status} ${err.response.statusText}`;
        setError(errorMsg);
      } else if (err.request) {
        // Request made but no response received
        setError('Network error: Could not reach server. Please check if backend is running on port 5000.');
      } else if (err.code === 'ECONNABORTED') {
        setError('Request timeout. Please try again.');
      } else {
        // Something else happened
        setError(err.message || 'Failed to cancel booking. Please try again.');
      }
    } finally {
      setCancelling(false);
    }
  };

  const formatDateTime = (dateTime) => {
    if (!dateTime) return 'N/A';
    
    try {
      const date = new Date(dateTime);
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (err) {
      console.error('Date formatting error:', err);
      return 'Invalid date';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={(e) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    }}>
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Check Your Ticket</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold transition duration-200"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={bookingReference}
              onChange={(e) => setBookingReference(e.target.value.toUpperCase().trim())}
              placeholder="Enter Booking Reference (e.g., BK123ABC)"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !bookingReference.trim()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition duration-200 disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p className="font-semibold">Error:</p>
            <p>{error}</p>
          </div>
        )}

        {cancelSuccess && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            ✅ Booking cancelled successfully! Seats have been restored to the flight.
          </div>
        )}

        {booking && (
          <div className="border-2 border-blue-200 rounded-lg p-6 bg-blue-50">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Flight Ticket</h3>
              <p className="text-sm text-gray-600">Booking Reference: <span className="font-bold text-blue-600">{booking.booking_reference || 'N/A'}</span></p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-white p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Passenger Name</p>
                <p className="font-semibold text-lg">{booking.passenger_name || 'N/A'}</p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Email</p>
                <p className="font-semibold">{booking.passenger_email || 'N/A'}</p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Flight Number</p>
                <p className="font-semibold text-lg">{booking.flight_number || 'N/A'}</p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Airline</p>
                <p className="font-semibold">{booking.airline || 'N/A'}</p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">From</p>
                <p className="font-semibold text-lg">{booking.origin || 'N/A'}</p>
                <p className="text-xs text-gray-500">{formatDateTime(booking.departure_time)}</p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">To</p>
                <p className="font-semibold text-lg">{booking.destination || 'N/A'}</p>
                <p className="text-xs text-gray-500">{formatDateTime(booking.arrival_time)}</p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Seats</p>
                <p className="font-semibold">{booking.seats || 'N/A'}</p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Total Amount</p>
                <p className="font-semibold text-green-600 text-lg">
                  ${booking.price && booking.seats ? (parseFloat(booking.price) * booking.seats).toFixed(2) : 'N/A'}
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-blue-200 mb-4">
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className={`font-semibold uppercase ${
                  booking.status === 'confirmed' 
                    ? 'text-green-600' 
                    : booking.status === 'cancelled' 
                    ? 'text-red-600' 
                    : 'text-gray-600'
                }`}>
                  {booking.status || 'Unknown'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Booking Date</p>
                <p className="font-semibold">{formatDateTime(booking.booking_date)}</p>
              </div>
            </div>

            {/* Cancel button - only show if booking is confirmed */}
            {booking.status === 'confirmed' && (
              <div className="mt-4 pt-4 border-t border-blue-200">
                <button
                  onClick={handleCancelBooking}
                  disabled={cancelling}
                  className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition duration-200 disabled:bg-red-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {cancelling ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Cancelling...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Cancel Booking
                    </>
                  )}
                </button>
                <p className="text-xs text-gray-500 text-center mt-2">
                  Cancelling will restore the seats to the flight
                </p>
              </div>
            )}

            {/* Show message if booking is already cancelled */}
            {booking.status === 'cancelled' && (
              <div className="mt-4 pt-4 border-t border-blue-200">
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                  <p className="text-sm text-red-700 font-semibold">
                    ⚠️ This booking has been cancelled
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full mt-4 bg-gray-300 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-400 transition duration-200"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default CheckTicket;
