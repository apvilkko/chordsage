import Lexer from '../node_modules/lex/lexer';
import _ from '../node_modules/lodash';

function doPush(arr, value) {
  if (value) {
    arr.push(value);
  }
}

function convertAccidental(input) {
  var acc = input;
  if (input === 'b') {
    acc = '♭';
  } else if (input === '#') {
    acc = '♯';
  }
  return acc;
}

var NOTES = {
  'B#': 0,
  'C': 0,
  'Dbb': 0,
  'C#': 1,
  'Db': 1,
  'D': 2,
  'Ebb': 2,
  'C##': 2,
  'D#': 3,
  'Eb': 3,
  'E': 4,
  'D##': 4,
  'Fb': 4,
  'E#': 5,
  'F': 5,
  'Gbb': 5,
  'F#': 6,
  'Gb': 6,
  'G': 7,
  'Abb': 7,
  'F##': 7,
  'G#': 8,
  'Ab': 8,
  'A': 9,
  'G##': 9,
  'Bbb': 9,
  'A#': 10,
  'Bb': 10,
  'B': 11,
  'A##': 11,
  'Cb': 11,
}

var ROOTS = {
  'C': 0,
  'D': 1,
  'E': 2,
  'F': 3,
  'G': 4,
  'A': 5,
  'B': 6
}

function absToNote(absNote, originalRoot, rd, quality) {
  var inverted = _.invert(NOTES, true);
  if (absNote > 11) {
    absNote -= 12;
  }
  var choices = inverted[absNote];
  console.log(absNote, choices);
  return _(choices).filter(function (item) {
    var rootDistance = ROOTS[item[0]] - ROOTS[originalRoot];
    if (rootDistance < 0) {
      rootDistance += 7;
    }
    var fifth = (rd >= 6 && rd <= 8) && rootDistance === 4;
    var seventh = (rd >= 10 && rd <= 11) && rootDistance === 6;
    var dimSeventh = (rd === 9) && rootDistance === 6 && quality === 'dim';
    var sixth = (rd >= 8 && rd <= 9) && rootDistance === 5 && quality !== 'dim' && quality !== 'aug';
    var third = (rd >= 3 && rd <= 4) && rootDistance === 2;
    var second = (rd >= 1 && rd <= 2) && rootDistance === 1;
    var fourth = (rd >= 5 && rd <= 6) && rootDistance === 3 && quality !== 'dim';
    return fifth || third || fourth || sixth || seventh || dimSeventh || second;
  }).first();
}

function getAbsNote(root, acc) {
  return NOTES[root + (acc ? acc : '')];
}

function getNote(model, distance, role) {
  var root = model.root;
  var acc = model.rootModifier;
  var absNote = getAbsNote(root, acc);
  var newNote = absNote + distance;
  var newClean = absToNote(newNote, root, distance, model.quality);
  if (!newClean) {
    throw new Error("bad note" + " " + root + " " + acc + " " + distance + " " + role);
  }
  return {
    note: newClean[0],
    accidental: newClean.length > 1 ? newClean.substr(1) : null,
    role: role
  };
}

class ChordParser {
  constructor() {
    this.resetModel();
    this.setupLexer();
  }
  setupLexer() {
    this.lexer = new Lexer((char) => {
      throw new Error(char);
    });
    this.lexer.addRule(/^[a-h](#|b)?/i, (value) => {
      this.model.root = value[0].toUpperCase();
      this.model.rootModifier = value.length > 1 ? value[1].toLowerCase() : null;
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
    }).addRule(/(?!(^))((add|sus|#|b|\+|\-)[1-9]{1,2})+/i, (value) => {
      // TODO parse these separately
      this.model.extra = value;
    }).addRule(/\/[a-h](#|b)?$/i, (value) => {
      this.model.bass = value[1].toUpperCase();
      this.model.bassModifier = value.length > 2 ? value[2].toLowerCase() : null;
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
    this.buildChord();
    console.log(this.model);
    return true;
  }
  buildChord() {
    let notes = [];
    if (this.model.root) {
      notes.push({
        note: this.model.root,
        accidental: this.model.rootModifier,
        role: 'root'
      });
      var third = 4;
      if (this.model.quality === 'm' || this.model.quality === 'dim') {
        third = 3;
      } else if (this.model.quality === 'sus') {
        third = null;
        if (this.model.interval === 2) {
          third = 2;
        } else if (this.model.interval === 4) {
          third = 5;
        }
      }
      if (third && this.model.quality !== 'power') {
        notes.push(getNote(this.model, third, 'third'));
      }
      var fifth = 7;
      if (this.model.quality === 'dim') {
        fifth = 6;
      } else if (this.model.quality === 'aug') {
        fifth = 8;
      }
      if (fifth) {
        notes.push(getNote(this.model, fifth, 'fifth'));
      }
      var interval = this.model.interval;
      if (interval) {
        var realInterval;
        if (interval === 7) {
          realInterval = this.model.quality === 'maj' ? 11 : 10;
          if (this.model.quality === 'dim') {
            realInterval--;
          }
        } else if (interval === 6) {
          realInterval = 9;
        }
        if (realInterval) {
          notes.push(getNote(this.model, realInterval, 'interval'));
        }
      }
    }
    this.model.notes = notes;
  }
  toString() {
    if (!this.model.root) {
      return '';
    }
    let isAlt = this.model.quality === 'alt';
    let isPower = this.model.quality === 'power';
    let ret = [];
    doPush(ret, this.model.root);
    doPush(ret, convertAccidental(this.model.rootModifier));
    doPush(ret, this.model.quality);
    if ((this.model.quality === 'maj' && !this.model.interval) || isAlt || isPower) {
      ret.pop();
    }
    doPush(ret, this.model.interval);
    doPush(ret, this.model.extra);
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
  octaveChanged(a, b) {
    return NOTES[b] - NOTES[a] < 0;
  }
}

export default ChordParser;
