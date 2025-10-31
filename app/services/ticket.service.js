import { Ticket } from '../models/ticket.model.js';
import crypto from 'crypto';

class TicketService {
  /**
   * Genera un código único para el ticket
   */
  generateUniqueCode() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `TICKET-${timestamp}-${random}`;
  }

  /**
   * Crea un nuevo ticket de compra
   * @param {Object} ticketData - Datos del ticket
   * @param {number} ticketData.amount - Monto total de la compra
   * @param {string} ticketData.purchaser - Email del comprador
   * @param {Array} ticketData.products - Array de productos comprados
   * @returns {Promise<Ticket>} Ticket creado
   */
  async createTicket({ amount, purchaser, products = [] }) {
    try {
      const code = this.generateUniqueCode();
      
      const ticket = new Ticket({
        code,
        purchase_datetime: new Date(),
        amount,
        purchaser,
        products
      });

      await ticket.save();
      return ticket;
    } catch (error) {
      // Si el código ya existe (muy improbable), reintentar
      if (error.code === 11000) {
        return this.createTicket({ amount, purchaser, products });
      }
      throw error;
    }
  }

  /**
   * Obtiene un ticket por su código
   */
  async getTicketByCode(code) {
    return await Ticket.findOne({ code }).populate('products.product').lean();
  }

  /**
   * Obtiene tickets por email del comprador
   */
  async getTicketsByPurchaser(email) {
    return await Ticket.find({ purchaser: email })
      .populate('products.product')
      .sort({ purchase_datetime: -1 })
      .lean();
  }

  /**
   * Obtiene todos los tickets (admin)
   */
  async getAllTickets(limit = 50) {
    return await Ticket.find()
      .populate('products.product')
      .sort({ purchase_datetime: -1 })
      .limit(limit)
      .lean();
  }
}

export const ticketService = new TicketService();
