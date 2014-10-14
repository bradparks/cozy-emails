// Generated by CoffeeScript 1.7.1
var Account, ImapPromised, ImapReporter, ImapScheduler, Message, Promise, UIDValidityChanged, log, mailutils, recoverChangedUIDValidity, _,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

log = require('../utils/logging')({
  prefix: 'imap:scheduler'
});

Promise = (function() {
  function Promise() {}

  return Promise;

})();

ImapPromised = require('./imap_promisified');

ImapReporter = require('./imap_reporter');

Promise = require('bluebird');

_ = require('lodash');

UIDValidityChanged = require('../utils/errors').UIDValidityChanged;

Message = require('../models/message');

mailutils = require('../utils/jwz_tools');

Account = null;

module.exports = ImapScheduler = (function() {
  ImapScheduler.instances = {};

  ImapScheduler.instanceFor = function(account) {
    var _base, _name;
    if (account != null) {
      if ((_base = this.instances)[_name = account.imapServer] == null) {
        _base[_name] = new ImapScheduler(account);
      }
      return this.instances[account.imapServer];
    }
  };

  ImapScheduler.prototype.tasks = [];

  ImapScheduler.prototype.pendingTask = null;

  function ImapScheduler(account) {
    this.account = account;
    this._dequeue = __bind(this._dequeue, this);
    this._rejectPending = __bind(this._rejectPending, this);
    this._resolvePending = __bind(this._resolvePending, this);
    this.closeConnection = __bind(this.closeConnection, this);
    if (Account == null) {
      Account = require('../models/account');
    }
    if (!(this.account instanceof Account)) {
      this.account = new Account(this.account);
    }
  }

  ImapScheduler.prototype.createNewConnection = function() {
    log.info("OPEN IMAP CONNECTION", this.account.label);
    this.imap = new ImapPromised({
      user: this.account.login,
      password: this.account.password,
      host: this.account.imapServer,
      port: parseInt(this.account.imapPort),
      tls: (this.account.imapSecure == null) || this.account.imapSecure,
      tlsOptions: {
        rejectUnauthorized: false
      }
    });
    this.imap.onTerminated = (function(_this) {
      return function() {
        _this._rejectPending(new Error('connection closed'));
        return _this.closeConnection();
      };
    })(this);
    return this.imap.waitConnected["catch"]((function(_this) {
      return function(err) {
        var task;
        log.error("FAILED TO CONNECT", err, _this.tasks.length);
        while (task = _this.tasks.shift()) {
          task.reject(err);
        }
        throw err;
      };
    })(this)).tap((function(_this) {
      return function() {
        return _this._dequeue();
      };
    })(this));
  };

  ImapScheduler.prototype.closeConnection = function(hard) {
    log.info("CLOSING CONNECTION", (hard ? "HARD" : ""));
    return this.imap.end(hard).then((function(_this) {
      return function() {
        log.info("CLOSED CONNECTION");
        _this.imap = null;
        return _this._dequeue();
      };
    })(this));
  };

  ImapScheduler.prototype.doASAP = function(gen) {
    return this.queue(true, gen);
  };

  ImapScheduler.prototype.doLater = function(gen) {
    return this.queue(false, gen);
  };

  ImapScheduler.prototype.queue = function(urgent, gen) {
    if (urgent == null) {
      urgent = false;
    }
    return new Promise((function(_this) {
      return function(resolve, reject) {
        var fn;
        fn = urgent ? 'unshift' : 'push';
        _this.tasks[fn]({
          attempts: 0,
          generator: gen,
          resolve: resolve,
          reject: reject
        });
        return _this._dequeue();
      };
    })(this));
  };

  ImapScheduler.prototype.doASAPWithBox = function(box, gen) {
    return this.queueWithBox(true, box, gen);
  };

  ImapScheduler.prototype.doLaterWithBox = function(box, gen) {
    return this.queueWithBox(false, box, gen);
  };

  ImapScheduler.prototype.queueWithBox = function(urgent, box, gen) {
    return this.queue(urgent, function(imap) {
      var uidvalidity;
      uidvalidity = null;
      return imap.openBox(box.path).then(function(imapbox) {
        if (!imapbox.persistentUIDs) {
          throw new Error('UNPERSISTENT UID NOT SUPPORTED');
        }
        log.info("UIDVALIDITY", box.uidvalidity, imapbox.uidvalidity);
        if (box.uidvalidity && box.uidvalidity !== imapbox.uidvalidity) {
          throw new UIDValidityChanged(imapbox.uidvalidity);
        }
        return gen(imap).tap(function() {
          if (!box.uidvalidity) {
            log.info("FIRST UIDVALIDITY", imapbox.uidvalidity);
            return box.updateAttributesPromised({
              uidvalidity: imapbox.uidvalidity
            });
          }
        });
      });
    })["catch"](UIDValidityChanged, (function(_this) {
      return function(err) {
        log.warn("UID VALIDITY HAS CHANGED, RECOVERING");
        return _this.doASAP(function(imap) {
          return recoverChangedUIDValidity(imap, box, _this.account._id);
        }).then(function() {
          return box.updateAttributesPromised({
            uidvalidity: err.newUidvalidity
          });
        }).then(function() {
          log.warn("RECOVERED");
          return _this.queueWithBox(urgent, box, gen);
        });
      };
    })(this));
  };

  ImapScheduler.prototype._resolvePending = function(result) {
    this.pendingTask.resolve(result);
    this.pendingTask = null;
    return setTimeout(this._dequeue, 1);
  };

  ImapScheduler.prototype._rejectPending = function(err) {
    this.pendingTask.reject(err);
    this.pendingTask = null;
    return setTimeout(this._dequeue, 1);
  };

  ImapScheduler.prototype._dequeue = function() {
    var moreTasks, _ref, _ref1, _ref2;
    if (this.pendingTask) {
      return false;
    }
    if ((_ref = this.imap) != null ? _ref.waitConnected.isPending() : void 0) {
      return false;
    }
    if ((_ref1 = this.imap) != null ? (_ref2 = _ref1.waitEnding) != null ? _ref2.isPending() : void 0 : void 0) {
      return false;
    }
    moreTasks = this.tasks.length !== 0;
    if (!moreTasks && !this.imap) {
      return false;
    }
    if (this.imap && !moreTasks) {
      this.closeConnection();
      return false;
    }
    if (moreTasks && !this.imap) {
      this.createNewConnection();
      return false;
    }
    this.pendingTask = this.tasks.shift();
    return Promise.resolve(this.pendingTask.generator(this.imap)).timeout(120000)["catch"](Promise.TimeoutError, (function(_this) {
      return function(err) {
        log.error("TASK GOT STUCKED");
        _this.closeConnection(true);
        throw err;
      };
    })(this)).then(this._resolvePending, this._rejectPending);
  };

  return ImapScheduler;

})();

recoverChangedUIDValidity = function(imap, box, accountID) {
  var reporter;
  reporter = ImapReporter.addUserTask({
    code: 'fix-changed-uidvalidity',
    box: box.path
  });
  return imap.openBox(box.path).then(function() {
    return imap.fetchBoxMessageIds();
  }).then(function(map) {
    return Promise.serie(_.keys(map), function(newUID) {
      var messageID;
      messageID = mailutils.normalizeMessageID(map[newUID]);
      return Message.rawRequestPromised('byMessageId', {
        key: [accountID, messageID],
        include_docs: true
      }).get(0).then(function(row) {
        var mailboxIDs, msg;
        if (!row) {
          return;
        }
        mailboxIDs = row.doc.mailboxIDs;
        mailboxIDs[box.id] = newUID;
        msg = new Message(row.doc);
        return msg.updateAttributesPromised({
          mailboxIDs: mailboxIDs
        });
      });
    });
  });
};

Promise.serie = function(items, mapper) {
  return Promise.map(items, mapper, {
    concurrency: 1
  });
};
