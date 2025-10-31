import express from 'express';

import authRouter from '../routes/auth.router.js';
import homeRouter from '../routes/home.router.js'

import orderRouter from '../routes/order.router.js';
import messagingRouter from '../routes/messaging.router.js';
import mailerRouter from '../routes/mailer.router.js';
import sessionsRouter from '../routes/sessions.router.js';
import productRouter from '../routes/product.router.js';
import cartRouter from '../routes/cart.router.js';
import ticketRouter from '../routes/ticket.router.js';



import environment, { validateEnv } from '../config/env.config.js';

import logger from '../middleware/logger.middleware.js'
import { connectAuto } from '../config/db/connect.config.js'

import session from 'express-session';
import MongoStore from 'connect-mongo';
import cookieParser from 'cookie-parser';

import passport from 'passport';
import { initPassport } from '../config/auth/passport.config.js'

import { engine } from 'express-handlebars';
import path from 'path';
import { fileURLToPath  } from 'url';
import { hbsHelpers } from './hbs.helper.js';
import jwt from 'jsonwebtoken';


const app = express();

const PORT = environment.PORT || 5000;

app.use(express.json());
// Parse URL-encoded bodies (form submissions)
app.use(express.urlencoded({ extended: true }));
app.use(logger);
app.use(cookieParser('clave_secreta'));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const startServer = async () => {

    // Validar la existencia de las variables de entorno
    validateEnv();

    // Conexion a la Base de Datos
    await connectAuto();

    const store = MongoStore.create({
        client: (await import("mongoose")).default.connection.getClient(),
        ttl: 60 * 60,
    })

    app.use(
        session({
            secret: environment.SESSION_SECRET || "clave_secreta",
            resave: false,
            saveUninitialized: false,
            store,
            cookie: {
                maxAge: 1 * 60 * 60 * 1000, // 1hr
                httpOnly: true,
                // signed: true,
            },
        })
    );

    initPassport();
    app.use(passport.initialize());

    // Populate res.locals.user from JWT cookie (non-blocking)
    app.use((req, res, next) => {
        try {
            const token = req.cookies && req.cookies.access_token;
            if (token) {
                const payload = jwt.verify(token, environment.JWT_SECRET);
                // expose useful user info to views (include names if present)
                res.locals.user = {
                    email: payload.email,
                    role: payload.role,
                    id: payload.sub,
                    first_name: payload.first_name,
                    last_name: payload.last_name,
                };
                // also attach to req.user for downstream handlers if needed
                req.user = payload;
            }
        } catch (err) {
            // ignore invalid token
        }
        next();
    });

    // Rutas de Handlebars
    app.engine('handlebars', engine({
        defaultLayout: 'main',
        layoutDir: path.join(__dirname, '../views/layouts'),
        helpers: hbsHelpers,
    }))
    app.set('view engine', 'handlebars');
    app.set('views', path.join(__dirname, '../views'));

    // Llamadas al enrutador
    app.use('/auth', authRouter);
    app.use('/api/sessions', sessionsRouter);
    app.use('/', homeRouter);
   


    // Enrutador de Ordenes
    app.use('/', orderRouter);
    app.use('/', messagingRouter);
    app.use('/', mailerRouter);
    // Productos y carrito
    app.use('/', productRouter);
    app.use('/', cartRouter);
    // Tickets
    app.use('/', ticketRouter);

    // Ruta 404
    app.use((req, res) => {
        res.status(404).json({ error: 'Página No Encontrada.!' });
    });

    // Manejo de señales y errores globales
    process.on('unhandledRejection', (reason) => {
        console.error('[process] Unhandled Rejection ', reason);
    });

    process.on('uncaughtException', (err) => {
        console.error('[process] Uncaught Exception ', err);
    });

    process.on('SIGINT', () => {
        console.log('\n[process] SIGINT recibido. Cerrando...');
        process.exit(0);
    });

    app.listen(PORT, () => console.log(`✅ Servidor escuchando en http://localhost:${PORT}`));
};