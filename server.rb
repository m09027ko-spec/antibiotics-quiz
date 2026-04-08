require 'webrick'
require 'webrick/httpservlet/filehandler'

port = ENV['PORT'] || 3000

doc_root = File.expand_path(File.dirname(__FILE__))

server = WEBrick::HTTPServer.new(
  Port: port.to_i,
  DocumentRoot: doc_root,
  Logger: WEBrick::Log.new($stderr, WEBrick::Log::INFO),
  AccessLog: []
)

# Force UTF-8 encoding
Encoding.default_external = Encoding::UTF_8
Encoding.default_internal = Encoding::UTF_8

trap('INT') { server.shutdown }
trap('TERM') { server.shutdown }
server.start
