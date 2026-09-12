"""HTTPS loopback QA server with same-origin API proxy; never a production server."""
import argparse,ssl,http.client
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
class Handler(SimpleHTTPRequestHandler):
 def do_POST(self): self.proxy()
 def do_PATCH(self): self.proxy()
 def do_DELETE(self): self.proxy()
 def do_GET(self):
  if self.path.startswith('/qa-api/'):return self.proxy()
  return super().do_GET()
 def proxy(self):
  if not self.path.startswith('/qa-api/'):return self.send_error(404)
  conn=http.client.HTTPConnection('127.0.0.1',8767,timeout=20)
  body=self.rfile.read(int(self.headers.get('Content-Length',0)))
  headers={k:v for k,v in self.headers.items() if k.lower() not in ('host','connection','accept-encoding')}
  conn.request(self.command,self.path[7:],body,headers)
  response=conn.getresponse();data=response.read();self.send_response(response.status)
  for k,v in response.getheaders():
   if k.lower() not in ('transfer-encoding','connection','content-length'):self.send_header(k,v)
  self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data);conn.close()
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--cert',required=True);parser.add_argument('--key',required=True);args=parser.parse_args()
 from pathlib import Path
 from functools import partial
 server=ThreadingHTTPServer(('127.0.0.1',8766),partial(Handler,directory=str(Path('dist').resolve())))
 ctx=ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER);ctx.load_cert_chain(args.cert,args.key);server.socket=ctx.wrap_socket(server.socket,server_side=True);server.serve_forever()
