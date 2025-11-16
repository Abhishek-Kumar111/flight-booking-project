CREATE DATABASE IF NOT EXISTS flight_booking2;
USE flight_booking2;

-- Flights table
CREATE TABLE IF NOT EXISTS flights (
  id INT AUTO_INCREMENT PRIMARY KEY,
  flight_number VARCHAR(20) NOT NULL UNIQUE,
  airline VARCHAR(100) NOT NULL,
  origin VARCHAR(100) NOT NULL,
  destination VARCHAR(100) NOT NULL,
  departure_time DATETIME NOT NULL,
  arrival_time DATETIME NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  total_seats INT NOT NULL DEFAULT 180,
  available_seats INT NOT NULL DEFAULT 180,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_reference VARCHAR(20) NOT NULL UNIQUE,
  flight_id INT NOT NULL,
  passenger_name VARCHAR(100) NOT NULL,
  passenger_email VARCHAR(100) NOT NULL,
  passenger_phone VARCHAR(20),
  seats INT NOT NULL DEFAULT 1,
  booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) DEFAULT 'confirmed',
  FOREIGN KEY (flight_id) REFERENCES flights(id) ON DELETE CASCADE,
  INDEX idx_email (passenger_email),
  INDEX idx_flight (flight_id),
  INDEX idx_booking_ref (booking_reference)
);

-- Sample data (only insert if table is empty)
INSERT INTO flights (flight_number, airline, origin, destination, departure_time, arrival_time, price, total_seats, available_seats) 
SELECT * FROM (
  SELECT 'AA101' as flight_number, 'American Airlines' as airline, 'New York' as origin, 'Los Angeles' as destination, '2024-12-20 08:00:00' as departure_time, '2024-12-20 11:30:00' as arrival_time, 299.99 as price, 180 as total_seats, 150 as available_seats
  UNION ALL SELECT 'UA202', 'United Airlines', 'Chicago', 'Miami', '2024-12-20 10:00:00', '2024-12-20 13:45:00', 349.99, 180, 120
  UNION ALL SELECT 'DL303', 'Delta Airlines', 'New York', 'Chicago', '2024-12-20 14:00:00', '2024-12-20 16:30:00', 249.99, 180, 180
  UNION ALL SELECT 'SW404', 'Southwest', 'Los Angeles', 'Las Vegas', '2024-12-20 09:00:00', '2024-12-20 10:15:00', 149.99, 180, 100
  UNION ALL SELECT 'AA505', 'American Airlines', 'Miami', 'New York', '2024-12-20 15:00:00', '2024-12-20 18:30:00', 329.99, 180, 90
) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM flights);