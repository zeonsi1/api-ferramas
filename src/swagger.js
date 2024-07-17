const swaggerJSDOC = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const path = require("path")
//Metadata info about out api

const options = {
    definition: {
        openapi: '3.0.0',
        info: {title: 'Api ferreteria', version:'1.0.0'},
        servers: [
            {
                url:"http://localhost:4000/"
            }
        ]
    },
    apis: [`${path.join(__dirname, "./routes/*.js")}`],
};

// Docs en JSON format

const swaggerSpec = swaggerJSDOC(options);


//Funcion to setup ourd docs

const swaggerDocs = (app, port) => {
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {explorer: true}));
    app.get('/docs.json', (req, res) =>{
        const jsonContent = JSON.stringify(swaggerSpec, null, 2);
        res.setHeader('Content-Type', 'aplication/json');
        res.setHeader('Content-Disposition', `attachment; filename="docs.json"`);
        res.send(jsonContent);
    });

    console.log(`Version 1 Doc are aviable at http:localhost:${port}/docs`);
};

module.exports = {swaggerDocs};