import { useState } from 'react';
import FlightSearch from './components/FlightSearch';
import FlightList from './components/FlightList';
import BookingForm from './components/BookingForm';

function App() {
  const [flights, setFlights] = useState([]);
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [showBookingForm, setShowBookingForm] = useState(false);

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
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            ✈️ Flight Booking System
          </h1>
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
      </div>
    </div>
  );
}

export default App;