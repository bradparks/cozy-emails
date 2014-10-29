// Generated by CoffeeScript 1.7.1
var americano;

americano = require('americano');

module.exports = {
  settings: {
    all: americano.defaultRequests.all
  },
  account: {
    all: americano.defaultRequests.all
  },
  mailbox: {
    all: americano.defaultRequests.all,
    treeMap: function(doc) {
      return emit([doc.accountID].concat(doc.tree), null);
    }
  },
  message: {
    all: americano.defaultRequests.all,
    byMailboxAndDate: {
      reduce: '_count',
      map: function(doc) {
        var boxid, uid, _ref;
        _ref = doc.mailboxIDs;
        for (boxid in _ref) {
          uid = _ref[boxid];
          emit([boxid, doc.date], uid);
        }
        return void 0;
      }
    },
    byMailboxAndUID: function(doc) {
      var boxid, uid, _ref, _results;
      _ref = doc.mailboxIDs;
      _results = [];
      for (boxid in _ref) {
        uid = _ref[boxid];
        _results.push(emit([boxid, uid], doc.flags));
      }
      return _results;
    },
    byMailboxAndFlag: {
      reduce: '_count',
      map: function(doc) {
        var boxid, flag, uid, _i, _len, _ref, _ref1;
        _ref = doc.mailboxIDs;
        for (boxid in _ref) {
          uid = _ref[boxid];
          _ref1 = doc.flags;
          for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
            flag = _ref1[_i];
            emit([boxid, flag], uid);
          }
          void 0;
        }
        return void 0;
      }
    },
    byMessageId: function(doc) {
      if (doc.messageID) {
        return emit([doc.accountID, doc.messageID], doc.conversationID);
      }
    },
    byNormSubject: function(doc) {
      if (doc.normSubject) {
        return emit([doc.accountID, doc.normSubject], doc.conversationID);
      }
    }
  }
};
