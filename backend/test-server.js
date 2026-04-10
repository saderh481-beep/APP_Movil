const http = require('http');

const json = (res, status, payload) => {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
  });
  res.end(body);
};

const server = http.createServer(async (req, res) => {
  try {
    if (!req.url) {
      json(res, 404, { error: 'Ruta no encontrada' });
      return;
    }
    
    json(res, 200, { ok: true });
  } catch (error) {
    json(res, 500, { error: error.message });
  }
});

server.listen(3002, () => {
  console.log('Test server started');
});
