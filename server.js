const http = require("http");
const https = require("https");
const { URL } = require("url");

const port = Number(process.env.PORT || 8080);
const prefix = `/${(process.env.PROXY_PREFIX || "").replace(/^\/+|\/+$/g, "")}`;
const upstream = new URL(process.env.UPSTREAM || "");
const client = upstream.protocol === "https:" ? https : http;

if (prefix === "/" || !process.env.UPSTREAM) {
  throw new Error("PROXY_PREFIX and UPSTREAM are required");
}

function stripPrefix(url) {
  if (url === prefix) return "/";
  if (url.startsWith(`${prefix}/`)) return url.slice(prefix.length);
  return null;
}

function proxyHeaders(headers) {
  const next = { ...headers, host: upstream.host };
  delete next["connection"];
  delete next["content-length"];
  return next;
}

const server = http.createServer((req, res) => {
  const targetPath = stripPrefix(req.url || "/");
  if (!targetPath) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  const proxyReq = client.request(
    {
      protocol: upstream.protocol,
      hostname: upstream.hostname,
      port: upstream.port || (upstream.protocol === "https:" ? 443 : 80),
      method: req.method,
      path: targetPath,
      headers: proxyHeaders(req.headers),
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res);
    },
  );

  proxyReq.on("error", () => {
    res.writeHead(502);
    res.end("Bad gateway");
  });

  req.pipe(proxyReq);
});

server.on("upgrade", (req, socket, head) => {
  const targetPath = stripPrefix(req.url || "/");
  if (!targetPath) {
    socket.destroy();
    return;
  }

  const proxyReq = client.request({
    protocol: upstream.protocol,
    hostname: upstream.hostname,
    port: upstream.port || (upstream.protocol === "https:" ? 443 : 80),
    method: req.method,
    path: targetPath,
    headers: proxyHeaders(req.headers),
  });

  proxyReq.on("upgrade", (proxyRes, proxySocket, proxyHead) => {
    socket.write(
      `HTTP/1.1 ${proxyRes.statusCode} ${proxyRes.statusMessage}\r\n` +
        Object.entries(proxyRes.headers)
          .map(([key, value]) => `${key}: ${value}`)
          .join("\r\n") +
        "\r\n\r\n",
    );
    proxySocket.write(proxyHead);
    socket.write(head);
    proxySocket.pipe(socket);
    socket.pipe(proxySocket);
  });

  proxyReq.on("error", () => socket.destroy());
  proxyReq.end();
});

server.listen(port, () => {
  console.log(`proxy listening on ${port}`);
});
