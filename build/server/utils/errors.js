// Generated by CoffeeScript 1.7.1
var AccountConfigError, Break, ImapImpossible, UIDValidityChanged, utils,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

module.exports = utils = {};

utils.AccountConfigError = AccountConfigError = (function(_super) {
  __extends(AccountConfigError, _super);

  function AccountConfigError(field) {
    this.name = 'AccountConfigError';
    this.field = field;
    this.message = "on field '" + field + "'";
    this.stack = '';
    return this;
  }

  return AccountConfigError;

})(Error);

utils.Break = Break = (function(_super) {
  __extends(Break, _super);

  function Break() {
    this.name = 'Break';
    this.stack = '';
    return this;
  }

  return Break;

})(Error);

utils.ImapImpossible = ImapImpossible = (function(_super) {
  __extends(ImapImpossible, _super);

  function ImapImpossible(code, originalErr) {
    this.name = 'ImapImpossible';
    this.code = code;
    this.original = originalErr;
    this.message = originalErr.message;
    Error.captureStackTrace(this, arguments.callee);
    return this;
  }

  return ImapImpossible;

})(Error);

utils.UIDValidityChanged = UIDValidityChanged = (function(_super) {
  __extends(UIDValidityChanged, _super);

  function UIDValidityChanged(uidvalidity) {
    this.name = UIDValidityChanged;
    this.newUidvalidity = uidvalidity;
    this.message = "UID Validty has changed";
    Error.captureStackTrace(this, arguments.callee);
    return this;
  }

  return UIDValidityChanged;

})(Error);

utils.HttpError = function(status, msg) {
  if (msg instanceof Error) {
    msg.status = status;
    return msg;
  } else {
    Error.call(this);
    Error.captureStackTrace(this, arguments.callee);
    this.status = status;
    this.message = msg;
    return this.name = 'HttpError';
  }
};
