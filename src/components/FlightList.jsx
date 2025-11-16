const FlightList = ({ flights, onSelectFlight }) => {
    if (flights.length === 0) {
      return (
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <p className="text-gray-500 text-lg">No flights found. Please try different search criteria.</p>
        </div>
      );
    }
  
    const formatDateTime = (dateTime) => {
      const date = new Date(dateTime);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };
  
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Available Flights</h2>
        {flights.map((flight) => (
          <div
            key={flight.id}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition duration-200"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-2">
                  <h3 className="text-xl font-bold text-gray-800">{flight.flight_number}</h3>
                  <span className="text-gray-600">{flight.airline}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">From</p>
                    <p className="font-semibold text-gray-800">{flight.origin}</p>
                    <p className="text-gray-600">{formatDateTime(flight.departure_time)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">To</p>
                    <p className="font-semibold text-gray-800">{flight.destination}</p>
                    <p className="text-gray-600">{formatDateTime(flight.arrival_time)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Available Seats</p>
                    <p className="font-semibold text-gray-800">{flight.available_seats}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Price</p>
                    <p className="font-bold text-blue-600 text-lg">${flight.price}</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => onSelectFlight(flight)}
                className="mt-4 md:mt-0 md:ml-4 bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition duration-200"
              >
                Book Now
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  export default FlightList;