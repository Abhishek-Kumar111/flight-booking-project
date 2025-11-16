import express from 'express';
import { createBooking, getBookings, getBookingByReference } from '../controllers/bookingController.js';

const router = express.Router();

router.post('/', createBooking);
router.get('/', getBookings);
router.get('/reference/:reference', getBookingByReference);

export default router;