const axios = require('axios');
const { Pool } = require('pg');
const { WebpayPlus } = require('transbank-sdk');

const {config} = require('dotenv');
config()

WebpayPlus.configureForTesting();

const pool = new Pool({
    // connectionString: process.env.DATABASE_URL,
    // ssl: true
    host: 'localhost',
    user: 'postgres',
    password: 'duoc',
    database: 'ferreteria',
    port: '5432'
});

const accountBank = process.env.CENTRAL_BANK_ACCOUNT;
const passwordBank = process.env.CENTRAL_BANK_PASSWORD;

const fechaActual = new Date();

const anno = fechaActual.getFullYear();
const mes = String(fechaActual.getMonth() + 1).padStart(2, '0');
const dia = String(fechaActual.getDate()).padStart(2, '0');

const postUsers = async(req, res) =>{
    const {email, password} = req.body;

    const query = {
        text: 'SELECT id_tipo_user, pnombre_user FROM users WHERE email = $1 AND password = $2',
        values: [email, password]
    }

    try {
        const response = await pool.query(query);
        if (response.rows.length > 0) {          
          res.status(200).json(response.rows);
        } else {
          res.status(401).json({ error: 'Invalid email or password' });
        }

    } catch (error) {
        console.error('Error al ejecutar la consulta: ', error);
        res.status(500).json({ error: 'Error al ejecutar la consulta' });
    }
    
};

const getProducts = async(req, res) => {
    try {
        const response = await pool.query('SELECT * FROM productos ORDER BY id_producto');
        res.status(200).json(response.rows);
    } catch (error) {
        console.error('Error al obtener la lista de productos: ', error);
        res.status(500).json({ error: 'Error al obtener la lista de productos' });
    }
};

const postProducts = async(req, res) => {
    divisa = req.body.divisa;
    fecha = `${anno}-${mes}-${dia}`;
    let resp = ''; 
    let valor = 0;
    let precio = 0;

    const response = await pool.query('SELECT precio_producto FROM productos ORDER BY id_producto');

    switch (divisa){
        case 'CLP':
            res.status(200).json(response.rows);
            break;
        case 'EUR':
            resp = await axios.get(`https://si3.bcentral.cl/SieteRestWS/SieteRestWS.ashx?user=${accountBank}&pass=${passwordBank}&firstdate=${fecha}&timeseries=F072.CLP.EUR.N.O.D&function=GetSeries`);
            valor = resp.data.Series.Obs[0].value;
            for (let i in response.rows){                
                precio = response.rows[i].precio_producto;
                precio = precio / valor;
                response.rows[i].precio_producto = precio;
            }            
            res.status(200).json(response.rows);
            break;
        case 'USD':
            resp = await axios.get(`https://si3.bcentral.cl/SieteRestWS/SieteRestWS.ashx?user=${accountBank}&pass=${passwordBank}&firstdate=${fecha}&timeseries=F073.TCO.PRE.Z.D&function=GetSeries`);
            valor = resp.data.Series.Obs[0].value;
            for (let i in response.rows){                
                precio = response.rows[i].precio_producto;
                precio = precio / valor;    
                response.rows[i].precio_producto = precio
            }
            res.status(200).json(response.rows);    
            break;
    }
}

const getUsers = async(req, res) => {
    try {
        const response = await pool.query('SELECT u.id, u.pnombre_user, u.email, u.password, tu.nombre_tipo_user FROM users u JOIN tipo_user tu ON u.id_tipo_user = tu.id_tipo_user ORDER BY u.id');
        res.status(200).json(response.rows);
    } catch (error) {
        console.error('Error al obtener la lista de usuarios: ', error);
        res.status(500).json({ error: 'Error al obtener la lista de usuarios' });
    }
}

const postWebpay = async(req, res) => {
    let { total: amount, products: products } = req.body;
    const sessionId = '3'; // Asegúrate de generar un sessionId único si es necesario
    const returnUrl = 'http://localhost:5173/result';
    let buyOrder = '';
    const divisa = req.body.divisaType; // Asegúrate de que este dato es correcto y necesario
    
    const fecha = new Date().toISOString().split('T')[0];
    
    if (divisa === 'EUR'){
        resp = await axios.get(`https://si3.bcentral.cl/SieteRestWS/SieteRestWS.ashx?user=${accountBank}&pass=${passwordBank}&firstdate=${fecha}&timeseries=F072.CLP.EUR.N.O.D&function=GetSeries`);
        valor = resp.data.Series.Obs[0].value;
        amount = amount * valor;
    }else if (divisa === 'USD'){
        resp = await axios.get(`https://si3.bcentral.cl/SieteRestWS/SieteRestWS.ashx?user=${accountBank}&pass=${passwordBank}&firstdate=${fecha}&timeseries=F073.TCO.PRE.Z.D&function=GetSeries`);
        valor = resp.data.Series.Obs[0].value;
        amount = amount * valor;
    }    

    try {
        // Inserta en la tabla purchase_orders
        const insertResponse = await pool.query('INSERT INTO purchase_orders (user_id, status, total_amount, order_details) VALUES ($1, $2, $3, $4) RETURNING *', [ parseInt(sessionId), 'CREATED', amount, JSON.stringify(products)]);
        // Maneja la respuesta de la inserción
        buyOrder = insertResponse.rows[0].order_number;
        
        if (insertResponse.rows.length > 0) {
            // Si la inserción fue exitosa, procede con la creación de la transacción WebpayPlus
            try {
                const createResponse = await (new WebpayPlus.Transaction()).create(
                    buyOrder, 
                    sessionId,
                    amount, 
                    returnUrl
                );
                res.status(200).json(createResponse);
            } catch (error) {
                console.error('Error al crear la transacción WebpayPlus:', error);
                res.status(500).json({ error: 'Ocurrió un error al crear la transacción WebpayPlus. Inténtalo de nuevo más tarde.' });
            }
        } else {
            // Si no hay filas en la respuesta, la inserción no fue exitosa
            res.status(500).json({ error: 'No se pudo insertar la orden de compra en la base de datos.' });
        }
    } catch (error) {
        console.error('Error al crear la orden de compra:', error);
        res.status(500).json({ error: 'Ocurrió un error al crear la orden de compra. Inténtalo de nuevo más tarde.' });
    }
}

const processedTokens = new Set();

const getWebpayReturn = async(req, res) => {
    const token_ws = req.query.token_ws;
    const tx = new WebpayPlus.Transaction();

    if (processedTokens.has(token_ws)) {
        return res.status(400).json({ error: 'token_ws ya sido procesado' });
    }

    if (!token_ws) {
        return res.status(400).json({ error: 'token_ws es requerido' });
    }
    let productos = [];
    try {
        const commitResponse = await tx.commit(token_ws);
        if (commitResponse.status === 'AUTHORIZED') {
            const orderNumber = commitResponse.buy_order;
            const response = await pool.query('SELECT * FROM purchase_orders WHERE order_number = $1', [orderNumber]);
            productos = JSON.parse(response.rows[0].order_details);
            await Promise.all(productos.map(async (producto) => {
                const id_producto = producto.id;
                const cantidad = producto.quantity;
                return pool.query('UPDATE productos SET stock = stock - $1 WHERE id_producto = $2', [cantidad, id_producto]);
            }));
        }else if(commitResponse.status === 'FAILED'){
            const orderNumber = commitResponse.buy_order;
            const response = await pool.query('UPDATE purchase_orders SET status = $1 WHERE order_number = $2', ['FAILED', orderNumber]);
        }
        processedTokens.add(token_ws);
        res.json({commitResponse, productos});
    } catch (error) {
        // Asegúrate de enviar una respuesta en caso de error para evitar que la solicitud se quede colgando
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
}

const postCreateUser = async(req, res) => {
    const {email: email, pnombre: pnombre, password: password} = req.body
    
    try{
        const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

        if(existingUser.rows.length > 0) {
            return res.status(400).json({error: 'El Email esta en uso'});
        }

        await pool.query('INSERT INTO users (pnombre_user, email, password, id_tipo_user) VALUES ($1, $2, $3, 3)', [pnombre, email, password])
        res.status(201).json({ message: 'Usuario creado con éxito' })
    }catch(error){
        console.error('Error al crear el usuario:', error);
        res.status(500).json({ error: 'Ocurrió un error al crear el usuario. Inténtalo de nuevo más tarde.' });
    }
}

const updateStock = async(req, res) => {
    const { id_producto: id_producto, stock: stock, precio_producto: precio_producto } = req.body;
    try{
        const response = await pool.query('UPDATE productos SET stock = $1, precio_producto = $3 WHERE id_producto = $2', [stock, id_producto, precio_producto]);
        res.status(200).json({ message: 'Actualizado con éxito' });
    }catch(error){
        console.error('Error al actualizar:', error);
        res.status(500).json({ error: 'Ocurrió un error al actualizar. Inténtalo de nuevo más tarde.' });
    }
}

module.exports = {
    postUsers,
    getProducts,
    postProducts,
    getUsers,
    postWebpay,
    getWebpayReturn,
    postCreateUser,
    updateStock
}