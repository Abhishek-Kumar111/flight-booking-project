import { useState } from 'react';
import FlightSearch from './components/FlightSearch';
import FlightList from './components/FlightList';
import BookingForm from './components/BookingForm';
import CheckTicket from './components/CheckTicket';

function App() {
  const [flights, setFlights] = useState([]);
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [showCheckTicket, setShowCheckTicket] = useState(false);

  const handleSearchResults = (results) => {
    setFlights(results);
  };

  const handleSelectFlight = (flight) => {
    setSelectedFlight(flight);
    setShowBookingForm(true);
  };

  const handleBookingSuccess = () => {
    // Refresh flights after booking
    setFlights(flights.map(f => 
      f.id === selectedFlight.id 
        ? { ...f, available_seats: f.available_seats - 1 }
        : f
    ));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <div className="flex justify-center items-center gap-4 mb-4">
            <h1 className="text-4xl font-bold text-gray-800">
              ✈️ Flight Booking System
            </h1>
            <button
              onClick={() => setShowCheckTicket(true)}
              className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 transition duration-200"
            >
              Check Ticket
            </button>
          </div>
          <p className="text-gray-600">Search and book your flights easily</p>
        </header>

        <FlightSearch onSearchResults={handleSearchResults} />
        
        <FlightList 
          flights={flights} 
          onSelectFlight={handleSelectFlight}
        />

        {showBookingForm && (
          <BookingForm
            flight={selectedFlight}
            onBookingSuccess={handleBookingSuccess}
            onClose={() => {
              setShowBookingForm(false);
              setSelectedFlight(null);
            }}
          />
        )}

        {showCheckTicket && (
          <CheckTicket
            onClose={() => setShowCheckTicket(false)}
          />
        )}
      </div>
    </div>
  );
}

export default App;