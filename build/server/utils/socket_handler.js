// Generated by CoffeeScript 1.9.0
var ImapReporter, Mailbox, SocketHandler, forgetClient, handleNewClient, inScope, io, ioServer, log, sockets, stream, updateClientScope,
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

ImapReporter = require('../imap/reporter');

log = require('../utils/logging')('sockethandler');

ioServer = require('socket.io');

Mailbox = require('../models/mailbox');

stream = require('stream');

io = null;

sockets = [];

SocketHandler = exports;

SocketHandler.setup = function(app, server) {
  io = ioServer(server);
  ImapReporter.setIOReference(io);
  return io.on('connection', handleNewClient);
};

SocketHandler.notify = function(type, data, olddata) {
  var socket, _i, _len, _results;
  log.debug("notify", type, data.toString());
  if (type === 'message.update' || type === 'message.create') {
    _results = [];
    for (_i = 0, _len = sockets.length; _i < _len; _i++) {
      socket = sockets[_i];
      if (inScope(socket, data) || (olddata && inScope(socket, olddata))) {
        _results.push(socket.emit(type, data));
      } else {
        _results.push(void 0);
      }
    }
    return _results;
  } else if (type === 'mailbox.update') {
    return Mailbox.getCounts(data.id, function(err, results) {
      var recent, total, unread, _ref;
      if (results[data.id]) {
        _ref = results[data.id], total = _ref.total, unread = _ref.unread, recent = _ref.recent;
        data.nbTotal = total;
        data.nbUnread = unread;
        data.nbRecent = recent;
      }
      return io != null ? io.emit(type, data) : void 0;
    });
  } else {
    return io != null ? io.emit(type, data) : void 0;
  }
};

SocketHandler.wrapModel = function(Model, docType) {
  var _oldCreate, _oldDestroy, _oldUpdateAttributes;
  _oldCreate = Model.create;
  Model.create = function(data, callback) {
    return _oldCreate.call(Model, data, function(err, created) {
      var raw;
      if (!err) {
        raw = created.toObject();
        SocketHandler.notify(docType + ".create", raw);
      }
      return callback(err, created);
    });
  };
  _oldUpdateAttributes = Model.prototype.updateAttributes;
  Model.prototype.updateAttributes = function(data, callback) {
    var old;
    old = this.toObject();
    return _oldUpdateAttributes.call(this, data, function(err, updated) {
      var raw;
      if (!err) {
        if (docType === 'message') {
          raw = updated.toClientObject();
          SocketHandler.notify(docType + ".update", raw, old);
        } else if (docType === 'account') {
          updated.toClientObject(function(err, raw) {
            if (err == null) {
              return SocketHandler.notify(docType + ".update", raw, old);
            }
          });
        } else {
          raw = updated.toObject();
          SocketHandler.notify(docType + ".update", raw, old);
        }
      }
      return callback(err, updated);
    });
  };
  _oldDestroy = Model.prototype.destroy;
  return Model.prototype.destroy = function(callback) {
    var id, old;
    old = this.toObject();
    id = old.id;
    return _oldDestroy.call(this, function(err) {
      if (!err) {
        SocketHandler.notify(docType + ".delete", id, old);
      }
      return callback(err);
    });
  };
};

inScope = function(socket, data) {
  var _ref;
  return (_ref = socket.scope_mailboxID, __indexOf.call(Object.keys(data.mailboxIDs), _ref) >= 0) && socket.scope_before < data.date;
};

handleNewClient = function(socket) {
  log.debug('handleNewClient', socket.id);
  socket.emit('refreshes.status', ImapReporter.summary());
  socket.on('mark_ack', ImapReporter.acknowledge);
  socket.on('change_scope', function(scope) {
    return updateClientScope(socket, scope);
  });
  socket.on('disconnect', function() {
    return forgetClient(socket);
  });
  return sockets.push(socket);
};

updateClientScope = function(socket, scope) {
  log.debug('updateClientScope', socket.id, scope);
  socket.scope_before = new Date(scope.before || 0);
  return socket.scope_mailboxID = scope.mailboxID;
};

forgetClient = function(socket) {
  var index;
  log.debug("forgetClient", socket.id);
  index = sockets.indexOf(socket);
  if (index !== -1) {
    return sockets = sockets.splice(index, 1);
  }
};
