import express from 'express';
import { createBooking, getBookings, getBookingByReference, cancelBooking } from '../controllers/bookingController.js';

const router = express.Router();

router.post('/', createBooking);
router.get('/', getBookings);
router.get('/reference/:reference', getBookingByReference);
router.put('/cancel/:reference', cancelBooking);

export default router;