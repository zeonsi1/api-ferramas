const { Router } = require('express');
const router = Router();

const {getProducts, postUsers, postProducts, getUsers, postWebpay, getWebpayReturn, postCreateUser, updateStock, verifyToken } = require('../controllers/index.controller');



/**
 * @swagger
 * /users:
 *   post:
 *     summary: Verificar la existencia de un usuario mediante el correo electrónico y la contraseña
 *     description: Verifica si existe un usuario en la base de datos utilizando el correo electrónico y la contraseña proporcionados.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 description: Correo electrónico del usuario.
 *               password:
 *                 type: string
 *                 description: Contraseña del usuario.
 *     responses:
 *       '200':
 *         description: Usuario encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id_tipo_user:
 *                     type: integer
 *                     description: ID del tipo de usuario.
 *       '401':
 *         description: Correo electrónico o contraseña no válidos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Mensaje de error.
 *       '500':
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Mensaje de error.
 */
router.post('/users', postUsers);

/**
 * @openapi
 * /products:
 *   get:
 *     summary: Obtener todos los productos
 *     description: Recupera una lista de todos los productos disponibles.
 *     responses:
 *       '200':
 *         description: Lista de productos recuperada exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   // Aquí debes definir las propiedades de tus productos
 */
router.get('/products', getProducts);


/**
 * @openapi
 * /products2:
 *   post:
 *     summary: Consulta el precio de los productos y la divisa
 *     description: Consulta el precio de los productos y la divisa que recibe desde la interfaz, modificando el precio segun esta divisa
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               divisa:
 *                 type: string
 *                 description: Tipo de divisa para la conversión del precio del producto (CLP, EUR, USD).
 *     responses:
 *       '200':
 *         description: Producto creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   precio_producto:
 *                     type: number
 *                     description: Precio del producto en la divisa especificada.
 */
router.post('/products2', postProducts);

/**
 * @swagger
 * /users-mostrar:
 *   post:
 *     summary: Obtener una lista de usuarios
 *     responses:
 *       200:
 *         description: Una lista de usuarios
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     description: El ID del usuario
 *                     example: 1
 *                   pnombre_user:
 *                     type: string
 *                     description: El primer nombre del usuario
 *                     example: Juan
 *                   email:
 *                     type: string
 *                     description: El email del usuario
 *                     example: juan@example.com
 */
router.post('/users-mostrar', getUsers);

/**
 * @swagger
 * /webpay:
 *   post:
 *     summary: Iniciar una transacción de Webpay
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               products:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     quantity:
 *                       type: integer
 *                       example: 2
 *               total:
 *                 type: number
 *                 example: 1000
 *     responses:
 *       200:
 *         description: Transacción iniciada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                   example: https://webpay.url
 *                 token:
 *                   type: string
 *                   example: abcd1234
 */
router.post('/webpay', postWebpay)

/**
 * @swagger
 * /webpay-return:
 *   get:
 *     summary: Manejar el retorno de Webpay
 *     parameters:
 *       - in: query
 *         name: token_ws
 *         schema:
 *           type: string
 *         required: true
 *         description: El token de Webpay
 *     responses:
 *       200:
 *         description: Retorno de Webpay manejado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 */
router.get('/webpay-return', getWebpayReturn);

router.post('/create-user', postCreateUser);

router.put('/update-stock', updateStock);

router.post('/verify-token', verifyToken);

module.exports = router;