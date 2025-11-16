import { useState } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const BookingForm = ({ flight, onBookingSuccess, onClose }) => {
  const [formData, setFormData] = useState({
    passengerName: '',
    passengerEmail: '',
    passengerPhone: '',
    seats: 1
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bookingDetails, setBookingDetails] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Always send flightData so backend can create flight if needed
      const response = await axios.post(`${API_URL}/bookings`, {
        flightId: flight.id,
        flightData: {
          flight_number: flight.flight_number,
          airline: flight.airline,
          origin: flight.origin || flight.origin_code,
          destination: flight.destination || flight.destination_code,
          origin_code: flight.origin_code,
          destination_code: flight.destination_code,
          departure_time: flight.departure_time,
          arrival_time: flight.arrival_time,
          price: flight.price,
          total_seats: flight.total_seats || 180,
          available_seats: flight.available_seats || 180
        },
        ...formData
      });
      
      // Store booking details to show success message
      setBookingDetails(response.data);
      onBookingSuccess();
    } catch (err) {
      console.error('Booking error:', err);
      setError(err.response?.data?.error || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  const handleBookMore = () => {
    // Reset form and booking details to allow booking another flight
    setBookingDetails(null);
    setFormData({
      passengerName: '',
      passengerEmail: '',
      passengerPhone: '',
      seats: 1
    });
    setError('');
    // Close the form so user can select another flight
    onClose();
  };

  const handleReturnHome = () => {
    // Reset everything and close the form to return to home
    setBookingDetails(null);
    setFormData({
      passengerName: '',
      passengerEmail: '',
      passengerPhone: '',
      seats: 1
    });
    setError('');
    onClose();
  };

  if (!flight) return null;

  // Show booking confirmation if booking was successful
  if (bookingDetails) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-lg shadow-xl p-5 max-w-md w-full relative my-4 max-h-[90vh] overflow-y-auto">
          {/* Close button in top right */}
          <button
            onClick={handleReturnHome}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-xl font-bold transition duration-200 z-10"
            aria-label="Close"
          >
            ×
          </button>

          <div className="text-center mb-4">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-2">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-1">Booking Confirmed!</h2>
            <p className="text-sm text-gray-600">Your flight has been successfully booked</p>
          </div>

          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-4">
            <div className="text-center">
              <p className="text-xs text-gray-600 mb-1">Booking Reference</p>
              <p className="text-2xl font-bold text-blue-600 tracking-wider">
                {bookingDetails.booking_reference}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Save this reference number
              </p>
            </div>
          </div>

          <div className="space-y-2 mb-4 text-sm">
            <div className="flex justify-between py-1.5 border-b">
              <span className="text-gray-600">Passenger:</span>
              <span className="font-semibold text-right">{bookingDetails.passenger_name}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b">
              <span className="text-gray-600">Flight:</span>
              <span className="font-semibold text-right">{bookingDetails.flight_number} - {bookingDetails.airline}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b">
              <span className="text-gray-600">Route:</span>
              <span className="font-semibold text-right">{bookingDetails.origin} → {bookingDetails.destination}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b">
              <span className="text-gray-600">Seats:</span>
              <span className="font-semibold">{bookingDetails.seats}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b">
              <span className="text-gray-600">Total Amount:</span>
              <span className="font-semibold text-green-600">
                ${(parseFloat(bookingDetails.price) * bookingDetails.seats).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-gray-600">Status:</span>
              <span className="font-semibold text-green-600 uppercase text-xs">{bookingDetails.status}</span>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <p className="text-xs text-yellow-800">
              <strong>Important:</strong> Save your booking reference number to check your ticket later.
            </p>
          </div>

          {/* Three buttons: Book More, Return to Home, Close */}
          <div className="space-y-2">
            <button
              onClick={handleBookMore}
              className="w-full bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 transition duration-200 flex items-center justify-center gap-2 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Book More Flights
            </button>
            
            <div className="flex gap-2">
              <button
                onClick={handleReturnHome}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition duration-200 flex items-center justify-center gap-1 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Return to Home
              </button>
              <button
                onClick={handleReturnHome}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-400 transition duration-200 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Book Flight</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <p className="font-semibold">{flight.flight_number} - {flight.airline}</p>
          <p className="text-sm text-gray-600">
            {flight.origin} → {flight.destination}
          </p>
          <p className="text-sm text-gray-600">
            ${flight.price} per seat | {flight.available_seats} seats available
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Passenger Name *
            </label>
            <input
              type="text"
              value={formData.passengerName}
              onChange={(e) => setFormData({ ...formData, passengerName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              value={formData.passengerEmail}
              onChange={(e) => setFormData({ ...formData, passengerEmail: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              value={formData.passengerPhone}
              onChange={(e) => setFormData({ ...formData, passengerPhone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Number of Seats *
            </label>
            <input
              type="number"
              min="1"
              max={flight.available_seats}
              value={formData.seats}
              onChange={(e) => setFormData({ ...formData, seats: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-400 transition duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition duration-200 disabled:bg-blue-400"
            >
              {loading ? 'Booking...' : 'Confirm Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookingForm;