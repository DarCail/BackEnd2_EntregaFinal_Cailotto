import { ticketService } from '../services/ticket.service.js';
import { User } from '../models/user.model.js';

class TicketController {
  // Vista - Mis tickets (usuario)
  async viewMyTickets(req, res) {
    try {
      const user = await User.findById(req.user._id).lean();
      const tickets = await ticketService.getTicketsByPurchaser(user.email);
      
      return res.render('tickets/my-tickets', { 
        tickets, 
        title: 'Mis Compras',
        user 
      });
    } catch (err) {
      return res.status(500).render('tickets/my-tickets', { 
        error: err.message,
        tickets: []
      });
    }
  }

  // Vista - Detalle de ticket
  async viewTicketDetail(req, res) {
    try {
      const { code } = req.params;
      const ticket = await ticketService.getTicketByCode(code);
      
      if (!ticket) {
        return res.status(404).render('error', { 
          message: 'Ticket no encontrado' 
        });
      }

      // Verificar que el ticket pertenece al usuario o es admin
      const user = await User.findById(req.user._id).lean();
      if (ticket.purchaser !== user.email && req.user.role !== 'admin') {
        return res.status(403).render('error', { 
          message: 'No tienes permiso para ver este ticket' 
        });
      }

      return res.render('tickets/detail', { 
        ticket, 
        title: `Ticket ${ticket.code}`,
        user 
      });
    } catch (err) {
      return res.status(500).render('error', { 
        message: err.message 
      });
    }
  }

  // Vista - Todos los tickets (admin)
  async viewAllTickets(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const tickets = await ticketService.getAllTickets(limit);
      
      return res.render('tickets/admin-tickets', { 
        tickets, 
        title: 'Gestión de Tickets',
        limit 
      });
    } catch (err) {
      return res.status(500).render('tickets/admin-tickets', { 
        error: err.message,
        tickets: []
      });
    }
  }

  // API - Obtener mis tickets
  async getMyTickets(req, res) {
    try {
      const user = await User.findById(req.user._id).lean();
      const tickets = await ticketService.getTicketsByPurchaser(user.email);
      return res.json({ tickets });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // API - Obtener ticket por código
  async getTicketByCode(req, res) {
    try {
      const { code } = req.params;
      const ticket = await ticketService.getTicketByCode(code);
      
      if (!ticket) {
        return res.status(404).json({ error: 'Ticket no encontrado' });
      }

      // Verificar permisos
      const user = await User.findById(req.user._id).lean();
      if (ticket.purchaser !== user.email && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'No autorizado' });
      }

      return res.json({ ticket });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // API - Obtener todos los tickets (admin)
  async getAllTickets(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const tickets = await ticketService.getAllTickets(limit);
      return res.json({ tickets, count: tickets.length });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
}

export const ticketController = new TicketController();
