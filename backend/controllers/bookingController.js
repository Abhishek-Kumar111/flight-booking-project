import pool from '../config/database.js';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const AVIATIONSTACK_API_KEY = process.env.AVIATIONSTACK_API_KEY || 'aab180211f0588d2c6e20f1626349a6b';
const AVIATIONSTACK_BASE_URL = 'http://api.aviationstack.com/v1';

// Generate unique booking reference
const generateBookingReference = () => {
  const prefix = 'BK';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${timestamp}${random}`;
};

// Convert ISO datetime string to MySQL DATETIME format (YYYY-MM-DD HH:MM:SS)
const convertToMySQLDateTime = (dateTimeString) => {
  if (!dateTimeString) {
    return null;
  }
  
  try {
    const date = new Date(dateTimeString);
    if (isNaN(date.getTime())) {
      return null;
    }
    
    // Format: YYYY-MM-DD HH:MM:SS
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch (error) {
    console.error('Error converting datetime:', error);
    return null;
  }
};

export const createBooking = async (req, res) => {
  try {
    const { flightId, passengerName, passengerEmail, passengerPhone, seats, flightData } = req.body;

    if (!flightId || !passengerName || !passengerEmail || !seats) {
      return res.status(400).json({ 
        error: 'Flight ID, passenger name, email, and seats are required' 
      });
    }

    // Validate seats
    const seatsNum = parseInt(seats);
    if (isNaN(seatsNum) || seatsNum < 1) {
      return res.status(400).json({ 
        error: 'Invalid number of seats' 
      });
    }

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      let flight;
      let flightIdToUse = flightId;
      
      // Check if flight exists in database (only if flightId is numeric)
      let existingFlights = [];
      if (!isNaN(flightId) && !flightId.toString().includes('_')) {
        [existingFlights] = await connection.execute(
          'SELECT * FROM flights WHERE id = ? FOR UPDATE',
          [flightId]
        );
      }

      if (existingFlights.length === 0) {
        // Flight doesn't exist - need to create it from flightData
        if (!flightData) {
          await connection.rollback();
          connection.release();
          return res.status(400).json({ 
            error: 'Flight data is required to create booking for this flight' 
          });
        }

        console.log('Flight not found in database, creating new flight from flightData');
        
        // Prepare flight data with proper defaults and format conversion
        const now = new Date();
        const defaultDeparture = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
        const defaultArrival = new Date(defaultDeparture.getTime() + 3 * 60 * 60 * 1000); // 3 hours later
        
        const flightNumber = flightData.flight_number || `FL${Date.now().toString().slice(-6)}`;
        const airline = flightData.airline || 'Unknown Airline';
        const origin = (flightData.origin || flightData.origin_code || 'UNK').toString().substring(0, 100);
        const destination = (flightData.destination || flightData.destination_code || 'UNK').toString().substring(0, 100);
        
        // Convert datetime to MySQL format
        const departureTime = convertToMySQLDateTime(flightData.departure_time) || 
                             convertToMySQLDateTime(defaultDeparture.toISOString());
        const arrivalTime = convertToMySQLDateTime(flightData.arrival_time) || 
                           convertToMySQLDateTime(defaultArrival.toISOString());
        
        const price = parseFloat(flightData.price) || 200.00;
        const totalSeats = parseInt(flightData.total_seats) || 180;
        const availableSeats = Math.max(0, totalSeats - seatsNum); // Ensure non-negative
        
        console.log('Creating flight with data:', {
          flightNumber,
          airline,
          origin,
          destination,
          departureTime,
          arrivalTime,
          price,
          totalSeats,
          availableSeats
        });
        
        // Save flight to database
        const [flightResult] = await connection.execute(
          `INSERT INTO flights (flight_number, airline, origin, destination, departure_time, arrival_time, price, total_seats, available_seats)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            flightNumber,
            airline,
            origin,
            destination,
            departureTime,
            arrivalTime,
            price,
            totalSeats,
            availableSeats
          ]
        );
        
        flightIdToUse = flightResult.insertId;
        
        // Fetch the newly created flight
        const [newFlights] = await connection.execute(
          'SELECT * FROM flights WHERE id = ?',
          [flightIdToUse]
        );
        
        if (newFlights.length === 0) {
          throw new Error('Failed to retrieve created flight');
        }
        
        flight = newFlights[0];
        console.log(`Created new flight in database with ID: ${flightIdToUse}`);
      } else {
        // Flight exists in database
        flight = existingFlights[0];
        flightIdToUse = flight.id;
        console.log(`Using existing flight from database with ID: ${flightIdToUse}`);
      }

      // Check seat availability
      if (flight.available_seats < seatsNum) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({ 
          error: `Not enough seats available. Only ${flight.available_seats} seats remaining.` 
        });
      }

      // Generate unique booking reference
      let bookingReference;
      let isUnique = false;
      let attempts = 0;
      
      while (!isUnique && attempts < 10) {
        bookingReference = generateBookingReference();
        const [existing] = await connection.execute(
          'SELECT id FROM bookings WHERE booking_reference = ?',
          [bookingReference]
        );
        if (existing.length === 0) {
          isUnique = true;
        }
        attempts++;
      }

      if (!isUnique) {
        await connection.rollback();
        connection.release();
        return res.status(500).json({ error: 'Failed to generate booking reference' });
      }

      // Create booking with reference
      const [result] = await connection.execute(
        `INSERT INTO bookings (booking_reference, flight_id, passenger_name, passenger_email, passenger_phone, seats, booking_date, status)
         VALUES (?, ?, ?, ?, ?, ?, NOW(), 'confirmed')`,
        [bookingReference, flightIdToUse, passengerName.trim(), passengerEmail.trim(), passengerPhone?.trim() || null, seatsNum]
      );

      // Update available seats
      await connection.execute(
        'UPDATE flights SET available_seats = available_seats - ? WHERE id = ?',
        [seatsNum, flightIdToUse]
      );

      await connection.commit();

      // Fetch the created booking with flight details
      const [bookings] = await pool.execute(
        `SELECT b.*, f.flight_number, f.airline, f.origin, f.destination, 
                f.departure_time, f.arrival_time, f.price
         FROM bookings b
         JOIN flights f ON b.flight_id = f.id
         WHERE b.id = ?`,
        [result.insertId]
      );

      connection.release();

      if (bookings.length === 0) {
        return res.status(500).json({ error: 'Failed to retrieve booking details' });
      }

      res.status(201).json(bookings[0]);
    } catch (error) {
      await connection.rollback();
      connection.release();
      console.error('Transaction error:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message,
      sqlMessage: error.sqlMessage || null
    });
  }
};

export const getBookings = async (req, res) => {
  try {
    const { email, bookingReference } = req.query;
    
    let query = `
      SELECT b.*, f.flight_number, f.airline, f.origin, f.destination, 
             f.departure_time, f.arrival_time, f.price
      FROM bookings b
      JOIN flights f ON b.flight_id = f.id
      WHERE 1=1
    `;
    
    const params = [];
    if (email) {
      query += ' AND b.passenger_email = ?';
      params.push(email);
    }
    if (bookingReference) {
      query += ' AND b.booking_reference = ?';
      params.push(bookingReference);
    }
    
    query += ' ORDER BY b.booking_date DESC';
    
    const [bookings] = await pool.execute(query, params);
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getBookingByReference = async (req, res) => {
  try {
    const { reference } = req.params;
    
    const [bookings] = await pool.execute(
      `SELECT b.*, f.flight_number, f.airline, f.origin, f.destination, 
              f.departure_time, f.arrival_time, f.price
       FROM bookings b
       JOIN flights f ON b.flight_id = f.id
       WHERE b.booking_reference = ?`,
      [reference]
    );

    if (bookings.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json(bookings[0]);
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const cancelBooking = async (req, res) => {
  try {
    const { reference } = req.params;
    
    console.log('Cancel booking called with reference:', reference); // Debug log

    if (!reference) {
      return res.status(400).json({ error: 'Booking reference is required' });
    }

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Get booking details
      const [bookings] = await connection.execute(
        `SELECT b.*, f.id as flight_id 
         FROM bookings b
         JOIN flights f ON b.flight_id = f.id
         WHERE b.booking_reference = ? FOR UPDATE`,
        [reference]
      );

      if (bookings.length === 0) {
        await connection.rollback();
        connection.release();
        return res.status(404).json({ error: 'Booking not found' });
      }

      const booking = bookings[0];

      // Check if already cancelled
      if (booking.status === 'cancelled') {
        await connection.rollback();
        connection.release();
        return res.status(400).json({ error: 'Booking is already cancelled' });
      }

      // Update booking status to cancelled
      await connection.execute(
        'UPDATE bookings SET status = ? WHERE booking_reference = ?',
        ['cancelled', reference]
      );

      // Restore seats to the flight
      await connection.execute(
        'UPDATE flights SET available_seats = available_seats + ? WHERE id = ?',
        [booking.seats, booking.flight_id]
      );

      await connection.commit();

      // Fetch updated booking with flight details
      const [updatedBookings] = await pool.execute(
        `SELECT b.*, f.flight_number, f.airline, f.origin, f.destination, 
                f.departure_time, f.arrival_time, f.price
         FROM bookings b
         JOIN flights f ON b.flight_id = f.id
         WHERE b.booking_reference = ?`,
        [reference]
      );

      connection.release();

      res.json({
        message: 'Booking cancelled successfully',
        booking: updatedBookings[0]
      });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};