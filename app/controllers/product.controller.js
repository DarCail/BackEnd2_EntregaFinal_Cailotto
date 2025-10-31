import { Product } from '../models/product.model.js';

class ProductController {
  // Vista con Handlebars
  async listView(req, res) {
    try {
      const products = await Product.find().lean();
      res.status(200).render("products/index", {
        title: "Productos",
        products
      });
    } catch (err) {
      console.error("[ProductController.listView]", err);
      res.status(500).render("products/index", { error: "Error cargando los productos" });
    }
  }

  // API JSON - Listar todos los productos
  async listJSON(req, res) {
    try {
      const products = await Product.find().lean();
      res.status(200).json({ products });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // API JSON - Obtener producto por ID
  async getById(req, res) {
    try {
      const product = await Product.findById(req.params.id).lean();
      if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
      res.status(200).json({ product });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // API JSON - Crear producto (admin)
  async create(req, res) {
    try {
      const { title, description, price, stock } = req.body;
      if (!title || price == null) {
        return res.status(400).json({ error: 'Title y price son requeridos' });
      }
      const product = new Product({ title, description, price, stock });
      await product.save();
      res.status(201).json({ product });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // API JSON - Actualizar producto (admin)
  async update(req, res) {
    try {
      const product = await Product.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      ).lean();
      if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
      res.status(200).json({ product });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // API JSON - Eliminar producto (admin)
  async remove(req, res) {
    try {
      const product = await Product.findByIdAndDelete(req.params.id).lean();
      if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  // Web - Mostrar formulario de nuevo producto (admin)
  async newForm(req, res) {
    return res.render('products/new');
  }

  // Web - Crear producto desde formulario (admin)
  async createFromForm(req, res) {
    try {
      const { title, description, price, stock } = req.body;
      if (!title || price == null) {
        return res.status(400).render('products/new', { error: 'Title y price son requeridos' });
      }
      const product = new Product({ title, description, price, stock });
      await product.save();
      return res.redirect('/products');
    } catch (err) {
      return res.status(500).render('products/new', { error: err.message });
    }
  }

  // Web - Mostrar formulario de edición (admin)
  async editForm(req, res) {
    try {
      const product = await Product.findById(req.params.id).lean();
      if (!product) {
        return res.status(404).render('products/index', { error: 'Producto no encontrado' });
      }
      return res.render('products/edit', { product });
    } catch (err) {
      return res.status(500).render('products/index', { error: err.message });
    }
  }

  // Web - Actualizar producto desde formulario (admin)
  async updateFromForm(req, res) {
    try {
      const { title, description, price, stock } = req.body;
      if (!title || price == null) {
        const product = await Product.findById(req.params.id).lean();
        return res.status(400).render('products/edit', { 
          product, 
          error: 'Title y price son requeridos' 
        });
      }
      
      const product = await Product.findByIdAndUpdate(
        req.params.id,
        { title, description, price, stock },
        { new: true }
      );
      
      if (!product) {
        return res.status(404).render('products/index', { error: 'Producto no encontrado' });
      }
      return res.redirect('/products');
    } catch (err) {
      return res.status(500).render('products/index', { error: err.message });
    }
  }

  // Web - Eliminar producto desde formulario (admin)
  async deleteFromForm(req, res) {
    try {
      if (req.body._method !== 'DELETE') {
        return res.status(400).json({ error: 'Método no soportado' });
      }
      const product = await Product.findByIdAndDelete(req.params.id);
      if (!product) {
        return res.status(404).render('products/index', { error: 'Producto no encontrado' });
      }
      return res.redirect('/products');
    } catch (err) {
      return res.status(500).render('products/index', { error: err.message });
    }
  }
}

export const productController = new ProductController();
