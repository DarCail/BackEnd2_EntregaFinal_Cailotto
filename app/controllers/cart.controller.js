import { Cart } from '../models/cart.model.js';
import { Product } from '../models/product.model.js';
import { User } from '../models/user.model.js';
import { ticketService } from '../services/ticket.service.js';
import { mailerService } from '../services/mailer.service.js';

class CartController {
  // Helper: get or create cart for user
  async getOrCreateCart(userId) {
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
      await cart.save();
    }
    return cart;
  }

  // Vista con Handlebars - Ver carrito del usuario
  async viewCart(req, res) {
    try {
      const cart = await Cart.findOne({ user: req.user._id })
        .populate('items.product')
        .lean();
      
      // Transformar items a products para compatibilidad con la vista
      const cartForView = cart ? {
        ...cart,
        products: cart.items.map(item => ({
          product: item.product,
          qty: item.qty
        }))
      } : { products: [] };
      
      return res.render('cart/index', { cart: cartForView, title: 'Mi Carrito' });
    } catch (err) {
      return res.status(500).render('cart/index', { error: err.message });
    }
  }

  // API JSON - Obtener carrito del usuario
  async getCart(req, res) {
    try {
      const cart = await Cart.findOne({ user: req.user._id })
        .populate('items.product')
        .lean();
      return res.json({ cart });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // API JSON - Obtener conteo de items del carrito
  async getCartCount(req, res) {
    try {
      const cart = await Cart.findOne({ user: req.user._id }).lean();
      const count = cart ? cart.items.reduce((sum, item) => sum + item.qty, 0) : 0;
      return res.json({ count });
    } catch (err) {
      return res.status(500).json({ error: err.message, count: 0 });
    }
  }

  // API JSON - Agregar producto al carrito
  async addItem(req, res) {
    try {
      const { productId } = req.params;
      const { qty } = req.body;
      const q = Math.max(1, parseInt(qty, 10) || 1);

      const product = await Product.findById(productId).lean();
      if (!product) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }

      const cart = await this.getOrCreateCart(req.user._id);
      const idx = cart.items.findIndex(i => String(i.product) === String(productId));
      
      if (idx >= 0) {
        cart.items[idx].qty = cart.items[idx].qty + q;
      } else {
        cart.items.push({ product: productId, qty: q });
      }
      
      await cart.save();
      return res.json({ message: 'Producto agregado al carrito', cart });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // API JSON - Actualizar cantidad de item en carrito
  async updateItem(req, res) {
    try {
      const { productId } = req.params;
      const { qty } = req.body;
      const q = parseInt(qty, 10);
      
      if (isNaN(q) || q < 0) {
        return res.status(400).json({ error: 'Cantidad inválida' });
      }

      const cart = await Cart.findOne({ user: req.user._id });
      if (!cart) {
        return res.status(404).json({ error: 'Carrito no encontrado' });
      }

      const idx = cart.items.findIndex(i => String(i.product) === String(productId));
      if (idx === -1) {
        return res.status(404).json({ error: 'Producto no en el carrito' });
      }

      if (q === 0) {
        cart.items.splice(idx, 1);
      } else {
        cart.items[idx].qty = q;
      }
      
      await cart.save();
      return res.json({ message: 'Carrito actualizado', cart });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // API JSON - Eliminar item del carrito
  async removeItem(req, res) {
    try {
      const { productId } = req.params;
      const cart = await Cart.findOne({ user: req.user._id });
      
      if (!cart) {
        return res.status(404).json({ error: 'Carrito no encontrado' });
      }
      
      cart.items = cart.items.filter(i => String(i.product) !== String(productId));
      await cart.save();
      return res.json({ message: 'Producto eliminado del carrito', cart });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // Web - Agregar producto desde formulario
  async addItemFromForm(req, res) {
    try {
      const { productId } = req.params;
      const { _method, qty } = req.body;

      // Handle DELETE method
      if (_method === 'DELETE') {
        const cart = await Cart.findOne({ user: req.user._id });
        if (cart) {
          cart.items = cart.items.filter(i => String(i.product) !== String(productId));
          await cart.save();
        }
        return res.redirect('/cart');
      }

      // Handle PUT method
      if (_method === 'PUT') {
        const q = parseInt(qty, 10);
        if (!isNaN(q) && q >= 0) {
          const cart = await Cart.findOne({ user: req.user._id });
          if (cart) {
            const idx = cart.items.findIndex(i => String(i.product) === String(productId));
            if (idx !== -1) {
              if (q === 0) {
                cart.items.splice(idx, 1);
              } else {
                cart.items[idx].qty = q;
              }
              await cart.save();
            }
          }
        }
        return res.redirect('/cart');
      }

      // Regular POST - add to cart
      const q = Math.max(1, parseInt(qty, 10) || 1);
      const product = await Product.findById(productId);
      if (!product) {
        return res.redirect('/products');
      }

      const cart = await this.getOrCreateCart(req.user._id);
      const idx = cart.items.findIndex(i => String(i.product) === String(productId));
      
      if (idx >= 0) {
        cart.items[idx].qty = cart.items[idx].qty + q;
      } else {
        cart.items.push({ product: productId, qty: q });
      }
      
      await cart.save();
      return res.redirect('/cart');
    } catch (err) {
      return res.redirect('/cart');
    }
  }

  // API JSON - Finalizar compra (purchase)
  async purchase(req, res) {
    try {
      // Obtener el carrito del usuario con productos populados
      const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
      
      if (!cart || !cart.items || cart.items.length === 0) {
        return res.status(400).json({ 
          error: 'El carrito está vacío',
          productsNotProcessed: []
        });
      }

      // Obtener información del usuario para el ticket
      const user = await User.findById(req.user._id).lean();
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      const productsProcessed = []; // Productos que sí se pudieron comprar
      const productsNotProcessed = []; // IDs de productos sin stock suficiente
      let totalAmount = 0;

      // Procesar cada item del carrito
      for (const item of cart.items) {
        const product = item.product;
        const requestedQty = item.qty;

        // Verificar que el producto existe y tiene stock suficiente
        if (!product) {
          productsNotProcessed.push(item.product);
          continue;
        }

        if (product.stock >= requestedQty) {
          // Hay stock suficiente - procesar la compra
          // Restar el stock del producto
          product.stock -= requestedQty;
          await product.save();

          // Agregar a productos procesados para el ticket
          productsProcessed.push({
            product: product._id,
            quantity: requestedQty,
            price: product.price
          });

          // Sumar al total
          totalAmount += product.price * requestedQty;
        } else {
          // No hay stock suficiente - no procesar
          productsNotProcessed.push(product._id);
        }
      }

      // Si no se pudo procesar ningún producto
      if (productsProcessed.length === 0) {
        return res.status(400).json({
          error: 'No se pudo procesar ningún producto. Stock insuficiente.',
          productsNotProcessed
        });
      }

      // Crear el ticket con los productos procesados
      const ticket = await ticketService.createTicket({
        amount: totalAmount,
        purchaser: user.email,
        products: productsProcessed
      });

      // Actualizar el carrito: mantener solo los productos que NO se pudieron comprar
      cart.items = cart.items.filter(item => 
        productsNotProcessed.some(id => String(id) === String(item.product._id || item.product))
      );
      await cart.save();

      // Enviar email de confirmación de compra
      try {
        await mailerService.sendPurchaseConfirmation({
          to: user.email,
          userName: `${user.first_name} ${user.last_name}`,
          ticket: {
            code: ticket.code,
            amount: ticket.amount,
            purchase_datetime: ticket.purchase_datetime,
            products: productsProcessed
          }
        });
      } catch (emailErr) {
        console.error('Error enviando email de confirmación:', emailErr);
        // No fallar la compra si el email falla
      }

      // Respuesta exitosa
      return res.json({
        message: 'Compra procesada exitosamente',
        ticket: {
          code: ticket.code,
          amount: ticket.amount,
          purchase_datetime: ticket.purchase_datetime,
          purchaser: ticket.purchaser
        },
        productsNotProcessed: productsNotProcessed.length > 0 ? productsNotProcessed : undefined
      });

    } catch (err) {
      console.error('Error en purchase:', err);
      return res.status(500).json({ error: err.message });
    }
  }
}

export const cartController = new CartController();
