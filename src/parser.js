import Lexer from '../node_modules/lex/lexer';
import ChordBuilder from './chordbuilder';
import _ from '../node_modules/lodash';

function doPush(arr, value) {
  if (value) {
    arr.push(value);
  }
}

function convertAccidental(input) {
  if (!input) {
    return input;
  }
  return input.replace('b', '♭').replace('#', '♯');
}

function toAccidental(value) {
  if (!value) {
    return value;
  }
  value = value.toLowerCase();
  return value.replace('♭', 'b').replace('♯', '#');
}


class ChordParser {
  constructor() {
    this.resetModel();
    this.setupLexer();
    this.builder = new ChordBuilder();
  }
  setupLexer() {
    this.lexer = new Lexer((char) => {
      throw new Error(char);
    });
    this.lexer.addRule(/^[a-h](#|b|♭|♯)?/i, (value) => {
      this.model.root = value[0].toUpperCase();
      this.model.rootModifier = value.length > 1 ? toAccidental(value[1]) : null;
    }).addRule(/(\+|\-|maj|min|m|aug|dom|dim|sus|alt)/i, (value) => {
      if (value === 'M') {
        value = 'maj';
      } else if (value.toLowerCase() === 'dom') {
        value = null;
      } else if (value.toLowerCase() === 'min' || value === '-') {
        value = 'm';
      } else if (value === '+') {
        value = 'aug';
      }
      this.model.quality = value ? value.toLowerCase() : value;
    }).addRule(/[1-9]{1,2}/, (value) => {
      this.model.interval = parseInt(value, 10);
      if (this.model.interval === 8 ||
          this.model.interval === 1) {
        this.model.interval = null;
      }
    }).addRule(/(?!(^))(((add(#|b|♭|♯|\+|\-)?)|sus|omit|no|#|b|♭|♯|\+|\-)[1-9]{1,2})+/i, (value) => {
      this.model.extra = value;
    }).addRule(/\/[a-h](#|b|♭|♯)?$/i, (value) => {
      this.model.bass = value[1].toUpperCase();
      this.model.bassModifier = value.length > 2 ? toAccidental(value[2]) : null;
    });
  }
  resetModel() {
    this.model = {};
  }
  getModel() {
    return this.model;
  }
  parse(value) {
    this.resetModel();
    try {
      this.lexer.setInput(value).lex();
    } catch(e) {
      return e;
    }
    if (this.model.quality === 'alt') {
      this.model.interval = 7;
    }
    if (this.model.interval === 5 && this.model.quality !== 'dim' && this.model.quality !== 'aug') {
      this.model.quality = 'power';
    }
    if (this.model.root === 'H') {
      this.model.root = 'B';
    }
    if (this.model.bass === 'H') {
      this.model.bass = 'B';
    }
    if (this.model.quality === 'sus' && !this.model.interval) {
      this.model.interval = 4;
    }
    if (this.model.quality === 'sus' && this.model.interval === 7) {
      this.model.susInterval = 4;
    }
    this.processExtras();
    let extraSus = _.find(this.model.extra, function (item) {
      return item.action === 'sus';
    });
    if (extraSus) {
      this.model.quality = 'sus';
      this.model.susInterval = extraSus.interval;
      _.remove(this.model.extra, function (item) {
        return item.action === 'sus';
      });
    }
    this.builder.buildChord(this.model);
    return true;
  }
  processExtras() {
    if (this.model.extra) {
      let groups = this.model.extra.split(/([^0-9]+[0-9]+)/);
      this.model.extra = _(groups).filter(function (item) {
        return item;
      }).map(function (item) {
        var split = item.split(/(\d+)/);
        var accidental = split[0].toLowerCase();
        var interval = parseInt(split[1], 10);
        var action = null;
        if (accidental === 'omit' || accidental === 'no') {
          action = 'omit';
          accidental = null;
        } else if (accidental === 'sus') {
          action = 'sus';
          accidental = null;
        } else if (_.contains(accidental, 'add')) {
          action = 'add';
          accidental = accidental.replace('add', '');
        } else if (accidental === '+') {
          accidental = '#';
        } else if (accidental === '-') {
          accidental = 'b';
        }
        return {
          action: action || 'iadd',
          interval: interval,
          accidental: toAccidental(accidental)
        };
      }).sortBy('interval').value();
    }
  }
  toString() {
    if (!this.model.root) {
      return '';
    }
    let isAlt = this.model.quality === 'alt';
    let isPower = this.model.quality === 'power';
    //let isSus = this.model.quality === 'sus' && this.model.interval > 5;
    let isSus = this.model.quality === 'sus';
    let ret = [];
    doPush(ret, this.model.root);
    doPush(ret, convertAccidental(this.model.rootModifier));
    doPush(ret, this.model.quality);
    if ((this.model.quality === 'maj' && !this.model.interval) || isAlt || isPower || isSus) {
      ret.pop();
    }
    doPush(ret, this.model.interval);
    if (isSus) {
      if (this.model.interval < 5) {
        ret.pop();
      }
      doPush(ret, this.model.quality);
      doPush(ret, this.model.susInterval || this.model.interval);
    }
    _.each(this.model.extra, function (item) {
      if (item.action === 'add' || item.action === 'omit' || item.action === 'sus') {
        doPush(ret, item.action);
      }
      doPush(ret, convertAccidental(item.accidental));
      doPush(ret, item.interval);
    });
    if (this.model.bass) {
      doPush(ret, '/');
    }
    if (isAlt) {
      doPush(ret, this.model.quality);
    }
    doPush(ret, this.model.bass);
    doPush(ret, convertAccidental(this.model.bassModifier));

    //doPush(ret, ' -- ');
    //doPush(ret, JSON.stringify(this.model.notes));

    return ret.join('');
  }
}

export default ChordParser;
