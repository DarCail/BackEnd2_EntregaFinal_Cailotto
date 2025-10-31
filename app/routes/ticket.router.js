import { Router } from 'express';
import { requireJwtCookie } from '../middleware/auth.middleware.js';
import { policies } from '../middleware/policies.middleware.js';
import { ticketController as ctrl } from '../controllers/ticket.controller.js';

const router = Router();

// Vistas - Tickets del usuario
router.get('/tickets', requireJwtCookie, policies('user'), (req, res) => ctrl.viewMyTickets(req, res));
router.get('/tickets/:code', requireJwtCookie, policies('user'), (req, res) => ctrl.viewTicketDetail(req, res));

// Vistas - Admin
router.get('/admin/tickets', requireJwtCookie, policies('admin'), (req, res) => ctrl.viewAllTickets(req, res));

// API - Tickets
router.get('/api/tickets', requireJwtCookie, policies('user'), (req, res) => ctrl.getMyTickets(req, res));
router.get('/api/tickets/:code', requireJwtCookie, policies('user'), (req, res) => ctrl.getTicketByCode(req, res));
router.get('/api/admin/tickets', requireJwtCookie, policies('admin'), (req, res) => ctrl.getAllTickets(req, res));

export default router;
